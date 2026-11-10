-- CookPilot · 0003 · Appliance catalogue

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  manufacturer text not null,
  created_at timestamptz not null default now()
);

create table public.device_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,          -- {"en": "...", "fr": "..."}
  description jsonb not null default '{"en":"","fr":""}',
  created_at timestamptz not null default now()
);

create table public.device_models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand_id uuid not null references public.brands (id) on delete restrict,
  category_id uuid not null references public.device_categories (id) on delete restrict,
  name text not null,
  model_number text not null,
  region text not null default 'GLOBAL',
  description jsonb not null default '{"en":"","fr":""}',
  image_url text,
  specs jsonb not null default '[]',          -- [{key, label:{en,fr}, value}]
  missing_info jsonb not null default '[]',   -- [{en, fr}] — what is NOT documented yet
  verification_status text not null default 'incomplete'
    check (verification_status in ('verified', 'documented', 'partial', 'incomplete')),
  last_verified_at date,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, model_number, region)
);
create index device_models_category_idx on public.device_models (category_id);
create index device_models_brand_idx on public.device_models (brand_id);
create index device_models_published_idx on public.device_models (published) where published;
create trigger device_models_set_updated_at before update on public.device_models
  for each row execute function public.set_updated_at();

create table public.device_capabilities (
  id uuid primary key default gen_random_uuid(),
  device_model_id uuid not null references public.device_models (id) on delete cascade,
  kind text not null check (kind in ('program', 'accessory', 'feature')),
  key text not null,
  name jsonb not null,
  temp_min numeric,
  temp_max numeric,
  temp_unit text check (temp_unit in ('C', 'F')),
  levels text[] not null default '{}',
  notes jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (device_model_id, kind, key),
  check ((temp_min is null and temp_max is null) or temp_unit is not null)
);
create index device_capabilities_model_idx on public.device_capabilities (device_model_id);

create table public.device_sources (
  id uuid primary key default gen_random_uuid(),
  device_model_id uuid not null references public.device_models (id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'other' check (kind in ('manufacturer', 'manual', 'retailer', 'other')),
  accessed_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index device_sources_model_idx on public.device_sources (device_model_id);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_model_id uuid not null references public.device_models (id) on delete cascade,
  nickname text check (char_length(nickname) <= 60),
  is_favorite boolean not null default false,
  added_at timestamptz not null default now(),
  unique (user_id, device_model_id)
);
create index user_devices_user_idx on public.user_devices (user_id);
