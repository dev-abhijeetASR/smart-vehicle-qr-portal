// server.js - Native Node.js Server for Smart Vehicle QR Privacy Portal
// Zero external dependencies required. Works natively with Node.js 18+ / 20+ / 26+.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && process.loadEnvFile) {
  process.loadEnvFile(envPath);
}

const PORT = process.env.PORT || 3000;
let TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
let TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
let DEFAULT_VEHICLE = process.env.DEFAULT_VEHICLE || 'MH 12 AB 1234';

// In-memory store for alerts (can also be saved to SQLite/JSON if desired)
const alerts = new Map();
const rateLimits = new Map();

// Quick response options for owner
const RESPONSE_LABELS = {
  'coming_2m': '🏃 On my way! Arriving in 2 minutes.',
  'coming_5m': '🚗 Coming in 5 minutes to move vehicle.',
  'parked_ok': '🅿️ Vehicle is parked with permission.',
  'call_back': '📞 Calling your number shortly.'
};

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
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
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// Dispatches alert message with Telegram Inline Keyboard buttons
async function sendTelegramAlert(alert, botToken, chatId) {
  const token = botToken || TG_BOT_TOKEN;
  const chat = chatId || TG_CHAT_ID;

  if (!token || !chat) {
    console.warn('[Telegram] Bot token or Chat ID not configured. Skipping push.');
    return { success: false, reason: 'missing_credentials' };
  }

  const text = 
    `🚨 *SMART VEHICLE ALERT: ${alert.vehicle}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ *Reason:* ${alert.reason}\n` +
    `📝 *Note:* ${alert.note || 'None'}\n` +
    `📞 *Finder Contact:* ${alert.senderPhone || 'Not provided'}\n` +
    `🕒 *Time:* ${alert.time}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 *Tap below to reply directly to the scanner:*`;

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
        text: text,
        parse_mode: 'Markdown',
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

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // -------------------------------------------------------------
  // API: Dispatches Alert to Owner
  // -------------------------------------------------------------
  if (pathname === '/api/alert' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const vehicle = data.vehicle || DEFAULT_VEHICLE;
      const clientIp = req.socket.remoteAddress || 'unknown';

      // Anti-Spam Rate Limiting: 1 alert per 30 seconds per vehicle/IP
      const rateKey = `${clientIp}:${vehicle}`;
      const lastTime = rateLimits.get(rateKey) || 0;
      if (Date.now() - lastTime < 30000) {
        return sendJson(res, 429, {
          error: 'Rate limit reached. Please wait 30 seconds before sending another alert.'
        });
      }
      rateLimits.set(rateKey, Date.now());

      const alertId = 'ALT_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const alert = {
        id: alertId,
        vehicle: vehicle,
        reason: data.reason || 'Vehicle blocking my way',
        note: data.note || '',
        senderPhone: data.senderPhone || '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        createdAt: Date.now(),
        response: null,
        responseTime: null
      };

      alerts.set(alertId, alert);

      // Clean up old alerts after 2 hours
      setTimeout(() => alerts.delete(alertId), 2 * 60 * 60 * 1000);

      // Send to Telegram
      const tgResult = await sendTelegramAlert(alert, data.botToken, data.chatId);

      return sendJson(res, 200, {
        success: true,
        alertId: alertId,
        telegramDispatched: tgResult.success,
        telegramError: tgResult.error || null
      });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // -------------------------------------------------------------
  // API: Status Poll (Scanner checks if owner tapped reply)
  // -------------------------------------------------------------
  if (pathname === '/api/status' && req.method === 'GET') {
    const alertId = parsedUrl.searchParams.get('id');
    if (!alertId || !alerts.has(alertId)) {
      return sendJson(res, 404, { error: 'Alert not found' });
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

          // Acknowledge Telegram callback query
          const botToken = TG_BOT_TOKEN;
          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: cq.id,
                text: '✅ Response delivered to scanner screen!'
              })
            });

            // Edit original message to show confirmed response
            if (cq.message) {
              await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: cq.message.chat.id,
                  message_id: cq.message.message_id,
                  text: cq.message.text + `\n\n✅ *Status: You replied:*\n> "${replyText}"`,
                  parse_mode: 'Markdown'
                })
              });
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
      const token = data.botToken || TG_BOT_TOKEN;
      const chat = data.chatId || TG_CHAT_ID;

      if (!token || !chat) {
        return sendJson(res, 400, { error: 'Please provide both Bot Token and Chat ID.' });
      }

      const testMsg = 
        `🎉 *Smart Vehicle QR Portal Connected!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Your Telegram Bot is successfully configured.\n` +
        `🚗 Vehicle alerts will arrive here immediately when someone scans your decal.\n` +
        `🕒 Test timestamp: ${new Date().toLocaleString()}`;

      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text: testMsg,
          parse_mode: 'Markdown'
        })
      });
      const result = await resp.json();
      if (!result.ok) {
        return sendJson(res, 400, { error: result.description });
      }

      // If user provided tokens in test call, store them for current session
      if (data.botToken) TG_BOT_TOKEN = data.botToken;
      if (data.chatId) TG_CHAT_ID = data.chatId;

      return sendJson(res, 200, { success: true, message: 'Test message sent successfully!' });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // -------------------------------------------------------------
  // Static File Serving
  // -------------------------------------------------------------
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚗 Smart Vehicle QR Decal Portal is Running!`);
  console.log(`👉 Open Studio:  http://localhost:${PORT}`);
  console.log(`👉 Scanner View: http://localhost:${PORT}/scanner-portal.html`);
  console.log(`=================================================\n`);
});
