-- Remove free starting tokens (initial 100) from all existing users
-- Preserve only tokens that were purchased

-- Step 1: Calculate each user's total purchased tokens
with purchased_tokens as (
  select 
    user_id,
    coalesce(sum(amount), 0) as total_purchased
  from public.token_transactions
  where type = 'purchase' and amount > 0
  group by user_id
)
-- Step 2: Update profiles to reflect only purchased tokens
update public.profiles
set token_balance = coalesce(pt.total_purchased, 0)
from purchased_tokens pt
where profiles.id = pt.user_id;

-- Step 3: Set token_balance to 0 for users who never purchased tokens
update public.profiles
set token_balance = 0
where id not in (
  select distinct user_id 
  from public.token_transactions 
  where type = 'purchase' and amount > 0
)
and token_balance > 0;

-- Note: This migration removes the free 100 starting tokens.
-- Users who purchased tokens will retain their purchased amounts.
-- The token_transactions table maintains the complete audit trail.
