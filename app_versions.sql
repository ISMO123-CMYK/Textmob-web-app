-- Run this ONCE in the Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor)
-- Creates the table that drives in-app updates.
-- The admin "App Version" card in /asilfcismail manages the single 'current' row.

CREATE TABLE IF NOT EXISTS public.app_versions (
  id text PRIMARY KEY DEFAULT 'current',
  version text NOT NULL,
  apk_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  grace_days integer NOT NULL DEFAULT 7,
  published_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Optional: allow anon key to read (the server reads it server-side, so this is
-- not strictly needed — leave commented unless you prefer direct reads).
-- alter table public.app_versions enable row level security;
-- create policy "app_versions public read" on public.app_versions
--   for select using (true);