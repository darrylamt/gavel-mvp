'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Truck, Package, CheckCircle2, X, Search, RefreshCw, Clock, AlertCircle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DeliveryRow = {
  id: string
  created_at: string
  total_amount: number
  buyer_full_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  delivery_address: string | null
  delivery_city: string | null
  dawurobo_order_id: string | null
  dawurobo_status: string | null
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',       color: 'bg-gray-100 text-gray-700' },
  assigned:   { label: 'Rider Assigned', color: 'bg-blue-100 text-blue-700' },
  picked_up:  { label: 'Picked Up',     color: 'bg-yellow-100 text-yellow-700' },
  in_transit: { label: 'In Transit',    color: 'bg-purple-100 text-purple-700' },
  delivered:  { label: 'Delivered',     color: 'bg-green-100 text-green-700' },
  failed:     { label: 'Failed',        color: 'bg-red-100 text-red-700' },
  returned:   { label: 'Returned',      color: 'bg-red-100 text-red-700' },
}

export const dynamic = 'force-dynamic'

export default function AdminDeliveriesPage() {
  const [rows, setRows] = useState<DeliveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shop_orders')
      .select('id, created_at, total_amount, buyer_full_name, buyer_phone, buyer_email, delivery_address, delivery_city, dawurobo_order_id, dawurobo_status')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(300)
    setRows((data ?? []) as DeliveryRow[])
    setLoading(false)
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.id.toLowerCase().includes(q) ||
      (r.buyer_full_name ?? '').toLowerCase().includes(q) ||
      (r.buyer_email ?? '').toLowerCase().includes(q) ||
      (r.buyer_phone ?? '').includes(q) ||
      (r.dawurobo_order_id ?? '').toLowerCase().includes(q)
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'no_dispatch' && !r.dawurobo_order_id) ||
      r.dawurobo_status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: rows.length,
    noDispatch: rows.filter(r => !r.dawurobo_order_id).length,
    inTransit: rows.filter(r => r.dawurobo_status && !['delivered', 'failed', 'returned'].includes(r.dawurobo_status)).length,
    delivered: rows.filter(r => r.dawurobo_status === 'delivered').length,
    failed: rows.filter(r => r.dawurobo_status === 'failed' || r.dawurobo_status === 'returned').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-sm text-gray-500 mt-0.5">All shop orders with Dawurobo delivery status.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Orders', value: stats.total, Icon: Package, color: 'gray' },
          { label: 'Awaiting Dispatch', value: stats.noDispatch, Icon: Clock, color: 'amber' },
          { label: 'In Transit', value: stats.inTransit, Icon: Truck, color: 'purple' },
          { label: 'Delivered', value: stats.delivered, Icon: CheckCircle2, color: 'green' },
          { label: 'Failed / Returned', value: stats.failed, Icon: AlertCircle, color: 'red' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className={`rounded-2xl border border-${color === 'gray' ? 'gray-100' : `${color}-200`} bg-${color === 'gray' ? 'white' : `${color}-50`} p-4 shadow-sm`}>
            <p className={`text-xs font-medium uppercase tracking-wide text-${color}-${color === 'gray' ? '500' : '700'}`}>{label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className={`text-2xl font-bold text-${color}-${color === 'gray' ? '900' : '900'}`}>{value}</p>
              <Icon className={`h-5 w-5 text-${color}-${color === 'gray' ? '400' : '500'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, order ID…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
        >
          <option value="all">All statuses</option>
          <option value="no_dispatch">Awaiting Dispatch</option>
          <option value="assigned">Rider Assigned</option>
          <option value="picked_up">Picked Up</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No deliveries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Delivery Address</th>
                  <th className="px-5 py-3">Dawurobo ID</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-700">#{r.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{r.buyer_full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{r.buyer_phone || r.buyer_email || '—'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-700 max-w-[180px] truncate">{r.delivery_address || '—'}</p>
                      {r.delivery_city && <p className="text-xs text-gray-400">{r.delivery_city}</p>}
                    </td>
                    <td className="px-5 py-3">
                      {r.dawurobo_order_id
                        ? <span className="font-mono text-xs text-gray-700">{r.dawurobo_order_id}</span>
                        : <span className="text-xs text-gray-400 italic">Not dispatched</span>}
                    </td>
                    <td className="px-5 py-3">
                      {r.dawurobo_status ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_INFO[r.dawurobo_status]?.color || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_INFO[r.dawurobo_status]?.label || r.dawurobo_status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Awaiting Dispatch
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      GH₵ {Number(r.total_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
