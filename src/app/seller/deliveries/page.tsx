'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type SellerDeliveryRow = {
  item_id: string
  order_id: string
  order_created_at: string
  buyer_full_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_notes: string | null
  product_title: string
  quantity: number
  unit_price: number
  delivered_by_seller: boolean
  delivered_at: string | null
  seller_payout_provider: string | null
  seller_payout_account_name: string | null
  seller_payout_account_number: string | null
}

export default function SellerDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<SellerDeliveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setError('Unauthorized')
        setLoading(false)
        return
      }

      const res = await fetch('/api/seller/deliveries', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error || 'Failed to load deliveries')
        setLoading(false)
        return
      }

      setDeliveries((payload?.deliveries ?? []) as SellerDeliveryRow[])
      setLoading(false)
    }

    load()
  }, [])

  const markDelivered = async (itemId: string) => {
    setUpdatingItemId(itemId)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setError('Unauthorized')
        return
      }

      const res = await fetch('/api/seller/deliveries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: itemId }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error || 'Failed to mark delivered')
        return
      }

      const deliveredAt = (payload?.item?.delivered_at as string | undefined) ?? new Date().toISOString()
      setDeliveries((previous) =>
        previous.map((row) =>
          row.item_id === itemId
            ? {
                ...row,
                delivered_by_seller: true,
                delivered_at: deliveredAt,
              }
            : row
        )
      )
    } finally {
      setUpdatingItemId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Delivery Details</h1>
            <p className="mt-1 text-sm text-gray-600">Buyer delivery information for your sold products.</p>
          </div>
          <Link href="/seller" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading deliveries…</p>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-gray-500">No delivery records yet.</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Order</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Buyer</th>
                  <th className="py-2">Delivery</th>
                  <th className="py-2">Payout Snapshot</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row, index) => (
                  <tr key={`${row.order_id}-${row.item_id}-${index}`} className="border-t align-top">
                    <td className="py-2 whitespace-nowrap">{new Date(row.order_created_at).toLocaleString()}</td>
                    <td className="py-2">{row.order_id.slice(0, 8)}…</td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.product_title}</p>
                      <p className="text-xs text-gray-500">Qty: {row.quantity} · Unit: GHS {Number(row.unit_price).toLocaleString()}</p>
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.buyer_full_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{row.buyer_phone || 'No phone'}</p>
                      <p className="text-xs text-gray-500">{row.buyer_email || 'No email'}</p>
                    </td>
                    <td className="py-2">
                      <p className="text-gray-900">{row.delivery_address || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{row.delivery_city || 'No city'}</p>
                      {row.delivery_notes ? <p className="mt-1 text-xs text-gray-500">Note: {row.delivery_notes}</p> : null}
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.seller_payout_provider || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{row.seller_payout_account_name || 'No account name'}</p>
                      <p className="text-xs text-gray-500">{row.seller_payout_account_number || 'No account number'}</p>
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {row.delivered_by_seller ? (
                        <div>
                          <p className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Delivered</p>
                          {row.delivered_at ? <p className="mt-1 text-xs text-gray-500">{new Date(row.delivered_at).toLocaleString()}</p> : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markDelivered(row.item_id)}
                          disabled={updatingItemId === row.item_id}
                          className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingItemId === row.item_id ? 'Saving…' : 'Mark Delivered'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
