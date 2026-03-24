-- Add delivery fee and priority columns to shop_orders
-- These are populated at checkout time from the Dawurobo estimate the buyer selected.

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS delivery_fee      numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_priority text          NOT NULL DEFAULT 'standard';
