-- Create seller delivery zones table
create table if not exists public.seller_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  location_value text not null, -- Format: "region:location" e.g. "Greater Accra:Osu"
  delivery_price numeric(10,2) not null check (delivery_price >= 0),
  delivery_time_days integer not null default 2 check (delivery_time_days >= 1),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one location per seller
  unique(seller_id, location_value)
);

-- Create indexes
create index if not exists idx_seller_delivery_zones_seller_id on public.seller_delivery_zones(seller_id);
create index if not exists idx_seller_delivery_zones_seller_enabled on public.seller_delivery_zones(seller_id, is_enabled);

-- Create trigger to update updated_at
create or replace function public.set_seller_delivery_zones_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seller_delivery_zones_set_updated_at on public.seller_delivery_zones;
create trigger seller_delivery_zones_set_updated_at
before update on public.seller_delivery_zones
for each row
execute function public.set_seller_delivery_zones_updated_at();

-- Create RLS policies
alter table public.seller_delivery_zones enable row level security;

drop policy if exists "Sellers can view their own delivery zones" on public.seller_delivery_zones;
create policy "Sellers can view their own delivery zones"
  on public.seller_delivery_zones
  for select
  to authenticated
  using (auth.uid() = seller_id);

drop policy if exists "Sellers can update their own delivery zones" on public.seller_delivery_zones;
create policy "Sellers can update their own delivery zones"
  on public.seller_delivery_zones
  for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can insert their own delivery zones" on public.seller_delivery_zones;
create policy "Sellers can insert their own delivery zones"
  on public.seller_delivery_zones
  for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete their own delivery zones" on public.seller_delivery_zones;
create policy "Sellers can delete their own delivery zones"
  on public.seller_delivery_zones
  for delete
  to authenticated
  using (auth.uid() = seller_id);

-- Ensure every seller has delivery zone entries (initialize on first access via application code)
-- This is handled by the application when a seller first accesses the delivery settings page
