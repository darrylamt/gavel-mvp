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

type OrderItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
  status: string
  delivered: boolean
  delivered_at?: string
}

type Order = {
  id: string
  tracking_number: string
  tracking_status: string
  total_amount: number
  delivery_address?: string
  buyer_full_name?: string | null
  buyer_phone?: string | null
  created_at: string
  customer: {
    id: string
    username: string
    phone?: string
  }
  items: OrderItem[]
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Order Received', icon: Clock },
  { value: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { value: 'picked_up', label: 'Picked Up', icon: Package },
  { value: 'in_transit', label: 'In Transit', icon: Truck },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-yellow-100 text-yellow-700',
  in_transit: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ orderId: string; status: string } | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('Please log in')
        setLoading(false)
        return
      }

      const res = await fetch('/api/seller/orders/tracking', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()

      if (res.ok) {
        setOrders(data.orders || [])
      } else {
        setError(data.error || 'Failed to load orders')
      }
    } catch (err) {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateItemStatus = async (
    orderId: string,
    itemId: string,
    status: string,
    description?: string
  ) => {
    setUpdatingItem(itemId)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('Please log in')
        setUpdatingItem(null)
        return
      }

      const res = await fetch('/api/seller/orders/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          item_id: itemId,
          status,
          description:
            description ||
            `Item ${status === 'delivered' ? 'delivered' : status.replace('_', ' ')}`,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage('Order item status updated successfully.')
        await loadOrders()
      } else {
        setError(data.error || 'Failed to update status')
      }
    } catch (err) {
      setError('Failed to update status')
    } finally {
      setUpdatingItem(null)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string, description: string) => {
    setError(null)
    setSuccessMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('Please log in')
        return
      }

      const res = await fetch('/api/seller/orders/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          status,
          description: description || STATUS_OPTIONS.find((s) => s.value === status)?.label,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage('Order status updated successfully.')
        await loadOrders()
      } else {
        setError(data.error || 'Failed to update status')
      }
    } catch (err) {
      setError('Failed to update status')
    }
  }

  const openStatusNoteModal = (orderId: string, status: string) => {
    setPendingStatusUpdate({ orderId, status })
    setStatusNote(STATUS_OPTIONS.find((option) => option.value === status)?.label || '')
    setNoteModalOpen(true)
  }

  const submitStatusUpdate = async () => {
    if (!pendingStatusUpdate) return
    await updateOrderStatus(pendingStatusUpdate.orderId, pendingStatusUpdate.status, statusNote.trim())
    setNoteModalOpen(false)
    setPendingStatusUpdate(null)
    setStatusNote('')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  const pendingCount = orders.filter((o) =>
    o.items.some((i) => i.status === 'pending' || i.status === 'confirmed')
  ).length

  const inTransitCount = orders.filter((o) =>
    o.items.some((i) => i.status === 'in_transit' || i.status === 'picked_up')
  ).length

  const deliveredCount = orders.filter((o) => o.items.every((i) => i.delivered)).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Order Management</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your orders and update delivery status.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-2">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">Pending</p>
              <p className="mt-2 text-3xl font-bold text-yellow-900">{pendingCount}</p>
            </div>
            <div className="rounded-xl bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-purple-700">In Transit</p>
              <p className="mt-2 text-3xl font-bold text-purple-900">{inTransitCount}</p>
            </div>
            <div className="rounded-xl bg-purple-100 p-2">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-green-700">Delivered</p>
              <p className="mt-2 text-3xl font-bold text-green-900">{deliveredCount}</p>
            </div>
            <div className="rounded-xl bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <span className="flex-1">{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
            {orders.map((order) => (
              <div key={order.id}>
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleOrder(order.id)}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 rounded-xl bg-gray-100 p-2.5">
                      <Package className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        Order #{order.tracking_number}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {order.customer.username} · {formatDate(order.created_at)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[order.tracking_status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === order.tracking_status)?.label ||
                            order.tracking_status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {order.items.length} item(s)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-3 flex flex-shrink-0 items-center gap-3">
                    <p className="font-bold text-gray-900 text-sm">
                      GH₵ {order.total_amount.toFixed(2)}
                    </p>
                    {expandedOrder === order.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    {/* Customer + status */}
                    <div className="mb-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Customer Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="text-gray-800">
                              {order.buyer_full_name || order.customer.username}
                            </span>
                          </div>
                          {(order.buyer_phone || order.customer.phone) && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span className="text-gray-800">
                                {order.buyer_phone || order.customer.phone}
                              </span>
                            </div>
                          )}
                          {order.delivery_address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span className="flex-1 text-gray-800">{order.delivery_address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Update Order Status
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {STATUS_OPTIONS.map((statusOption) => {
                            const Icon = statusOption.icon
                            return (
                              <button
                                key={statusOption.value}
                                onClick={() => openStatusNoteModal(order.id, statusOption.value)}
                                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{statusOption.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Order Items
                      </h4>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Qty: {item.quantity} × GH₵ {item.unit_price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {STATUS_OPTIONS.find((s) => s.value === item.status)?.label ||
                                item.status}
                            </span>
                            {!item.delivered && (
                              <button
                                onClick={() =>
                                  updateItemStatus(
                                    order.id,
                                    item.id,
                                    'delivered',
                                    'Item delivered to customer'
                                  )
                                }
                                disabled={updatingItem === item.id}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {updatingItem === item.id ? 'Updating…' : 'Mark Delivered'}
                              </button>
                            )}
                            {item.delivered && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                Delivered
                                {item.delivered_at && (
                                  <span className="ml-1 text-gray-400">
                                    · {formatDate(item.delivered_at)}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status note modal */}
      {noteModalOpen && pendingStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">Update order status</h3>
              <button
                type="button"
                onClick={() => {
                  setNoteModalOpen(false)
                  setPendingStatusUpdate(null)
                  setStatusNote('')
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Add a note for &quot;
              {STATUS_OPTIONS.find((s) => s.value === pendingStatusUpdate.status)?.label}&quot;.
            </p>
            <textarea
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Status note…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNoteModalOpen(false)
                  setPendingStatusUpdate(null)
                  setStatusNote('')
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitStatusUpdate}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Save update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
