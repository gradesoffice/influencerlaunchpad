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
    if (imageBase64 === 'logged' || imageBase64 === 'placeholder') {
      await db.from('usage_logs').insert({ user_id: user.id, action: 'image_enhance' });
      return res.status(200).json({ success: true, usedToday: usedToday + 1, freeDaily });
    }

    const stabilityKey = process.env.STABILITY_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    let imageUrl: string | null = null;

    // Stability AI - Image to Image (enhance whole photo, keep subject intact)
    if (stabilityKey) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'input.png');
        formData.append('prompt', `Enhance this photo to look like a premium Instagram story. Improve colors, lighting, contrast. Make it vibrant and aesthetic. Keep the subject/product EXACTLY the same but make the overall image look professional and eye-catching. Add subtle warm tones, slight vignette, modern social media aesthetic. The image should look like it was shot by a professional photographer for social media.`);
        formData.append('strength', '0.35'); // Low strength = keep original mostly intact
        formData.append('output_format', 'png');

        const stabRes = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stabilityKey}`, 'Accept': 'image/*' },
          body: formData,
        });

        if (stabRes.ok) {
          const imgBuffer = Buffer.from(await stabRes.arrayBuffer());
          imageUrl = `data:image/png;base64,${imgBuffer.toString('base64')}`;
        } else {
          const errText = await stabRes.text().catch(() => '');
          console.error('[image-enhance] Stability error:', stabRes.status, errText);
        }
      } catch (e) {
        console.error('[image-enhance] Stability exception:', e);
      }
    }

    // Fallback to OpenAI if Stability fails
    if (!imageUrl && openaiKey) {
      const imageSize = size === '1024x1024' ? '1024x1024' : '1024x1792';
      const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: `Create a stunning professional Instagram ${imageSize === '1024x1792' ? 'story (portrait 9:16)' : 'feed post (square 1:1)'} image with bold modern typography: "${hook}". Aesthetic, vibrant colors, clean design. Text must be large, bold, readable. Premium social media content.`,
          n: 1,
          size: imageSize,
          quality: 'medium',
        }),
      });
      if (dalleRes.ok) {
        const data = await dalleRes.json();
        imageUrl = data.data?.[0]?.url || null;
      } else {
        const err = await dalleRes.json().catch(() => null);
        console.error('[image-enhance] OpenAI fallback error:', JSON.stringify(err));
      }
    }

    if (!imageUrl) return res.status(400).json({ error: 'Gagal generate gambar. Coba lagi.' });

    await db.from('usage_logs').insert({ user_id: user.id, action: 'image_enhance' });
    return res.status(200).json({ image: imageUrl, usedToday: usedToday + 1, freeDaily });
  } catch (e) {
    console.error('[image-enhance]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' });
  }
}
