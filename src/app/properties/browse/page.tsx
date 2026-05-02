'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import PropertyCard from '@/components/properties/PropertyCard'
import { GHANA_REGIONS, PROPERTY_TYPE_LABELS } from '@/lib/propertyUtils'
import type { PropertyListingWithAuction } from '@/types/properties'
import { SlidersHorizontal, X } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
]

export default function PropertyBrowsePage() {
  const params = useSearchParams()
  const [listings, setListings] = useState<PropertyListingWithAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [propertyType, setPropertyType] = useState(params.get('property_type') ?? '')
  const [listingType, setListingType] = useState(params.get('listing_type') ?? params.get('type') ?? '')
  const [region, setRegion] = useState(params.get('region') ?? '')
  const [minPrice, setMinPrice] = useState(params.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('max_price') ?? '')
  const [sort, setSort] = useState('newest')
  const [q, setQ] = useState(params.get('q') ?? '')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('property_listings')
        .select('*, property_auctions(*)')
        .eq('status', 'active')

      if (propertyType) query = query.eq('property_type', propertyType)
      if (listingType) query = query.eq('listing_type', listingType)
      if (region) query = query.eq('region', region)
      if (minPrice) query = query.gte('price', Number(minPrice))
      if (maxPrice) query = query.lte('price', Number(maxPrice))
      if (q) query = query.ilike('title', `%${q}%`)

      if (sort === 'price_asc') query = query.order('price', { ascending: true })
      else if (sort === 'price_desc') query = query.order('price', { ascending: false })
      else if (sort === 'most_viewed') query = query.order('views', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      const { data } = await query.limit(50)
      setListings((data ?? []) as PropertyListingWithAuction[])
      setLoading(false)
    }
    load()
  }, [propertyType, listingType, region, minPrice, maxPrice, sort, q])

  const clearFilters = () => {
    setPropertyType(''); setListingType(''); setRegion('')
    setMinPrice(''); setMaxPrice(''); setQ('')
  }

  const hasFilters = propertyType || listingType || region || minPrice || maxPrice || q

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Properties</h1>
          <p className="text-sm text-gray-500 mt-0.5">{loading ? 'Searching…' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowFilters(v => !v)} className="flex items-center gap-2 text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors md:hidden">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-60 flex-shrink-0`}>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 sticky top-24">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">Filters</p>
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            {/* Search */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Search</label>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Title or area..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#C9A84C]" />
            </div>

            {/* Property type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Property Type</label>
              <div className="space-y-1.5">
                {[{ value: '', label: 'All Types' }, ...Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))].map(o => (
                  <button key={o.value} onClick={() => setPropertyType(o.value)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${propertyType === o.value ? 'bg-[#0F2557] text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listing type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Listing Type</label>
              <div className="space-y-1.5">
                {[{ value: '', label: 'All' }, { value: 'sale', label: 'For Sale' }, { value: 'auction', label: 'Auction' }].map(o => (
                  <button key={o.value} onClick={() => setListingType(o.value)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${listingType === o.value ? 'bg-[#0F2557] text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white focus:ring-1 focus:ring-[#C9A84C]">
                <option value="">All Regions</option>
                {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Price Range (GHS)</label>
              <div className="flex gap-2">
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min" className="w-1/2 text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-[#C9A84C]" />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max" className="w-1/2 text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-[#C9A84C]" />
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[4/5]" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <p className="text-4xl mb-3">🏡</p>
              <p className="font-semibold text-gray-700">No properties found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((l) => (
                <PropertyCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
