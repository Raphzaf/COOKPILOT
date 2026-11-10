# Stripe setup

CookPilot uses Stripe Billing with hosted Checkout and the Billing Portal. Nothing is charged, and the upgrade button stays disabled with an explanation, until the variables below are set. Start in **test mode**.

Prerequisite: Supabase is connected and `SUPABASE_SERVICE_ROLE_KEY` is set — the webhook is the only writer of the `subscriptions` table.

## 1. Product and prices

Stripe Dashboard → **Product catalogue → Add product**:

- Name: `CookPilot Pro`
- Price 1: **€3.99**, recurring, **monthly**
- Price 2: **€29.99**, recurring, **yearly**

Copy the two price IDs (`price_…`):

```
STRIPE_PRICE_PRO_MONTHLY=price_…
STRIPE_PRICE_PRO_ANNUAL=price_…
```

The amounts shown in the app come from `PRICING` in `src/lib/billing/plans.ts`; the amounts charged come from these Stripe prices. Keep them identical.

## 2. API key

**Developers → API keys** → copy the **Secret key** → `STRIPE_SECRET_KEY` (use a restricted key in production if you prefer: Checkout Sessions, Billing Portal, Subscriptions and Customers write access).

## 3. Webhook

**Developers → Webhooks → Add destination**:

- Endpoint URL: `https://<your-domain>/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`. Redeploy.

The endpoint verifies the signature on the raw body, ignores events it has already processed (`stripe_events` table) and returns 500 on a processing error so that Stripe retries.

## 4. Billing Portal

**Settings → Billing → Customer portal** → enable it and allow customers to update payment methods, view invoices and cancel subscriptions (cancel *at end of billing period* is recommended; switching between the monthly and annual prices is optional). Save.

## 5. Test

1. Sign in to the app → **Subscription** → **Upgrade to Pro** → pay with `4242 4242 4242 4242`, any future date, any CVC.
2. You return to `/dashboard/subscription?checkout=success`; within a few seconds the plan shows **Pro** and the quota becomes 60.
3. In Supabase, `subscriptions` contains your row with `status = active`.
4. **Manage billing** → cancel. The page shows "Pro access ends on …"; access remains until that date.
5. Stripe → the webhook → **Event deliveries** all show `200`.

Local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints a whsec_ secret for .env.local
stripe trigger customer.subscription.updated
```

## 6. Go live

Switch the dashboard to live mode and repeat steps 1–4 (products, keys and webhooks are separate in live mode). Complete Stripe's business verification, configure tax settings (Stripe Tax or tax-inclusive prices, as applicable to you) and enable the receipts you want under **Settings → Emails**.

## How entitlements work

| Stripe status | CookPilot plan |
| --- | --- |
| `active`, `trialing` | Pro |
| `past_due`, `unpaid` | Pro (grace) with a "payment failed" notice |
| `canceled` | Pro until `current_period_end`, then Free |
| `incomplete`, `incomplete_expired`, `paused` | Free |

The rule is implemented once in TypeScript (`resolvePlan`) and mirrored in SQL (`current_plan`) for the database-level limit triggers. Deleting an account cancels the active subscription first.
