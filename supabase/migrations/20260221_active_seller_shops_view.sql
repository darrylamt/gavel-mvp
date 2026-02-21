create or replace view public.active_seller_shops as
select
  sh.id,
  sh.owner_id,
  sh.slug,
  sh.name,
  sh.description,
  sh.logo_url,
  sh.cover_image_url,
  sh.status,
  sh.created_at,
  sh.updated_at
from public.shops sh
where sh.status = 'active'
  and exists (
    select 1
    from public.seller_applications sa
    where sa.user_id = sh.owner_id
      and sa.status = 'approved'
  )
  and exists (
    select 1
    from public.profiles p
    where p.id = sh.owner_id
      and coalesce(p.role, 'user') <> 'admin'
  );

grant select on public.active_seller_shops to anon, authenticated, service_role;
