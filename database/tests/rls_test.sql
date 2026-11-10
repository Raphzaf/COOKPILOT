-- CookPilot · RLS and trigger behaviour tests
--
-- Runs against a database where the migrations (and seeds) have been applied.
-- Everything happens in one transaction that is rolled back: nothing is left behind.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/rls_test.sql
--
-- Helper: act as a signed-in user / anonymous visitor / trusted session.
begin;

create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $$;
create or replace function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create or replace function pg_temp.act_as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create or replace function pg_temp.expect_denied(statement text, label text) returns void language plpgsql as $$
declare affected bigint;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when others then
    return; -- rejected with an error: denied
  end;
  if affected > 0 then raise exception 'SECURITY: % was allowed (% rows)', label, affected; end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice@example.com', '{"locale":"fr","full_name":"Alice"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bob@example.com', '{}'),
  ('cccccccc-0000-4000-8000-000000000003', 'admin@example.com', '{}');

do $$
declare
  alice uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  bob uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  boss uuid := 'cccccccc-0000-4000-8000-000000000003';
  af101 uuid := '00000000-0000-4000-8000-de0000000003';
  nc301 uuid := '00000000-0000-4000-8000-de0000000005';
  wedges uuid := '00000000-0000-4000-8000-0ec100000002';
  n bigint;
  rid uuid;
  cid uuid;
begin
  -- 1. Sign-up trigger creates profile + preferences, honouring the requested locale.
  assert (select locale from public.profiles where id = alice) = 'fr', 'profile locale from metadata';
  assert (select display_name from public.profiles where id = alice) = 'Alice', 'profile name from metadata';
  assert (select count(*) from public.user_preferences where user_id in (alice, bob)) = 2, 'preferences rows created';
  assert (select role from public.profiles where id = bob) = 'user', 'default role is user';

  -- 2. Admin bootstrap from a trusted session (SQL editor / service role) works.
  update public.profiles set role = 'admin' where id = boss;
  assert (select role from public.profiles where id = boss) = 'admin', 'admin bootstrap';

  -- 3. Anonymous visitors: public catalogue only.
  perform pg_temp.act_as_anon();
  assert (select count(*) from public.device_models) = 7, 'anon reads published models';
  assert (select count(*) from public.device_capabilities) = 35, 'anon reads capabilities';
  assert (select count(*) from public.recipes) = 8, 'anon reads published recipes';
  assert (select count(*) from public.recipe_steps) = 64, 'anon reads published steps';
  assert (select count(*) from public.profiles) = 0, 'anon cannot read profiles';
  assert (select count(*) from public.knowledge_chunks) = 0, 'anon cannot read knowledge';
  perform pg_temp.expect_denied('insert into public.brands (slug, name, manufacturer) values (''x'',''x'',''x'')', 'anon insert brand');
  perform pg_temp.expect_denied('update public.device_models set published = false', 'anon update models');

  -- 4. Alice: her own data only.
  perform pg_temp.act_as(alice);
  assert (select count(*) from public.profiles) = 1, 'user sees only own profile';
  update public.profiles set display_name = 'Alice B.' where id = alice;
  perform pg_temp.expect_denied(format('update public.profiles set role = ''admin'' where id = %L', alice), 'self-promotion to admin');
  perform pg_temp.expect_denied(format('update public.profiles set display_name = ''hacked'' where id = %L', bob), 'editing another profile');
  insert into public.user_devices (user_id, device_model_id) values (alice, af101);
  perform pg_temp.expect_denied(format('insert into public.user_devices (user_id, device_model_id) values (%L, %L)', bob, af101), 'adding a device for someone else');
  -- Free plan: second appliance is refused by the database itself.
  perform pg_temp.expect_denied(format('insert into public.user_devices (user_id, device_model_id) values (%L, %L)', alice, nc301), 'second device on the free plan');
  insert into public.favorites (user_id, recipe_id) values (alice, wedges);
  insert into public.recipe_feedback (recipe_id, user_id, rating) values (wedges, alice, 4);
  insert into public.conversations (user_id, title) values (alice, 'private chat') returning id into cid;
  insert into public.messages (conversation_id, user_id, role, content) values (cid, alice, 'user', 'hello');
  insert into public.usage_events (user_id, kind) values (alice, 'recipe_generation');
  perform pg_temp.expect_denied('delete from public.usage_events', 'deleting usage events (quota reset)');
  perform pg_temp.expect_denied('update public.usage_events set created_at = now() - interval ''1 year''', 'back-dating usage events');
  perform pg_temp.expect_denied(format('insert into public.subscriptions (user_id, plan, status) values (%L, ''pro'', ''active'')', alice), 'self-granting Pro');
  perform pg_temp.expect_denied('update public.recipes set status = ''archived''', 'editing catalogue recipes');
  perform pg_temp.expect_denied('update public.device_capabilities set temp_max = 999', 'editing appliance specifications');
  -- A user may save a private AI recipe, but can never label it verified or publish it.
  insert into public.recipes (slug, owner_id, status, category, device_category, provenance) values ('alice-private', alice, 'private', 'main', 'air-fryer', 'generated') returning id into rid;
  insert into public.recipe_versions (recipe_id, version, servings) values (rid, 1, 2);
  perform pg_temp.expect_denied(format('insert into public.recipes (slug, owner_id, status, category, device_category, provenance) values (''v'', %L, ''private'', ''main'', ''air-fryer'', ''verified'')', alice), 'user-created verified recipe');
  perform pg_temp.expect_denied(format('insert into public.recipes (slug, owner_id, status, category, device_category, provenance) values (''p'', %L, ''published'', ''main'', ''air-fryer'', ''generated'')', alice), 'user-published recipe');
  perform pg_temp.expect_denied(format('update public.recipes set status = ''published'' where id = %L', rid), 'publishing own recipe');
  perform pg_temp.expect_denied(format('insert into public.recipe_compatibility (recipe_id, device_model_id, tested) values (%L, %L, true)', rid, af101), 'user marking a recipe as tested');
  assert public.current_plan(alice) = 'free', 'plan resolves to free';
  -- Retrieval function works with the caller's session (full-text fallback).
  select count(*) into n from public.match_knowledge_chunks(null, 'poultry:* | chicken:*', 5, 'en', array['AF101'], null);
  assert n > 0, 'full-text retrieval returns chunks';
  select count(*) into n from public.match_knowledge_chunks(null, 'program:*', 20, 'en', array['AF101'], array['capability']) where model_number is distinct from 'AF101';
  assert n = 0, 'retrieval never returns another model''s sheet';

  -- 5. Bob cannot see anything of Alice's.
  perform pg_temp.act_as(bob);
  assert (select count(*) from public.user_devices) = 0, 'devices are private';
  assert (select count(*) from public.conversations) = 0, 'conversations are private';
  assert (select count(*) from public.messages) = 0, 'messages are private';
  assert (select count(*) from public.favorites) = 0, 'favourites are private';
  assert (select count(*) from public.usage_events) = 0, 'usage is private';
  assert (select count(*) from public.recipes where slug = 'alice-private') = 0, 'private recipes are private';
  assert (select count(*) from public.recipe_versions where recipe_id = rid) = 0, 'private recipe versions are private';
  perform pg_temp.expect_denied(format('insert into public.messages (conversation_id, user_id, role, content) values (%L, %L, ''user'', ''x'')', cid, bob), 'writing into another user''s conversation');
  perform pg_temp.expect_denied(format('delete from public.conversations where id = %L', cid), 'deleting another user''s conversation');

  -- 6. Rating aggregate maintained by trigger; visible publicly.
  perform pg_temp.act_as_anon();
  assert (select rating_count from public.recipes where id = wedges) = 1, 'rating count updated';
  assert (select rating_average from public.recipes where id = wedges) = 4, 'rating average updated';

  -- 7. Admin manages the catalogue through RLS (no service role needed).
  perform pg_temp.act_as(boss);
  assert public.is_admin(), 'is_admin() true for admin';
  assert (select count(*) from public.profiles) = 3, 'admin reads all profiles';
  update public.device_models set published = false where id = nc301;
  update public.recipes set status = 'draft' where id = wedges;
  insert into public.knowledge_documents (title, source, language, doc_type, rights_note, content_hash) values ('t', 's', 'en', 'guide', 'own text', 'hash-test');
  perform pg_temp.act_as_anon();
  assert (select count(*) from public.device_models) = 6, 'unpublished model hidden from the public';
  assert (select count(*) from public.device_capabilities where device_model_id = nc301) = 0, 'capabilities of hidden model hidden';
  assert (select count(*) from public.recipes) = 7, 'draft recipe hidden from the public';
  assert (select count(*) from public.recipe_translations where recipe_id = wedges) = 0, 'draft recipe content hidden';

  -- 8. Pro (written by the trusted server only) lifts the appliance limit; cancellation keeps access until period end.
  perform pg_temp.act_as_owner();
  insert into public.subscriptions (user_id, plan, status, current_period_end) values (alice, 'pro', 'canceled', now() + interval '5 days');
  assert public.current_plan(alice) = 'pro', 'cancelled subscription stays pro until period end';
  update public.subscriptions set current_period_end = now() - interval '1 day' where user_id = alice;
  assert public.current_plan(alice) = 'free', 'expired subscription is free';
  update public.subscriptions set status = 'active' where user_id = alice;
  update public.device_models set published = true where id = nc301;
  perform pg_temp.act_as(alice);
  insert into public.user_devices (user_id, device_model_id) values (alice, nc301);
  assert (select count(*) from public.user_devices) = 2, 'pro can add more appliances';
  assert (select count(*) from public.subscriptions) = 1, 'user can read own subscription';

  -- 9. Account deletion erases everything by cascade.
  perform public.delete_my_account();
  perform pg_temp.act_as_owner();
  assert (select count(*) from auth.users where id = alice) = 0, 'auth user deleted';
  assert (select count(*) from public.profiles where id = alice) = 0, 'profile deleted';
  assert (select count(*) from public.user_devices where user_id = alice) = 0, 'devices deleted';
  assert (select count(*) from public.conversations where user_id = alice) = 0, 'conversations deleted';
  assert (select count(*) from public.messages where user_id = alice) = 0, 'messages deleted';
  assert (select count(*) from public.recipes where owner_id = alice) = 0, 'private recipes deleted';
  assert (select count(*) from public.usage_events where user_id = alice) = 0, 'usage deleted';
  assert (select count(*) from public.subscriptions where user_id = alice) = 0, 'subscription deleted';
  assert (select count(*) from public.recipes where id = wedges) = 1, 'catalogue untouched';

  raise notice 'ALL RLS TESTS PASSED';
end $$;

rollback;
