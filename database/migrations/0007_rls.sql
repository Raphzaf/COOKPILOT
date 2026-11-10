-- CookPilot · 0007 · Row Level Security
--
-- Principles
--   * Every table has RLS enabled. No policy = no access (service role bypasses RLS).
--   * Users can only see and change their own rows.
--   * The public catalogue (published appliances and recipes) is readable by everyone.
--   * Administrators (profiles.role = 'admin') manage the catalogue through public.is_admin().
--   * Subscriptions and Stripe events are written by the server (service role) only.
--   * (select auth.uid()) is used so the planner evaluates it once per statement.

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.brands enable row level security;
alter table public.device_categories enable row level security;
alter table public.device_models enable row level security;
alter table public.device_capabilities enable row level security;
alter table public.device_sources enable row level security;
alter table public.user_devices enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_translations enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_compatibility enable row level security;
alter table public.recipe_feedback enable row level security;
alter table public.favorites enable row level security;
alter table public.cooking_sessions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.support_requests enable row level security;

-- ───────────── Profiles & preferences ─────────────
create policy "profiles: read own or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own or admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());
-- Inserts happen through the handle_new_user trigger; deletes through auth.users cascade.

create policy "preferences: read own" on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "preferences: insert own" on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "preferences: update own" on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────── Catalogue ─────────────
create policy "brands: public read" on public.brands for select to anon, authenticated using (true);
create policy "brands: admin write" on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "device_categories: public read" on public.device_categories for select to anon, authenticated using (true);
create policy "device_categories: admin write" on public.device_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "device_models: read published" on public.device_models for select to anon, authenticated
  using (published or public.is_admin());
create policy "device_models: admin write" on public.device_models for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "device_capabilities: read with model" on public.device_capabilities for select to anon, authenticated
  using (exists (select 1 from public.device_models m where m.id = device_model_id and (m.published or public.is_admin())));
create policy "device_capabilities: admin write" on public.device_capabilities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "device_sources: read with model" on public.device_sources for select to anon, authenticated
  using (exists (select 1 from public.device_models m where m.id = device_model_id and (m.published or public.is_admin())));
create policy "device_sources: admin write" on public.device_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "user_devices: read own or admin" on public.user_devices for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "user_devices: insert own" on public.user_devices for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "user_devices: update own" on public.user_devices for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_devices: delete own" on public.user_devices for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────── Recipes ─────────────
create or replace function public.can_read_recipe(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = target
      and (r.status = 'published' or r.owner_id = (select auth.uid()) or public.is_admin())
  );
$$;

create or replace function public.can_write_recipe(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = target
      and (public.is_admin() or (r.owner_id = (select auth.uid()) and r.status = 'private'))
  );
$$;
revoke all on function public.can_read_recipe(uuid) from public;
revoke all on function public.can_write_recipe(uuid) from public;
grant execute on function public.can_read_recipe(uuid) to anon, authenticated, service_role;
grant execute on function public.can_write_recipe(uuid) to authenticated, service_role;

create policy "recipes: read published, own or admin" on public.recipes for select to anon, authenticated
  using (status = 'published' or owner_id = (select auth.uid()) or public.is_admin());
-- Users may only create private, non-verified recipes that they own (AI results they chose to save).
create policy "recipes: insert own private" on public.recipes for insert to authenticated
  with check (
    public.is_admin()
    or (owner_id = (select auth.uid()) and status = 'private' and provenance in ('generated', 'adapted') and is_demo = false)
  );
create policy "recipes: update own private or admin" on public.recipes for update to authenticated
  using (public.is_admin() or (owner_id = (select auth.uid()) and status = 'private'))
  with check (
    public.is_admin()
    or (owner_id = (select auth.uid()) and status = 'private' and provenance in ('generated', 'adapted') and is_demo = false)
  );
create policy "recipes: delete own or admin" on public.recipes for delete to authenticated
  using (public.is_admin() or owner_id = (select auth.uid()));

create policy "recipe_versions: read" on public.recipe_versions for select to anon, authenticated
  using (public.can_read_recipe(recipe_id));
create policy "recipe_versions: write" on public.recipe_versions for all to authenticated
  using (public.can_write_recipe(recipe_id)) with check (public.can_write_recipe(recipe_id));

create policy "recipe_translations: read" on public.recipe_translations for select to anon, authenticated
  using (public.can_read_recipe(recipe_id));
create policy "recipe_translations: write" on public.recipe_translations for all to authenticated
  using (public.can_write_recipe(recipe_id)) with check (public.can_write_recipe(recipe_id));

create policy "recipe_ingredients: read" on public.recipe_ingredients for select to anon, authenticated
  using (exists (select 1 from public.recipe_versions v where v.id = version_id and public.can_read_recipe(v.recipe_id)));
create policy "recipe_ingredients: write" on public.recipe_ingredients for all to authenticated
  using (exists (select 1 from public.recipe_versions v where v.id = version_id and public.can_write_recipe(v.recipe_id)))
  with check (exists (select 1 from public.recipe_versions v where v.id = version_id and public.can_write_recipe(v.recipe_id)));

create policy "recipe_steps: read" on public.recipe_steps for select to anon, authenticated
  using (exists (select 1 from public.recipe_versions v where v.id = version_id and public.can_read_recipe(v.recipe_id)));
create policy "recipe_steps: write" on public.recipe_steps for all to authenticated
  using (exists (select 1 from public.recipe_versions v where v.id = version_id and public.can_write_recipe(v.recipe_id)))
  with check (exists (select 1 from public.recipe_versions v where v.id = version_id and public.can_write_recipe(v.recipe_id)));

create policy "recipe_compatibility: read" on public.recipe_compatibility for select to anon, authenticated
  using (public.can_read_recipe(recipe_id));
-- Only admins may mark a recipe as tested on a model; owners may list untested compatibility.
create policy "recipe_compatibility: write" on public.recipe_compatibility for all to authenticated
  using (public.can_write_recipe(recipe_id))
  with check (public.can_write_recipe(recipe_id) and (tested = false or public.is_admin()));

create policy "recipe_feedback: read own or admin" on public.recipe_feedback for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "recipe_feedback: insert own" on public.recipe_feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_read_recipe(recipe_id));
create policy "recipe_feedback: update own" on public.recipe_feedback for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipe_feedback: delete own or admin" on public.recipe_feedback for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "favorites: read own" on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "favorites: insert own" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_read_recipe(recipe_id));
create policy "favorites: delete own" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "cooking_sessions: read own" on public.cooking_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "cooking_sessions: insert own" on public.cooking_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "cooking_sessions: delete own" on public.cooking_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────── Conversations ─────────────
create policy "conversations: read own" on public.conversations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "conversations: insert own" on public.conversations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "conversations: update own" on public.conversations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "conversations: delete own" on public.conversations for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "messages: read own" on public.messages for select to authenticated
  using (user_id = (select auth.uid()));
create policy "messages: insert own" on public.messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
  );
create policy "messages: delete own" on public.messages for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────── Knowledge base ─────────────
-- Readable by signed-in users (the AI Chef retrieves with the caller's session); managed by admins.
create policy "knowledge_documents: read" on public.knowledge_documents for select to authenticated using (true);
create policy "knowledge_documents: admin write" on public.knowledge_documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "knowledge_chunks: read" on public.knowledge_chunks for select to authenticated using (true);
create policy "knowledge_chunks: admin write" on public.knowledge_chunks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ───────────── Billing & usage ─────────────
-- Subscriptions: users read their own row; only the service role (Stripe webhook) writes.
create policy "subscriptions: read own or admin" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- stripe_events: no policies → service role only.

-- Usage events are append-only for users (no update/delete), so quotas cannot be reset client-side.
create policy "usage_events: read own or admin" on public.usage_events for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "usage_events: insert own" on public.usage_events for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ───────────── Support ─────────────
create policy "support_requests: read own or admin" on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "support_requests: insert own" on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "support_requests: admin update" on public.support_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "support_requests: admin delete" on public.support_requests for delete to authenticated
  using (public.is_admin());
