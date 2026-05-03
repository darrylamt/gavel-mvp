'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  GHANA_REGIONS, PROPERTY_AMENITIES, calculateSizes,
  getPropertyCommission, formatGhsPrice
} from '@/lib/propertyUtils'
import { Check, Layers, Home, Building2, Building } from 'lucide-react'

const PROPERTY_TYPE_CONFIG = [
  { value: 'land',        Icon: Layers,    label: 'Land' },
  { value: 'residential', Icon: Home,      label: 'Residential' },
  { value: 'commercial',  Icon: Building2, label: 'Commercial' },
  { value: 'industrial',  Icon: Building,  label: 'Industrial' },
]

const STEPS = ['Basic Details', 'Location & Size', 'Property Details', 'Pricing & Media']

type FormData = {
  listing_type: 'sale' | 'auction'
  property_type: 'land' | 'residential' | 'commercial' | 'industrial' | ''
  title: string
  description: string
  region: string
  city: string
  neighborhood: string
  size_plots: string
  size_sqft: string
  size_sqm: string
  actual_dimensions: string
  gps_coordinates: string
  title_type: string
  land_commission_number: string
  bedrooms: string
  bathrooms: string
  furnished: string
  amenities: string[]
  price: string
  reserve_price: string
  auction_start: string
  auction_end: string
  images: string
  video_url: string
  contact_person: string
  contact_phone: string
  is_licensed_auctioneer: boolean
}

const INITIAL: FormData = {
  listing_type: 'sale', property_type: '', title: '', description: '',
  region: '', city: '', neighborhood: '', size_plots: '', size_sqft: '', size_sqm: '',
  actual_dimensions: '', gps_coordinates: '', title_type: '', land_commission_number: '',
  bedrooms: '', bathrooms: '', furnished: '', amenities: [],
  price: '', reserve_price: '', auction_start: '', auction_end: '',
  images: '', video_url: '', contact_person: '', contact_phone: '',
  is_licensed_auctioneer: false,
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
            i < current ? 'bg-[#C9A84C] text-[#0F2557]' : i === current ? 'bg-[#0F2557] text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`hidden sm:block text-xs font-medium ${i === current ? 'text-[#0F2557]' : 'text-gray-400'}`}>{label}</span>
          {i < total - 1 && <div className={`w-6 h-0.5 ${i < current ? 'bg-[#C9A84C]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function PropertySellPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { router.replace('/properties'); return }
      setAuthorized(true)
    }
    checkAdmin()
  }, [router])

  if (!authorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A84C] border-t-transparent" />
      </div>
    )
  }

  const set = (key: keyof FormData, value: FormData[keyof FormData]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSizeChange = (value: string, unit: 'plots' | 'sqft' | 'sqm') => {
    if (!value || isNaN(Number(value))) {
      set(unit === 'plots' ? 'size_plots' : unit === 'sqft' ? 'size_sqft' : 'size_sqm', value)
      return
    }
    const sizes = calculateSizes(Number(value), unit)
    setForm(prev => ({
      ...prev,
      size_plots: String(Math.round(sizes.plots * 1000) / 1000),
      size_sqft: String(Math.round(sizes.sqft)),
      size_sqm: String(Math.round(sizes.sqm * 100) / 100),
    }))
  }

  const toggleAmenity = (a: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a],
    }))
  }

  const canNext = () => {
    if (step === 0) return form.property_type && form.title.trim()
    if (step === 1) return form.region && form.city.trim()
    return true
  }

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const imageUrls = form.images.split('\n').map(s => s.trim()).filter(Boolean)
    const price = form.listing_type === 'sale' ? Number(form.price) || null : null
    const reserve = form.listing_type === 'auction' ? Number(form.reserve_price) || 0 : null
    const commission = price ? getPropertyCommission(price) : 0.05

    const { data: listing, error: err } = await supabase
      .from('property_listings')
      .insert({
        seller_id: session.user.id,
        listing_type: form.listing_type,
        property_type: form.property_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        price,
        reserve_price: reserve,
        region: form.region,
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim() || null,
        size_plots: form.size_plots ? Number(form.size_plots) : null,
        size_sqft: form.size_sqft ? Number(form.size_sqft) : null,
        size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
        actual_dimensions: form.actual_dimensions.trim() || null,
        gps_coordinates: form.gps_coordinates.trim() || null,
        title_type: form.title_type || null,
        land_commission_number: form.land_commission_number.trim() || null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        furnished: form.furnished || null,
        amenities: form.amenities.length ? form.amenities : null,
        images: imageUrls.length ? imageUrls : null,
        video_url: form.video_url.trim() || null,
        contact_person: form.contact_person.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        is_licensed_auctioneer: form.is_licensed_auctioneer,
        commission_rate: commission,
      })
      .select('id')
      .single()

    if (err || !listing) {
      setError('Failed to submit listing. Please try again.')
      setSubmitting(false)
      return
    }

    if (form.listing_type === 'auction' && reserve && form.auction_start && form.auction_end) {
      await supabase.from('property_auctions').insert({
        property_id: listing.id,
        seller_id: session.user.id,
        reserve_price: reserve,
        start_time: form.auction_start,
        end_time: form.auction_end,
      })
    }

    router.push(`/properties/${listing.id}`)
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black text-gray-900">List Your Property</h1>
        <p className="text-sm text-gray-500 mt-1">Reach thousands of qualified buyers across Ghana</p>
      </div>

      <StepIndicator current={step} total={STEPS.length} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

        {/* Step 0: Basic Details */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Basic Details</h2>

            <div>
              <label className={labelCls}>Listing Type</label>
              <div className="flex gap-2">
                {(['sale', 'auction'] as const).map(t => (
                  <button key={t} onClick={() => set('listing_type', t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-colors ${form.listing_type === t ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {t === 'sale' ? 'For Sale' : 'Auction'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Property Type</label>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_TYPE_CONFIG.map(({ value, Icon, label }) => (
                  <button key={value} onClick={() => set('property_type', value as FormData['property_type'])}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-colors ${form.property_type === value ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 2 Bedroom House at East Legon" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Description <span className="text-gray-400 font-normal">({form.description.length}/500)</span></label>
              <textarea value={form.description} onChange={e => set('description', e.target.value.slice(0, 500))}
                placeholder="Describe the property, its condition, notable features..." rows={4} className={`${inputCls} resize-none`} />
            </div>
          </div>
        )}

        {/* Step 1: Location & Size */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Location &amp; Size</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Region <span className="text-red-500">*</span></label>
                <select value={form.region} onChange={e => set('region', e.target.value)} className={inputCls}>
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>City <span className="text-red-500">*</span></label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Accra" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Neighbourhood / Area</label>
              <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="e.g. East Legon, Spintex, Tema Community 1" className={inputCls} />
            </div>

            {/* Synced size inputs */}
            <div>
              <label className={labelCls}>Size</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input type="number" value={form.size_plots} onChange={e => handleSizeChange(e.target.value, 'plots')} placeholder="Plots" className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1 text-center">Plots</p>
                </div>
                <div>
                  <input type="number" value={form.size_sqft} onChange={e => handleSizeChange(e.target.value, 'sqft')} placeholder="Sq Ft" className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1 text-center">Sq Ft</p>
                </div>
                <div>
                  <input type="number" value={form.size_sqm} onChange={e => handleSizeChange(e.target.value, 'sqm')} placeholder="Sq M" className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1 text-center">Sq M</p>
                </div>
              </div>
              <p className="text-xs text-[#C9A84C] mt-1.5">Helper: 1 plot = 10,000 sq ft = 929 sq m</p>
            </div>

            <div>
              <label className={labelCls}>Actual Dimensions (optional)</label>
              <input value={form.actual_dimensions} onChange={e => set('actual_dimensions', e.target.value)} placeholder="e.g. 100ft × 100ft" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>GPS Coordinates (optional)</label>
              <input value={form.gps_coordinates} onChange={e => set('gps_coordinates', e.target.value)} placeholder="e.g. 5.6037° N, -0.1870° W" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Title Type</label>
                <select value={form.title_type} onChange={e => set('title_type', e.target.value)} className={inputCls}>
                  <option value="">Select type</option>
                  <option value="freehold">Freehold</option>
                  <option value="leasehold">Leasehold</option>
                  <option value="stool_land">Stool Land</option>
                  <option value="vested_land">Vested Land</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Land Commission No.</label>
                <input value={form.land_commission_number} onChange={e => set('land_commission_number', e.target.value)} placeholder="Optional" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Property Details */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Property Details</h2>

            {form.property_type === 'residential' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Bedrooms</label>
                    <div className="flex gap-2 flex-wrap">
                      {['1', '2', '3', '4', '5+'].map(n => (
                        <button key={n} onClick={() => set('bedrooms', n)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.bedrooms === n ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-700'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Bathrooms</label>
                    <div className="flex gap-2 flex-wrap">
                      {['1', '2', '3', '4+'].map(n => (
                        <button key={n} onClick={() => set('bathrooms', n)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.bathrooms === n ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-700'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Furnished Status</label>
                  <div className="flex gap-2">
                    {[{ v: 'furnished', l: 'Furnished' }, { v: 'unfurnished', l: 'Unfurnished' }, { v: 'semi_furnished', l: 'Semi-Furnished' }].map(({ v, l }) => (
                      <button key={v} onClick={() => set('furnished', v)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${form.furnished === v ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-700'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Amenities</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPERTY_AMENITIES.map(a => (
                      <label key={a} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)}
                          className="h-4 w-4 rounded accent-[#C9A84C]" />
                        <span className="text-sm text-gray-700">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(form.property_type === 'land' || form.property_type === 'commercial' || form.property_type === 'industrial') && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500 text-center">
                No additional details required for {form.property_type} listings.
                <br />You can add more information in the description.
              </div>
            )}

            {!form.property_type && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700 text-center">
                Please go back and select a property type first.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pricing & Media */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Pricing &amp; Media</h2>

            {form.listing_type === 'sale' ? (
              <div>
                <label className={labelCls}>Asking Price (GHS)</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 250000" className={inputCls} />
                {form.price && Number(form.price) > 0 && (
                  <p className="text-xs text-[#C9A84C] mt-1.5 font-medium">
                    Gavel earns {Math.round(getPropertyCommission(Number(form.price)) * 100)}% = {formatGhsPrice(Number(form.price) * getPropertyCommission(Number(form.price)))}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className={labelCls}>Reserve Price (GHS)</label>
                  <input type="number" value={form.reserve_price} onChange={e => set('reserve_price', e.target.value)} placeholder="Minimum acceptable bid" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Auction Start</label>
                    <input type="datetime-local" value={form.auction_start} onChange={e => set('auction_start', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Auction End</label>
                    <input type="datetime-local" value={form.auction_end} onChange={e => set('auction_end', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Photos (one URL per line, min 3)</label>
              <textarea value={form.images} onChange={e => set('images', e.target.value)}
                placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg" rows={4} className={`${inputCls} resize-none`} />
              <p className="text-xs text-gray-400 mt-1">Enter each image URL on a new line</p>
            </div>

            <div>
              <label className={labelCls}>Video URL (YouTube/Vimeo, optional)</label>
              <input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contact Name</label>
                <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Your name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Phone</label>
                <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="0241234567" className={inputCls} />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={form.is_licensed_auctioneer} onChange={e => set('is_licensed_auctioneer', e.target.checked)}
                className="h-4 w-4 rounded accent-[#C9A84C]" />
              <div>
                <p className="text-sm font-medium text-gray-900">I am a licensed auctioneer</p>
                <p className="text-xs text-gray-500">A &quot;Verified Auctioneer&quot; badge will appear on your listing</p>
              </div>
            </label>

            {error && <p className="text-sm text-red-500 rounded-xl bg-red-50 px-4 py-3">{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex-1 rounded-xl bg-[#0F2557] text-white py-3 text-sm font-semibold hover:bg-[#1a3570] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 rounded-xl bg-[#C9A84C] text-[#0F2557] py-3 text-sm font-bold hover:bg-[#d4b55c] transition-colors disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
