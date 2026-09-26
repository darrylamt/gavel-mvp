-- Atomic bid placement.
--
-- /api/bids used to validate, insert the bid, raise current_price, and deduct
-- the token as separate queries with no transaction or lock. Under concurrent
-- bidding near close that allowed:
--   * current_price going BACKWARDS -- two bids both pass "higher than current
--     price", and whichever price UPDATE lands last wins, even the lower one
--   * free bids -- the deduction wrote a balance computed from an earlier read,
--     so two parallel bids by one user each wrote the same value (paid once)
--   * the "no two bids in a row" rule being bypassed by the same race
--   * a bid standing with no token deducted if a later write failed (none of
--     the writes were error-checked)
--
-- place_bid() does all of it in one transaction behind a row lock on the
-- auction, so bids on the same auction serialise. The route keeps its own
-- early checks for fast, friendly errors; this function re-checks everything
-- under the lock and is authoritative.
--
-- New rule enforced here: a seller cannot bid on their own auction (shill
-- bidding). The route had no such check.
--
-- Returns jsonb: { ok: true, previous_top_bidder, ends_at }
--            or { ok: false, code, message }

create or replace function public.place_bid(
  p_auction_id uuid,
  p_user_id    uuid,
  p_amount     numeric,
  p_token_cost integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auction     record;
  v_now         timestamptz := now();
  v_increment   numeric;
  v_latest_user uuid;
  v_prev_top    uuid;
  v_new_ends_at timestamptz;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid_amount', 'message', 'Invalid bid amount');
  end if;

  -- Serialise all bids on this auction.
  select id, seller_id, status, starts_at, ends_at, current_price, min_increment, max_increment
    into v_auction
    from auctions
   where id = p_auction_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Auction not found');
  end if;

  if v_auction.starts_at is not null and v_auction.starts_at > v_now then
    return jsonb_build_object('ok', false, 'code', 'not_started', 'message', 'Auction has not started yet');
  end if;

  if v_auction.status = 'ended' or v_auction.ends_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'ended', 'message', 'Auction has ended');
  end if;

  if v_auction.seller_id = p_user_id then
    return jsonb_build_object('ok', false, 'code', 'own_auction', 'message', 'You cannot bid on your own auction');
  end if;

  if p_amount <= v_auction.current_price then
    return jsonb_build_object('ok', false, 'code', 'too_low', 'message', 'Bid must be higher than current price');
  end if;

  v_increment := p_amount - v_auction.current_price;

  if coalesce(v_auction.min_increment, 1) > 0 and v_increment < coalesce(v_auction.min_increment, 1) then
    return jsonb_build_object('ok', false, 'code', 'below_min_increment',
      'message', format('Bid must be at least GHS %s above current price', coalesce(v_auction.min_increment, 1)));
  end if;

  if v_auction.max_increment is not null and v_auction.max_increment > 0 and v_increment > v_auction.max_increment then
    return jsonb_build_object('ok', false, 'code', 'above_max_increment',
      'message', format('Bid cannot be more than GHS %s above current price', v_auction.max_increment));
  end if;

  select user_id into v_latest_user
    from bids where auction_id = p_auction_id
   order by created_at desc limit 1;

  if v_latest_user = p_user_id then
    return jsonb_build_object('ok', false, 'code', 'twice_in_row',
      'message', 'You cannot bid twice in a row. Wait for another bidder.');
  end if;

  select user_id into v_prev_top
    from bids where auction_id = p_auction_id
   order by amount desc, created_at asc limit 1;

  -- Atomic deduction: never reads a stale balance, never goes negative.
  update profiles
     set token_balance = token_balance - p_token_cost
   where id = p_user_id
     and token_balance >= p_token_cost;

  if not found then
    if not exists (select 1 from profiles where id = p_user_id) then
      return jsonb_build_object('ok', false, 'code', 'no_profile', 'message', 'Profile not found');
    end if;
    return jsonb_build_object('ok', false, 'code', 'insufficient_tokens', 'message', 'Insufficient tokens to place a bid');
  end if;

  insert into bids (auction_id, user_id, amount)
  values (p_auction_id, p_user_id, p_amount);

  -- Anti-sniping: a bid in the final 60 seconds extends the close by 30.
  v_new_ends_at := case
    when v_auction.ends_at - v_now <= interval '60 seconds' then v_auction.ends_at + interval '30 seconds'
    else v_auction.ends_at
  end;

  update auctions
     set current_price = p_amount,
         ends_at       = v_new_ends_at,
         status        = case when status = 'scheduled' then 'active' else status end
   where id = p_auction_id;

  -- Refunds for losing bidders count bids per user, and this row is the ledger.
  insert into token_transactions (user_id, amount, type, reference)
  values (p_user_id, -p_token_cost, 'bid', 'bid:' || p_auction_id::text);

  return jsonb_build_object(
    'ok', true,
    'previous_top_bidder', v_prev_top,
    'ends_at', v_new_ends_at
  );
end;
$$;

-- Server-only: called by /api/bids with the service-role key after it has
-- verified the caller's token. p_user_id is trusted, so it must never be
-- callable from a client.
revoke execute on function public.place_bid(uuid, uuid, numeric, integer) from public, anon, authenticated;
grant  execute on function public.place_bid(uuid, uuid, numeric, integer) to service_role;
