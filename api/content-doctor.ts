import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject } from 'ai';
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

    const { data: planRow } = await db.from('user_plans').select('plan, expires_at').eq('user_id', user.id).single();
    let plan = 'free';
    if (planRow && (!planRow.expires_at || new Date(planRow.expires_at) > new Date())) plan = planRow.plan;
    if (plan === 'free') return res.status(403).json({ error: 'Upgrade ke Pro', code: 'PLAN_LIMIT' });

    const { caption, platform, niche, metrics } = req.body;
    if (!caption) return res.status(400).json({ error: 'Caption required' });

    const apiKey = process.env.AI_GATEWAY_API_KEY!;
    const gateway = createOpenAICompatible({ name: 'ai-gateway', baseURL: process.env.AI_GATEWAY_BASE_URL || 'https://openrouter.ai/api/v1', headers: { Authorization: `Bearer ${apiKey}` } });
    const model = gateway('google/gemini-3-flash-preview');

    const { object } = await generateObject({
      model, output: 'no-schema', temperature: 0.3, maxOutputTokens: 2000,
      system: 'Kamu content doctor. Diagnosa kenapa konten underperform dan kasih fix. Jawab HANYA JSON valid. Bahasa Indonesia singkat.',
      prompt: `Diagnosa konten ini:\nCaption: "${caption}"\nPlatform: ${platform || "Instagram"}\nNiche: ${niche || "umum"}\n${metrics ? `Performa: ${metrics}` : ""}\n\nAnalisis: kenapa flop, apa yang salah, dan kasih 3 versi perbaikan. JSON: {"diagnosis":"","issues":[""],"fixes":[{"version":1,"hook":"","caption":"","cta":"","why":""}]}`,
    });

    return res.status(200).json(object);
  } catch (e) {
    console.error('[content-doctor]', e);
    return res.status(400).json({ error: e instanceof Error ? e.message : 'error' });
  }
}
