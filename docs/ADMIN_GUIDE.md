# Admin guide

The admin panel lives at `/en/admin` (or `/fr/admin`). Access requires `profiles.role = 'admin'`, checked on the server for every page and every action, and again by the database. Everyone else gets a 404.

## Creating the first administrator

There are no default credentials. Create a normal account in the app, then promote it using **one** of:

**A. SQL editor** (Supabase dashboard → SQL Editor):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

**B. Script** (from a trusted machine; the key is read from the environment and never stored):

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run admin:promote -- you@example.com
```

Sign out and back in. An **Admin** entry appears in the menu. Further administrators can be promoted from **Admin → Users**. An administrator cannot change their own role, which prevents locking everybody out.

Why it is safe: a database trigger rejects any role change made by a signed-in non-admin, so users cannot promote themselves through the API.

## Overview

Counters (users, Pro subscribers, models to verify, published/draft recipes, knowledge documents, open requests, AI requests and estimated cost over 30 days) and the configuration status of every integration. Application errors are in Sentry when configured, otherwise in Vercel → Logs.

## Appliances

List, create, edit, hide or delete models. Fields that take several items use one line per item with `|` separators — the expected format is shown under each field.

- **Programs, accessories and features:** `kind | key | name EN | name FR | min | max | unit | levels | note EN | note FR`
  - `program | air-fry | Air Fry | Air Fry | 40 | 240 | C`
  - `program | grill | Grill | Grill | | | | LOW,MED,HIGH,MAX` (level-based: leave the range empty)
  - `feature | sync | Sync | Sync | | | | | Finishes both drawers together | Termine les deux tiroirs ensemble`
- **Specifications:** `key | label EN | label FR | value`
- **Not documented:** `EN | FR` — list every gap here instead of guessing.
- **Sources:** `title | https://… | manufacturer|manual|retailer|other`

Rules enforced by the form: *Documented* and *Verified* require at least one https source; brand + model number + region must be unique.

Verification workflow: `incomplete` → `partial` → `documented` → `verified`. Use **verified** only after checking the appliance itself or its official owner's guide. The program keys you define are what recipes and the AI are allowed to use for that model, so a wrong entry here becomes a wrong instruction to a user.

Read `docs/CONTENT_AND_RECIPE_GUIDELINES.md` before editing the catalogue.

## Recipes

Create and edit catalogue recipes, one language at a time (EN / FR tabs; a dot marks a missing translation). Structure — category, times, compatibility, provenance, status — is shared; text is per language. Every save creates a new version.

- **Ingredients:** `quantity | unit | name | note | optional(yes)` — metric quantities; the app converts.
- **Steps:** `instruction | program key | level | temperature °C | duration in seconds | tip`
- **Compatible models:** tick the models the recipe suits; tick *physically tested* only after cooking it on that exact model.
- **Provenance:** *Verified* is refused unless at least one model is marked as tested.
- **Status:** draft → published → archived. Change it from the list or the form. Only published recipes are public and appear in the sitemap.

## Knowledge

The documents the AI Chef retrieves from. To add one: title, source, optional URL / manufacturer / model, language, type, verification status, a **rights note** (why you may use the text) and the content. The text is cleaned, split into chunks and indexed; with `GEMINI_API_KEY` it is embedded immediately, otherwise run `npm run knowledge:ingest` later. Identical content in the same language is ignored.

Set the **model** field for model-specific documents: they are then retrieved only for users who own that model.

Appliance capability sheets in the seed were generated from the catalogue. After changing a model substantially, add an updated sheet (and delete the old one) so retrieval matches the catalogue. The prompt always uses the live catalogue for programs and limits, so the catalogue remains the source of truth.

## Users

Email, plan, number of appliances, sign-up date and role. Subscriptions are managed in Stripe; to refund or cancel on a user's behalf use the Stripe dashboard.

## Feedback

Missing-model requests and support messages (set status: open → in review → resolved) and recipe ratings/comments. Missing-model requests are the best signal for which appliance to document next.

## AI & plans

Requests and estimated cost per day for the last 30 days, average cost per request, and plan limits. Cost figures are estimates from token counts and the configured per-token prices.

## Images

Upload to the `recipe-images` or `device-images` bucket (Supabase → Storage), copy the public URL and paste it in the form. Only use images you own or have licensed; never manufacturer imagery.
