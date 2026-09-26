-- Private auction access codes, phase 1 of 2: move them out of `auctions`.
--
-- auctions has a public read policy (using true), so auctions.access_code was
-- readable by anyone holding the public anon key — every private auction's code
-- was one API call away, which defeats private auctions entirely.
--
-- Codes move to auction_access_codes, which has RLS enabled and no policies:
-- only the service role (server routes) can read or write it.
--
-- Phase 1 (this file) is safe while the currently deployed code still reads and
-- writes auctions.access_code: rows are backfilled, and a trigger mirrors any
-- write to the old column into the new table, so old and new code agree.
--
-- Phase 2 (20260926_private_auction_access_codes_phase2.sql) drops the old
-- column and the mirror trigger. Apply it ONLY AFTER the code that reads the
-- new table is deployed — that is the step that actually closes the exposure.

create table if not exists public.auction_access_codes (
  auction_id  uuid        primary key references public.auctions(id) on delete cascade,
  access_code text        not null,
  updated_at  timestamptz not null default now()
);

alter table public.auction_access_codes enable row level security;
-- Deliberately no policies: anon and authenticated get nothing.

revoke all on public.auction_access_codes from anon, authenticated;
grant select, insert, update, delete on public.auction_access_codes to service_role;

insert into public.auction_access_codes (auction_id, access_code)
select id, access_code
  from public.auctions
 where access_code is not null and btrim(access_code) <> ''
on conflict (auction_id) do update
  set access_code = excluded.access_code, updated_at = now();

-- Transitional mirror: keeps the new table correct while old code still
-- writes auctions.access_code. Removed in phase 2.
create or replace function public.mirror_auction_access_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.access_code is not distinct from old.access_code then
    return new;
  end if;

  if new.access_code is null or btrim(new.access_code) = '' then
    delete from public.auction_access_codes where auction_id = new.id;
  else
    insert into public.auction_access_codes (auction_id, access_code)
    values (new.id, new.access_code)
    on conflict (auction_id) do update
      set access_code = excluded.access_code, updated_at = now();
  end if;

  return new;
end;
$$;

revoke execute on function public.mirror_auction_access_code() from public, anon, authenticated;

drop trigger if exists mirror_auction_access_code on public.auctions;
create trigger mirror_auction_access_code
after insert or update of access_code on public.auctions
for each row
execute function public.mirror_auction_access_code();
