-- Capture schema that existed only in the Supabase dashboard.
--
-- These objects are live but were never in a migration, so a restore, branch or
-- fresh environment built from this repo would silently lack them (the same
-- class of problem as increment_tokens). Definitions below were read from the
-- live database on 2026-09-26 and are written to be no-ops against it.

-- ── payment_intents ──────────────────────────────────────────────────────────
-- Hubtel checkout has no metadata field, so init writes the payment's metadata
-- here keyed by clientReference (gvl_…) and the webhook/verify paths read it back.
create table if not exists public.payment_intents (
  id          text        primary key,
  provider    text        not null default 'hubtel',
  metadata    jsonb       not null default '{}'::jsonb,
  amount_ghs  numeric     not null,
  email       text        not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours')
);

alter table public.payment_intents enable row level security;

drop policy if exists "No public access" on public.payment_intents;
create policy "No public access" on public.payment_intents
  for all using (false);

-- ── auctions ─────────────────────────────────────────────────────────────────
alter table public.auctions enable row level security;

-- Note: this exposes every column of every auction to anyone. Private auction
-- access codes were moved off this table into auction_access_codes
-- (20260926_private_auction_access_codes_phase1/2.sql) for that reason. Never
-- add a secret column to auctions.
drop policy if exists "Public read auctions" on public.auctions;
create policy "Public read auctions" on public.auctions
  for select using (true);

-- Column-level limits on what a seller may change live in the
-- protect_auction_settlement_columns trigger (20260926_protect_auction_settlement_columns.sql).
drop policy if exists auctions_update_seller_or_admin on public.auctions;
create policy auctions_update_seller_or_admin on public.auctions
  for update to authenticated
  using (
    (select auth.uid()) = seller_id
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

-- ── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin((select auth.uid())));

-- token_balance and role are additionally locked by the
-- protect_privileged_profile_columns trigger (20260817_harden_token_and_role_writes.sql).
drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin((select auth.uid())))
  with check (id = (select auth.uid()) or public.is_admin((select auth.uid())));
