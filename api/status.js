// api/status.js - Vercel Serverless Function to poll alert response status

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query || {};
  if (!id) {
    return res.status(400).json({ error: 'Missing alert ID parameter' });
  }

  // On serverless instances without shared persistent store, return acknowledged status
  return res.status(200).json({
    id: id,
    status: 'delivered',
    response: null,
    responseTime: null,
    serverless: true
  });
}
