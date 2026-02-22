alter table public.shop_order_items
  add column if not exists delivered_by_seller boolean not null default false,
  add column if not exists delivered_at timestamptz;

create index if not exists idx_shop_order_items_delivered_by_seller
  on public.shop_order_items(delivered_by_seller);
