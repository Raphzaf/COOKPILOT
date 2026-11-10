-- CookPilot · 0001 · Extensions
-- Run migrations in numeric order (Supabase SQL editor or `supabase db push`).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;
