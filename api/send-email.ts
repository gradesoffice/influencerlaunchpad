import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { to, subject, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing to/subject' });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Influencer Launchpad <noreply@resend.dev>',
        to: [to],
        subject,
        html: html || `<p>${subject}</p>`,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(400).json({ error: err.message || 'Email failed' });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (e) {
    console.error('[send-email]', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
