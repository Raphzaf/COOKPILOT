import "server-only";
import Stripe from "stripe";
import type { BillingInterval, Subscription, SubscriptionStatus } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";

let client: Stripe | null = null;

/** Stripe SDK instance, or null when STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe | null {
  const key = serverEnv.stripeSecretKey;
  if (!key) return null;
  client ??= new Stripe(key, { appInfo: { name: "CookPilot" }, maxNetworkRetries: 2 });
  return client;
}

export function priceIdFor(interval: BillingInterval): string | undefined {
  return interval === "year" ? serverEnv.stripePriceAnnual : serverEnv.stripePriceMonthly;
}

export function intervalForPrice(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null;
  if (priceId === serverEnv.stripePriceAnnual) return "year";
  if (priceId === serverEnv.stripePriceMonthly) return "month";
  return null;
}

/** Minimal shape of a Stripe subscription that the sync logic depends on (keeps it unit-testable). */
export interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer: string | { id: string };
  cancel_at_period_end?: boolean | null;
  current_period_end?: number | null;
  metadata?: Record<string, string> | null;
  items?: { data: { current_period_end?: number | null; price?: { id?: string; recurring?: { interval?: string } | null } | null }[] };
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  paused: "canceled",
};

/** Translates a Stripe subscription into CookPilot's subscription record. */
export function subscriptionFromStripe(sub: StripeSubscriptionLike, userId: string): Subscription {
  const item = sub.items?.data[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null;
  const recurring = item?.price?.recurring?.interval;
  const interval: BillingInterval | null = intervalForPrice(item?.price?.id) ?? (recurring === "year" ? "year" : recurring === "month" ? "month" : null);
  return {
    userId,
    plan: "pro",
    interval,
    status: STATUS_MAP[sub.status] ?? "none",
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
  };
}
