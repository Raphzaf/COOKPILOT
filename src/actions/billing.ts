"use server";

import { z } from "zod";
import { setDemoPlan, setDemoRole } from "@/lib/data/demo-store";
import { getAppUrl, isDemoAdminEnabled, isDemoMode } from "@/lib/env";
import { getStripe, priceIdFor } from "@/lib/billing/stripe";
import { ActionError, userAction, type ActionResult } from "./helpers";

const localeSchema = z.enum(["en", "fr"]);

export async function startCheckoutAction(intervalInput: string, localeInput: string): Promise<ActionResult<{ url: string }>> {
  return userAction(
    async ({ user, store }) => {
      const interval = z.enum(["month", "year"]).parse(intervalInput);
      const locale = localeSchema.parse(localeInput);
      if (user.isDemo) throw new ActionError("DEMO_UNAVAILABLE");
      const stripe = getStripe();
      const price = priceIdFor(interval);
      if (!stripe || !price) throw new ActionError("NOT_CONFIGURED");
      const existing = await store.getSubscription(user.id);
      const base = `${getAppUrl()}/${locale}/dashboard/subscription`;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        ...(existing?.stripeCustomerId ? { customer: existing.stripeCustomerId } : { customer_email: user.email }),
        client_reference_id: user.id,
        metadata: { user_id: user.id },
        subscription_data: { metadata: { user_id: user.id } },
        allow_promotion_codes: true,
        locale,
        success_url: `${base}?checkout=success`,
        cancel_url: `${base}?checkout=cancelled`,
      });
      if (!session.url) throw new ActionError("UNKNOWN");
      return { url: session.url };
    },
    { revalidate: false },
  );
}

export async function openBillingPortalAction(localeInput: string): Promise<ActionResult<{ url: string }>> {
  return userAction(
    async ({ user, store }) => {
      const locale = localeSchema.parse(localeInput);
      if (user.isDemo) throw new ActionError("DEMO_UNAVAILABLE");
      const stripe = getStripe();
      if (!stripe) throw new ActionError("NOT_CONFIGURED");
      const subscription = await store.getSubscription(user.id);
      if (!subscription?.stripeCustomerId) throw new ActionError("NOT_FOUND");
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${getAppUrl()}/${locale}/dashboard/subscription`,
        locale,
      });
      return { url: session.url };
    },
    { revalidate: false },
  );
}

/** Demo mode only: preview the Free / Pro experience without Stripe. */
export async function setDemoPlanAction(plan: string): Promise<ActionResult> {
  return userAction(async ({ user }) => {
    if (!isDemoMode() || !user.isDemo) throw new ActionError("DEMO_ONLY");
    setDemoPlan(user.id, z.enum(["free", "pro"]).parse(plan));
    return null;
  });
}

/** Demo mode only: switch between the demo user and demo admin personas. */
export async function setDemoRoleAction(role: string): Promise<ActionResult> {
  return userAction(async ({ user }) => {
    if (!isDemoMode() || !user.isDemo) throw new ActionError("DEMO_ONLY");
    if (!isDemoAdminEnabled()) throw new ActionError("FORBIDDEN");
    setDemoRole(user.id, z.enum(["user", "admin"]).parse(role));
    return null;
  });
}
