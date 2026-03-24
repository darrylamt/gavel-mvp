-- Dawurobo delivery integration
-- Adds Dawurobo tracking columns to shop_orders and creates delivery_events table

-- 1. Add Dawurobo columns to shop_orders
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS dawurobo_order_id     text UNIQUE,
  ADD COLUMN IF NOT EXISTS dawurobo_status       text,
  ADD COLUMN IF NOT EXISTS delivery_address      text,
  ADD COLUMN IF NOT EXISTS delivery_city         text,
  ADD COLUMN IF NOT EXISTS delivery_notes        text,
  ADD COLUMN IF NOT EXISTS buyer_full_name       text,
  ADD COLUMN IF NOT EXISTS buyer_phone           text;

-- Index for webhook lookups by dawurobo_order_id
CREATE INDEX IF NOT EXISTS idx_shop_orders_dawurobo_order_id
  ON shop_orders (dawurobo_order_id)
  WHERE dawurobo_order_id IS NOT NULL;

-- 2. Create delivery_events table for timeline tracking
CREATE TABLE IF NOT EXISTS delivery_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  status       text NOT NULL,
  description  text,
  timestamp    timestamptz NOT NULL DEFAULT now(),
  raw_payload  jsonb
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_order_id ON delivery_events (order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_timestamp ON delivery_events (order_id, timestamp DESC);

-- RLS
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;

-- Buyers can read events for their own orders
CREATE POLICY "buyer_read_delivery_events"
  ON delivery_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_orders
      WHERE shop_orders.id = delivery_events.order_id
        AND shop_orders.user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "admin_all_delivery_events"
  ON delivery_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
