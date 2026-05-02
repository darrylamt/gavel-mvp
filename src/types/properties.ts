export type PropertyListing = {
  id: string
  seller_id: string
  listing_type: 'sale' | 'auction'
  property_type: 'land' | 'residential' | 'commercial' | 'industrial'
  title: string
  description: string | null
  price: number | null
  reserve_price: number | null
  region: string
  city: string
  neighborhood: string | null
  size_plots: number | null
  size_sqft: number | null
  size_sqm: number | null
  actual_dimensions: string | null
  title_type: 'freehold' | 'leasehold' | 'stool_land' | 'vested_land' | 'other' | null
  land_commission_number: string | null
  bedrooms: number | null
  bathrooms: number | null
  furnished: 'furnished' | 'unfurnished' | 'semi_furnished' | null
  amenities: string[] | null
  gps_coordinates: string | null
  video_url: string | null
  images: string[] | null
  is_licensed_auctioneer: boolean
  contact_person: string | null
  contact_phone: string | null
  status: 'pending' | 'active' | 'sold' | 'archived'
  featured: boolean
  views: number
  commission_rate: number
  created_at: string
  updated_at: string
}

export type PropertyAuction = {
  id: string
  property_id: string
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

export type PropertyListingWithAuction = PropertyListing & {
  property_auctions: PropertyAuction[] | null
  profiles: { username: string | null; avatar_url: string | null } | null
}
