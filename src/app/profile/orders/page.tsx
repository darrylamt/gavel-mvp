'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Package, Truck, Search, X, CheckCircle2, Clock } from 'lucide-react'

type DeliveryEvent = {
  status: string
  description: string
  timestamp: string
}

type Order = {
  id: string
  created_at: string
  total_amount: number
  dawurobo_order_id: string | null
  dawurobo_status: string | null
  items: Array<{
    title: string
    quantity: number
    unit_price: number
  }>
}

const DAWUROBO_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Processing', color: 'amber' },
  assigned: { label: 'Rider Assigned', color: 'blue' },
  picked_up: { label: 'Picked Up', color: 'blue' },
  in_transit: { label: 'In Transit', color: 'blue' },
  delivered: { label: 'Delivered', color: 'green' },
  failed: { label: 'Delivery Failed', color: 'red' },
  returned: { label: 'Returned', color: 'red' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
        <Clock className="h-3 w-3" /> Processing
      </span>
    )
  }
  const s = DAWUROBO_STATUS_LABELS[status]
  if (!s) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
      {status}
    </span>
  )
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorMap[s.color] || 'bg-gray-100 text-gray-600'}`}>
      {s.color === 'green' ? <CheckCircle2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
      {s.label}
    </span>
  )
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchCode, setSearchCode] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Record<string, DeliveryEvent[]>>({})
  const [loadingEvents, setLoadingEvents] = useState<Record<string, boolean>>({})

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Please log in to view your orders'); setLoading(false); return }

      const { data: ordersData, error: ordersError } = await supabase
        .from('shop_orders')
        .select('id, created_at, total_amount, dawurobo_order_id, dawurobo_status')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
      if (ordersError) throw ordersError

      const orderIds = (ordersData || []).map(o => o.id)
      const { data: itemsData, error: itemsError } = await supabase
        .from('shop_order_items')
        .select('order_id, title_snapshot, quantity, unit_price')
        .in('order_id', orderIds)
      if (itemsError) throw itemsError

      const itemsByOrder = new Map<string, typeof itemsData>()
      for (const item of itemsData || []) {
        if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, [])
        itemsByOrder.get(item.order_id)!.push(item)
      }

      setOrders((ordersData || []).map(order => ({
        id: order.id,
        created_at: order.created_at,
        total_amount: order.total_amount,
        dawurobo_order_id: order.dawurobo_order_id ?? null,
        dawurobo_status: order.dawurobo_status ?? null,
        items: (itemsByOrder.get(order.id) || []).map(item => ({
          title: item.title_snapshot,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      })))
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
      setLoading(false)
    }
  }

  const loadDeliveryEvents = async (orderId: string) => {
    if (expandedEvents[orderId]) {
      setExpandedEvents(prev => { const n = { ...prev }; delete n[orderId]; return n })
      return
    }
    setLoadingEvents(prev => ({ ...prev, [orderId]: true }))
    const { data } = await supabase
      .from('delivery_events')
      .select('status, description, timestamp')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: false })
    setExpandedEvents(prev => ({ ...prev, [orderId]: (data ?? []) as DeliveryEvent[] }))
    setLoadingEvents(prev => ({ ...prev, [orderId]: false }))
  }

  const filteredOrders = searchCode.trim()
    ? orders.filter(o =>
        o.id.toLowerCase().includes(searchCode.trim().toLowerCase()) ||
        o.dawurobo_order_id?.toLowerCase().includes(searchCode.trim().toLowerCase())
      )
    : orders

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-1 text-sm text-gray-500">View your purchase history and track deliveries.</p>
      </div>

      {orders.length > 0 && (
        <div className="mb-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID…"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full rounded-xl border border-gray-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
          {searchCode && (
            <button onClick={() => setSearchCode('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-700">No orders yet</p>
          <p className="mt-1 text-sm text-gray-400">Your purchases will appear here.</p>
          <Link href="/shop" className="mt-4 rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black transition-colors">
            Browse Shop
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-500">No orders match &ldquo;{searchCode}&rdquo;</p>
          <button onClick={() => setSearchCode('')} className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700">Clear search</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Order header */}
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-base font-bold text-gray-900">GH₵ {order.total_amount.toFixed(2)}</p>
                  <StatusBadge status={order.dawurobo_status} />
                </div>
              </div>

              {/* Items */}
              <div className="px-4 sm:px-5 py-3 space-y-1.5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate mr-4">
                      <span className="font-semibold text-gray-900">{item.quantity}×</span> {item.title}
                    </span>
                    <span className="font-semibold text-gray-900 flex-shrink-0">GH₵ {item.unit_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Delivery tracking */}
              {order.dawurobo_order_id && (
                <div className="px-4 sm:px-5 pb-4 border-t border-gray-50 pt-3">
                  <button
                    onClick={() => loadDeliveryEvents(order.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    {loadingEvents[order.id] ? 'Loading…' : expandedEvents[order.id] ? 'Hide Timeline' : 'View Delivery Timeline'}
                  </button>

                  {expandedEvents[order.id] && (
                    <div className="mt-3 space-y-2">
                      {expandedEvents[order.id].length === 0 ? (
                        <p className="text-xs text-gray-400">No delivery events yet.</p>
                      ) : (
                        expandedEvents[order.id].map((event, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="mt-0.5 h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-gray-800">
                                {DAWUROBO_STATUS_LABELS[event.status]?.label || event.status}
                              </p>
                              {event.description && (
                                <p className="text-xs text-gray-500">{event.description}</p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(event.timestamp).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
