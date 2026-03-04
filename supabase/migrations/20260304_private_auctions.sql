-- Add columns for private auction functionality
alter table public.auctions
  add column if not exists is_private boolean not null default false,
  add column if not exists access_code text;

-- Create a table to track which users have accessed private auctions
create table if not exists public.private_auction_access (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete cascade,
  viewer_key text not null,
  accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(auction_id, viewer_key)
);

-- Create index for efficient lookups
create index if not exists private_auction_access_auction_id_idx
  on public.private_auction_access (auction_id);

create index if not exists private_auction_access_user_id_idx
  on public.private_auction_access (user_id);

-- Add RLS policies for private_auction_access table
alter table public.private_auction_access enable row level security;

create policy "anyone_can_read_private_auction_access"
  on public.private_auction_access for select
  using (true);

create policy "users_can_insert_own_access"
  on public.private_auction_access for insert
  with check (
    (user_id = auth.uid()) or (user_id is null)
  );
