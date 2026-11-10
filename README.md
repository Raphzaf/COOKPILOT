# CookPilot

**Your kitchen. Your appliances. Your AI chef.**

CookPilot is an AI cooking assistant that understands the exact kitchen appliances each user owns — their programs, temperature limits and accessories — and adapts every recipe to them. It launches with Ninja indoor grills, air fryers and CREAMi machines, in English and French, as a responsive web app and installable PWA.

> CookPilot is an independent product. It is not affiliated with, endorsed by or sponsored by SharkNinja or any appliance manufacturer.

## What is in this repository

| Area | What you get |
| --- | --- |
| Public site | Landing page, pricing, SEO recipe library with schema.org markup, about, privacy, terms |
| App | Onboarding, appliance management, AI Chef chat (streaming), recipe library, guided cooking mode with timers, favourites, history, settings, subscription |
| Admin | Appliance catalogue, recipes + translations, knowledge base ingestion, users and roles, feedback, AI usage |
| AI | Provider-agnostic LLM layer (Gemini implemented), RAG over pgvector with full-text fallback, structured output validated by Zod plus deterministic appliance/safety guard-rails |
| Data | 8 SQL migrations (25 tables, RLS on every table), generated seeds, database-level RLS tests |
| Billing | Stripe Checkout, Billing Portal, verified + idempotent webhook, server-side quotas |
| Quality | 77 unit tests (Vitest), 32 end-to-end tests (Playwright), CI workflow |

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables the app runs in **demo mode**: a clearly labelled, in-memory dataset that lets you use every screen. Nothing in demo mode touches a real database, and demo data is never mixed with production data.

To connect real services, copy `.env.example` to `.env.local` and follow:

1. [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) — database and authentication (works with a Supabase account separate from your GitHub/Vercel accounts)
2. [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md) — every variable, what it enables
3. [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md) — subscriptions
4. [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) — deployment

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run typecheck` / `lint` | TypeScript (strict) and ESLint |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests against a production build in demo mode |
| `npm run check` | Typecheck + lint + unit tests + build |
| `npm run db:seed:generate` | Regenerate `database/seeds/*.sql` from `src/data/seed` |
| `npm run admin:promote -- <email>` | Make an existing account an administrator |
| `npm run knowledge:ingest` | Embed knowledge chunks that have no embedding yet |

## Honest status

Read this before launching:

- **Appliance data** comes from public sources listed on each model. No model is marked *verified*; several are *partial* or *incomplete*, and the gaps are shown in the UI rather than filled with guesses. Verify against the owner's guides before relying on it.
- **Recipes** in the seed are original demonstration recipes that have **not** been physically tested. They are labelled *Generated* + *Demo recipe*. Replace or verify them before a commercial launch.
- **Recipe covers** are original illustrations. No food photography is bundled (none could be licensed and verified from the build environment); upload your own through the admin panel and the `recipe-images` bucket.
- **Supabase mode** is implemented and its SQL (migrations, RLS, triggers, retrieval function) is tested against PostgreSQL 16 + pgvector, but the app has not yet been run against a live Supabase project — do the checks in `SUPABASE_SETUP.md` §12–14 after connecting yours.
- **Gemini, Stripe, Resend, PostHog and Sentry** are integrated but were not exercised with real credentials. Each shows an explicit "not configured" state until its keys are set.
- **Legal pages** are a sensible baseline, not legal advice. Add your company details and have them reviewed.

## Documentation

- [`docs/PROJECT_ARCHITECTURE.md`](docs/PROJECT_ARCHITECTURE.md)
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md)
- [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)
- [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md)
- [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md)
- [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md)
- [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md)
- [`docs/CONTENT_AND_RECIPE_GUIDELINES.md`](docs/CONTENT_AND_RECIPE_GUIDELINES.md)
- [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
