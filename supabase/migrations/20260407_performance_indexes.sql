-- Performance indexes for high-traffic query patterns
-- Run: supabase db push  OR  paste into Supabase SQL editor

-- bids: most queried by auction_id (every auction detail page load)
CREATE INDEX IF NOT EXISTS idx_bids_auction_id
  ON bids (auction_id);

-- bids: sorted by amount descending to find highest bidder
CREATE INDEX IF NOT EXISTS idx_bids_auction_id_amount
  ON bids (auction_id, amount DESC);

-- bids: sorted by created_at to find most recent bid per auction
CREATE INDEX IF NOT EXISTS idx_bids_auction_id_created_at
  ON bids (auction_id, created_at DESC);

-- shop_orders: buyer order history (user looks up their orders)
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id
  ON shop_orders (user_id);

-- shop_orders: sorted by date for order history pages
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id_created_at
  ON shop_orders (user_id, created_at DESC);

-- shop_order_items: seller dashboard loads all items by seller_id
CREATE INDEX IF NOT EXISTS idx_shop_order_items_seller_id
  ON shop_order_items (seller_id);

-- shop_order_items: seller dashboard sorted by date
CREATE INDEX IF NOT EXISTS idx_shop_order_items_seller_id_created_at
  ON shop_order_items (seller_id, created_at DESC);

-- payouts: seller earnings queries
CREATE INDEX IF NOT EXISTS idx_payouts_seller_id
  ON payouts (seller_id);

-- payouts: filter by status (pending, released, etc.)
CREATE INDEX IF NOT EXISTS idx_payouts_seller_id_status
  ON payouts (seller_id, status);

-- auctions: list page filters by status (active, ended, scheduled)
CREATE INDEX IF NOT EXISTS idx_auctions_status
  ON auctions (status);

-- auctions: list page sorted by created_at
CREATE INDEX IF NOT EXISTS idx_auctions_created_at
  ON auctions (created_at DESC);

-- auctions: filter out private auctions on public listing
CREATE INDEX IF NOT EXISTS idx_auctions_is_private
  ON auctions (is_private);

-- shop_products: store front filters by status
CREATE INDEX IF NOT EXISTS idx_shop_products_status
  ON shop_products (status);

-- shop_products: filter by category
CREATE INDEX IF NOT EXISTS idx_shop_products_category
  ON shop_products (category);

-- swaps: user swap history
CREATE INDEX IF NOT EXISTS idx_swap_submissions_user_id
  ON swap_submissions (user_id);
