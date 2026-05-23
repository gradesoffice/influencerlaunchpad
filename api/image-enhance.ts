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
      // Check if user has credits
      const { data: creditRow } = await (db.from('image_credits') as any).select('credits').eq('user_id', user.id).single();
      const credits = creditRow?.credits ?? 0;
      if (credits <= 0) {
        return res.status(403).json({ error: 'Kuota harian habis. Beli credit tambahan.', code: 'CREDIT_LIMIT', usedToday, freeDaily });
      }
      // Deduct 1 credit
      await (db.from('image_credits') as any).update({ credits: credits - 1 }).eq('user_id', user.id);
    }

    const { hook, imageBase64, style } = req.body;
    if (!hook || !imageBase64) return res.status(400).json({ error: 'Hook dan gambar diperlukan' });

    const apiKey = process.env.AI_GATEWAY_API_KEY!;
    const baseURL = process.env.AI_GATEWAY_BASE_URL || 'https://openrouter.ai/api/v1';

    // Call Gemini 3.1 Flash Image via OpenRouter
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` }
              },
              {
                type: 'text',
                text: `Edit this photo to make it look like a professional Instagram story post. Style: ${style || 'modern, clean, aesthetic'}. Add the following hook text as an overlay on the image in a visually appealing way (bold, readable, contrasting): "${hook}". Make it look like a high-quality social media content piece ready to post. Keep the original photo as the background but enhance it with professional editing (better colors, slight vignette, modern feel). The text should be prominent and eye-catching.`
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      console.error('[image-enhance] API error:', err);
      return res.status(400).json({ error: err?.error?.message || 'Gagal generate gambar' });
    }

    const data = await response.json();
    
    // Extract image from response
    const content = data.choices?.[0]?.message?.content;
    let outputImage = null;

    if (Array.isArray(content)) {
      const imgPart = content.find((c: any) => c.type === 'image_url');
      if (imgPart) outputImage = imgPart.image_url?.url;
    } else if (typeof content === 'string' && content.includes('data:image')) {
      outputImage = content;
    }

    if (!outputImage) {
      return res.status(400).json({ error: 'AI tidak menghasilkan gambar. Coba lagi.' });
    }

    // Log usage
    await db.from('usage_logs').insert({ user_id: user.id, action: 'image_enhance' });

    return res.status(200).json({ image: outputImage, usedToday: usedToday + 1, freeDaily });
  } catch (e) {
    console.error('[image-enhance]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' });
  }
}
