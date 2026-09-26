-- Private auction access codes, phase 2 of 2: remove the public copy.
--
-- APPLY ONLY AFTER the code that reads auction_access_codes is deployed (the
-- release containing src/lib/auctionAccessCodes.ts and
-- /api/auctions/[id]/access-code). Before that, the deployed code still reads
-- auctions.access_code and private-auction access would stop working.
--
-- Also confirm the mobile app (gavel-app) does not select auctions.access_code
-- directly; if it does, it needs the same change first.
--
-- This is the step that actually closes the exposure: while the column exists
-- on the publicly readable auctions table, codes remain readable with the anon key.

drop trigger if exists mirror_auction_access_code on public.auctions;
drop function if exists public.mirror_auction_access_code();

-- Catch any code written to the old column after phase 1's backfill.
insert into public.auction_access_codes (auction_id, access_code)
select id, access_code
  from public.auctions
 where access_code is not null and btrim(access_code) <> ''
on conflict (auction_id) do update
  set access_code = excluded.access_code, updated_at = now();

alter table public.auctions drop column if exists access_code;
