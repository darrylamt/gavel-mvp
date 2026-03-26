-- Add requires_cargo flag to products and auctions
-- Sellers mark items that need cargo delivery (bulky/heavy, over 10kg)
ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS requires_cargo boolean NOT NULL DEFAULT false;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS requires_cargo boolean NOT NULL DEFAULT false;

-- Add delivery_region to shop_orders for Dawurobo dispatch payload
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS delivery_region text NOT NULL DEFAULT '';
