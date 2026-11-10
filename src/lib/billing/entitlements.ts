import "server-only";
import type { DataStore } from "@/lib/data/store";
import type { PlanId, Subscription } from "@/lib/domain/types";
import { startOfMonthUtc, startOfNextMonthUtc } from "@/lib/utils";
import { computeQuota, getLimits, resolvePlan, type PlanLimits, type QuotaState } from "./plans";

export interface Entitlements {
  plan: PlanId;
  limits: PlanLimits;
  subscription: Subscription | null;
}

export async function getEntitlements(store: DataStore, userId: string): Promise<Entitlements> {
  const subscription = await store.getSubscription(userId);
  const plan = resolvePlan(subscription);
  return { plan, limits: getLimits(plan), subscription };
}

/** Monthly AI generation quota, computed from the append-only usage log. */
export async function getQuota(store: DataStore, userId: string, plan: PlanId, now = new Date()): Promise<QuotaState> {
  const used = await store.countUsage(userId, "recipe_generation", startOfMonthUtc(now).toISOString());
  return computeQuota(plan, used, startOfNextMonthUtc(now));
}

/** ISO date before which history is hidden on this plan (null = full history). */
export function historyCutoff(limits: PlanLimits, now = new Date()): string | null {
  return limits.historyDays == null ? null : new Date(now.getTime() - limits.historyDays * 86400_000).toISOString();
}
