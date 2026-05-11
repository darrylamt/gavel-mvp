'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import {
  formatGhsPrice, getPropertyCommission, GHANA_REGIONS,
  PROPERTY_AMENITIES, calculateSizes, PROPERTY_TYPE_LABELS,
} from '@/lib/propertyUtils'
import { Check, X, Star, Search, Plus, MapPin, Home, Layers, Building2, Building, Pencil } from 'lucide-react'
import type { PropertyListing } from '@/types/properties'
import ImageUploader from '@/components/ImageUploader'

type Row = PropertyListing & { profiles: { username: string | null } | null }

const PAGE_SIZE = 10

const PROPERTY_TYPE_ICONS = {
  land: Layers, residential: Home, commercial: Building2, industrial: Building,
}

// ─── Create Form ────────────────────────────────────────────────────────────

type CreateForm = {
  listing_type: 'sale' | 'auction'
  property_type: 'land' | 'residential' | 'commercial' | 'industrial' | ''
  title: string; description: string
  region: string; city: string; neighborhood: string
  size_plots: string; size_sqft: string; size_sqm: string
  title_type: string; land_commission_number: string
  bedrooms: string; bathrooms: string; furnished: string; amenities: string[]
  price: string; reserve_price: string; auction_start: string; auction_end: string
  images: string[]; video_url: string; contact_person: string; contact_phone: string
  is_licensed_auctioneer: boolean
}

const EMPTY_FORM: CreateForm = {
  listing_type: 'sale', property_type: '', title: '', description: '',
  region: '', city: '', neighborhood: '', size_plots: '', size_sqft: '', size_sqm: '',
  title_type: '', land_commission_number: '', bedrooms: '', bathrooms: '', furnished: '',
  amenities: [], price: '', reserve_price: '', auction_start: '', auction_end: '',
  images: [], video_url: '', contact_person: '', contact_phone: '', is_licensed_auctioneer: false,
}

function CreateModal({ onClose, onCreated, editing }: { onClose: () => void; onCreated: () => void; editing?: Row }) {
  const [form, setForm] = useState<CreateForm>(() => editing ? {
    listing_type: editing.listing_type,
    property_type: editing.property_type as CreateForm['property_type'],
    title: editing.title, description: editing.description ?? '',
    region: editing.region, city: editing.city, neighborhood: editing.neighborhood ?? '',
    size_plots: editing.size_plots != null ? String(editing.size_plots) : '',
    size_sqft: editing.size_sqft != null ? String(editing.size_sqft) : '',
    size_sqm: editing.size_sqm != null ? String(editing.size_sqm) : '',
    title_type: editing.title_type ?? '', land_commission_number: editing.land_commission_number ?? '',
    bedrooms: editing.bedrooms != null ? String(editing.bedrooms) : '',
    bathrooms: editing.bathrooms != null ? String(editing.bathrooms) : '',
    furnished: editing.furnished ?? '', amenities: editing.amenities ?? [],
    price: editing.price != null ? String(editing.price) : '',
    reserve_price: editing.reserve_price != null ? String(editing.reserve_price) : '',
    auction_start: '', auction_end: '',
    images: editing.images ?? [], video_url: editing.video_url ?? '',
    contact_person: editing.contact_person ?? '', contact_phone: editing.contact_phone ?? '',
    is_licensed_auctioneer: editing.is_licensed_auctioneer,
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSizeChange = (value: string, unit: 'plots' | 'sqft' | 'sqm') => {
    if (!value || isNaN(Number(value))) { set(unit === 'plots' ? 'size_plots' : unit === 'sqft' ? 'size_sqft' : 'size_sqm', value); return }
    const s = calculateSizes(Number(value), unit)
    setForm(p => ({ ...p, size_plots: String(Math.round(s.plots * 1000) / 1000), size_sqft: String(Math.round(s.sqft)), size_sqm: String(Math.round(s.sqm * 100) / 100) }))
  }

  const toggleAmenity = (a: string) =>
    setForm(p => ({ ...p, amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a] }))

  const handleSubmit = async () => {
    if (!form.property_type || !form.title.trim() || !form.region || !form.city.trim()) {
      setError('Property type, title, region and city are required.'); return
    }
    setSaving(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated'); setSaving(false); return }
    const imageUrls = form.images
    const price = form.listing_type === 'sale' ? Number(form.price) || null : null
    const reserve = form.listing_type === 'auction' ? Number(form.reserve_price) || 0 : null
    const commission = price ? getPropertyCommission(price) : 0.05

    const payload = {
      listing_type: form.listing_type,
      property_type: form.property_type, title: form.title.trim(),
      description: form.description.trim() || null, price, reserve_price: reserve,
      region: form.region, city: form.city.trim(), neighborhood: form.neighborhood.trim() || null,
      size_plots: form.size_plots ? Number(form.size_plots) : null,
      size_sqft: form.size_sqft ? Number(form.size_sqft) : null,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
      title_type: form.title_type || null, land_commission_number: form.land_commission_number.trim() || null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      furnished: form.furnished || null, amenities: form.amenities.length ? form.amenities : null,
      images: imageUrls.length ? imageUrls : null, video_url: form.video_url.trim() || null,
      contact_person: form.contact_person.trim() || null, contact_phone: form.contact_phone.trim() || null,
      is_licensed_auctioneer: form.is_licensed_auctioneer, commission_rate: commission,
    }

    if (editing) {
      const { error: err } = await supabase.from('property_listings').update(payload).eq('id', editing.id)
      if (err) { setError('Failed to update listing.'); setSaving(false); return }
    } else {
      const { data: listing, error: err } = await supabase.from('property_listings')
        .insert({ ...payload, seller_id: session.user.id, status: 'active' }).select('id').single()
      if (err || !listing) { setError('Failed to create listing.'); setSaving(false); return }
      if (form.listing_type === 'auction' && reserve && form.auction_start && form.auction_end) {
        await supabase.from('property_auctions').insert({
          property_id: listing.id, seller_id: session.user.id,
          reserve_price: reserve, start_time: form.auction_start, end_time: form.auction_end,
        })
      }
    }
    onCreated(); onClose()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]/50 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{editing ? 'Edit Property Listing' : 'New Property Listing'}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Type toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Listing Type</label>
              <div className="flex gap-2">
                {(['sale', 'auction'] as const).map(t => (
                  <button key={t} onClick={() => set('listing_type', t)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${form.listing_type === t ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-700'}`}>
                    {t === 'sale' ? 'For Sale' : 'Auction'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Property Type <span className="text-red-500">*</span></label>
              <select value={form.property_type} onChange={e => set('property_type', e.target.value as CreateForm['property_type'])} className={inputCls}>
                <option value="">Select type</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 2 Plots of Land at East Legon" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value.slice(0, 500))} rows={3} placeholder="Describe the property..." className={`${inputCls} resize-none`} />
          </div>

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
            <label className={labelCls}>Neighbourhood</label>
            <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="e.g. East Legon" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Size</label>
            <div className="grid grid-cols-3 gap-2">
              {(['plots', 'sqft', 'sqm'] as const).map(unit => (
                <div key={unit}>
                  <input type="number" value={form[`size_${unit}` as 'size_plots' | 'size_sqft' | 'size_sqm']}
                    onChange={e => handleSizeChange(e.target.value, unit)} placeholder={unit} className={inputCls} />
                  <p className="text-[10px] text-gray-400 text-center mt-0.5 capitalize">{unit}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#C9A84C] mt-1">1 plot = 10,000 sq ft = 929 sq m</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Title Type</label>
              <select value={form.title_type} onChange={e => set('title_type', e.target.value)} className={inputCls}>
                <option value="">Select</option>
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

          {form.property_type === 'residential' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Bedrooms</label>
                  <select value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} className={inputCls}>
                    <option value="">–</option>
                    {['1', '2', '3', '4', '5+'].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Bathrooms</label>
                  <select value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} className={inputCls}>
                    <option value="">–</option>
                    {['1', '2', '3', '4+'].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Furnished</label>
                  <select value={form.furnished} onChange={e => set('furnished', e.target.value)} className={inputCls}>
                    <option value="">–</option>
                    <option value="furnished">Furnished</option>
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi_furnished">Semi-Furnished</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Amenities</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROPERTY_AMENITIES.map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                      <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)} className="h-3.5 w-3.5 accent-[#C9A84C]" /> {a}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {form.listing_type === 'sale' ? (
            <div>
              <label className={labelCls}>Asking Price (GHS)</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 250000" className={inputCls} />
              {form.price && Number(form.price) > 0 && (
                <p className="text-xs text-[#C9A84C] mt-1">
                  Commission ({Math.round(getPropertyCommission(Number(form.price)) * 100)}%): {formatGhsPrice(Number(form.price) * getPropertyCommission(Number(form.price)))}
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

          <div>
            <label className={labelCls}>Photos</label>
            <ImageUploader bucket="property-images" value={form.images} onChange={urls => set('images', urls)} accentColor="#C9A84C" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Your name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="024..." className={inputCls} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_licensed_auctioneer} onChange={e => set('is_licensed_auctioneer', e.target.checked)} className="h-4 w-4 accent-[#C9A84C]" />
            <span className="text-sm text-gray-700">Licensed Auctioneer</span>
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 rounded-lg bg-[#0F2557] text-white py-2.5 text-sm font-semibold hover:bg-[#1a3570] transition-colors disabled:opacity-50">
            {saving ? (editing ? 'Saving…' : 'Creating…') : (editing ? 'Save Changes' : 'Create Listing')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPropertiesPage() {
  const [listings, setListings] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingListing, setEditingListing] = useState<Row | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => { load() }, [])
  useEffect(() => { setVisible(PAGE_SIZE) }, [search, statusFilter])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('property_listings')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(500)
    setListings((data ?? []) as Row[])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await supabase.from('property_listings').update({ status }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: status as PropertyListing['status'] } : l))
    setUpdating(null)
  }

  async function toggleFeatured(id: string, current: boolean) {
    setUpdating(id)
    await supabase.from('property_listings').update({ featured: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, featured: !current } : l))
    setUpdating(null)
  }

  async function updateCommission(id: string, rate: number) {
    await supabase.from('property_listings').update({ commission_rate: rate }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, commission_rate: rate } : l))
  }

  const filtered = listings.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const q = search.toLowerCase()
    const matchText = !q || l.title.toLowerCase().includes(q) || (l.profiles?.username ?? '').toLowerCase().includes(q) || l.city.toLowerCase().includes(q)
    return matchStatus && matchText
  })

  const shown = filtered.slice(0, visible)

  return (
    <AdminShell>
      {(showCreate || editingListing) && (
        <CreateModal
          editing={editingListing ?? undefined}
          onClose={() => { setShowCreate(false); setEditingListing(null) }}
          onCreated={load}
        />
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Property Listings</h2>
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
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-[#0F2557] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1a3570] transition-colors">
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
              <Home className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-gray-700">No property listings yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0F2557] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1a3570] transition-colors">
              <Plus className="h-4 w-4" /> Create first listing
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.map(l => {
                const TypeIcon = PROPERTY_TYPE_ICONS[l.property_type as keyof typeof PROPERTY_TYPE_ICONS] ?? Home
                const image = l.images?.[0]
                return (
                  <div key={l.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative h-36 bg-gray-100">
                      {image
                        ? <img src={image} alt={l.title} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#0F2557] to-[#1a3570]">
                            <TypeIcon className="h-10 w-10 text-white/30" strokeWidth={1} />
                          </div>
                      }
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {l.status}
                        </span>
                        {l.featured && <span className="rounded-full bg-[#C9A84C] text-white px-2 py-0.5 text-[10px] font-bold">Featured</span>}
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="rounded-full bg-white/90 text-[#0F2557] px-2 py-0.5 text-[10px] font-semibold capitalize">
                          {PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3.5">
                      <a href={`/properties/${l.id}`} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-gray-900 text-sm hover:text-[#0F2557] hover:underline line-clamp-1 block mb-1">
                        {l.title}
                      </a>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                        <MapPin className="h-3 w-3" /> {l.city}, {l.region}
                      </div>
                      <p className="text-sm font-bold text-[#0F2557] mb-3">
                        {l.price ? formatGhsPrice(l.price) : l.reserve_price ? `Reserve: ${formatGhsPrice(l.reserve_price)}` : 'Price TBD'}
                      </p>

                      {/* Commission */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-500">Commission:</span>
                        <input type="number" step="0.01" min="0" max="0.2" defaultValue={l.commission_rate}
                          onBlur={e => updateCommission(l.id, Number(e.target.value))}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#C9A84C]" />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setEditingListing(l)}
                          className="rounded-lg bg-gray-100 text-gray-600 p-1.5 hover:bg-gray-200 transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleFeatured(l.id, l.featured)} disabled={updating === l.id}
                          className={`rounded-lg p-1.5 transition-colors ${l.featured ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
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
