-- Ensure shops table exists with all required columns
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  cover_image_url text,
  payout_account_name text,
  payout_account_number text,
  payout_provider text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shops_owner_id on public.shops(owner_id);
create index if not exists idx_shops_slug on public.shops(slug);
create index if not exists idx_shops_status on public.shops(status);

-- Enable RLS
alter table public.shops enable row level security;

-- Allow anyone to view active shops
drop policy if exists "Anyone can view active shops" on public.shops;
create policy "Anyone can view active shops"
  on public.shops
  for select
  using (status = 'active');

-- Allow service role full access
drop policy if exists "Service role has full access" on public.shops;
create policy "Service role has full access"
  on public.shops
  for all
  to service_role
  using (true)
  with check (true);

-- Allow sellers to view their own shops
drop policy if exists "Sellers can view their own shops" on public.shops;
create policy "Sellers can view their own shops"
  on public.shops
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- Allow sellers to update their own shops
drop policy if exists "Sellers can update their own shops" on public.shops;
create policy "Sellers can update their own shops"
  on public.shops
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Create updated_at trigger
create or replace function public.set_shops_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
before update on public.shops
for each row
execute function public.set_shops_updated_at();
