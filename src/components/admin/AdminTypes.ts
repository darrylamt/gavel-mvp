export type DashboardUser = {
  id: string
  username: string | null
  phone: string | null
  token_balance: number | null
  role: string | null
}

export type DashboardAuction = {
  id: string
  title: string
  status: string | null
  current_price: number | null
  reserve_price: number | null
  starts_at?: string | null
  ends_at?: string | null
  sale_source: string | null
  seller_name: string | null
  seller_phone: string | null
  seller_expected_amount: number | null
  created_at?: string | null
}

export type DashboardSeller = {
  userId: string
  name: string
  phone: string
  totalProducts: number
}

export type DashboardPurchase = {
  orderId: string
  orderCreatedAt: string
  orderTotalAmount: number
  productTitle: string
  quantity: number
  sellerName: string | null
  sellerShopName: string | null
  sellerPayoutProvider: string | null
  sellerPayoutAccountName: string | null
  sellerPayoutAccountNumber: string | null
}

/**
 * Auctions that ended with qualifying bids (reserve met or no reserve) but were
 * never assigned a winner. This should normally be empty; a non-empty list means
 * the settlement flow failed for those auctions and they need attention.
 */
export type StuckAuction = {
  id: string
  title: string
  topBid: number
  bidCount: number
  reservePrice: number | null
  endsAt: string | null
}

export type DashboardPayload = {
  users: DashboardUser[]
  auctions: DashboardAuction[]
  sellers: DashboardSeller[]
  purchases: DashboardPurchase[]
  stuckAuctions: StuckAuction[]
}
