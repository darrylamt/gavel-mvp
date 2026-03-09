-- Create payouts table for tracking seller payouts with escrow/hold functionality
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.shop_orders(id) on delete set null,
  auction_id uuid references public.auctions(id) on delete set null,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  payout_amount numeric(12,2) not null check (payout_amount >= 0),
  recipient_code text not null,
  transfer_code text,
  status text not null default 'pending' check (status in (
    'pending',
    'on_hold',
    'processing',
    'success',
    'failed',
    'reversed'
  )),
  hold_reason text,
  held_by uuid references public.profiles(id) on delete set null,
  held_at timestamptz,
  payout_trigger text check (payout_trigger in (
    'buyer_confirmed',
    'auto_released',
    'admin_released'
  )),
  scheduled_release_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_payouts_order_id on public.payouts(order_id);
create index if not exists idx_payouts_auction_id on public.payouts(auction_id);
create index if not exists idx_payouts_seller_id on public.payouts(seller_id);
create index if not exists idx_payouts_buyer_id on public.payouts(buyer_id);
create index if not exists idx_payouts_status on public.payouts(status);
create index if not exists idx_payouts_scheduled_release 
  on public.payouts(scheduled_release_at) 
  where status = 'pending' and scheduled_release_at is not null;

-- RLS policies for payouts
alter table public.payouts enable row level security;

-- Sellers can view their own payouts
create policy "Sellers can view their own payouts"
  on public.payouts
  for select
  using (auth.uid() = seller_id);

-- Buyers can view payouts for their purchases
create policy "Buyers can view their payouts"
  on public.payouts
  for select
  using (auth.uid() = buyer_id);

-- Service role can insert/update payouts (API routes use service role)
-- No user-level insert/update policies needed

-- Admins can view all payouts
create policy "Admins can view all payouts"
  on public.payouts
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update payouts (for hold/release actions)
create policy "Admins can update payouts"
  on public.payouts
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Update timestamp trigger
create or replace function public.update_payouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payouts_updated_at
  before update on public.payouts
  for each row
  execute function public.update_payouts_updated_at();
