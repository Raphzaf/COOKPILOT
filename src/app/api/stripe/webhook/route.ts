import type Stripe from "stripe";
import { track } from "@/lib/analytics/server";
import { getStripe, subscriptionFromStripe } from "@/lib/billing/stripe";
import { getServiceStore } from "@/lib/data";
import { EMAIL_TEMPLATES, sendEmail } from "@/lib/email/resend";
import { isDemoMode, serverEnv } from "@/lib/env";
import { intlLocale } from "@/lib/i18n/locale";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook: the only writer of the subscriptions table.
 * Requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = serverEnv.stripeWebhookSecret;
  const store = getServiceStore();
  if (!stripe || !secret || !store || isDemoMode()) return Response.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "MISSING_SIGNATURE" }, { status: 400 });

  let event: Stripe.Event;
  try {
    // The raw body is required for signature verification.
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  // Idempotency: Stripe may deliver an event more than once.
  const service = createSupabaseServiceClient()!;
  const { error: duplicate } = await service.from("stripe_events").insert({ id: event.id, type: event.type });
  if (duplicate?.code === "23505") return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        if (session.mode === "subscription" && userId && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await store.upsertSubscription(subscriptionFromStripe(subscription, userId));
          const profile = await store.getProfile(userId);
          if (profile) await sendEmail(profile.email, EMAIL_TEMPLATES.subscriptionActive(profile.locale), profile.locale);
          track("subscription_started", userId, {});
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const userId = subscription.metadata?.user_id || (await store.findUserIdByStripeCustomer(customerId));
        if (!userId) break;
        const record = subscriptionFromStripe(subscription, userId);
        if (event.type === "customer.subscription.deleted") record.status = "canceled";
        await store.upsertSubscription(record);
        if (event.type === "customer.subscription.deleted") {
          const profile = await store.getProfile(userId);
          const until = record.currentPeriodEnd && new Date(record.currentPeriodEnd) > new Date() && profile
            ? new Intl.DateTimeFormat(intlLocale(profile.locale), { dateStyle: "long" }).format(new Date(record.currentPeriodEnd))
            : null;
          if (profile) await sendEmail(profile.email, EMAIL_TEMPLATES.subscriptionCanceled(profile.locale, until), profile.locale);
          track("subscription_cancelled", userId, {});
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // Let Stripe retry: forget the event id so the retry is processed.
    await service.from("stripe_events").delete().eq("id", event.id);
    console.error("[stripe] webhook handling failed:", event.type, error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "HANDLER_FAILED" }, { status: 500 });
  }

  return Response.json({ received: true });
}
