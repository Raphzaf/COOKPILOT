import type { PlanId, Subscription } from "@/lib/domain/types";

/**
 * Single source of truth for plan limits. Prices are display values; the amounts actually
 * charged come from the Stripe prices referenced by STRIPE_PRICE_PRO_MONTHLY / _ANNUAL.
 */
export interface PlanLimits {
  /** null = unlimited */
  maxDevices: number | null;
  aiGenerationsPerMonth: number;
  /** Hard ceiling on chat messages per day (cost control, independent of generations). */
  chefMessagesPerDay: number;
  maxFavorites: number | null;
  /** null = full history */
  historyDays: number | null;
  personalizedRecipes: boolean;
  advancedCookingMode: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    maxDevices: 1,
    aiGenerationsPerMonth: 5,
    chefMessagesPerDay: 15,
    maxFavorites: 10,
    historyDays: 30,
    personalizedRecipes: false,
    advancedCookingMode: false,
  },
  pro: {
    maxDevices: null,
    aiGenerationsPerMonth: 60,
    chefMessagesPerDay: 150,
    maxFavorites: null,
    historyDays: null,
    personalizedRecipes: true,
    advancedCookingMode: true,
  },
};

export const PRICING = {
  currency: "EUR",
  proMonthly: 3.99,
  proAnnual: 29.99,
} as const;

/** Percentage saved by paying annually instead of twelve monthly payments. */
export function annualSavingsPercent(): number {
  const yearlyAtMonthly = PRICING.proMonthly * 12;
  return Math.round(((yearlyAtMonthly - PRICING.proAnnual) / yearlyAtMonthly) * 100);
}

const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Resolves the plan a user is entitled to right now.
 * A cancelled subscription keeps Pro until the end of the paid period.
 */
export function resolvePlan(subscription: Subscription | null, now = new Date()): PlanId {
  if (!subscription || subscription.plan !== "pro") return "free";
  if (ENTITLED_STATUSES.has(subscription.status)) return "pro";
  if (
    subscription.status === "canceled" &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() > now.getTime()
  ) {
    return "pro";
  }
  return "free";
}

export function getLimits(plan: PlanId): PlanLimits {
  return PLANS[plan];
}

export interface QuotaState {
  plan: PlanId;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export function canAddDevice(plan: PlanId, currentCount: number): boolean {
  const max = PLANS[plan].maxDevices;
  return max == null || currentCount < max;
}

export function canAddFavorite(plan: PlanId, currentCount: number): boolean {
  const max = PLANS[plan].maxFavorites;
  return max == null || currentCount < max;
}

export function computeQuota(plan: PlanId, used: number, resetsAt: Date): QuotaState {
  const limit = PLANS[plan].aiGenerationsPerMonth;
  return { plan, limit, used, remaining: Math.max(0, limit - used), resetsAt: resetsAt.toISOString() };
}
