-- CookPilot · 0004 · Recipes

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid references auth.users (id) on delete cascade,   -- null = catalogue recipe
  status text not null default 'draft' check (status in ('draft', 'published', 'private', 'archived')),
  cover_image text,
  illustration text,
  category text not null,
  cuisine text,
  dietary text[] not null default '{}',
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'advanced')),
  device_category text not null references public.device_categories (slug) on update cascade,
  programs text[] not null default '{}',
  -- Provenance: 'verified' is reserved for recipes physically tested on an exact model.
  provenance text not null default 'generated' check (provenance in ('verified', 'adapted', 'generated')),
  author_name text not null default 'CookPilot',
  is_demo boolean not null default false,
  current_version_id uuid,
  rating_average numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_status_idx on public.recipes (status);
create index recipes_owner_idx on public.recipes (owner_id) where owner_id is not null;
create index recipes_device_category_idx on public.recipes (device_category);
create index recipes_dietary_idx on public.recipes using gin (dietary);
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  version integer not null,
  servings integer not null check (servings between 1 and 24),
  prep_minutes integer not null default 0 check (prep_minutes >= 0),
  cook_minutes integer not null default 0 check (cook_minutes >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recipe_id, version)
);
alter table public.recipes
  add constraint recipes_current_version_fk
  foreign key (current_version_id) references public.recipe_versions (id) on delete set null;

create table public.recipe_translations (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  locale text not null check (locale in ('en', 'fr')),
  title text not null,
  description text not null default '',
  accessories jsonb not null default '[]',
  safety_notes jsonb not null default '[]',
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, locale)
);
create trigger recipe_translations_set_updated_at before update on public.recipe_translations
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.recipe_versions (id) on delete cascade,
  locale text not null check (locale in ('en', 'fr')),
  position integer not null,
  name text not null,
  quantity numeric,           -- canonical metric quantity; null = "to taste"
  unit text,
  note text,
  optional boolean not null default false,
  unique (version_id, locale, position)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.recipe_versions (id) on delete cascade,
  locale text not null check (locale in ('en', 'fr')),
  position integer not null,
  instruction text not null,
  program text,               -- capability key, e.g. 'air-fry'
  level text,                 -- e.g. 'HIGH' for level-based appliances
  temperature_c numeric,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  tip text,
  unique (version_id, locale, position)
);

create table public.recipe_compatibility (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  device_model_id uuid not null references public.device_models (id) on delete cascade,
  tested boolean not null default false,   -- true only after a physical test on this exact model
  notes text,
  created_at timestamptz not null default now(),
  primary key (recipe_id, device_model_id)
);
create index recipe_compatibility_device_idx on public.recipe_compatibility (device_model_id);

create table public.recipe_feedback (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  device_model_id uuid references public.device_models (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);
create index recipe_feedback_recipe_idx on public.recipe_feedback (recipe_id);
create trigger recipe_feedback_set_updated_at before update on public.recipe_feedback
  for each row execute function public.set_updated_at();

create or replace function public.refresh_recipe_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.recipe_id, old.recipe_id);
begin
  update public.recipes r
  set rating_average = s.avg_rating, rating_count = s.rating_count
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(rating)::int as rating_count
    from public.recipe_feedback where recipe_id = target and rating is not null
  ) s
  where r.id = target;
  return null;
end;
$$;
create trigger recipe_feedback_refresh_rating
  after insert or update or delete on public.recipe_feedback
  for each row execute function public.refresh_recipe_rating();

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  recipe_title text not null default '',
  device_model_id uuid references public.device_models (id) on delete set null,
  servings integer not null default 2,
  completed_at timestamptz not null default now()
);
create index cooking_sessions_user_idx on public.cooking_sessions (user_id, completed_at desc);
