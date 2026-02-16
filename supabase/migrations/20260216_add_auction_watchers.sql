create table if not exists public.auction_watchers (
  auction_id uuid not null references public.auctions(id) on delete cascade,
  viewer_key text not null,
  user_id uuid null references auth.users(id) on delete set null,
  starred boolean not null default false,
  viewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (auction_id, viewer_key)
);

create index if not exists auction_watchers_auction_id_idx
  on public.auction_watchers (auction_id);

create index if not exists auction_watchers_user_id_idx
  on public.auction_watchers (user_id);
