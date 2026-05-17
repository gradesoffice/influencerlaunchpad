import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getDb(token?: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined);
}

const PLAN_PRICES = { pro: { price: 99000, name: 'Pro Plan' }, business: { price: 249000, name: 'Business Plan' } } as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const db = getDb(token);
    const { data: { user } } = await db.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { plan } = req.body;
    if (plan !== 'pro' && plan !== 'business') return res.status(400).json({ error: 'Invalid plan' });
    const planInfo = PLAN_PRICES[plan];

    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const orderId = `INF-${plan.toUpperCase()}-${user.id.substring(0, 8)}-${Date.now()}`;
    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    const midtransRes = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authString}` },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: planInfo.price },
        item_details: [{ id: plan, price: planInfo.price, quantity: 1, name: planInfo.name }],
        customer_details: { email: user.email },
      }),
    });

    if (!midtransRes.ok) return res.status(502).json({ error: 'Payment gateway error' });
    const { token: snapToken } = await midtransRes.json();

    await db.from('user_plans').upsert({ user_id: user.id, midtrans_order_id: orderId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    return res.status(200).json({ token: snapToken, orderId });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'error' });
  }
}
