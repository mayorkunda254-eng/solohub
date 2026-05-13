-- SoloHub Phase 5 Auth/Profile patch
-- Run this in Supabase SQL Editor before testing login roles.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'clipper' check (role in ('clipper', 'creator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles disable row level security;

-- Keep prototype tables open while developing locally.
-- Before launch, re-enable RLS and add secure policies.
alter table if exists public.campaigns disable row level security;
alter table if exists public.submissions disable row level security;
alter table if exists public.payouts disable row level security;

-- Optional helper index for email lookup.
create index if not exists profiles_email_idx on public.profiles(email);
