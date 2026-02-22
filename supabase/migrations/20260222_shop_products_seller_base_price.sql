alter table public.shop_products
  add column if not exists seller_base_price numeric(12,2)
  check (seller_base_price is null or seller_base_price >= 0);
