import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { order_id, transaction_status, fraud_status } = req.body;
    const isSuccess = (transaction_status === 'capture' && fraud_status === 'accept') || transaction_status === 'settlement';
    if (!isSuccess) return res.status(200).json({ status: 'noted' });

    const parts = order_id.split('-');
    const planRaw = parts[1]?.toLowerCase();
    const plan = planRaw === 'pro' ? 'pro' : planRaw === 'business' ? 'business' : null;
    if (!plan) return res.status(200).json({ status: 'invalid order' });

    const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data: planRow } = await db.from('user_plans').select('user_id').eq('midtrans_order_id', order_id).single();
    if (!planRow) return res.status(200).json({ status: 'order not found' });

    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
    await db.from('user_plans').update({ plan, started_at: new Date().toISOString(), expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() }).eq('user_id', planRow.user_id);

    return res.status(200).json({ status: 'ok' });
  } catch (e) {
    return res.status(500).json({ error: 'error' });
  }
}
