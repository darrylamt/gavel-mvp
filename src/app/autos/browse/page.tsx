'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AutoCard from '@/components/autos/AutoCard'
import { GHANA_REGIONS } from '@/lib/propertyUtils'
import { AUTO_MAKES, VEHICLE_TYPES } from '@/lib/autoUtils'
import type { AutoListingWithAuction } from '@/types/autos'
import { SlidersHorizontal, X } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'year_desc', label: 'Year: Newest' },
  { value: 'most_viewed', label: 'Most Viewed' },
]

export default function AutoBrowsePage() {
  const params = useSearchParams()
  const [listings, setListings] = useState<AutoListingWithAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [vehicleType, setVehicleType] = useState(params.get('vehicle_type') ?? '')
  const [listingType, setListingType] = useState(params.get('listing_type') ?? params.get('type') ?? '')
  const [make, setMake] = useState(params.get('make') ?? '')
  const [condition, setCondition] = useState(params.get('condition') ?? '')
  const [region, setRegion] = useState(params.get('region') ?? '')
  const [minPrice, setMinPrice] = useState(params.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('max_price') ?? '')
  const [transmission, setTransmission] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('auto_listings')
        .select('*, auto_auctions(*)')
        .eq('status', 'active')

      if (vehicleType) query = query.eq('vehicle_type', vehicleType)
      if (listingType) query = query.eq('listing_type', listingType)
      if (make) query = query.eq('make', make)
      if (condition) query = query.eq('condition', condition)
      if (region) query = query.eq('region', region)
      if (minPrice) query = query.gte('price', Number(minPrice))
      if (maxPrice) query = query.lte('price', Number(maxPrice))
      if (transmission) query = query.eq('transmission', transmission)

      if (sort === 'price_asc') query = query.order('price', { ascending: true })
      else if (sort === 'price_desc') query = query.order('price', { ascending: false })
      else if (sort === 'year_desc') query = query.order('year', { ascending: false })
      else if (sort === 'most_viewed') query = query.order('views', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      const { data } = await query.limit(50)
      setListings((data ?? []) as AutoListingWithAuction[])
      setLoading(false)
    }
    load()
  }, [vehicleType, listingType, make, condition, region, minPrice, maxPrice, transmission, sort])

  const clearFilters = () => {
    setVehicleType(''); setListingType(''); setMake(''); setCondition('')
    setRegion(''); setMinPrice(''); setMaxPrice(''); setTransmission('')
  }

  const hasFilters = vehicleType || listingType || make || condition || region || minPrice || maxPrice || transmission

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Vehicles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{loading ? 'Searching…' : `${listings.length} vehicle${listings.length !== 1 ? 's' : ''} found`}</p>
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

            {/* Vehicle type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Vehicle Type</label>
              <div className="space-y-1.5">
                {[{ value: '', label: 'All Types' }, ...VEHICLE_TYPES.map(v => ({ value: v.value, label: v.label }))].map(o => (
                  <button key={o.value} onClick={() => setVehicleType(o.value)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${vehicleType === o.value ? 'bg-[#1A1A2E] text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Make */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Make</label>
              <select value={make} onChange={e => setMake(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white focus:ring-1 focus:ring-[#E63946]">
                <option value="">All Makes</option>
                {AUTO_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Condition</label>
              <div className="space-y-1.5">
                {[{ value: '', label: 'All' }, { value: 'brand_new', label: 'Brand New' }, { value: 'foreign_used', label: 'Foreign Used' }, { value: 'ghana_used', label: 'Ghana Used' }].map(o => (
                  <button key={o.value} onClick={() => setCondition(o.value)}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${condition === o.value ? 'bg-[#1A1A2E] text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
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
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${listingType === o.value ? 'bg-[#1A1A2E] text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transmission */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Transmission</label>
              <div className="flex gap-2">
                {['automatic', 'manual'].map(t => (
                  <button key={t} onClick={() => setTransmission(prev => prev === t ? '' : t)}
                    className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors capitalize ${transmission === t ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white focus:ring-1 focus:ring-[#E63946]">
                <option value="">All Regions</option>
                {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Price (GHS)</label>
              <div className="flex gap-2">
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min" className="w-1/2 text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-[#E63946]" />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max" className="w-1/2 text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-[#E63946]" />
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
              <p className="text-4xl mb-3">🚗</p>
              <p className="font-semibold text-gray-700">No vehicles found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((l) => (
                <AutoCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
