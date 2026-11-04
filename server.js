// server.js - Native Node.js Server for Smart Vehicle QR Privacy Portal
// Zero external dependencies required. Works natively with Node.js 18+ / 20+ / 24+ / 26+.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && process.loadEnvFile) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn('[Env] Warning reading .env file:', err.message);
  }
}

export const PORT = Number(process.env.PORT) || 3000;
let TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
let TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
let DEFAULT_VEHICLE = process.env.DEFAULT_VEHICLE || 'MH 14 ML 3751';

// In-memory store for alerts and rate limiting
export const alerts = new Map();
export const rateLimits = new Map();

// Periodic prune to prevent memory leaks (unref so process can cleanly exit)
const RATE_LIMIT_TTL_MS = 60 * 1000; // 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of rateLimits.entries()) {
    if (now - timestamp > RATE_LIMIT_TTL_MS) {
      rateLimits.delete(key);
    }
  }
}, 2 * 60 * 1000).unref();

const ALERT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, alert] of alerts.entries()) {
    if (now - alert.createdAt > ALERT_TTL_MS) {
      alerts.delete(id);
    }
  }
}, 15 * 60 * 1000).unref();

// Quick response presets for owner
export const RESPONSE_LABELS = {
  'coming_2m': '🏃 On my way! Arriving in 2 minutes.',
  'coming_5m': '🚗 Coming in 5 minutes to move vehicle.',
  'parked_ok': '🅿️ Vehicle is parked with permission.',
  'call_back': '📞 Calling your number shortly.'
};

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
};

/**
 * Escapes characters for Telegram HTML parse_mode to prevent parsing crashes.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(JSON.stringify(data));
}

export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => reject(err));
  });
}

/**
 * Dispatches alert message with Telegram Inline Keyboard buttons
 */
export async function sendTelegramAlert(alert, botToken, chatId) {
  const token = botToken || TG_BOT_TOKEN;
  const chat = chatId || TG_CHAT_ID;

  if (!token || !chat) {
    console.warn('[Telegram] Bot token or Chat ID not configured. Skipping push.');
    return { success: false, reason: 'missing_credentials' };
  }

  const htmlText = 
    `🚨 <b>SMART VEHICLE ALERT: ${escapeHtml(alert.vehicle)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>Reason:</b> ${escapeHtml(alert.reason)}\n` +
    `📝 <b>Note:</b> ${escapeHtml(alert.note || 'None')}\n` +
    `📞 <b>Finder Contact:</b> ${escapeHtml(alert.senderPhone || 'Not provided')}\n` +
    `🕒 <b>Time:</b> ${escapeHtml(alert.time)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 <b>Tap below to reply directly to the scanner:</b>`;

  const inlineKeyboard = [
    [
      { text: '🏃 Coming in 2 min', callback_data: `ans:${alert.id}:coming_2m` },
      { text: '🚗 Coming in 5 min', callback_data: `ans:${alert.id}:coming_5m` }
    ],
    [
      { text: '🅿️ Parked legally', callback_data: `ans:${alert.id}:parked_ok` },
      { text: '📞 Will call you', callback_data: `ans:${alert.id}:call_back` }
    ]
  ];

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: htmlText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      })
    });
    const result = await resp.json();
    if (!result.ok) {
      console.error('[Telegram Error]', result);
      return { success: false, error: result.description };
    }
    return { success: true, messageId: result.result.message_id };
  } catch (err) {
    console.error('[Telegram Network Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Main application request handler
 */
export async function appHandler(req, res) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // -------------------------------------------------------------
  // API: Server Status and Configuration Info
  // -------------------------------------------------------------
  if (pathname === '/api/info' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      version: '1.1.0',
      serverTime: new Date().toISOString(),
      telegramConfigured: Boolean(TG_BOT_TOKEN && TG_CHAT_ID),
      defaultVehicle: DEFAULT_VEHICLE
    });
  }

  // -------------------------------------------------------------
  // API: Dispatches Alert to Owner
  // -------------------------------------------------------------
  if (pathname === '/api/alert' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const vehicle = (data.vehicle || DEFAULT_VEHICLE).trim().slice(0, 32);
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const clientIp = String(rawIp).split(',')[0].trim();

      // Anti-Spam Rate Limiting: 1 alert per 30 seconds per vehicle/IP
      const rateKey = `${clientIp}:${vehicle.toUpperCase()}`;
      const lastTime = rateLimits.get(rateKey) || 0;
      if (Date.now() - lastTime < 30000) {
        const remainingSec = Math.ceil((30000 - (Date.now() - lastTime)) / 1000);
        return sendJson(res, 429, {
          error: `Rate limit reached. Please wait ${remainingSec}s before sending another alert.`
        });
      }
      rateLimits.set(rateKey, Date.now());

      const alertId = 'ALT_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const alert = {
        id: alertId,
        vehicle: vehicle,
        reason: (data.reason || 'Vehicle blocking my way').trim().slice(0, 140),
        note: (data.note || '').trim().slice(0, 500),
        senderPhone: (data.senderPhone || '').trim().slice(0, 30),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        createdAt: Date.now(),
        botToken: data.botToken || TG_BOT_TOKEN,
        chatId: data.chatId || TG_CHAT_ID,
        response: null,
        responseTime: null
      };

      alerts.set(alertId, alert);

      // Send to Telegram
      const tgResult = await sendTelegramAlert(alert, data.botToken, data.chatId);

      return sendJson(res, 200, {
        success: true,
        alertId: alertId,
        telegramDispatched: tgResult.success,
        telegramError: tgResult.error || null
      });
    } catch (e) {
      return sendJson(res, 400, { error: e.message || 'Invalid request' });
    }
  }

  // -------------------------------------------------------------
  // API: Status Poll (Scanner checks if owner tapped reply)
  // -------------------------------------------------------------
  if (pathname === '/api/status' && req.method === 'GET') {
    const alertId = parsedUrl.searchParams.get('id');
    if (!alertId || !alerts.has(alertId)) {
      return sendJson(res, 404, { error: 'Alert not found or expired' });
    }
    const alert = alerts.get(alertId);
    return sendJson(res, 200, {
      id: alert.id,
      status: alert.response ? 'replied' : 'pending',
      response: alert.response,
      responseTime: alert.responseTime
    });
  }

  // -------------------------------------------------------------
  // API: Telegram Webhook (Owner taps inline button on Telegram)
  // -------------------------------------------------------------
  if (pathname === '/api/telegram-webhook' && req.method === 'POST') {
    try {
      const update = await parseJsonBody(req);
      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data || ''; // format: "ans:<alertId>:<action>"
        const [prefix, alertId, action] = data.split(':');

        if (prefix === 'ans' && alertId && alerts.has(alertId)) {
          const alert = alerts.get(alertId);
          const replyText = RESPONSE_LABELS[action] || 'Owner responded!';
          alert.response = replyText;
          alert.responseTime = new Date().toLocaleTimeString();

          const botToken = alert.botToken || TG_BOT_TOKEN;
          if (botToken) {
            // Acknowledge Telegram callback query
            await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: cq.id,
                text: '✅ Response delivered to scanner screen!'
              })
            }).catch(e => console.error('Callback ack error:', e.message));

            // Edit original message to show confirmed response
            if (cq.message) {
              const updatedText = (cq.message.text || '') + `\n\n✅ <b>Status: You replied:</b>\n<i>"${escapeHtml(replyText)}"</i>`;
              await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: cq.message.chat.id,
                  message_id: cq.message.message_id,
                  text: updatedText,
                  parse_mode: 'HTML'
                })
              }).catch(e => console.error('Edit message error:', e.message));
            }
          }
        }
      }
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      console.error('Webhook error:', e);
      return sendJson(res, 200, { ok: true });
    }
  }

  // -------------------------------------------------------------
  // API: Test Bot Configuration
  // -------------------------------------------------------------
  if (pathname === '/api/test-bot' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const token = (data.botToken || TG_BOT_TOKEN || '').trim();
      const chat = (data.chatId || TG_CHAT_ID || '').trim();

      if (!token || !chat) {
        return sendJson(res, 400, { error: 'Please provide both Bot Token and Chat ID.' });
      }

      if (token.startsWith('@') || !token.includes(':')) {
        return sendJson(res, 400, {
          error: 'Invalid Bot Token format. It must look like 123456789:ABC-DEF..., not a @username.'
        });
      }

      const testMsg = 
        `🎉 <b>Smart Vehicle QR Portal Connected!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Your Telegram Bot is successfully configured.\n` +
        `🚗 Vehicle alerts will arrive here immediately when someone scans your decal.\n` +
        `🕒 Test timestamp: ${escapeHtml(new Date().toLocaleString())}`;

      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text: testMsg,
          parse_mode: 'HTML'
        })
      });
      const result = await resp.json();
      if (!result.ok) {
        return sendJson(res, 400, { error: result.description || 'Failed to send test message' });
      }

      // If tokens worked in test, remember for this process session
      if (data.botToken) TG_BOT_TOKEN = data.botToken;
      if (data.chatId) TG_CHAT_ID = data.chatId;

      return sendJson(res, 200, { success: true, message: 'Test message sent successfully!' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message || 'Internal server error' });
    }
  }

  // -------------------------------------------------------------
  // Secure Static File Serving (with Path Traversal Protection)
  // -------------------------------------------------------------
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 Bad Request: Invalid URL encoding');
  }

  if (decodedPath.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 Bad Request');
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const publicRoot = path.resolve(__dirname);
  const safePath = path.resolve(publicRoot, relativePath);

  // Path Traversal containment check
  if (!safePath.startsWith(publicRoot + path.sep) && safePath !== publicRoot) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  // Disallow serving hidden files or environment files
  const baseName = path.basename(safePath);
  if (baseName.startsWith('.') || baseName.endsWith('.env')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('500 Server Error');
    });
  });
}

export const server = http.createServer(appHandler);

// Only listen if executed directly as entrypoint (not when imported in tests)
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);

if (isMain) {
  server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚗 Smart Vehicle QR Decal Portal is Running!`);
    console.log(`👉 Studio:         http://localhost:${PORT}`);
    console.log(`👉 Scanner Portal: http://localhost:${PORT}/scanner-portal.html`);
    console.log(`👉 API Info:       http://localhost:${PORT}/api/info`);
    console.log(`=================================================\n`);
  });

  const shutdown = () => {
    console.log('\nShutting down server gracefully...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
