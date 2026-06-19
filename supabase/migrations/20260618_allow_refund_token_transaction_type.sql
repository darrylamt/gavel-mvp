-- The auction-settlement flow refunds losing bidders by inserting a
-- token_transactions row with type = 'refund'. The original CHECK constraint
-- only permitted ('purchase','bid','admin'), so every refund insert silently
-- failed (the application code never checked the insert error) — meaning no
-- losing bidder was ever actually refunded. Allow 'refund' as a valid type.
alter table public.token_transactions
  drop constraint if exists token_transactions_type_check;

alter table public.token_transactions
  add constraint token_transactions_type_check
  check (type = any (array['purchase'::text, 'bid'::text, 'admin'::text, 'refund'::text]));
