// api/test-bot.js - Vercel Serverless Function to test Telegram connection

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { botToken, chatId } = req.body || {};
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chat) {
    return res.status(400).json({ error: 'Please provide both Bot Token and Chat ID.' });
  }

  const testMsg = 
    `🎉 *Smart Vehicle QR Portal Connected!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ Your Telegram Bot is successfully configured.\n` +
    `🚗 Vehicle alerts will arrive here immediately when someone scans your decal.\n` +
    `🕒 Timestamp: ${new Date().toLocaleString()}`;

  try {
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
      return res.status(400).json({ error: result.description });
    }
    return res.status(200).json({ success: true, message: 'Test message delivered!' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
