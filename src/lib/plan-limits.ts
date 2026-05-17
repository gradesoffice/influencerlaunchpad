export type PlanType = "free" | "pro" | "business";

export const PLAN_LIMITS = {
  free: {
    maxStrategies: 1,
    maxWeeksPerStrategy: 1,
    analytics: false,
    feedbackTracking: false,
    maxBrands: 1,
    dailyGenerateLimit: 3, // max 3 AI calls per day
  },
  pro: {
    maxStrategies: 999,
    maxWeeksPerStrategy: 26, // 6 months
    analytics: true,
    feedbackTracking: true,
    maxBrands: 1,
    dailyGenerateLimit: 50,
  },
  business: {
    maxStrategies: 999,
    maxWeeksPerStrategy: 52, // 1 year
    analytics: true,
    feedbackTracking: true,
    maxBrands: 5,
    dailyGenerateLimit: 200,
  },
} as const;

export function getPlanLimits(plan: PlanType) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function getPlanLabel(plan: PlanType): string {
  switch (plan) {
    case "pro": return "Pro";
    case "business": return "Business";
    default: return "Free";
  }
}
