# Supabase setup (separate account)

CookPilot is designed so the Supabase project can live in **any** Supabase account — including one created with a different Google account from the one used for GitHub or Vercel. The app only needs three values from that project; nobody else needs access to the account.

Until these values are set, the app runs in demo mode and every auth page explains that accounts are not connected yet.

> The project referenced in this repository's `.mcp.json` is `zpuzxgrxrtgbdbdjzldd`. If that is your project, its URL is `https://zpuzxgrxrtgbdbdjzldd.supabase.co`.

## 1. Create the Supabase account

Go to https://supabase.com → **Start your project** → **Continue with Google** and choose the Google account that should own the database. Keep using that same account for every step below.

## 2. Create a project

**New project** → pick the organisation → name it `cookpilot` → generate a strong database password and store it in a password manager (you will rarely need it).

## 3. Choose a region

Pick the region closest to your users. For a French/European audience choose an EU region such as **West EU (Paris)** or **Central EU (Frankfurt)**; this also keeps personal data in the EU. If you deploy on Vercel, set the function region near it (see `docs/VERCEL_DEPLOYMENT.md`).

## 4. Get the project URL

**Project Settings → Data API** (or the **Connect** button) → copy **Project URL**, e.g. `https://abcdefgh.supabase.co`.
→ `NEXT_PUBLIC_SUPABASE_URL`

## 5. Get the publishable / anon key

**Project Settings → API Keys** → copy the **Publishable key** (`sb_publishable_…`). On older projects use the legacy **anon public** key instead; both work.
→ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

This key is safe in the browser: Row Level Security is what protects the data.

## 6. Get the service role key — securely

Same page → **Secret key** (`sb_secret_…`), or the legacy **service_role** key.
→ `SUPABASE_SERVICE_ROLE_KEY`

This key bypasses Row Level Security. Treat it like a password:

- paste it **only** into Vercel's environment variables (or a local `.env.local`);
- never commit it, never send it by chat or email, never prefix it with `NEXT_PUBLIC_`;
- if it leaks, rotate it immediately from the same page.

CookPilot uses it only on the server, for the Stripe webhook, usage metering and account deletion. Without it the app still works, except that Stripe subscriptions cannot be synchronised.

## 7. Add the variables to Vercel

Vercel → your project → **Settings → Environment Variables** → add the three variables for **Production** (and Preview if you want previews to use the same database) → **Redeploy**. Mark `SUPABASE_SERVICE_ROLE_KEY` as *Sensitive*.

For local development put them in `.env.local`.

## 8. Run the SQL migrations

Supabase dashboard → **SQL Editor** → **New query**. Paste and run each file **in order**:

1. `database/migrations/0001_extensions.sql`
2. `database/migrations/0002_users.sql`
3. `database/migrations/0003_catalogue.sql`
4. `database/migrations/0004_recipes.sql`
5. `database/migrations/0005_ai_knowledge.sql`
6. `database/migrations/0006_billing_support.sql`
7. `database/migrations/0007_rls.sql`
8. `database/migrations/0008_storage.sql`

Then the seeds, also in order:

9. `database/seeds/0001_catalogue.sql` — appliance catalogue
10. `database/seeds/0002_demo_recipes.sql` — demonstration recipes (flagged `is_demo`; skip if you do not want them)
11. `database/seeds/0003_knowledge.sql` — knowledge base text

Each file should finish with "Success. No rows returned". Seeds are safe to run again.

*Alternative with the Supabase CLI:* `supabase link --project-ref <ref>` then run the files with `psql "$(supabase db url)" -f <file>`.

Optional, once `GEMINI_API_KEY` is available — add embeddings for semantic search (until then the chef uses full-text search):

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… GEMINI_API_KEY=… npm run knowledge:ingest
```

## 9. Google sign-in (optional)

1. Google Cloud Console (any Google account) → **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
2. **Authorised redirect URI:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste the client ID and secret, save.

Without this, the "Continue with Google" button shows a friendly "not available" message and email/password still works.

## 10. Authorised redirect URLs

Supabase → **Authentication → URL Configuration**:

- **Site URL:** your production URL, e.g. `https://cookpilot.vercel.app`
- **Redirect URLs:** add
  - `https://<your-domain>/auth/callback`
  - `http://localhost:3000/auth/callback` (local development)
  - `https://*-<your-vercel-team>.vercel.app/auth/callback` (optional, preview deployments)

Email confirmations, password resets and OAuth all return to `/auth/callback`, which only redirects to same-site paths.

For production email delivery, configure custom SMTP under **Authentication → Emails** (Supabase's built-in sender is rate-limited). You can reuse your Resend account as the SMTP provider.

## 11. Storage buckets

Migration `0008_storage.sql` already created and secured them:

| Bucket | Access | Use |
| --- | --- | --- |
| `recipe-images` | public read, admin write | recipe photographs you own |
| `device-images` | public read, admin write | your own appliance photos |
| `knowledge-docs` | admins only | source documents kept for audit |

Check under **Storage** that the three buckets exist. Upload an image, copy its public URL and paste it into the recipe or appliance form in the admin panel.

## 12. Test authentication

1. Open `/en/register`, create an account, confirm the email.
2. You should land on onboarding, then the dashboard. The yellow "Demo mode" banner must be gone.
3. Supabase → **Authentication → Users** shows the user; **Table Editor → profiles** has a matching row (created by trigger).
4. Sign out, use "Forgot password?", and check the reset email returns you to `/reset-password`.

Then make yourself an administrator (see `docs/ADMIN_GUIDE.md`):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## 13. Test database access

- `/en/recipes` lists the seeded recipes (public read through RLS).
- Add an appliance in the app → a row appears in `user_devices`.
- `GET /api/health` returns `"mode":"live"` and `"supabase":true`.

## 14. Verify RLS policies

In the SQL editor:

```sql
-- Every table must have RLS enabled: this must return zero rows.
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

-- 61 policies are expected.
select count(*) from pg_policies where schemaname = 'public';
```

Run the behavioural test suite (it rolls everything back) against your database connection string from **Connect → Session pooler**:

```bash
psql "<connection string>" -v ON_ERROR_STOP=1 -f database/tests/rls_test.sql
```

It must end with `ALL RLS TESTS PASSED`. It checks, among other things, that a user cannot read another user's data, promote themselves to admin, grant themselves Pro, reset their AI quota, exceed the free appliance limit, or label a recipe as verified. (Run it after the seeds: it uses the seeded catalogue.)

Finally open **Advisors → Security** in the Supabase dashboard and resolve anything it reports.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Demo banner still visible | The two `NEXT_PUBLIC_SUPABASE_*` variables are missing in that environment, or the deployment was not rebuilt after adding them |
| "That link is invalid or has expired" after confirming | Redirect URL not listed in step 10 |
| Recipes page empty | Seeds not run |
| Pro not activating after payment | `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_WEBHOOK_SECRET` missing — see `docs/STRIPE_SETUP.md` |
| `type "vector" does not exist` | Migration `0001_extensions.sql` was skipped |
