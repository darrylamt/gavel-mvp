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
  name: string
  phone: string
  totalAuctions: number
}

export type DashboardPayload = {
  users: DashboardUser[]
  auctions: DashboardAuction[]
  sellers: DashboardSeller[]
}
