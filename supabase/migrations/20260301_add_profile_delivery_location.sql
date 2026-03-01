alter table public.profiles
  add column if not exists delivery_location text;

create index if not exists profiles_delivery_location_idx
  on public.profiles(delivery_location)
  where delivery_location is not null;
