-- Add delivery confirmation fields to shop_orders
alter table public.shop_orders
  add column if not exists delivered boolean not null default false,
  add column if not exists delivery_confirmed_at timestamptz,
  add column if not exists delivery_confirmed_by uuid references public.profiles(id) on delete set null;

-- Add delivery confirmation fields for auction payments (on auctions table)
alter table public.auctions
  add column if not exists delivered boolean not null default false,
  add column if not exists delivery_confirmed_at timestamptz,
  add column if not exists delivery_confirmed_by uuid references public.profiles(id) on delete set null;

-- Indexes for querying
create index if not exists idx_shop_orders_delivered on public.shop_orders(delivered);
create index if not exists idx_auctions_delivered on public.auctions(delivered);
