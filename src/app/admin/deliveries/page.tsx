'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type DeliveryRow = {
  item_id: string
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
  delivered_by_seller: boolean
  delivered_at: string | null
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDeliveries = deliveries.filter((row) => {
    const statusMatch =
      statusFilter === 'delivered'
        ? row.delivered_by_seller
        : statusFilter === 'pending'
          ? !row.delivered_by_seller
          : true

    const query = searchQuery.trim().toLowerCase()
    const textMatch =
      !query ||
      `${row.product_title} ${row.buyer_full_name || ''} ${row.buyer_phone || ''} ${row.seller_name || ''} ${row.seller_shop_name || ''}`
        .toLowerCase()
        .includes(query)

    return statusMatch && textMatch
  })

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
        <p className="mt-1 text-sm text-gray-500">All sold items with buyer details, seller/store details, payout account snapshot, and delivery status.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by product, buyer, or seller"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
          />
          <p className="text-sm text-gray-500">
            Showing {filteredDeliveries.length} of {deliveries.length} sold item{deliveries.length === 1 ? '' : 's'}.
          </p>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'delivered')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending only</option>
            <option value="delivered">Delivered only</option>
          </select>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading deliveries…</p>
        ) : filteredDeliveries.length === 0 ? (
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
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((row, index) => (
                  <tr key={`${row.order_id}-${row.item_id}-${index}`} className="border-t align-top">
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
                    <td className="py-2 whitespace-nowrap">
                      {row.delivered_by_seller ? (
                        <div>
                          <p className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Delivered</p>
                          {row.delivered_at ? <p className="mt-1 text-xs text-gray-500">{new Date(row.delivered_at).toLocaleString()}</p> : null}
                        </div>
                      ) : (
                        <p className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Pending</p>
                      )}
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
