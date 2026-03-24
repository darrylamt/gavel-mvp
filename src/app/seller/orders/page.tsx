'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { useTopToast } from '@/components/ui/TopToastProvider'

type OrderItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
}

type Order = {
  id: string
  total_amount: number
  delivery_address: string | null
  delivery_city: string | null
  buyer_full_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  created_at: string
  dawurobo_order_id: string | null
  dawurobo_status: string | null
  items: OrderItem[]
}

const DAWUROBO_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Processing', color: 'bg-gray-100 text-gray-700' },
  assigned: { label: 'Rider Assigned', color: 'bg-blue-100 text-blue-700' },
  picked_up: { label: 'Picked Up', color: 'bg-yellow-100 text-yellow-700' },
  in_transit: { label: 'In Transit', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Delivery Failed', color: 'bg-red-100 text-red-700' },
  returned: { label: 'Returned', color: 'bg-red-100 text-red-700' },
}

export default function SellerOrdersPage() {
  const { notify } = useTopToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [dispatching, setDispatching] = useState<string | null>(null)

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    if (!userId) { setLoading(false); return }

    // Get seller's shop IDs
    const { data: shops } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)

    const shopIds = (shops ?? []).map(s => s.id as string)
    if (!shopIds.length) { setLoading(false); return }

    // Get product IDs belonging to seller's shops
    const { data: products } = await supabase
      .from('shop_products')
      .select('id')
      .in('shop_id', shopIds)

    const productIds = (products ?? []).map(p => p.id as string)
    if (!productIds.length) { setLoading(false); return }

    // Get order IDs that contain seller's products
    const { data: myItems } = await supabase
      .from('shop_order_items')
      .select('order_id, id, title_snapshot, quantity, unit_price')
      .in('product_id', productIds)

    const orderIds = [...new Set((myItems ?? []).map(i => i.order_id as string))]
    if (!orderIds.length) { setOrders([]); setLoading(false); return }

    const { data: ordersData } = await supabase
      .from('shop_orders')
      .select('id, total_amount, delivery_address, delivery_city, buyer_full_name, buyer_phone, buyer_email, created_at, dawurobo_order_id, dawurobo_status')
      .in('id', orderIds)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })

    const itemsByOrder = new Map<string, OrderItem[]>()
    for (const item of myItems ?? []) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, [])
      itemsByOrder.get(item.order_id)!.push({
        id: item.id,
        title: item.title_snapshot,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })
    }

    setOrders((ordersData ?? []).map(o => ({
      id: o.id,
      total_amount: o.total_amount,
      delivery_address: o.delivery_address ?? null,
      delivery_city: o.delivery_city ?? null,
      buyer_full_name: o.buyer_full_name ?? null,
      buyer_phone: o.buyer_phone ?? null,
      buyer_email: o.buyer_email ?? null,
      created_at: o.created_at,
      dawurobo_order_id: o.dawurobo_order_id ?? null,
      dawurobo_status: o.dawurobo_status ?? null,
      items: itemsByOrder.get(o.id) ?? [],
    })))
    setLoading(false)
  }

  const dispatchOrder = async (order: Order) => {
    setDispatching(order.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/delivery/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (res.ok) {
        notify({ title: 'Dispatched', description: 'Dawurobo delivery order created.', variant: 'success' })
        await loadOrders()
      } else {
        notify({ title: 'Dispatch Failed', description: data.error || 'Failed to create delivery', variant: 'error' })
      }
    } catch {
      notify({ title: 'Error', description: 'Failed to dispatch order', variant: 'error' })
    } finally {
      setDispatching(null)
    }
  }

  const pendingCount = orders.filter(o => !o.dawurobo_order_id).length
  const inTransitCount = orders.filter(o => o.dawurobo_status && !['delivered', 'returned', 'failed'].includes(o.dawurobo_status)).length
  const deliveredCount = orders.filter(o => o.dawurobo_status === 'delivered').length

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage your orders and dispatch deliveries.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: orders.length, color: 'gray', Icon: Package },
          { label: 'Pending', value: pendingCount, color: 'yellow', Icon: Clock },
          { label: 'In Transit', value: inTransitCount, color: 'purple', Icon: Truck },
          { label: 'Delivered', value: deliveredCount, color: 'green', Icon: CheckCircle2 },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className={`rounded-2xl border bg-${color}-50 border-${color === 'gray' ? 'gray-100' : `${color}-200`} p-4 shadow-sm`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide text-${color}-${color === 'gray' ? '500' : '700'}`}>{label}</p>
                <p className={`mt-2 text-3xl font-bold text-${color}-${color === 'gray' ? '900' : '900'}`}>{value}</p>
              </div>
              <div className={`rounded-xl bg-${color}-100 p-2`}>
                <Icon className={`h-5 w-5 text-${color}-${color === 'gray' ? '400' : '600'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Orders</h2>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => {
              const statusInfo = order.dawurobo_status
                ? DAWUROBO_STATUS_LABELS[order.dawurobo_status]
                : null

              return (
                <div key={order.id}>
                  <div
                    className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 rounded-xl bg-gray-100 p-2.5">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {order.buyer_full_name || order.buyer_email || 'Customer'} · {formatDate(order.created_at)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {statusInfo ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Awaiting Dispatch
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{order.items.length} item(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 flex flex-shrink-0 items-center gap-3">
                      <p className="font-bold text-gray-900 text-sm">GH₵ {Number(order.total_amount).toFixed(2)}</p>
                      {expandedOrder === order.id
                        ? <ChevronUp className="h-4 w-4 text-gray-400" />
                        : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                      <div className="mb-4 grid gap-3 md:grid-cols-2">
                        {/* Customer */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span className="text-gray-800">{order.buyer_full_name || 'N/A'}</span>
                            </div>
                            {order.buyer_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="text-gray-800">{order.buyer_phone}</span>
                              </div>
                            )}
                            {(order.delivery_address || order.delivery_city) && (
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="flex-1 text-gray-800">
                                  {[order.delivery_address, order.delivery_city].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dispatch */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery</h4>
                          {order.dawurobo_order_id ? (
                            <div className="space-y-1.5">
                              <p className="text-xs text-gray-500">
                                Dawurobo ID: <span className="font-mono text-gray-700">{order.dawurobo_order_id}</span>
                              </p>
                              {order.dawurobo_status && (
                                <p className="text-xs text-gray-500">
                                  Status:{' '}
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${DAWUROBO_STATUS_LABELS[order.dawurobo_status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {DAWUROBO_STATUS_LABELS[order.dawurobo_status]?.label || order.dawurobo_status}
                                  </span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="mb-3 text-xs text-gray-500">
                                Ready to ship? Dispatch this order through Dawurobo.
                              </p>
                              <button
                                onClick={() => dispatchOrder(order)}
                                disabled={dispatching === order.id}
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                {dispatching === order.id ? 'Dispatching…' : 'Dispatch with Dawurobo'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items</h4>
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-gray-900">GH₵ {Number(item.unit_price).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
