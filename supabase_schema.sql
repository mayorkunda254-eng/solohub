-- SoloHub Phase 3 database schema
-- Run this in Supabase SQL Editor.
-- Prototype note: Row Level Security is disabled here so your local MVP works quickly.
-- Before public launch, turn RLS on and add proper user/role policies.

create extension if not exists "pgcrypto";

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  creator text not null default 'SoloHub Creator',
  category text not null default 'General',
  type text not null default 'Clipping',
  management text not null default 'Self Managed',
  pay_per_thousand numeric not null default 0,
  budget numeric not null default 0,
  remaining numeric not null default 0,
  minimum_views integer not null default 0,
  max_payout numeric not null default 0,
  platforms text[] not null default '{}',
  deadline date,
  beginner_friendly boolean not null default true,
  verified boolean not null default false,
  score integer not null default 70,
  status text not null default 'Pending Approval',
  description text,
  rules text[] not null default '{}',
  hashtags text[] not null default '{}',
  assets text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  campaign text not null,
  clipper text not null,
  platform text not null,
  post_url text not null,
  caption text,
  submitted_views integer not null default 0,
  approved_views integer not null default 0,
  payout numeric not null default 0,
  status text not null default 'Pending Review',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  clipper text not null,
  amount numeric not null default 0,
  mpesa_number text,
  status text not null default 'Pending',
  payment_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table campaigns disable row level security;
alter table submissions disable row level security;
alter table payouts disable row level security;

insert into campaigns (
  title, creator, category, type, management, pay_per_thousand, budget, remaining,
  minimum_views, max_payout, platforms, deadline, beginner_friendly, verified, score,
  status, description, rules, hashtags, assets
) values
(
  'MarkTradesFX Gold Trading Clips',
  'MarkTradesFX',
  'Forex Education',
  'Clipping',
  'SoloHub Managed',
  80,
  20000,
  17000,
  2000,
  1500,
  array['TikTok','Instagram Reels','YouTube Shorts'],
  '2026-06-15',
  true,
  true,
  88,
  'Live',
  'Create short educational clips from approved MarkTradesFX videos. Focus on gold analysis, market structure, risk management, and trading psychology.',
  array['Use only approved MarkTradesFX content.','Add captions to every clip.','Do not promise guaranteed profits.','Use the provided hashtags.','Post must remain public for review and payout.'],
  array['#MarkTradesFX','#ForexKenya','#GoldTrading','#XAUUSD','#TradingEducation'],
  array['Google Drive source folder','Logo pack','Approved caption examples']
),
(
  'Moh Bakes Food Promo Clips',
  'Moh Bakes and Treats',
  'Food & Bakery',
  'Clipping',
  'Self Managed',
  60,
  12000,
  9400,
  1500,
  1000,
  array['TikTok','Instagram Reels'],
  '2026-06-05',
  true,
  true,
  81,
  'Live',
  'Use approved bakery videos to create mouth-watering short clips that promote cakes, pastries, and custom orders around Nairobi.',
  array['Use provided videos only.','Show the product clearly in the first 3 seconds.','Mention Kasarani or Nairobi where natural.','Do not use another bakery brand name.'],
  array['#MohBakes','#NairobiBakes','#CakeKenya','#FoodTokKenya'],
  array['Cake videos','Product photos','Logo']
)
on conflict do nothing;
