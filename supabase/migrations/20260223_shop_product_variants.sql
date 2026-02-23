create table if not exists public.shop_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  color text,
  size text,
  sku text,
  price numeric(12,2) not null check (price >= 0),
  seller_base_price numeric(12,2) check (seller_base_price is null or seller_base_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_product_variants_product_id_idx
  on public.shop_product_variants(product_id);

create unique index if not exists shop_product_variants_product_sku_uidx
  on public.shop_product_variants(product_id, sku)
  where sku is not null;

insert into public.shop_product_variants (
  product_id,
  price,
  seller_base_price,
  stock,
  image_url,
  is_default,
  is_active
)
select
  p.id,
  p.price,
  p.seller_base_price,
  coalesce(p.stock, 0),
  p.image_url,
  true,
  (p.status <> 'archived')
from public.shop_products p
where not exists (
  select 1
  from public.shop_product_variants v
  where v.product_id = p.id
);

create or replace function public.sync_shop_product_from_variants(p_product_id uuid)
returns void
language plpgsql
as $$
declare
  v_min_price numeric(12,2);
  v_min_base_price numeric(12,2);
  v_total_stock integer;
begin
  select
    min(v.price),
    min(v.seller_base_price),
    coalesce(sum(v.stock), 0)
  into
    v_min_price,
    v_min_base_price,
    v_total_stock
  from public.shop_product_variants v
  where v.product_id = p_product_id
    and v.is_active = true;

  update public.shop_products p
  set
    price = coalesce(v_min_price, p.price),
    seller_base_price = coalesce(v_min_base_price, p.seller_base_price),
    stock = coalesce(v_total_stock, 0)
  where p.id = p_product_id;
end;
$$;

create or replace function public.trg_sync_shop_product_from_variants()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_shop_product_from_variants(old.product_id);
    return old;
  else
    perform public.sync_shop_product_from_variants(new.product_id);
    return new;
  end if;
end;
$$;

drop trigger if exists shop_product_variants_sync_product_trg on public.shop_product_variants;
create trigger shop_product_variants_sync_product_trg
after insert or update or delete on public.shop_product_variants
for each row execute function public.trg_sync_shop_product_from_variants();
