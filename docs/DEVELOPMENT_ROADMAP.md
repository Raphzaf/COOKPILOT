# Development roadmap

## Done (v1.0)

- Bilingual (EN/FR) responsive web app and installable PWA
- Public site with SEO: metadata, hreflang, canonical URLs, sitemap, robots, schema.org Recipe markup, Open Graph image
- Demo mode that works with zero credentials and is clearly labelled
- Supabase integration: auth (email + Google), SSR sessions, 25 tables, RLS, storage buckets, seeds
- Onboarding, preferences, appliance catalogue and management, missing-model requests
- AI Chef: streaming, structured output, RAG, guard-rails, provenance, quotas, conversation history
- Recipe library with filtering, favourites, ratings, servings and unit conversion
- Guided cooking mode: steps, checklist, multiple timers, notifications, in-context AI help, feedback
- Stripe subscriptions (monthly/annual), portal, webhook, entitlements
- Admin panel: appliances, recipes and translations, knowledge base, users, feedback, AI usage
- Resend emails, PostHog analytics, Sentry monitoring (all optional)
- Unit, end-to-end and database RLS tests; CI workflow

## Before a public launch

1. Connect Supabase, run migrations and the RLS test suite on the real project (`SUPABASE_SETUP.md`).
2. Add `GEMINI_API_KEY`, confirm the model names, run `npm run knowledge:ingest`, and review real answers for each supported appliance.
3. Verify the catalogue against the official owner's guides; fill the documented gaps.
4. Replace demo recipes with physically tested ones; add licensed photography.
5. Configure Stripe in test mode, run the full subscription cycle, then go live.
6. Complete the legal pages (company identity, contact, hosting details) and have them reviewed; configure custom SMTP for auth emails.
7. Set up a custom domain, Sentry alerts and uptime monitoring on `/api/health`.

## Next

- **Catalogue growth:** more Ninja models (multi-cookers, blenders), then Philips, Cosori, Moulinex, Thermomix, Magimix — the schema already supports brands, categories and regions.
- **Verification workflow:** test logs with photos per model, reviewer sign-off, "verified on your model" filter.
- **Admin:** file upload to storage from the forms, PDF text extraction for manuals, bulk import, side-by-side translation editing, catalogue-to-knowledge auto-sync.
- **AI:** image input (identify an appliance from its label, critique a result), meal planning and shopping lists, automatic recipe translation with human review, response caching for common questions, evaluation set run in CI.
- **Cooking mode:** voice commands, timers that survive reloads via service-worker scheduled notifications, cast to a second screen.
- **Platform:** shared rate-limit store (e.g. Upstash) for strict global limits, web push, offline access to saved recipes, native wrappers.
- **Growth:** editorial collections, seasonal content, referral programme, public appliance pages once verified.
- **Business:** annual-plan trials, gift subscriptions, family plan, regional pricing.

## Technical debt and known limits

- The burst rate limiter is per serverless instance (durable quotas are authoritative).
- Recipe writes in Supabase mode are several PostgREST calls, not one transaction; a failed create is rolled back by deleting the recipe. Moving writes into a SQL function would make them atomic.
- Admin stats aggregate usage in the application (capped at 10 000 rows for 30 days); move to a SQL view when volume grows.
- `database.types.ts` is hand-maintained; switch to `supabase gen types` once the project is linked.
- Demo-mode conversations and history live in server memory and are lost when an instance recycles.
