'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Package, CheckCircle2, Truck } from 'lucide-react'
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

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to view your orders')
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('shop_orders')
        .select('id, created_at, total_amount, delivered, delivery_confirmed_at, tracking_number, tracking_status')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch order items
      const orderIds = (ordersData || []).map(o => o.id)
      const { data: itemsData, error: itemsError } = await supabase
        .from('shop_order_items')
        .select('order_id, title_snapshot, quantity, unit_price')
        .in('order_id', orderIds)

      if (itemsError) throw itemsError

      // Group items by order
      const itemsByOrder = new Map<string, typeof itemsData>()
      for (const item of itemsData || []) {
        if (!itemsByOrder.has(item.order_id)) {
          itemsByOrder.set(item.order_id, [])
        }
        itemsByOrder.get(item.order_id)!.push(item)
      }

      const enrichedOrders: Order[] = (ordersData || []).map(order => ({
        ...order,
        items: (itemsByOrder.get(order.id) || []).map(item => ({
          title: item.title_snapshot,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      }))

      setOrders(enrichedOrders)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
      setLoading(false)
    }
  }

  const confirmDelivery = async (orderId: string) => {
    if (!userId) return
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
        body: JSON.stringify({
          order_id: orderToConfirm,
          buyer_id: userId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        await loadOrders()
        notify({
          title: 'Delivery Confirmed',
          description: 'Thank you for confirming your delivery!',
          variant: 'success',
        })
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

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-gray-600">Loading your orders...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          View your purchase history and confirm delivery when you receive items.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-900">No orders yet</p>
          <p className="mt-1 text-sm text-gray-500">
            When you purchase items from shops, they'll appear here.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Browse Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Order #{order.id.slice(0, 8)}
                  </p>
                  {order.tracking_number && (
                    <p className="text-xs text-gray-500">
                      Tracking: {order.tracking_number}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    GH₵ {order.total_amount.toFixed(2)}
                  </p>
                  {order.delivered ? (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Delivered
                    </div>
                  ) : (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      <Truck className="h-3 w-3" />
                      {order.tracking_status === 'in_transit' ? 'In Transit' : 'Processing'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}x {item.title}
                    </span>
                    <span className="font-medium text-gray-900">
                      GH₵ {item.unit_price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                {order.tracking_number && (
                  <Link
                    href={`/track-order?tracking=${order.tracking_number}`}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Package className="h-4 w-4" />
                    Track Order
                  </Link>
                )}
                {!order.delivered && (
                  <div className="flex-1">
                    <p className="mb-2 text-xs text-gray-600">
                      Confirm delivery once you receive your items to release payment to the seller
                    </p>
                    <button
                      onClick={() => confirmDelivery(order.id)}
                      disabled={confirmingOrderId === order.id}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {confirmingOrderId === order.id
                        ? 'Confirming...'
                        : 'Confirm Delivery'}
                    </button>
                  </div>
                )}
              </div>

              {order.delivered && order.delivery_confirmed_at && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">
                    Confirmed on{' '}
                    {new Date(order.delivery_confirmed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false)
          setOrderToConfirm(null)
        }}
        onConfirm={handleConfirmDelivery}
        title="Confirm Delivery"
        description="Confirm that you have received this order in good condition? This will release payment to the seller."
        confirmText="Confirm Delivery"
        variant="success"
        isLoading={confirmingOrderId === orderToConfirm}
      />
    </div>
  )
}
