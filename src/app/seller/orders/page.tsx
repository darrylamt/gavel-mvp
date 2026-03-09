'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import SellerShell from '@/components/seller/SellerShell'
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
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)

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
        alert('✓ Order status updated')
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

  const updateOrderStatus = async (orderId: string, status: string) => {
    const description = prompt(`Add a note for "${STATUS_OPTIONS.find((s) => s.value === status)?.label}"`)
    if (description === null) return

    setError(null)

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
        alert('✓ Order status updated')
        await loadOrders()
      } else {
        setError(data.error || 'Failed to update status')
      }
    } catch (err) {
      setError('Failed to update status')
    }
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
    <SellerShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your orders and update delivery status
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">In Transit</p>
                <p className="text-2xl font-bold text-purple-900">{inTransitCount}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Delivered</p>
                <p className="text-2xl font-bold text-green-900">{deliveredCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Orders List */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Orders</h2>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id}>
                  <div
                    className="flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-gray-50"
                    onClick={() => toggleOrder(order.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-gray-100 p-3">
                        <Package className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{order.tracking_number}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {order.customer.username} • {formatDate(order.created_at)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          GHS {order.total_amount.toFixed(2)}
                        </p>
                      </div>
                      {expandedOrder === order.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedOrder === order.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                      {/* Customer Info */}
                      <div className="mb-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <h4 className="mb-2 text-sm font-semibold text-gray-700">
                            Customer Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{order.customer.username}</span>
                            </div>
                            {order.customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{order.customer.phone}</span>
                              </div>
                            )}
                            {order.delivery_address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                <span className="flex-1">{order.delivery_address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <h4 className="mb-2 text-sm font-semibold text-gray-700">
                            Update Order Status
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map((statusOption) => {
                              const Icon = statusOption.icon
                              return (
                                <button
                                  key={statusOption.value}
                                  onClick={() =>
                                    updateOrderStatus(order.id, statusOption.value)
                                  }
                                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {statusOption.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Order Items</h4>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-500">
                                Qty: {item.quantity} × GHS {item.unit_price.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
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
                                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {updatingItem === item.id ? 'Updating...' : 'Mark Delivered'}
                                </button>
                              )}
                              {item.delivered && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Delivered
                                  {item.delivered_at && (
                                    <span className="ml-1 text-gray-400">
                                      • {formatDate(item.delivered_at)}
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
      </div>
    </SellerShell>
  )
}
