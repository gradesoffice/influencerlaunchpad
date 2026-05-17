import { createClient } from "@supabase/supabase-js";
import { getPlanLimits, type PlanType } from "./plan-limits";

function getDb(token?: string) {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined);
}

export async function getUserPlanAndLimits(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const db = getDb(token);

  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;

  // Get plan
  const { data: planRow } = await db
    .from("user_plans")
    .select("plan, expires_at")
    .eq("user_id", user.id)
    .single();

  let plan: PlanType = "free";
  if (planRow) {
    // Check if plan expired
    if (planRow.expires_at && new Date(planRow.expires_at) < new Date()) {
      plan = "free"; // expired, downgrade
    } else {
      plan = planRow.plan as PlanType;
    }
  }

  const limits = getPlanLimits(plan);

  return { user, plan, limits, db, error: null } as const;
}

export async function checkDailyRateLimit(db: ReturnType<typeof getDb>, userId: string, action: string, limit: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", today.toISOString());

  return (count ?? 0) < limit;
}

export async function logUsage(db: ReturnType<typeof getDb>, userId: string, action: string) {
  await db.from("usage_logs").insert({ user_id: userId, action });
}
