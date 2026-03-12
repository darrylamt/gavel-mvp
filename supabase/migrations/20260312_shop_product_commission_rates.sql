-- Per-product and per-variant commission rates for Buy Now listings.
alter table public.shop_products
  add column if not exists commission_rate numeric(5,2) not null default 10;

alter table public.shop_product_variants
  add column if not exists commission_rate numeric(5,2) not null default 10;

alter table public.shop_products
  drop constraint if exists shop_products_commission_rate_check;
alter table public.shop_products
  add constraint shop_products_commission_rate_check
  check (commission_rate >= 0 and commission_rate <= 100);

alter table public.shop_product_variants
  drop constraint if exists shop_product_variants_commission_rate_check;
alter table public.shop_product_variants
  add constraint shop_product_variants_commission_rate_check
  check (commission_rate >= 0 and commission_rate <= 100);

-- Backfill product commission based on price / seller_base_price ratio where available.
update public.shop_products
set commission_rate = round(((price / nullif(seller_base_price, 0)) - 1) * 100, 2)
where seller_base_price is not null
  and seller_base_price > 0
  and price is not null
  and price > 0;

-- Backfill variant commission based on price / seller_base_price ratio where available.
update public.shop_product_variants
set commission_rate = round(((price / nullif(seller_base_price, 0)) - 1) * 100, 2)
where seller_base_price is not null
  and seller_base_price > 0
  and price is not null
  and price > 0;

-- Clamp outliers produced by bad historical data to default.
update public.shop_products
set commission_rate = 10
where commission_rate < 0 or commission_rate > 100;

update public.shop_product_variants
set commission_rate = 10
where commission_rate < 0 or commission_rate > 100;
