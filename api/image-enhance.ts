import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getDb(token?: string) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const db = getDb(token);
    const { data: { user } } = await db.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check plan - business only
    const { data: planRow } = await db.from('user_plans').select('plan, expires_at').eq('user_id', user.id).single();
    let plan = 'free';
    if (planRow && (!planRow.expires_at || new Date(planRow.expires_at) > new Date())) plan = planRow.plan;
    if (plan !== 'business') return res.status(403).json({ error: 'Fitur ini khusus Business plan', code: 'PLAN_LIMIT' });

    // Check daily limit (3 free/day)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await db.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('action', 'image_enhance').gte('created_at', today.toISOString());
    const freeDaily = 3;
    const usedToday = todayCount ?? 0;

    if (usedToday >= freeDaily) {
      const { data: creditRow } = await (db.from('image_credits') as any).select('credits').eq('user_id', user.id).single();
      const credits = creditRow?.credits ?? 0;
      if (credits <= 0) {
        return res.status(403).json({ error: 'Kuota harian habis. Beli credit tambahan.', code: 'CREDIT_LIMIT', usedToday, freeDaily });
      }
      await (db.from('image_credits') as any).update({ credits: credits - 1 }).eq('user_id', user.id);
    }

    const { hook, imageBase64, size } = req.body;
    if (!hook || !imageBase64) return res.status(400).json({ error: 'Hook dan gambar diperlukan' });
    if (imageBase64 === 'logged') {
      await db.from('usage_logs').insert({ user_id: user.id, action: 'image_enhance' });
      return res.status(200).json({ success: true, usedToday: usedToday + 1, freeDaily });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(500).json({ error: 'OpenAI API key not configured. Tambahkan OPENAI_API_KEY di Vercel env.' });

    const imageSize = size === '1024x1024' ? '1024x1024' : '1024x1792';

    // Use GPT Image 1 (gpt-image-1) to generate aesthetic IG story with hook
    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `Create a stunning, professional Instagram ${imageSize === '1024x1792' ? 'story (portrait)' : 'feed post (square)'} image. Design a beautiful social media content piece with bold, modern typography displaying this hook text: "${hook}". Style: aesthetic, clean gradients, modern design, eye-catching colors. The text "${hook}" must be the focal point - large, bold, readable. Add subtle decorative elements. Make it look like premium social media content from a top influencer. No faces, no photos - pure graphic design with text.`,
        n: 1,
        size: imageSize,
        quality: 'medium',
      }),
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.json().catch(() => null);
      console.error('[image-enhance] DALL-E error:', JSON.stringify(err));
      return res.status(400).json({ error: err?.error?.message || 'Gagal generate gambar. Coba lagi.' });
    }

    const dalleData = await dalleRes.json();
    const imageUrl = dalleData.data?.[0]?.url;
    if (!imageUrl) return res.status(400).json({ error: 'Tidak ada gambar dihasilkan' });

    // Log usage
    await db.from('usage_logs').insert({ user_id: user.id, action: 'image_enhance' });

    return res.status(200).json({ image: imageUrl, usedToday: usedToday + 1, freeDaily });
  } catch (e) {
    console.error('[image-enhance]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' });
  }
}
