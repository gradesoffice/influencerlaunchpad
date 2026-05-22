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

    // Check plan limits
    const { data: planRow } = await db.from('user_plans').select('plan, expires_at').eq('user_id', user.id).single();
    let plan = 'free';
    if (planRow && (!planRow.expires_at || new Date(planRow.expires_at) > new Date())) {
      plan = planRow.plan;
    }
    const maxStrategies = plan === 'free' ? 1 : 999;
    const { count } = await db.from('strategies').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if ((count ?? 0) >= maxStrategies) {
      return res.status(403).json({ error: 'Upgrade plan untuk membuat strategi baru', code: 'PLAN_LIMIT' });
    }

    // Rate limit
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyLimit = plan === 'free' ? 3 : plan === 'pro' ? 50 : 200;
    const { count: usageCount } = await db.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('action', 'generate_strategy').gte('created_at', today.toISOString());
    if ((usageCount ?? 0) >= dailyLimit) {
      return res.status(429).json({ error: 'Batas generate harian tercapai.', code: 'RATE_LIMIT' });
    }

    const input = req.body;
    const apiKey = process.env.AI_GATEWAY_API_KEY!;
    const gateway = createOpenAICompatible({ name: 'ai-gateway', baseURL: process.env.AI_GATEWAY_BASE_URL || 'https://openrouter.ai/api/v1', headers: { Authorization: `Bearer ${apiKey}` } });
    const model = gateway('google/gemini-3-flash-preview');

    const { object } = await generateObject({
      model, output: 'no-schema', temperature: 0.3, maxOutputTokens: 6000,
      system: 'Kamu adalah ahli strategi influencer & personal branding. Jawab HANYA JSON valid tanpa markdown. Bahasa Indonesia natural dan praktis.',
      prompt: `Buat strategi 90 hari menuju influencer.\nNiche: ${input.niche}\nPlatform: ${input.platform}\nAudiens: ${input.audience}\nPesan: ${input.message}\nKonversi: ${input.conversionGoal}\nTone: ${input.tone || 'tentukan'}\nKonten/hari: ${input.postsPerDay}\n\nBuat brand identity + 3 phase + 10-15 pain points SPESIFIK audiens target (bukan pain points content creator, tapi pain points AUDIENS yang akan dijadikan bahan konten). JSON: {"brand":{"persona":"","voice":"","visualStyle":"","tagline":"","contentPillars":[{"name":"","description":""}],"hashtags":[""],"dosAndDonts":{"dos":[""],"donts":[""]},"painPoints":[""]},"phases":[{"name":"","days":"","objective":"","kpis":[""],"weeklyThemes":[""]}]}`,
    });

    const result = object as Record<string, unknown>;

    // Save
    const { data: saved } = await db.from('strategies').insert({
      user_id: user.id, niche: input.niche, platform: input.platform, audience: input.audience,
      message: input.message, conversion_goal: input.conversionGoal, tone: input.tone || '',
      posts_per_day: input.postsPerDay, brand: result.brand, phases: result.phases,
    }).select('id').single();

    await db.from('usage_logs').insert({ user_id: user.id, action: 'generate_strategy' });

    return res.status(200).json({ ...result, strategyId: saved?.id ?? null });
  } catch (e) {
    console.error('[strategy]', e);
    return res.status(400).json({ error: e instanceof Error ? e.message : 'error' });
  }
}
