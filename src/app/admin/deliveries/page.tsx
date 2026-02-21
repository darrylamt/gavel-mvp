'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type DeliveryRow = {
  order_id: string
  order_created_at: string
  order_total_amount: number
  buyer_email: string | null
  buyer_full_name: string | null
  buyer_phone: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_notes: string | null
  product_title: string
  quantity: number
  unit_price: number
  seller_name: string | null
  seller_phone: string | null
  seller_shop_name: string | null
  seller_payout_provider: string | null
  seller_payout_account_name: string | null
  seller_payout_account_number: string | null
}

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      const res = await fetch('/api/admin/deliveries', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error || 'Failed to load deliveries')
        setLoading(false)
        return
      }

      setDeliveries((payload?.deliveries ?? []) as DeliveryRow[])
      setLoading(false)
    }

    load()
  }, [])

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-xl font-semibold">Deliveries</h2>
        <p className="mt-1 text-sm text-gray-500">Buyer delivery details and seller payout/account details for each purchased item.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
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
                  <th className="py-2">Seller</th>
                  <th className="py-2">Seller Account</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row, index) => (
                  <tr key={`${row.order_id}-${index}`} className="border-t align-top">
                    <td className="py-2 whitespace-nowrap">{new Date(row.order_created_at).toLocaleString()}</td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.order_id.slice(0, 8)}…</p>
                      <p className="text-xs text-gray-500">GHS {Number(row.order_total_amount).toLocaleString()}</p>
                    </td>
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
                      <p className="font-medium text-gray-900">{row.seller_name || 'Seller'}</p>
                      <p className="text-xs text-gray-500">{row.seller_phone || 'No phone'}</p>
                      <p className="text-xs text-gray-500">Shop: {row.seller_shop_name || 'N/A'}</p>
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{row.seller_payout_provider || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{row.seller_payout_account_name || 'No account name'}</p>
                      <p className="text-xs text-gray-500">{row.seller_payout_account_number || 'No account number'}</p>
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
