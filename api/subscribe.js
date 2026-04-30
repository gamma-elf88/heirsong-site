// /api/subscribe.js — Vercel serverless function
// Receives signup from any HeirSong page form and adds contact to Brevo list ID 3.
// Per editorial design (mentor-panel review 2026-04-30): only email + source captured
// at first contact. Pet name and date-of-loss are collected later in the welcome
// sequence, after value has been delivered.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://heirsong.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, source } = req.body || {};

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
          SOURCE: source || 'heirsong.fr',
        },
        updateEnabled: true,
      }),
    });

    if (brevoResponse.ok || brevoResponse.status === 204) {
      return res.status(200).json({ success: true });
    }

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
