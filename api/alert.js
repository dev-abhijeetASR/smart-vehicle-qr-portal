// api/alert.js - Vercel Serverless Function to dispatch Telegram alerts

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vehicle, reason, note, senderPhone, botToken, chatId } = req.body || {};
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chat) {
    return res.status(400).json({ error: 'Missing Telegram Bot credentials.' });
  }

  const alertId = 'ALT_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const text = 
    `🚨 *SMART VEHICLE ALERT: ${vehicle || 'UNREGISTERED'}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ *Reason:* ${reason || 'Vehicle blocking my way'}\n` +
    `📝 *Note:* ${note || 'None'}\n` +
    `📞 *Finder Contact:* ${senderPhone || 'Not provided'}\n` +
    `🕒 *Time:* ${time}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔒 Sent via Smart Vehicle Privacy Portal`;

  try {
    const tgResp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const result = await tgResp.json();
    if (!result.ok) {
      return res.status(400).json({ error: result.description });
    }

    return res.status(200).json({
      success: true,
      alertId: alertId,
      telegramDispatched: true
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
