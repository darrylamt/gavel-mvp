alter table public.profiles
  add column if not exists banned_at timestamp with time zone;

create index if not exists profiles_banned_at_idx
  on public.profiles(banned_at)
  where banned_at is not null;
