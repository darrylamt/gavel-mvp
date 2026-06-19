-- Gavel is repositioning to an auctions-only platform; the fixed-price shop is
-- being retired (hidden, not deleted). Add an `archived` flag to shop_products
-- and archive the entire existing catalogue. Products remain in the database and
-- nothing is dropped, so this is fully reversible.
--
-- To bring the catalogue back when re-enabling the shop:
--   UPDATE public.shop_products SET archived = false;
alter table public.shop_products
  add column if not exists archived boolean not null default false;

-- Hide every existing product from the live site. shop_orders is intentionally
-- left untouched so past orders, payouts, and history remain intact.
update public.shop_products set archived = true;

-- Index to keep `archived = false` filters fast once the shop is re-enabled.
create index if not exists idx_shop_products_archived on public.shop_products (archived);
