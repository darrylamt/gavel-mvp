-- Ensure shop_products can be linked to first-class shops
alter table public.shop_products
  add column if not exists shop_id uuid references public.shops(id) on delete set null;

create index if not exists idx_shop_products_shop_id
  on public.shop_products(shop_id);

-- Seed missing shops from existing seller/product data
with candidate_owners as (
  select distinct sp.created_by as owner_id
  from public.shop_products sp
  where sp.created_by is not null

  union

  select distinct sa.user_id as owner_id
  from public.seller_applications sa
  where sa.status = 'approved'
),
missing_owners as (
  select co.owner_id
  from candidate_owners co
  left join public.shops sh on sh.owner_id = co.owner_id
  where sh.id is null
),
shop_seed as (
  select
    mo.owner_id,
    coalesce(nullif(trim(p.username), ''), 'Seller Shop') as shop_name,
    regexp_replace(
      lower(
        coalesce(
          nullif(trim(p.username), ''),
          'shop-' || left(mo.owner_id::text, 8)
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ) || '-' || left(mo.owner_id::text, 6) as shop_slug
  from missing_owners mo
  left join public.profiles p on p.id = mo.owner_id
)
insert into public.shops (owner_id, name, slug, status)
select
  ss.owner_id,
  ss.shop_name,
  trim(both '-' from ss.shop_slug),
  'active'
from shop_seed ss;

-- Backfill product -> shop links using shop owner mapping
with ranked_shops as (
  select
    sh.id,
    sh.owner_id,
    row_number() over (
      partition by sh.owner_id
      order by sh.created_at desc nulls last, sh.id desc
    ) as rank_by_owner
  from public.shops sh
)
update public.shop_products sp
set shop_id = rs.id
from ranked_shops rs
where rs.rank_by_owner = 1
  and sp.shop_id is null
  and sp.created_by = rs.owner_id;
