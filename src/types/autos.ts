export type AutoListing = {
  id: string
  seller_id: string
  listing_type: 'sale' | 'auction'
  vehicle_type: 'car' | 'suv' | 'truck' | 'bus' | 'motorbike' | 'heavy_equipment'
  title: string
  description: string | null
  make: string
  model: string
  year: number
  price: number | null
  reserve_price: number | null
  condition: 'brand_new' | 'foreign_used' | 'ghana_used'
  mileage: number | null
  transmission: 'automatic' | 'manual' | null
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | null
  drive_type: '2wd' | '4wd' | 'awd' | null
  engine_size: string | null
  color: string | null
  previous_owners: number
  roadworthy: boolean
  roadworthy_expiry: string | null
  customs_cleared: boolean
  vin: string | null
  images: string[] | null
  video_url: string | null
  region: string | null
  city: string | null
  status: 'pending' | 'active' | 'sold' | 'archived'
  featured: boolean
  views: number
  commission_rate: number
  created_at: string
  updated_at: string
}

export type AutoAuction = {
  id: string
  auto_id: string
  seller_id: string
  reserve_price: number
  current_bid: number | null
  highest_bidder_id: string | null
  bid_count: number
  start_time: string
  end_time: string
  status: 'upcoming' | 'active' | 'ended' | 'sold' | 'failed'
  created_at: string
}

export type AutoListingWithAuction = AutoListing & {
  auto_auctions: AutoAuction[] | null
  profiles: { username: string | null; avatar_url: string | null } | null
}
