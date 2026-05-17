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

    // Check plan
    const { data: planRow } = await db.from('user_plans').select('plan, expires_at').eq('user_id', user.id).single();
    let plan = 'free';
    if (planRow && (!planRow.expires_at || new Date(planRow.expires_at) > new Date())) plan = planRow.plan;
    const maxWeeks = plan === 'free' ? 1 : plan === 'pro' ? 26 : 52;

    const input = req.body;
    if (input.weekNumber > maxWeeks) {
      return res.status(403).json({ error: `Plan kamu hanya sampai minggu ${maxWeeks}. Upgrade untuk akses lebih.`, code: 'PLAN_LIMIT' });
    }

    // Rate limit
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyLimit = plan === 'free' ? 3 : plan === 'pro' ? 50 : 200;
    const { count } = await db.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('action', 'generate_week').gte('created_at', today.toISOString());
    if ((count ?? 0) >= dailyLimit) {
      return res.status(429).json({ error: 'Batas generate harian tercapai.', code: 'RATE_LIMIT' });
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY!;
    const gateway = createOpenAICompatible({ name: 'ai-gateway', baseURL: process.env.AI_GATEWAY_BASE_URL || 'https://openrouter.ai/api/v1', headers: { Authorization: `Bearer ${apiKey}` } });
    const model = gateway('google/gemini-3-flash-preview');

    const startDay = (input.weekNumber - 1) * 7 + 1;
    const endDay = startDay + 6;

    const { object } = await generateObject({
      model, output: 'no-schema', temperature: 0.25, maxOutputTokens: Math.min(14000, 3000 + input.postsPerDay * 900),
      system: 'Kamu adalah content strategist influencer. Jawab HANYA JSON valid tanpa markdown. Bahasa Indonesia.',
      prompt: `Breakdown konten Minggu ${input.weekNumber} (Hari ${startDay}-${endDay}).\nPhase: ${input.phaseName}\nTema: ${input.weeklyTheme}\nNiche: ${input.niche}\nPlatform: ${input.platform}\nAudiens: ${input.audience}\nPesan: ${input.message}\nKonversi: ${input.conversionGoal}\nBrand: ${input.brandSummary}\n${input.feedbackInsights ? `Insights: ${input.feedbackInsights}` : ''}\n\n7 hari, ${input.postsPerDay} konten/hari. JSON: {"weekNumber":${input.weekNumber},"theme":"","focus":"","days":[{"day":${startDay},"dayLabel":"","dailyGoal":"","posts":[{"slot":"","format":"","hook":"","caption":"","cta":"","hashtags":[""],"visualIdea":"","conversionTie":""}]}]}`,
    });

    const result = object;

    // Save
    if (input.strategyId) {
      await db.from('weeks').upsert({ strategy_id: input.strategyId, user_id: user.id, week_number: input.weekNumber, data: result }, { onConflict: 'strategy_id,week_number' });
    }
    await db.from('usage_logs').insert({ user_id: user.id, action: 'generate_week' });

    return res.status(200).json(result);
  } catch (e) {
    console.error('[week]', e);
    return res.status(400).json({ error: e instanceof Error ? e.message : 'error' });
  }
}
