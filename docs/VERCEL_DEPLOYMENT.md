# Vercel deployment

The application builds and runs without any external credential (demo mode), so you can deploy first and connect services afterwards.

## 1. Import the repository

1. https://vercel.com/new → **Import Git Repository** → select `Raphzaf/COOKPILOT` (install the Vercel GitHub app on the repository if asked).
2. Framework preset: **Next.js** (detected). Leave build command (`next build`), output and install command at their defaults. Root directory: repository root.
3. Click **Deploy**. The first deployment runs in demo mode.

## 2. Production branch

**Settings → Environments → Production → Branch Tracking** must be `main`. Every push to `main` deploys to production; other branches and pull requests get preview deployments.

## 3. Environment variables

**Settings → Environment Variables**. Add what you have, for the *Production* environment (and *Preview* if previews should use the same services), then redeploy. The full list with explanations is in `docs/ENVIRONMENT_VARIABLES.md`:

```
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_ANNUAL=
RESEND_API_KEY=
EMAIL_FROM=
POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

Mark every non-`NEXT_PUBLIC_` key as **Sensitive**. Variables prefixed `NEXT_PUBLIC_` are inlined at build time: redeploy after changing them.

Tip: use different Supabase projects and Stripe test keys for *Preview* so that previews never touch production data.

## 4. Region

Functions run in Paris (`cdg1`), set in `vercel.json`. Change `regions` there to the region closest to your Supabase project (for example `fra1` for Frankfurt) to keep database latency low.

## 5. Domain

**Settings → Domains** → add your domain and follow the DNS instructions. Then:

- set `NEXT_PUBLIC_APP_URL` to the final URL and redeploy;
- update Supabase **Authentication → URL Configuration** (`SUPABASE_SETUP.md` §10);
- update the Stripe webhook endpoint URL (`docs/STRIPE_SETUP.md`).

## 6. Verify a deployment

| Check | Expected |
| --- | --- |
| `GET /api/health` | `{"status":"ok","mode":"demo" or "live", …}` |
| `/` | redirects to `/en` or `/fr` according to the browser language |
| `/en`, `/fr` | landing page; the yellow demo banner appears only in demo mode |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | served |
| `/en/does-not-exist` | HTTP 404 |
| Response headers | `strict-transport-security`, `x-frame-options: DENY`, `x-content-type-options: nosniff` |

If a build fails, open the deployment → **Build Logs**. The same build can be reproduced locally with `npm run build`.

## Notes

- The AI chat route streams for up to 90 seconds (`maxDuration`); this is within Vercel's limits on current plans with Fluid Compute. Lower it in `src/app/api/chef/chat/route.ts` if your plan requires.
- Fonts (Inter, Fraunces) are downloaded from Google Fonts at build time and self-hosted by Next.js; nothing is requested from Google at runtime.
- The service worker (`public/sw.js`) only registers in production builds.
- CLI alternative: `npm i -g vercel`, `vercel link`, `vercel env add <NAME> production`, `vercel --prod`.
