'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  MapPin,
  Phone,
  User,
  Star,
  Home,
} from 'lucide-react'

type TrackingHistory = {
  status: string
  description: string
  location?: string
  timestamp: string
  updated_by?: string
}

type OrderTracking = {
  id: string
  tracking_number: string
  status: string
  history: TrackingHistory[]
  total_amount: number
  delivery_address?: string
  estimated_delivery?: string
  actual_delivery?: string
  delivered: boolean
  delivery_confirmed_at?: string
  created_at: string
  customer: {
    name: string
    phone?: string
  }
  sellers: Array<{
    seller_id: string
    seller_name: string
    seller_phone?: string
    tracking_status: string
    items: Array<{
      title: string
      quantity: number
      unit_price: number
      delivered: boolean
      delivered_at?: string
    }>
  }>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Received',
  confirmed: 'Order Confirmed',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_ORDER = ['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']

export default function TrackOrderPage() {
  const searchParams = useSearchParams()
  const trackingParam = searchParams.get('tracking')
  
  const [trackingNumber, setTrackingNumber] = useState(trackingParam || '')
  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (trackingParam) {
      loadTracking(trackingParam)
    }
  }, [trackingParam])

  const loadTracking = async (tracking: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/orders/tracking?tracking=${encodeURIComponent(tracking)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Order not found')
        setOrder(null)
      } else {
        setOrder(data.order)
      }
    } catch (err) {
      setError('Failed to load tracking information')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (trackingNumber.trim()) {
      loadTracking(trackingNumber.trim())
    }
  }

  const confirmDelivery = async () => {
    if (!order || !order.id) return

    if (!confirm('Confirm that you have received this order in good condition?')) {
      return
    }

    setConfirming(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        alert('Please log in to confirm delivery')
        setConfirming(false)
        return
      }

      const res = await fetch('/api/orders/confirm-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: order.id,
          type: 'order',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('✓ Delivery confirmed! Thank you for your order.')
        loadTracking(order.tracking_number)
      } else {
        alert(data.error || 'Failed to confirm delivery')
      }
    } catch (err) {
      alert('Failed to confirm delivery')
    } finally {
      setConfirming(false)
    }
  }

  const getStatusProgress = (currentStatus: string) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus)
    return currentIndex >= 0 ? currentIndex + 1 : 0
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
            <p className="text-sm text-gray-500">Enter your tracking number to view order status</p>
          </div>
          <Link
            href="/profile/orders"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
            My Orders
          </Link>
        </div>

        {/* Tracking Input */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <form onSubmit={handleTrackSubmit} className="flex gap-3">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number (e.g., GVL341918713810)"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              type="submit"
              disabled={loading || !trackingNumber.trim()}
              className="rounded-lg bg-black px-6 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {error}
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left Column - Order Info */}
            <div className="space-y-6 md:col-span-2">
              {/* Status Card */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Tracking No.</p>
                    <p className="text-lg font-bold text-gray-900">#{order.tracking_number}</p>
                  </div>
                  <img
                    src="/logo.png"
                    alt="Gavel"
                    className="h-10"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">Your order is</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {STATUS_LABELS[order.status] || order.status}
                  </p>
                  {order.actual_delivery && (
                    <p className="mt-1 text-sm text-gray-500">
                      as on {formatTime(order.actual_delivery)}
                    </p>
                  )}
                  {order.estimated_delivery && !order.actual_delivery && (
                    <p className="mt-1 text-sm text-gray-500">
                      Est. delivery: {formatDate(order.estimated_delivery)}
                    </p>
                  )}
                </div>

                {/* Delivery Confirmation Button */}
                {order.status === 'delivered' && !order.delivery_confirmed_at && (
                  <button
                    onClick={confirmDelivery}
                    disabled={confirming}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {confirming ? 'Confirming...' : 'Confirm Delivery'}
                  </button>
                )}

                {order.delivery_confirmed_at && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                    <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" />
                    <p className="mt-1 text-sm font-medium text-green-900">
                      Delivery Confirmed
                    </p>
                    <p className="text-xs text-green-700">
                      on {formatDate(order.delivery_confirmed_at)}
                    </p>
                  </div>
                )}

                {/* Rating (Optional) */}
                {order.status === 'delivered' && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="mb-2 text-sm text-gray-600">How was your delivery experience?</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`transition-colors ${
                            rating >= star ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400`}
                        >
                          <Star className="h-6 w-6 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tracking History */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-900">Tracking History</h3>
                <div className="space-y-4">
                  {order.history.length > 0 ? (
                    order.history
                      .slice()
                      .reverse()
                      .map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                index === 0 ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                            >
                              {event.status === 'delivered' ? (
                                <CheckCircle2
                                  className={`h-5 w-5 ${
                                    index === 0 ? 'text-green-600' : 'text-gray-400'
                                  }`}
                                />
                              ) : event.status === 'in_transit' || event.status === 'out_for_delivery' ? (
                                <Truck
                                  className={`h-5 w-5 ${
                                    index === 0 ? 'text-blue-600' : 'text-gray-400'
                                  }`}
                                />
                              ) : (
                                <Package
                                  className={`h-5 w-5 ${
                                    index === 0 ? 'text-blue-600' : 'text-gray-400'
                                  }`}
                                />
                              )}
                            </div>
                            {index < order.history.length - 1 && (
                              <div className="h-full w-0.5 bg-gray-200" style={{ minHeight: '40px' }} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium text-gray-900">
                              {STATUS_LABELS[event.status] || event.description}
                            </p>
                            <p className="text-sm text-gray-500">{event.description}</p>
                            {event.location && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-gray-400">{formatTime(event.timestamp)}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500">No tracking history available yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-900">Customer Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Customer Name</p>
                    <p className="font-medium text-gray-900">{order.customer.name}</p>
                  </div>
                  {order.customer.phone && (
                    <div>
                      <p className="text-gray-500">Customer Contact</p>
                      <p className="font-medium text-gray-900">{order.customer.phone}</p>
                    </div>
                  )}
                  {order.delivery_address && (
                    <div>
                      <p className="text-gray-500">Delivery Address</p>
                      <p className="font-medium text-gray-900">{order.delivery_address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Info */}
              {order.sellers.map((seller, idx) => (
                <div key={idx} className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-semibold text-gray-900">Seller Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">Seller Name</p>
                      <p className="font-medium text-gray-900">{seller.seller_name}</p>
                    </div>
                    {seller.seller_phone && (
                      <div>
                        <p className="text-gray-500">Seller Contact</p>
                        <p className="font-medium text-gray-900">{seller.seller_phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Items</p>
                      <div className="mt-2 space-y-2">
                        {seller.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between text-xs">
                            <span className="text-gray-600">
                              {item.title} × {item.quantity}
                            </span>
                            <span className="font-medium">GHS {item.unit_price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Summary */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-900">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Date</span>
                    <span className="font-medium text-gray-900">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span className="font-medium text-gray-900">Total Amount</span>
                    <span className="font-bold text-gray-900">GHS {order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
