-- Add per-auction control for bidder identity visibility
alter table public.auctions
  add column if not exists anonymous_bidding_enabled boolean not null default true;
