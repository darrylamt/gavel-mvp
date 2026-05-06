'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { formatGhsPrice, getAutoCommission, AUTO_MAKES, VEHICLE_TYPES, ENGINE_SIZES, CONDITION_CONFIG } from '@/lib/autoUtils'
import { GHANA_REGIONS } from '@/lib/propertyUtils'
import { Check, X, Star, Search, Plus, Car, Truck, Bus, Bike, Cog, MapPin, CheckCircle2, XCircle } from 'lucide-react'
import type { AutoListing } from '@/types/autos'

type Row = AutoListing & { profiles: { username: string | null } | null }

const PAGE_SIZE = 10

const VEHICLE_TYPE_ICONS: Record<string, React.ElementType> = {
  car: Car, suv: Car, truck: Truck, bus: Bus, motorbike: Bike, heavy_equipment: Cog,
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1989 }, (_, i) => String(currentYear - i))

// ─── Create Form ─────────────────────────────────────────────────────────────

type CreateForm = {
  listing_type: 'sale' | 'auction'
  vehicle_type: 'car' | 'suv' | 'truck' | 'bus' | 'motorbike' | 'heavy_equipment' | ''
  make: string; model: string; year: string
  condition: 'brand_new' | 'foreign_used' | 'ghana_used' | ''
  description: string; mileage: string; transmission: string
  fuel_type: string; drive_type: string; engine_size: string
  color: string; previous_owners: string; vin: string
  roadworthy: boolean; roadworthy_expiry: string; customs_cleared: boolean
  region: string; city: string
  price: string; reserve_price: string; auction_start: string; auction_end: string
  images: string
}

const EMPTY_FORM: CreateForm = {
  listing_type: 'sale', vehicle_type: '', make: '', model: '', year: '', condition: '',
  description: '', mileage: '', transmission: '', fuel_type: '', drive_type: '',
  engine_size: '', color: '', previous_owners: '1', vin: '',
  roadworthy: false, roadworthy_expiry: '', customs_cleared: false,
  region: '', city: '', price: '', reserve_price: '', auction_start: '', auction_end: '', images: '',
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const toggleBtn = (active: boolean) =>
    `px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${active ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`

  const handleSubmit = async () => {
    if (!form.make || !form.model || !form.year || !form.condition) {
      setError('Make, model, year and condition are required.'); return
    }
    setSaving(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated'); setSaving(false); return }

    const imageUrls = form.images.split('\n').map(s => s.trim()).filter(Boolean)
    const price = form.listing_type === 'sale' ? Number(form.price) || null : null
    const reserve = form.listing_type === 'auction' ? Number(form.reserve_price) || 0 : null
    const commission = price ? getAutoCommission(price) : 0.05
    const title = `${form.year} ${form.make} ${form.model}`

    const { data: listing, error: err } = await supabase.from('auto_listings').insert({
      seller_id: session.user.id, listing_type: form.listing_type,
      vehicle_type: form.vehicle_type || 'car', title, description: form.description.trim() || null,
      make: form.make, model: form.model, year: Number(form.year), price, reserve_price: reserve,
      condition: form.condition,
      mileage: form.mileage && form.condition !== 'brand_new' ? Number(form.mileage) : null,
      transmission: form.transmission || null, fuel_type: form.fuel_type || null,
      drive_type: form.drive_type || null, engine_size: form.engine_size || null,
      color: form.color.trim() || null,
      previous_owners: form.condition !== 'brand_new' ? Number(form.previous_owners) || 1 : 0,
      roadworthy: form.roadworthy, roadworthy_expiry: form.roadworthy && form.roadworthy_expiry ? form.roadworthy_expiry : null,
      customs_cleared: form.customs_cleared, vin: form.vin.trim() || null,
      images: imageUrls.length ? imageUrls : null,
      region: form.region || null, city: form.city.trim() || null,
      commission_rate: commission, status: 'active',
    }).select('id').single()

    if (err || !listing) { setError('Failed to create listing.'); setSaving(false); return }

    if (form.listing_type === 'auction' && reserve && form.auction_start && form.auction_end) {
      await supabase.from('auto_auctions').insert({
        auto_id: listing.id, seller_id: session.user.id,
        reserve_price: reserve, start_time: form.auction_start, end_time: form.auction_end,
      })
    }
    onCreated(); onClose()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E63946]/40 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">New Vehicle Listing</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Listing type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Listing Type</label>
              <div className="flex gap-2">
                {(['sale', 'auction'] as const).map(t => (
                  <button key={t} onClick={() => set('listing_type', t)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${form.listing_type === t ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700'}`}>
                    {t === 'sale' ? 'For Sale' : 'Auction'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value as CreateForm['vehicle_type'])} className={inputCls}>
                <option value="">Select type</option>
                {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Make / Model / Year */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Make <span className="text-red-500">*</span></label>
              <select value={form.make} onChange={e => set('make', e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {AUTO_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Model <span className="text-red-500">*</span></label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Land Cruiser" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Year <span className="text-red-500">*</span></label>
              <select value={form.year} onChange={e => set('year', e.target.value)} className={inputCls}>
                <option value="">Year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className={labelCls}>Condition <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {[{ value: 'brand_new', label: 'Brand New' }, { value: 'foreign_used', label: 'Foreign Used' }, { value: 'ghana_used', label: 'Ghana Used' }].map(({ value, label }) => (
                <button key={value} onClick={() => set('condition', value as CreateForm['condition'])}
                  className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${form.condition === value ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]' : 'border-gray-200 text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle specs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Transmission</label>
              <div className="flex gap-2">
                {['automatic', 'manual'].map(t => (
                  <button key={t} onClick={() => set('transmission', form.transmission === t ? '' : t)} className={`flex-1 py-2 rounded-lg border text-sm capitalize ${toggleBtn(form.transmission === t)}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Fuel Type</label>
              <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {['petrol', 'diesel', 'electric', 'hybrid'].map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Engine Size</label>
              <select value={form.engine_size} onChange={e => set('engine_size', e.target.value)} className={inputCls}>
                <option value="">—</option>
                {ENGINE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Drive Type</label>
              <select value={form.drive_type} onChange={e => set('drive_type', e.target.value)} className={inputCls}>
                <option value="">—</option>
                {['2wd', '4wd', 'awd'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="e.g. White" className={inputCls} />
            </div>
          </div>

          {form.condition !== 'brand_new' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Mileage (km)</label>
                <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="e.g. 45000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Previous Owners</label>
                <select value={form.previous_owners} onChange={e => set('previous_owners', e.target.value)} className={inputCls}>
                  {['1', '2', '3+'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Describe the vehicle..." className={`${inputCls} resize-none`} />
          </div>

          {/* Documents */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Roadworthy Certificate</label>
              <div className="flex gap-2">
                <button onClick={() => set('roadworthy', true)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${toggleBtn(form.roadworthy)}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                </button>
                <button onClick={() => set('roadworthy', false)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${toggleBtn(!form.roadworthy)}`}>
                  <XCircle className="h-3.5 w-3.5" /> No
                </button>
              </div>
              {form.roadworthy && (
                <input type="date" value={form.roadworthy_expiry} onChange={e => set('roadworthy_expiry', e.target.value)} className={`${inputCls} mt-2`} />
              )}
            </div>
            <div>
              <label className={labelCls}>Customs Cleared</label>
              <div className="flex gap-2">
                <button onClick={() => set('customs_cleared', true)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${toggleBtn(form.customs_cleared)}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                </button>
                <button onClick={() => set('customs_cleared', false)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-sm ${toggleBtn(!form.customs_cleared)}`}>
                  <XCircle className="h-3.5 w-3.5" /> No
                </button>
              </div>
            </div>
          </div>

          {/* Location */}
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

          {/* Pricing */}
          {form.listing_type === 'sale' ? (
            <div>
              <label className={labelCls}>Asking Price (GHS)</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 85000" className={inputCls} />
              {form.price && Number(form.price) > 0 && (
                <p className="text-xs text-[#E63946] mt-1">
                  Commission ({Math.round(getAutoCommission(Number(form.price)) * 100)}%): {formatGhsPrice(Number(form.price) * getAutoCommission(Number(form.price)))}
                </p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>Reserve Price (GHS)</label>
                <input type="number" value={form.reserve_price} onChange={e => set('reserve_price', e.target.value)} placeholder="Minimum bid" className={inputCls} />
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

          {/* Photos */}
          <div>
            <label className={labelCls}>Photos (one URL per line)</label>
            <textarea value={form.images} onChange={e => set('images', e.target.value)} rows={3} placeholder="https://..." className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 rounded-lg bg-[#E63946] text-white py-2.5 text-sm font-semibold hover:bg-[#d42f3c] transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Listing'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAutosPage() {
  const [listings, setListings] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => { load() }, [])
  useEffect(() => { setVisible(PAGE_SIZE) }, [search, statusFilter])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('auto_listings')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(500)
    setListings((data ?? []) as Row[])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await supabase.from('auto_listings').update({ status }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: status as AutoListing['status'] } : l))
    setUpdating(null)
  }

  async function toggleFeatured(id: string, current: boolean) {
    setUpdating(id)
    await supabase.from('auto_listings').update({ featured: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, featured: !current } : l))
    setUpdating(null)
  }

  async function updateCommission(id: string, rate: number) {
    await supabase.from('auto_listings').update({ commission_rate: rate }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, commission_rate: rate } : l))
  }

  const filtered = listings.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const q = search.toLowerCase()
    const matchText = !q || l.title.toLowerCase().includes(q) || l.make.toLowerCase().includes(q) || (l.profiles?.username ?? '').toLowerCase().includes(q)
    return matchStatus && matchText
  })

  const shown = filtered.slice(0, visible)

  return (
    <AdminShell>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Auto Listings</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none w-44" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="archived">Archived</option>
            </select>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-[#E63946] text-white px-4 py-2 text-sm font-semibold hover:bg-[#d42f3c] transition-colors">
              <Plus className="h-4 w-4" /> New Listing
            </button>
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-48" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex rounded-full bg-gray-100 p-4 mb-3">
              <Car className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-gray-700">No auto listings yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#E63946] text-white px-4 py-2 text-sm font-semibold hover:bg-[#d42f3c] transition-colors">
              <Plus className="h-4 w-4" /> Create first listing
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.map(l => {
                const TypeIcon = VEHICLE_TYPE_ICONS[l.vehicle_type] ?? Car
                const image = l.images?.[0]
                const conditionCfg = CONDITION_CONFIG[l.condition]
                return (
                  <div key={l.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative h-36 bg-gray-100">
                      {image
                        ? <img src={image} alt={l.title} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#252540]">
                            <TypeIcon className="h-10 w-10 text-white/30" strokeWidth={1} />
                          </div>
                      }
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                        {l.featured && <span className="rounded-full bg-[#E63946] text-white px-2 py-0.5 text-[10px] font-bold">Featured</span>}
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${conditionCfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {conditionCfg?.label ?? l.condition}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3.5">
                      <a href={`/autos/${l.id}`} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-gray-900 text-sm hover:text-[#E63946] hover:underline block mb-0.5">
                        {l.year} {l.make} {l.model}
                      </a>
                      <p className="text-xs text-gray-400 mb-1 capitalize">{l.listing_type} · {l.vehicle_type}</p>
                      {(l.city || l.region) && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                          <MapPin className="h-3 w-3" /> {l.city ? `${l.city}, ` : ''}{l.region}
                        </div>
                      )}
                      <p className="text-sm font-bold text-[#1A1A2E] mb-3">
                        {l.price ? formatGhsPrice(l.price) : l.reserve_price ? `Reserve: ${formatGhsPrice(l.reserve_price)}` : 'Price TBD'}
                      </p>

                      {/* Commission */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-500">Commission:</span>
                        <input type="number" step="0.01" min="0" max="0.2" defaultValue={l.commission_rate}
                          onBlur={e => updateCommission(l.id, Number(e.target.value))}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#E63946]" />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => toggleFeatured(l.id, l.featured)} disabled={updating === l.id}
                          className={`rounded-lg p-1.5 transition-colors ${l.featured ? 'bg-[#E63946] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          title={l.featured ? 'Remove from featured' : 'Feature'}>
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        {l.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(l.id, 'active')} disabled={updating === l.id}
                              className="flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-emerald-200 transition-colors">
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button onClick={() => updateStatus(l.id, 'archived')} disabled={updating === l.id}
                              className="flex items-center gap-1 rounded-lg bg-red-100 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-200 transition-colors">
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </>
                        )}
                        {l.status === 'active' && (
                          <button onClick={() => updateStatus(l.id, 'sold')} disabled={updating === l.id}
                            className="rounded-lg bg-blue-100 text-blue-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-blue-200 transition-colors">
                            Mark Sold
                          </button>
                        )}
                        {(l.status === 'sold' || l.status === 'archived') && (
                          <button onClick={() => updateStatus(l.id, 'active')} disabled={updating === l.id}
                            className="rounded-lg bg-gray-100 text-gray-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-200 transition-colors">
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {visible < filtered.length && (
              <div className="text-center pt-2">
                <button onClick={() => setVisible(v => v + PAGE_SIZE)} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                  Load {Math.min(PAGE_SIZE, filtered.length - visible)} more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
