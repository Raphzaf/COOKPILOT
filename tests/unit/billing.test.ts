import { describe, expect, it } from "vitest";
import { annualSavingsPercent, canAddDevice, canAddFavorite, computeQuota, PLANS, PRICING, resolvePlan } from "@/lib/billing/plans";
import { subscriptionFromStripe } from "@/lib/billing/stripe";
import type { Subscription } from "@/lib/domain/types";

const sub = (patch: Partial<Subscription>): Subscription => ({
  userId: "u1",
  plan: "pro",
  interval: "month",
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  ...patch,
});

describe("plan definition", () => {
  it("matches the published offer", () => {
    expect(PLANS.free).toMatchObject({ maxDevices: 1, aiGenerationsPerMonth: 5, maxFavorites: 10 });
    expect(PLANS.pro).toMatchObject({ maxDevices: null, aiGenerationsPerMonth: 60, maxFavorites: null, historyDays: null });
    expect(PRICING).toMatchObject({ proMonthly: 3.99, proAnnual: 29.99, currency: "EUR" });
    expect(annualSavingsPercent()).toBe(37);
  });
});

describe("entitlements", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  it("is free without a subscription", () => {
    expect(resolvePlan(null, now)).toBe("free");
    expect(resolvePlan(sub({ plan: "free" }), now)).toBe("free");
  });
  it("is pro while active, trialing or in payment grace", () => {
    for (const status of ["active", "trialing", "past_due"] as const) expect(resolvePlan(sub({ status }), now)).toBe("pro");
  });
  it("keeps pro until the end of the paid period after cancellation", () => {
    expect(resolvePlan(sub({ status: "canceled", currentPeriodEnd: "2026-07-01T00:00:00Z" }), now)).toBe("pro");
    expect(resolvePlan(sub({ status: "canceled", currentPeriodEnd: "2026-06-01T00:00:00Z" }), now)).toBe("free");
    expect(resolvePlan(sub({ status: "canceled", currentPeriodEnd: null }), now)).toBe("free");
  });
  it("is free for incomplete payments", () => {
    expect(resolvePlan(sub({ status: "incomplete" }), now)).toBe("free");
    expect(resolvePlan(sub({ status: "none" }), now)).toBe("free");
  });
  it("enforces device and favourite limits", () => {
    expect(canAddDevice("free", 0)).toBe(true);
    expect(canAddDevice("free", 1)).toBe(false);
    expect(canAddDevice("pro", 25)).toBe(true);
    expect(canAddFavorite("free", 9)).toBe(true);
    expect(canAddFavorite("free", 10)).toBe(false);
    expect(canAddFavorite("pro", 500)).toBe(true);
  });
  it("computes the monthly AI quota without going negative", () => {
    const reset = new Date("2026-07-01T00:00:00Z");
    expect(computeQuota("free", 2, reset)).toMatchObject({ limit: 5, used: 2, remaining: 3 });
    expect(computeQuota("free", 9, reset).remaining).toBe(0);
    expect(computeQuota("pro", 10, reset).remaining).toBe(50);
  });
});

describe("Stripe subscription sync", () => {
  it("maps an active subscription (period end on the item, new API shape)", () => {
    const result = subscriptionFromStripe(
      { id: "sub_9", status: "active", customer: "cus_9", cancel_at_period_end: false, items: { data: [{ current_period_end: 1790000000, price: { id: "price_x", recurring: { interval: "year" } } }] } },
      "user-1",
    );
    expect(result).toMatchObject({ userId: "user-1", plan: "pro", status: "active", interval: "year", stripeCustomerId: "cus_9", stripeSubscriptionId: "sub_9" });
    expect(result.currentPeriodEnd).toBe(new Date(1790000000 * 1000).toISOString());
  });
  it("supports the legacy top-level period end and expanded customers", () => {
    const result = subscriptionFromStripe({ id: "s", status: "trialing", customer: { id: "cus_2" }, current_period_end: 1790000000, cancel_at_period_end: true, items: { data: [{ price: { recurring: { interval: "month" } } }] } }, "u");
    expect(result).toMatchObject({ status: "trialing", interval: "month", cancelAtPeriodEnd: true, stripeCustomerId: "cus_2" });
  });
  it("treats unpaid as past_due and expired/paused as cancelled", () => {
    expect(subscriptionFromStripe({ id: "s", status: "unpaid", customer: "c" }, "u").status).toBe("past_due");
    expect(subscriptionFromStripe({ id: "s", status: "incomplete_expired", customer: "c" }, "u").status).toBe("canceled");
    expect(subscriptionFromStripe({ id: "s", status: "something_new", customer: "c" }, "u").status).toBe("none");
  });
});
