# Environment variables

All variables are optional: with none set, the app runs in demo mode. Add them in Vercel (**Settings → Environment Variables**) or in `.env.local` for development. Never commit real values.

`NEXT_PUBLIC_*` variables are embedded in the browser bundle at build time — **redeploy after changing them**.

## Application

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | public | Canonical site URL without trailing slash, e.g. `https://cookpilot.app`. Used for SEO tags, the sitemap, email links and Stripe/auth return URLs. Falls back to the Vercel production URL. |

## Supabase — see `SUPABASE_SETUP.md`

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Project URL. Setting this **and** the anon key switches the app from demo mode to live mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Publishable (or legacy anon) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | Secret (or legacy service_role) key. Server only: Stripe webhook, usage metering, account deletion. |

## AI

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | **secret** | Enables AI generation and embeddings. Without it the chef answers from the recipe library and says so. |
| `GEMINI_MODEL` | server | Optional. Default `gemini-2.5-flash`. Set it to the current model you want to use. |
| `GEMINI_EMBEDDING_MODEL` | server | Optional. Default `gemini-embedding-001`. Must support 768-dimension output. |
| `AI_INPUT_COST_PER_MTOK_USD`, `AI_OUTPUT_COST_PER_MTOK_USD` | server | Optional. Per-million-token prices used for the cost *estimates* in the admin panel. Set them to your model's actual prices. |

## Stripe — see `docs/STRIPE_SETUP.md`

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | **secret** | API key. |
| `STRIPE_WEBHOOK_SECRET` | **secret** | Signing secret of the webhook endpoint. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | Reserved for client-side Stripe elements; the current hosted Checkout flow does not need it. |
| `STRIPE_PRICE_PRO_MONTHLY` | server | Price ID of the €3.99/month price. |
| `STRIPE_PRICE_PRO_ANNUAL` | server | Price ID of the €29.99/year price. |

## Email

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | **secret** | Enables the welcome and subscription emails (EN/FR). |
| `EMAIL_FROM` | server | Sender, e.g. `CookPilot <hello@your-domain.com>`. Requires a verified domain in Resend. |

Authentication emails (confirmation, password reset) are sent by Supabase, not by Resend.

## Analytics and monitoring

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `POSTHOG_KEY` | server | Server-side product events (onboarding completed, appliance added, chef answer, subscription started…). |
| `NEXT_PUBLIC_POSTHOG_KEY` | public | Browser page views, cookieless (in-memory persistence, no autocapture, no session recording). Usually the same project key as above. |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | Optional. Default `https://eu.i.posthog.com`. |
| `SENTRY_DSN` | server | Server-side error reporting. |
| `NEXT_PUBLIC_SENTRY_DSN` | public | Browser error reporting. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | build | Optional. Upload source maps during the build. |

## Demo mode

| Variable | Purpose |
| --- | --- |
| `DEMO_ADMIN_ENABLED` | Set to `true` to allow the demo admin persona on a production deployment that has no Supabase. Off by default because the demo catalogue is shared between visitors. Ignored once Supabase is configured. |

## Checking the configuration

`GET /api/health` and **Admin → Overview → Integrations** show which integrations are configured, as booleans only.

## Minimum sets

- **Demo:** nothing.
- **Accounts and data:** the three Supabase variables + `NEXT_PUBLIC_APP_URL`.
- **Real AI:** + `GEMINI_API_KEY`.
- **Paid plans:** + the four Stripe server variables (and the Supabase service role key).
