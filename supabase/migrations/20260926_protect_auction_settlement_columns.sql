-- Stop sellers rewriting settlement state on their own auctions.
--
-- Live policy auctions_update_seller_or_admin lets a seller UPDATE their own
-- auction row, and RLS is row-level: every column was writable with the public
-- key, including paid, winner_id, winning_bid_id, current_price, status and
-- ends_at. A seller could mark an auction paid, pick the winner, or move the
-- close time after bids were in. The INSERT policy likewise let a seller create
-- an auction that already had a winner or was already paid.
--
-- Verified 2026-09-26: the only UPDATE the app performs under a user JWT is
-- attaching image_url/images right after creating an auction. Every other
-- write (seller edit route, admin edit route, settlement, payments, place_bid)
-- goes through the service role, which this trigger lets through unchanged.
-- Admins (profiles.role = 'admin', now itself protected) are also let through.
--
-- Allow-list, not deny-list: columns added later are protected by default.

create or replace function public.protect_auction_settlement_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Columns a seller may change on their own auction from the client.
  v_seller_editable text[] := array[
    'title', 'description', 'image_url', 'images', 'car_specs', 'embedding', 'source_url'
  ];
begin
  if public.jwt_is_service_role() or coalesce(public.is_admin(auth.uid()), false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A new auction starts unsettled, whatever the client sent.
    new.winner_id              := null;
    new.winning_bid_id         := null;
    new.paid                   := false;
    new.auction_payment_due_at := null;
    new.delivered              := false;
    new.delivery_confirmed_at  := null;
    new.delivery_confirmed_by  := null;
    return new;
  end if;

  if (to_jsonb(new) - v_seller_editable) is distinct from (to_jsonb(old) - v_seller_editable) then
    raise exception 'Only title, description, images and specs can be changed directly; other auction fields are managed by Gavel'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_auction_settlement_columns() from public, anon, authenticated;

drop trigger if exists protect_auction_settlement_columns on public.auctions;

create trigger protect_auction_settlement_columns
before insert or update on public.auctions
for each row
execute function public.protect_auction_settlement_columns();

-- Rollback: drop trigger if exists protect_auction_settlement_columns on public.auctions;
