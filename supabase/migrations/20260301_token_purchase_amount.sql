-- Track fiat value for token purchases
alter table public.token_transactions
  add column if not exists purchase_amount numeric;

alter table public.token_transactions
  add column if not exists purchase_currency text default 'GHS';

-- Backfill historical purchases using current pack pricing
update public.token_transactions
set purchase_amount = case
    when coalesce(amount, 0) = 35 then 10
    when coalesce(amount, 0) = 120 then 30
    when coalesce(amount, 0) = 250 then 55
    else round(coalesce(amount, 0) * (10.0 / 35.0), 2)
  end,
  purchase_currency = coalesce(purchase_currency, 'GHS')
where type = 'purchase'
  and (purchase_amount is null or purchase_amount = 0);
