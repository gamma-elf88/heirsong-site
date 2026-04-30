// /api/subscribe.js — Vercel serverless function
// Receives email from heirsong.fr signup form, adds contact to Brevo list ID 3

export default async function handler(req, res) {
  // CORS headers (allow heirsong.fr to call this)
  res.setHeader('Access-Control-Allow-Origin', 'https://heirsong.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, petName, dateOfLoss } = req.body || {};

  // Basic email validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: email,
        listIds: [3],
        attributes: {
          PET_NAME: petName || '',
          DATE_OF_LOSS: dateOfLoss || '',
          SOURCE: 'heirsong.fr — A Gentle 7 Days',
        },
        updateEnabled: true,
      }),
    });

    if (brevoResponse.ok || brevoResponse.status === 204) {
      return res.status(200).json({ success: true });
    }

    // Brevo returns 400 for "contact already exists" — treat as success so we don't reveal list membership
    if (brevoResponse.status === 400) {
      const data = await brevoResponse.json();
      if (data.code === 'duplicate_parameter') {
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: data.message || 'Could not subscribe.' });
    }

    const errorText = await brevoResponse.text();
    console.error('Brevo error:', brevoResponse.status, errorText);
    return res.status(500).json({ error: 'Could not subscribe right now. Please try again in a moment.' });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Could not subscribe right now. Please try again in a moment.' });
  }
}
