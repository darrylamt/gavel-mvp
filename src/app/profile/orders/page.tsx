'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Package, CheckCircle2, Truck, Search, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTopToast } from '@/components/ui/TopToastProvider'

type Order = {
  id: string
  created_at: string
  total_amount: number
  delivered: boolean
  delivery_confirmed_at: string | null
  tracking_number: string | null
  tracking_status: string | null
  items: Array<{
    title: string
    quantity: number
    unit_price: number
  }>
}

export default function MyOrdersPage() {
  const { notify } = useTopToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [orderToConfirm, setOrderToConfirm] = useState<string | null>(null)
  const [searchCode, setSearchCode] = useState('')

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Please log in to view your orders'); setLoading(false); return }
      setUserId(user.id)

      const { data: ordersData, error: ordersError } = await supabase
        .from('shop_orders')
        .select('id, created_at, total_amount, delivered, delivery_confirmed_at, tracking_number, tracking_status')
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
        ...order,
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

  const confirmDelivery = (orderId: string) => {
    setOrderToConfirm(orderId)
    setConfirmDialogOpen(true)
  }

  const handleConfirmDelivery = async () => {
    if (!orderToConfirm || !userId) return
    setConfirmDialogOpen(false)
    setConfirmingOrderId(orderToConfirm)
    setError(null)
    try {
      const res = await fetch('/api/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderToConfirm, buyer_id: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        await loadOrders()
        notify({ title: 'Delivery Confirmed', description: 'Thank you for confirming your delivery!', variant: 'success' })
      } else {
        setError(data.error || 'Failed to confirm delivery')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm delivery')
    } finally {
      setConfirmingOrderId(null)
      setOrderToConfirm(null)
    }
  }

  // Filter by tracking code search
  const filteredOrders = searchCode.trim()
    ? orders.filter(o =>
        o.tracking_number?.toLowerCase().includes(searchCode.trim().toLowerCase()) ||
        o.id.toLowerCase().includes(searchCode.trim().toLowerCase())
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-1 text-sm text-gray-500">View your purchase history and confirm delivery when items arrive.</p>
      </div>

      {/* Search bar */}
      {orders.length > 0 && (
        <div className="mb-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID or tracking number…"
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
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
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
          <button onClick={() => setSearchCode('')} className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700">
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Order header */}
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  {order.tracking_number && (
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">Tracking: {order.tracking_number}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-gray-900">GH₵ {order.total_amount.toFixed(2)}</p>
                  {order.delivered ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> Delivered
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      <Truck className="h-3 w-3" />
                      {order.tracking_status === 'in_transit' ? 'In Transit' : 'Processing'}
                    </span>
                  )}
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

              {/* Actions */}
              <div className="px-4 sm:px-5 py-3 border-t border-gray-50 flex flex-wrap gap-2">
                {order.tracking_number && (
                  <Link
                    href={`/track-order?tracking=${order.tracking_number}`}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Track Package
                  </Link>
                )}
                {!order.delivered && (
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-xs text-gray-500 flex-1">
                      Confirm receipt to release payment to the seller
                    </p>
                    <button
                      onClick={() => confirmDelivery(order.id)}
                      disabled={confirmingOrderId === order.id}
                      className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {confirmingOrderId === order.id ? 'Confirming…' : '✓ Confirm Delivery'}
                    </button>
                  </div>
                )}
              </div>

              {order.delivered && order.delivery_confirmed_at && (
                <div className="px-4 sm:px-5 pb-3">
                  <p className="text-xs text-gray-400">
                    Confirmed {new Date(order.delivery_confirmed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => { setConfirmDialogOpen(false); setOrderToConfirm(null) }}
        onConfirm={handleConfirmDelivery}
        title="Confirm Delivery"
        description="Confirm that you received this order in good condition? This will release payment to the seller."
        confirmText="Confirm Delivery"
        variant="success"
        isLoading={confirmingOrderId === orderToConfirm}
      />
    </div>
  )
}
