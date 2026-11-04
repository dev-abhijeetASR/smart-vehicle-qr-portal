// api/alert.js - Vercel Serverless Function to dispatch Telegram alerts

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vehicle, reason, note, senderPhone, botToken, chatId } = req.body || {};
  const token = (botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chat = (chatId || process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!token || !chat) {
    return res.status(400).json({ error: 'Missing Telegram Bot credentials.' });
  }

  const safeVehicle = (vehicle || process.env.DEFAULT_VEHICLE || 'UNREGISTERED').trim().slice(0, 32);
  const safeReason = (reason || 'Vehicle blocking my way').trim().slice(0, 140);
  const safeNote = (note || '').trim().slice(0, 500);
  const safePhone = (senderPhone || '').trim().slice(0, 30);

  const alertId = 'ALT_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const htmlText = 
    `🚨 <b>SMART VEHICLE ALERT: ${escapeHtml(safeVehicle)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>Reason:</b> ${escapeHtml(safeReason)}\n` +
    `📝 <b>Note:</b> ${escapeHtml(safeNote || 'None')}\n` +
    `📞 <b>Finder Contact:</b> ${escapeHtml(safePhone || 'Not provided')}\n` +
    `🕒 <b>Time:</b> ${escapeHtml(time)}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔒 Sent via Smart Vehicle Privacy Portal`;

  const inlineKeyboard = [
    [
      { text: '🏃 Coming in 2 min', callback_data: `ans:${alertId}:coming_2m` },
      { text: '🚗 Coming in 5 min', callback_data: `ans:${alertId}:coming_5m` }
    ],
    [
      { text: '🅿️ Parked legally', callback_data: `ans:${alertId}:parked_ok` },
      { text: '📞 Will call you', callback_data: `ans:${alertId}:call_back` }
    ]
  ];

  try {
    const tgResp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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

    const result = await tgResp.json();
    if (!result.ok) {
      return res.status(400).json({ error: result.description || 'Telegram API rejected message' });
    }

    return res.status(200).json({
      success: true,
      alertId: alertId,
      telegramDispatched: true
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Network error reaching Telegram API' });
  }
}
