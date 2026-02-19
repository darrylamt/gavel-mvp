-- Seller onboarding follow-up updates

-- 1) Additional verification media for seller applications
alter table public.seller_applications
  add column if not exists selfie_with_card_url text;

-- 2) Allow approved sellers/admins to create auctions under RLS
alter table public.auctions enable row level security;

drop policy if exists auctions_insert_seller_or_admin on public.auctions;
create policy auctions_insert_seller_or_admin
on public.auctions
for insert
to authenticated
with check (
  auth.uid() = seller_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('seller', 'admin')
  )
);
