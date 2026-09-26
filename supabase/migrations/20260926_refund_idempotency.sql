-- One refund per user per auction, enforced by the database.
--
-- refundLosingBidders() used to check "has any refund row for this auction been
-- written?" and stop if so. Two settlement runs at the same moment could both
-- pass that check and refund everyone twice; a run that failed partway blocked
-- the remaining users from ever being refunded.
--
-- The code now writes the ledger row first and credits only if that insert
-- succeeds. This index makes the insert the idempotency guard: a duplicate gets
-- 23505 and the credit is skipped.
--
-- Verified 2026-09-26: no existing duplicate (user_id, reference) refund rows,
-- so this builds cleanly.

create unique index if not exists token_transactions_refund_once
  on public.token_transactions (user_id, reference)
  where type = 'refund';
