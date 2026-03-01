alter table public.seller_delivery_zones enable row level security;

drop policy if exists "Public can view enabled seller delivery zones" on public.seller_delivery_zones;
create policy "Public can view enabled seller delivery zones"
  on public.seller_delivery_zones
  for select
  to anon, authenticated
  using (is_enabled = true);
