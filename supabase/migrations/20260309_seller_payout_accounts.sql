-- Create seller_payout_accounts table for storing seller bank/momo account details
create table if not exists public.seller_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  account_type text not null check (account_type in ('bank', 'momo')),
  account_name text not null,
  account_number text not null,
  bank_code text,
  network_code text,
  recipient_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_seller_payout_accounts_seller_id 
  on public.seller_payout_accounts(seller_id);

create index if not exists idx_seller_payout_accounts_default 
  on public.seller_payout_accounts(seller_id, is_default) 
  where is_default = true;

-- RLS policies for seller_payout_accounts
alter table public.seller_payout_accounts enable row level security;

-- Sellers can view their own payout accounts
create policy "Sellers can view their own payout accounts"
  on public.seller_payout_accounts
  for select
  using (auth.uid() = seller_id);

-- Sellers can insert their own payout accounts
create policy "Sellers can insert their own payout accounts"
  on public.seller_payout_accounts
  for insert
  with check (auth.uid() = seller_id);

-- Sellers can update their own payout accounts
create policy "Sellers can update their own payout accounts"
  on public.seller_payout_accounts
  for update
  using (auth.uid() = seller_id);

-- Sellers can delete their own payout accounts
create policy "Sellers can delete their own payout accounts"
  on public.seller_payout_accounts
  for delete
  using (auth.uid() = seller_id);

-- Admins can view all payout accounts
create policy "Admins can view all payout accounts"
  on public.seller_payout_accounts
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
