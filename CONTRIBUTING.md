# Contributing

## Setup

```bash
npm install
npm run dev        # demo mode, no credentials needed
```

Node 20.9 or newer.

## Before you push

```bash
npm run check      # typecheck, lint, unit tests, production build
npm run test:e2e   # Playwright, demo mode
```

CI runs the same checks plus a dependency audit and verifies that `database/seeds/*.sql` matches `src/data/seed`.

## Ground rules

- **TypeScript strict.** No `any`, no `@ts-ignore`.
- **No hardcoded interface text.** Every string goes through `messages/en.json` and `messages/fr.json`; `tests/unit/i18n.test.ts` fails if a key is missing in either language.
- **Never commit secrets.** `.env*` files are git-ignored except `.env.example`, which contains names only.
- **Server-only code stays on the server.** Modules that read secrets import `server-only`. The browser only ever receives the Supabase URL/anon key, the Stripe publishable key and the PostHog/Sentry public keys.
- **Authorisation is enforced three times:** server guard (`src/lib/auth/session.ts`), action wrapper (`src/actions/helpers.ts`) and database RLS. UI hiding is never the control.
- **Appliance facts need a source.** See `docs/CONTENT_AND_RECIPE_GUIDELINES.md`. Do not add a program, temperature or accessory you cannot cite; list it under `missingInfo` instead.
- **Schema changes are new migration files.** Never edit an applied migration. Add `database/migrations/000N_description.sql`, update `src/lib/supabase/database.types.ts`, `docs/DATABASE_SCHEMA.md` and `database/tests/rls_test.sql`.
- **Seed data lives in TypeScript** (`src/data/seed`). After changing it, run `npm run db:seed:generate` and commit the SQL.

## Commits and branches

Small, descriptive commits in the imperative mood ("Add annual plan toggle"). `main` is the production branch deployed by Vercel; open pull requests against it.

## Adding things

- **A language:** add the locale to `src/lib/i18n/routing.ts` and `LOCALES` in `src/lib/domain/types.ts`, create `messages/<locale>.json`, extend the `check (locale in …)` constraints in a new migration.
- **An LLM provider:** implement `LLMProvider` (`src/lib/ai/provider.ts`) in one file and return it from `getLLMProvider()` in `src/lib/ai/index.ts`.
- **A manufacturer or category:** insert rows in `brands` / `device_categories` (admin SQL or a seed), then create models from the admin panel. No code change is required.
