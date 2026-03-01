-- Update seller_delivery_zones table to new schema
-- This migration handles the transition from zone_name to location_value

-- Drop existing table and recreate with new schema
drop table if exists public.seller_delivery_zones cascade;

-- Create seller delivery zones table with new schema
create table public.seller_delivery_zones (
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
create index idx_seller_delivery_zones_seller_id on public.seller_delivery_zones(seller_id);
create index idx_seller_delivery_zones_seller_enabled on public.seller_delivery_zones(seller_id, is_enabled);

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

create trigger seller_delivery_zones_set_updated_at
before update on public.seller_delivery_zones
for each row
execute function public.set_seller_delivery_zones_updated_at();

-- Create RLS policies
alter table public.seller_delivery_zones enable row level security;

create policy "Sellers can view their own delivery zones"
  on public.seller_delivery_zones
  for select
  to authenticated
  using (auth.uid() = seller_id);

create policy "Sellers can update their own delivery zones"
  on public.seller_delivery_zones
  for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create policy "Sellers can insert their own delivery zones"
  on public.seller_delivery_zones
  for insert
  to authenticated
  with check (auth.uid() = seller_id);

create policy "Sellers can delete their own delivery zones"
  on public.seller_delivery_zones
  for delete
  to authenticated
  using (auth.uid() = seller_id);
