-- CookPilot · 0002 · Users, profiles, preferences
--
-- "users" is Supabase's managed auth.users table (passwords are never stored by CookPilot).
-- public.profiles extends it with application data; a trigger keeps them in sync.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  locale text not null default 'en' check (locale in ('en', 'fr')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role = 'admin';
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  measurement_system text not null default 'metric' check (measurement_system in ('metric', 'imperial')),
  temperature_unit text not null default 'C' check (temperature_unit in ('C', 'F')),
  cuisines text[] not null default '{}',
  allergies text[] not null default '{}',
  diets text[] not null default '{}',
  dislikes text[] not null default '{}',
  experience text check (experience in ('beginner', 'intermediate', 'advanced')),
  servings integer not null default 2 check (servings between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- Admin check used by RLS policies. SECURITY DEFINER so it can read profiles without recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- Users may edit their own profile but can never change their own role.
-- Sessions without a JWT (SQL editor, service role) are trusted: that is how the first admin is bootstrapped.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'Only an administrator can change a role' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Create the profile + preferences rows whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'en');
begin
  insert into public.profiles (id, email, display_name, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''),
    case when requested_locale in ('en', 'fr') then requested_locale else 'en' end
  )
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets a signed-in user erase their account (and, by cascade, all their data) without the service role.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
