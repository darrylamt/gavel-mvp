'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AUTO_MAKES, VEHICLE_TYPES, ENGINE_SIZES, getAutoCommission, formatGhsPrice } from '@/lib/autoUtils'
import { GHANA_REGIONS } from '@/lib/propertyUtils'
import { Check } from 'lucide-react'

const STEPS = ['Vehicle Basics', 'Vehicle Details', 'Documents & Location', 'Pricing & Photos']

type FormData = {
  listing_type: 'sale' | 'auction'
  vehicle_type: 'car' | 'suv' | 'truck' | 'bus' | 'motorbike' | 'heavy_equipment' | ''
  make: string
  model: string
  year: string
  condition: 'brand_new' | 'foreign_used' | 'ghana_used' | ''
  mileage: string
  transmission: 'automatic' | 'manual' | ''
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | ''
  drive_type: '2wd' | '4wd' | 'awd' | ''
  engine_size: string
  color: string
  previous_owners: string
  vin: string
  description: string
  roadworthy: boolean
  roadworthy_expiry: string
  customs_cleared: boolean
  region: string
  city: string
  price: string
  reserve_price: string
  auction_start: string
  auction_end: string
  images: string
  video_url: string
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i))

const INITIAL: FormData = {
  listing_type: 'sale', vehicle_type: '', make: '', model: '', year: '', condition: '',
  mileage: '', transmission: '', fuel_type: '', drive_type: '', engine_size: '',
  color: '', previous_owners: '1', vin: '', description: '',
  roadworthy: false, roadworthy_expiry: '', customs_cleared: false,
  region: '', city: '', price: '', reserve_price: '', auction_start: '', auction_end: '',
  images: '', video_url: '',
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
            i < current ? 'bg-[#E63946] text-white' : i === current ? 'bg-[#1A1A2E] text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`hidden sm:block text-xs font-medium ${i === current ? 'text-[#1A1A2E]' : 'text-gray-400'}`}>{label}</span>
          {i < total - 1 && <div className={`w-6 h-0.5 ${i < current ? 'bg-[#E63946]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function AutoSellPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const canNext = () => {
    if (step === 0) return form.vehicle_type && form.make && form.model && form.year && form.condition
    if (step === 1) return form.transmission && form.fuel_type
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
    const commission = price ? getAutoCommission(price) : 0.05
    const title = `${form.year} ${form.make} ${form.model}`

    const { data: listing, error: err } = await supabase
      .from('auto_listings')
      .insert({
        seller_id: session.user.id,
        listing_type: form.listing_type,
        vehicle_type: form.vehicle_type,
        title,
        description: form.description.trim() || null,
        make: form.make,
        model: form.model,
        year: Number(form.year),
        price,
        reserve_price: reserve,
        condition: form.condition,
        mileage: form.mileage && form.condition !== 'brand_new' ? Number(form.mileage) : null,
        transmission: form.transmission || null,
        fuel_type: form.fuel_type || null,
        drive_type: form.drive_type || null,
        engine_size: form.engine_size || null,
        color: form.color.trim() || null,
        previous_owners: form.condition !== 'brand_new' ? Number(form.previous_owners) || 1 : 0,
        roadworthy: form.roadworthy,
        roadworthy_expiry: form.roadworthy && form.roadworthy_expiry ? form.roadworthy_expiry : null,
        customs_cleared: form.customs_cleared,
        vin: form.vin.trim() || null,
        images: imageUrls.length ? imageUrls : null,
        video_url: form.video_url.trim() || null,
        region: form.region || null,
        city: form.city.trim() || null,
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
      await supabase.from('auto_auctions').insert({
        auto_id: listing.id,
        seller_id: session.user.id,
        reserve_price: reserve,
        start_time: form.auction_start,
        end_time: form.auction_end,
      })
    }

    router.push(`/autos/${listing.id}`)
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E63946] bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

  const toggleBtn = (active: boolean) =>
    `px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${active ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black text-gray-900">List Your Vehicle</h1>
        <p className="text-sm text-gray-500 mt-1">Reach thousands of serious buyers across Ghana</p>
      </div>

      <StepIndicator current={step} total={STEPS.length} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

        {/* Step 0: Vehicle Basics */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Vehicle Basics</h2>

            <div>
              <label className={labelCls}>Listing Type</label>
              <div className="flex gap-2">
                {(['sale', 'auction'] as const).map(t => (
                  <button key={t} onClick={() => set('listing_type', t)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-colors ${form.listing_type === t ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700'}`}>
                    {t === 'sale' ? 'For Sale' : 'Auction'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Vehicle Type</label>
              <div className="grid grid-cols-3 gap-2">
                {VEHICLE_TYPES.map(({ value, label, emoji }) => (
                  <button key={value} onClick={() => set('vehicle_type', value as FormData['vehicle_type'])}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm font-medium transition-colors ${form.vehicle_type === value ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Make <span className="text-red-500">*</span></label>
                <select value={form.make} onChange={e => set('make', e.target.value)} className={inputCls}>
                  <option value="">Select make</option>
                  {AUTO_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Model <span className="text-red-500">*</span></label>
                <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Land Cruiser" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Year <span className="text-red-500">*</span></label>
              <select value={form.year} onChange={e => set('year', e.target.value)} className={inputCls}>
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Condition <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'brand_new', label: 'Brand New', color: 'bg-emerald-600 border-emerald-600' },
                  { value: 'foreign_used', label: 'Foreign Used', color: 'bg-blue-700 border-blue-700' },
                  { value: 'ghana_used', label: 'Ghana Used', color: 'bg-orange-600 border-orange-600' },
                ].map(({ value, label, color }) => (
                  <button key={value} onClick={() => set('condition', value as FormData['condition'])}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${form.condition === value ? `${color} text-white` : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Vehicle Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Vehicle Details</h2>

            {form.condition !== 'brand_new' && (
              <div>
                <label className={labelCls}>Mileage (km)</label>
                <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="e.g. 45000" className={inputCls} />
              </div>
            )}

            <div>
              <label className={labelCls}>Transmission <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {(['automatic', 'manual'] as const).map(t => (
                  <button key={t} onClick={() => set('transmission', t)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize ${toggleBtn(form.transmission === t)}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Fuel Type <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {(['petrol', 'diesel', 'electric', 'hybrid'] as const).map(t => (
                  <button key={t} onClick={() => set('fuel_type', t)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize ${toggleBtn(form.fuel_type === t)}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Drive Type</label>
              <div className="flex gap-2">
                {(['2wd', '4wd', 'awd'] as const).map(t => (
                  <button key={t} onClick={() => set('drive_type', form.drive_type === t ? '' : t)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold uppercase ${toggleBtn(form.drive_type === t)}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Engine Size</label>
                <select value={form.engine_size} onChange={e => set('engine_size', e.target.value)} className={inputCls}>
                  <option value="">Select size</option>
                  {ENGINE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="e.g. Pearl White" className={inputCls} />
              </div>
            </div>

            {form.condition !== 'brand_new' && (
              <div>
                <label className={labelCls}>Previous Owners</label>
                <div className="flex gap-2">
                  {['1', '2', '3+'].map(n => (
                    <button key={n} onClick={() => set('previous_owners', n)} className={`flex-1 py-2 rounded-xl border text-sm font-medium ${toggleBtn(form.previous_owners === n)}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>VIN (optional)</label>
              <input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder="Vehicle Identification Number" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the vehicle's condition, history, features..." rows={3} className={`${inputCls} resize-none`} />
            </div>
          </div>
        )}

        {/* Step 2: Documents & Location */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Documents &amp; Location</h2>

            <div>
              <label className={labelCls}>Roadworthy Certificate</label>
              <div className="flex gap-2 mb-2">
                <button onClick={() => set('roadworthy', true)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${toggleBtn(form.roadworthy)}`}>
                  ✅ Yes
                </button>
                <button onClick={() => set('roadworthy', false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${toggleBtn(!form.roadworthy)}`}>
                  ❌ No
                </button>
              </div>
              {form.roadworthy && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Expiry Date</label>
                  <input type="date" value={form.roadworthy_expiry} onChange={e => set('roadworthy_expiry', e.target.value)} className={inputCls} />
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Customs Cleared</label>
              <div className="flex gap-2">
                <button onClick={() => set('customs_cleared', true)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${toggleBtn(form.customs_cleared)}`}>
                  ✅ Yes
                </button>
                <button onClick={() => set('customs_cleared', false)} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${toggleBtn(!form.customs_cleared)}`}>
                  ❌ No
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Region</label>
                <select value={form.region} onChange={e => set('region', e.target.value)} className={inputCls}>
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Accra" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing & Photos */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-gray-900">Pricing &amp; Photos</h2>

            {form.listing_type === 'sale' ? (
              <div>
                <label className={labelCls}>Asking Price (GHS)</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 85000" className={inputCls} />
                {form.price && Number(form.price) > 0 && (
                  <p className="text-xs text-[#E63946] mt-1.5 font-medium">
                    Gavel earns {Math.round(getAutoCommission(Number(form.price)) * 100)}% = {formatGhsPrice(Number(form.price) * getAutoCommission(Number(form.price)))}
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
              <label className={labelCls}>Photos (one URL per line, min 4)</label>
              <p className="text-xs text-gray-400 mb-1.5">Include: Front, Rear, Driver Side, Passenger Side, Interior, Dashboard, Engine</p>
              <textarea value={form.images} onChange={e => set('images', e.target.value)}
                placeholder="https://example.com/front.jpg&#10;https://example.com/rear.jpg" rows={5} className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={labelCls}>Video URL (optional)</label>
              <input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
            </div>

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
              className="flex-1 rounded-xl bg-[#1A1A2E] text-white py-3 text-sm font-semibold hover:bg-[#252540] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 rounded-xl bg-[#E63946] text-white py-3 text-sm font-bold hover:bg-[#d42f3c] transition-colors disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
