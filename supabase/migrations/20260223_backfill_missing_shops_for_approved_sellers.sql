with latest_approved as (
  select distinct on (sa.user_id)
    sa.user_id,
    nullif(trim(sa.business_name), '') as business_name,
    sa.created_at
  from public.seller_applications sa
  join public.profiles p on p.id = sa.user_id
  where sa.status = 'approved'
    and coalesce(p.role, 'user') <> 'admin'
  order by sa.user_id, sa.created_at desc
),
missing_shop_users as (
  select la.user_id, coalesce(la.business_name, 'Seller Shop') as shop_name
  from latest_approved la
  left join public.shops sh on sh.owner_id = la.user_id
  where sh.id is null
),
seed as (
  select
    msu.user_id,
    msu.shop_name,
    trim(both '-' from regexp_replace(lower(msu.shop_name), '[^a-z0-9]+', '-', 'g')) as base_slug
  from missing_shop_users msu
)
insert into public.shops (owner_id, name, slug, status)
select
  s.user_id,
  s.shop_name,
  coalesce(nullif(s.base_slug, ''), 'shop') || '-' || left(s.user_id::text, 6),
  'active'
from seed s;
