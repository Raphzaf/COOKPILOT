# Database schema

PostgreSQL (Supabase). Migrations live in `database/migrations` and must be applied in order; seeds in `database/seeds` are generated from `src/data/seed`.

| File | Contents |
| --- | --- |
| `0001_extensions.sql` | `pgcrypto`, `vector` |
| `0002_users.sql` | `profiles`, `user_preferences`, sign-up trigger, `is_admin()`, role protection, `delete_my_account()` |
| `0003_catalogue.sql` | `brands`, `device_categories`, `device_models`, `device_capabilities`, `device_sources`, `user_devices` |
| `0004_recipes.sql` | `recipes`, `recipe_versions`, `recipe_translations`, `recipe_ingredients`, `recipe_steps`, `recipe_compatibility`, `recipe_feedback`, `favorites`, `cooking_sessions`, rating trigger |
| `0005_ai_knowledge.sql` | `conversations`, `messages`, `knowledge_documents`, `knowledge_chunks`, `match_knowledge_chunks()` |
| `0006_billing_support.sql` | `subscriptions`, `stripe_events`, `usage_events`, `support_requests`, `current_plan()`, plan-limit triggers |
| `0007_rls.sql` | RLS enabled on all 25 tables, 61 policies |
| `0008_storage.sql` | buckets and storage policies |

## Users

**"users" is Supabase's `auth.users`.** CookPilot never stores passwords. Every user-owned table references `auth.users(id) on delete cascade`, so deleting the auth user erases all personal data.

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | `id` → auth.users, `email`, `display_name`, `role` (`user`/`admin`), `locale`, `onboarded` | Created by trigger on sign-up. A trigger blocks role changes unless made by an admin or a trusted session. |
| `user_preferences` | `user_id` PK, `measurement_system`, `temperature_unit`, `cuisines[]`, `allergies[]`, `diets[]`, `dislikes[]`, `experience`, `servings` | All taste fields optional. |

## Appliance catalogue

| Table | Key columns | Notes |
| --- | --- | --- |
| `brands` | `slug` unique, `name`, `manufacturer` | |
| `device_categories` | `slug` unique, `name` jsonb `{en,fr}` | |
| `device_models` | `brand_id`, `category_id`, `name`, `model_number`, `region`, `description` jsonb, `image_url`, `specs` jsonb, `missing_info` jsonb, `verification_status`, `last_verified_at`, `published` | Unique `(brand_id, model_number, region)` — regional variants are separate models. |
| `device_capabilities` | `device_model_id`, `kind` (`program`/`accessory`/`feature`), `key`, `name` jsonb, `temp_min`, `temp_max`, `temp_unit`, `levels[]`, `notes` | Ranges are stored exactly as documented, in the source's unit; `null` = not documented. |
| `device_sources` | `device_model_id`, `title`, `url`, `kind`, `accessed_at` | Manual references and source URLs. |
| `user_devices` | `user_id`, `device_model_id`, `nickname`, `is_favorite` | Unique per user/model. Free-plan limit enforced by trigger. |

`verification_status`: `verified` (checked hands-on or against the official guide) · `documented` (public documentation) · `partial` · `incomplete`.

## Recipes

| Table | Key columns | Notes |
| --- | --- | --- |
| `recipes` | `slug` unique, `owner_id` (null = catalogue), `status` (`draft`/`published`/`private`/`archived`), `category`, `cuisine`, `dietary[]`, `difficulty`, `device_category` → categories.slug, `programs[]`, `provenance` (`verified`/`adapted`/`generated`), `is_demo`, `current_version_id`, `rating_average`, `rating_count` | |
| `recipe_versions` | `recipe_id`, `version`, `servings`, `prep_minutes`, `cook_minutes` | Every edit creates a version; history is kept. |
| `recipe_translations` | `recipe_id`, `locale`, `title`, `description`, `accessories` jsonb, `safety_notes` jsonb, `source_note` | Unique `(recipe_id, locale)`. |
| `recipe_ingredients` | `version_id`, `locale`, `position`, `name`, `quantity`, `unit`, `note`, `optional` | Metric canonical quantities; converted for display. |
| `recipe_steps` | `version_id`, `locale`, `position`, `instruction`, `program`, `level`, `temperature_c`, `duration_seconds`, `tip` | |
| `recipe_compatibility` | `recipe_id`, `device_model_id`, `tested` | `tested = true` only after a physical test on that exact model; only admins may set it. |
| `recipe_feedback` | `recipe_id`, `user_id`, `rating` 1–5, `comment`, `device_model_id` | One per user and recipe; a trigger maintains the aggregate rating. |
| `favorites` | `user_id`, `recipe_id` | Free-plan limit (10) enforced by trigger. |
| `cooking_sessions` | `user_id`, `recipe_id`, `recipe_title`, `device_model_id`, `servings`, `completed_at` | Cooking history. |

## AI

| Table | Key columns | Notes |
| --- | --- | --- |
| `conversations` | `user_id`, `title`, `updated_at` | |
| `messages` | `conversation_id`, `user_id`, `role`, `content`, `payload` jsonb | `payload` holds the validated structured answer. |
| `knowledge_documents` | `title`, `source`, `source_url`, `manufacturer`, `model_number`, `language`, `doc_type`, `published_at`, `verification_status`, `rights_note`, `content_hash` | Unique `(content_hash, language)` de-duplicates. |
| `knowledge_chunks` | `document_id`, `position`, `content`, `embedding vector(768)`, `fts` (generated tsvector) | HNSW cosine index + GIN index. |

`match_knowledge_chunks(query_embedding, query_text, match_count, filter_language, filter_models, filter_doc_types)` performs cosine search when an embedding is passed and full-text ranking otherwise, always with metadata filtering.

## Billing and support

| Table | Key columns | Notes |
| --- | --- | --- |
| `subscriptions` | `user_id` PK, `plan`, `billing_interval`, `status`, `current_period_end`, `cancel_at_period_end`, `stripe_customer_id`, `stripe_subscription_id` | Written only by the service role (webhook). |
| `stripe_events` | `id` PK, `type` | Webhook idempotency. No policies: service role only. |
| `usage_events` | `user_id`, `kind`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_usd`, `created_at` | Append-only for users — quotas cannot be reset client-side. |
| `support_requests` | `user_id`, `email`, `kind`, `subject`, `message`, `status` | Missing-model requests and feedback. |

`current_plan(user)` mirrors `resolvePlan()` in `src/lib/billing/plans.ts`. Keep both in sync if entitlement rules change.

## Row Level Security in one table

| Data | anon | signed-in user | admin |
| --- | --- | --- | --- |
| Published models, capabilities, sources, brands, categories | read | read | all |
| Published recipes and their content | read | read | all |
| Own private recipes | — | all (cannot publish, cannot mark verified/tested) | all |
| Profile | — | read/update own (not `role`) | read/update all |
| Preferences, appliances, favourites, feedback, cooking sessions, conversations, messages | — | own rows only | (appliance counts, feedback: read) |
| Knowledge base | — | read | all |
| Subscriptions | — | read own | read |
| Usage events | — | read own, insert own | read |
| Support requests | — | insert/read own | all |
| Stripe events | — | — | — (service role) |

`database/tests/rls_test.sql` asserts this behaviour.

## Storage

`recipe-images` and `device-images` are public-read, admin-write (5 MB, images only). `knowledge-docs` is private to admins (20 MB, PDF/text).
