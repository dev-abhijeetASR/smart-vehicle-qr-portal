// api/telegram-webhook.js - Vercel Serverless Function to receive Telegram webhooks

const RESPONSE_LABELS = {
  'coming_2m': '🏃 On my way! Arriving in 2 minutes.',
  'coming_5m': '🚗 Coming in 5 minutes to move vehicle.',
  'parked_ok': '🅿️ Vehicle is parked with permission.',
  'call_back': '📞 Calling your number shortly.'
};

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
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body || {};
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const [prefix, alertId, action] = data.split(':');
      const replyText = RESPONSE_LABELS[action] || 'Owner responded!';
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (botToken) {
        // Acknowledge tap
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: cq.id,
            text: '✅ Response registered: ' + replyText
          })
        }).catch(() => {});

        // Edit message
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
          }).catch(() => {});
        }
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: true });
  }
}
