# Project architecture

CookPilot is a **modular monolith**: one Next.js application deployed on Vercel, one PostgreSQL database (Supabase). No microservices.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack), TypeScript strict |
| UI | Tailwind CSS v4, shadcn/ui-style components on Radix primitives, Lucide icons, Sonner toasts |
| i18n | next-intl, routes under `/en` and `/fr` |
| Validation | Zod 4 on every server action, route handler and AI output |
| Data | Supabase PostgreSQL + Auth + Storage, pgvector |
| AI | Gemini REST API behind a provider interface |
| Billing | Stripe Billing |
| Email / analytics / monitoring | Resend, PostHog, Sentry (all optional) |
| Tests | Vitest, Playwright, SQL RLS tests |

## Directory map

```
src/
  app/
    layout.tsx, not-found.tsx, global-error.tsx
    [locale]/                 document shell (<html lang>), providers, demo banner
      (marketing)/            /, /pricing, /recipes, /recipes/[slug], /about, /privacy, /terms
      (auth)/                 /login, /register, /forgot-password, /reset-password
      onboarding/
      dashboard/              overview, devices, chef, recipes, cooking, favorites, history, settings, subscription
      admin/                  overview, devices, recipes, knowledge, users, feedback, analytics
    api/chef/chat             AI Chef (server-sent events)
    api/stripe/webhook        Stripe → subscriptions
    api/account/export        personal data export
    api/health                liveness + integration status (booleans only)
    auth/callback             Supabase OAuth / email-link exchange
    sitemap.ts, robots.ts, manifest.ts
  actions/                    server actions (user, auth, billing, admin) + shared wrapper
  components/                 ui/ (design system), layout/, marketing/, recipes/, devices/, chef/, cooking/, dashboard/, admin/, auth/
  lib/
    domain/types.ts           the domain model
    data/                     DataStore interface, demo store, Supabase store, factories
    supabase/                 server / browser / service clients, row types
    auth/session.ts           session resolution and guards
    ai/                       provider interface, Gemini, library fallback, prompt, schema, guard-rails, orchestration
    rag/                      chunking, lexical search, retrieval, ingestion
    billing/                  plans, entitlements, Stripe
    recipes/                  filtering, compatibility, storage record
    i18n/, email/, analytics/, admin/, units.ts, rate-limit.ts, env.ts, seo.ts
  data/seed/                  catalogue, demo recipes, knowledge (single source for demo mode AND SQL seeds)
  content/legal.ts            privacy policy and terms (EN/FR)
  proxy.ts                    locale routing + Supabase session refresh / demo session cookie
messages/                     en.json, fr.json
database/                     migrations/, seeds/ (generated), tests/
scripts/                      seed SQL generator, admin bootstrap, embedding backfill, icon generation
tests/                        unit/ (Vitest), e2e/ (Playwright)
```

## The data boundary

All persistence goes through one interface, `DataStore` (`src/lib/data/store.ts`), with two implementations:

- **`demoStore`** — in-memory, seeded from `src/data/seed`. Used when Supabase is not configured.
- **`createSupabaseStore(client)`** — PostgREST queries; RLS applies because it runs with the caller's session.

`getStore()` returns exactly one of them for a deployment, decided by `isDemoMode()` (are the two public Supabase variables set?). They are never combined, so demo data cannot leak into a real database. Three factories exist: `getStore()` (signed-in user), `getPublicStore()` (cookieless anon client — keeps public pages cacheable) and `getServiceStore()` (service role, webhook only).

### Demo mode

- Every visitor gets an isolated demo account keyed by an `httpOnly` cookie set in `proxy.ts`.
- A compact snapshot (preferences, appliances, favourites, plan) is mirrored in a second cookie so the state survives serverless instance recycling; conversations and history are in memory only.
- A permanent banner labels the mode; auth pages show a setup state instead of a form that cannot work; checkout is disabled; the chef answers from the library and labels the answer as a demo.
- The demo admin persona is available in development and, in production, only when `DEMO_ADMIN_ENABLED=true` (it edits the shared in-memory catalogue).

## Request flow and authorisation

1. `proxy.ts` negotiates the locale and refreshes the Supabase session cookie. It does **not** authorise.
2. Pages call `requireOnboardedUser()` or `requireAdmin()`; server actions run inside `userAction()` / `adminAction()`; route handlers call `getSessionUser()`. Each resolves the user with `supabase.auth.getUser()` (validated by Supabase, never from client state) and reads the role from the database.
3. The database enforces the same rules again with RLS, plus triggers for plan limits and role changes.

Non-admins requesting `/admin/**` receive a real HTTP 404.

## Rendering strategy

- Marketing pages and public recipe pages are statically generated per locale and revalidated hourly.
- `/recipes` is dynamic (filter query string); the filter is a plain GET form, so it works without JavaScript and yields crawlable URLs.
- Dashboard and admin are dynamic and `noindex`.

## Security summary

- Secrets only in server modules (`import "server-only"`); `/api/health` exposes booleans only.
- Zod validation on all inputs; error details stay in server logs and clients receive codes.
- CSRF: Server Actions (built-in origin check) + SameSite=Lax cookies; the chat endpoint additionally rejects cross-origin and non-JSON requests.
- Security headers in `next.config.ts` (HSTS, nosniff, frame deny, referrer and permissions policies).
- Stripe webhook signature verification and idempotency table.
- Rate limiting: in-memory sliding window per instance (bursts) + durable limits computed from `usage_events` (monthly quota, daily message cap).
- Open-redirect protection in `/auth/callback`; password-reset responses never reveal whether an account exists.
- Privacy: optional dietary data, export endpoint, account deletion (cascade), cookieless analytics, no message content in analytics.

Known limitation: the burst rate limiter is per serverless instance. The durable quotas are authoritative; add a shared store (for example Upstash) if you need strict global burst limits.
