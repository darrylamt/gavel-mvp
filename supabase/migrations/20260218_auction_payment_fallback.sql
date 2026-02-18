alter table public.auctions
  add column if not exists auction_payment_due_at timestamptz,
  add column if not exists winner_id uuid;

-- winner_id may already exist in some environments; keep this migration idempotent.
