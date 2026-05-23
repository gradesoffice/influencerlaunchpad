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
      await (db.from('image_credits') as any).update({ credits: credits - 1 }).eq('user_id', user.id);
    }

    const { hook, imageBase64, style } = req.body;
    if (!hook || !imageBase64) return res.status(400).json({ error: 'Hook dan gambar diperlukan' });

    const apiKey = process.env.AI_GATEWAY_API_KEY!;
    const baseURL = process.env.AI_GATEWAY_BASE_URL || 'https://openrouter.ai/api/v1';

    // Use Gemini 2.0 Flash (supports image output via OpenRouter)
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mibu27-influencerlaunchpad.vercel.app',
        'X-Title': 'Influencer Launchpad'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
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
                text: `You are a professional social media content designer. Take this photo and describe how to create a stunning Instagram story from it. Include: 1) Color grading suggestions 2) Where to place the hook text "${hook}" 3) Font style recommendation 4) Overall composition. Then provide the final hook text formatted for overlay: "${hook}". Respond in JSON: {"design":{"colorGrade":"","textPlacement":"","fontStyle":"","composition":""},"hookText":"${hook}","caption":"A ready-to-post description"}`
              }
            ]
          }
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Unknown API error' } }));
      console.error('[image-enhance] API error:', JSON.stringify(err));
      return res.status(400).json({ error: err?.error?.message || 'Gagal generate. Coba lagi.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let designResult = null;
    try {
      designResult = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      designResult = { design: { colorGrade: 'warm tones', textPlacement: 'center', fontStyle: 'bold sans-serif', composition: 'full bleed with text overlay' }, hookText: hook, caption: content || '' };
    }

    // Log usage
    await db.from('usage_logs').insert({ user_id: user.id, action: 'image_enhance' });

    // Return design instructions + original image (client-side will render with Canvas)
    return res.status(200).json({ 
      design: designResult?.design || {},
      hookText: hook,
      originalImage: imageBase64,
      usedToday: usedToday + 1, 
      freeDaily,
      success: true
    });
  } catch (e) {
    console.error('[image-enhance]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' });
  }
}
