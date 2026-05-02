'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { formatGhsPrice, PROPERTY_TYPE_LABELS } from '@/lib/propertyUtils'
import { Check, X, Star, Search } from 'lucide-react'
import type { PropertyListing } from '@/types/properties'

type Row = PropertyListing & { profiles: { username: string | null } | null }

export default function AdminPropertiesPage() {
  const [listings, setListings] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('property_listings')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(200)
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
    const matchText = !q || l.title.toLowerCase().includes(q) || (l.profiles?.username ?? '').toLowerCase().includes(q)
    return matchStatus && matchText
  })

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    sold: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
  }

  return (
    <AdminShell>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-900">Property Listings</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or seller..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none w-52" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-2">🏡</p>
            <p className="text-gray-500 text-sm">No property listings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Listing</th>
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Commission</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Featured</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/properties/${l.id}`} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-[#0F2557] hover:underline line-clamp-1 max-w-[200px] block">
                        {l.title}
                      </a>
                      <p className="text-xs text-gray-400 mt-0.5">{l.city}, {l.region}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.profiles?.username ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type}</span>
                      <br />
                      <span className="text-xs text-gray-400 capitalize">{l.listing_type}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {l.price ? formatGhsPrice(l.price) : l.reserve_price ? `Reserve: ${formatGhsPrice(l.reserve_price)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01" min="0" max="0.2"
                        defaultValue={l.commission_rate}
                        onBlur={e => updateCommission(l.id, Number(e.target.value))}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#C9A84C]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFeatured(l.id, l.featured)} disabled={updating === l.id}
                        className={`rounded-full p-1.5 transition-colors ${l.featured ? 'bg-[#C9A84C] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {l.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(l.id, 'active')} disabled={updating === l.id}
                              className="rounded-lg bg-emerald-100 text-emerald-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-emerald-200 transition-colors flex items-center gap-1">
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button onClick={() => updateStatus(l.id, 'archived')} disabled={updating === l.id}
                              className="rounded-lg bg-red-100 text-red-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-200 transition-colors flex items-center gap-1">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
