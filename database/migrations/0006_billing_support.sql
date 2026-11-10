-- CookPilot · 0006 · Subscriptions, usage metering, support requests

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  billing_interval text check (billing_interval in ('month', 'year')),
  status text not null default 'none'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'none')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Processed Stripe webhook events (idempotency).
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chef_message', 'recipe_generation', 'embedding')),
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index usage_events_user_kind_idx on public.usage_events (user_id, kind, created_at desc);
create index usage_events_created_idx on public.usage_events (created_at desc);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  kind text not null check (kind in ('missing_device', 'feedback', 'support')),
  subject text not null check (char_length(subject) <= 200),
  message text not null check (char_length(message) <= 4000),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_requests_status_idx on public.support_requests (status, created_at desc);
create trigger support_requests_set_updated_at before update on public.support_requests
  for each row execute function public.set_updated_at();

-- Plan a user is entitled to right now (mirrors src/lib/billing/plans.ts → resolvePlan).
create or replace function public.current_plan(target_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select 'pro' from public.subscriptions s
    where s.user_id = target_user
      and s.plan = 'pro'
      and (s.status in ('active', 'trialing', 'past_due')
           or (s.status = 'canceled' and s.current_period_end > now()))
  ), 'free');
$$;
revoke all on function public.current_plan(uuid) from public, anon;
grant execute on function public.current_plan(uuid) to authenticated, service_role;

-- Defence in depth: plan limits are also enforced in the database, so they hold even if
-- someone calls the Supabase API directly with their own session.
create or replace function public.enforce_device_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_plan(new.user_id) = 'free'
     and (select count(*) from public.user_devices where user_id = new.user_id) >= 1 then
    raise exception 'DEVICE_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger user_devices_enforce_limit before insert on public.user_devices
  for each row execute function public.enforce_device_limit();

create or replace function public.enforce_favorite_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_plan(new.user_id) = 'free'
     and (select count(*) from public.favorites where user_id = new.user_id) >= 10 then
    raise exception 'FAVORITE_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger favorites_enforce_limit before insert on public.favorites
  for each row execute function public.enforce_favorite_limit();
