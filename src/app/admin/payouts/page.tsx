'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type PayoutSummary = {
  key: string
  seller_id: string | null
  seller_name: string
  seller_shop_name: string
  seller_phone: string
  payout_provider: string
  payout_account_name: string
  payout_account_number: string
  items_sold: number
  gross_sales: number
}

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState<PayoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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

      const res = await fetch('/api/admin/payouts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(payload?.error || 'Failed to load seller payouts')
        setLoading(false)
        return
      }

      setRows((payload?.payouts ?? []) as PayoutSummary[])
      setLoading(false)
    }

    load()
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((row) =>
      `${row.seller_name} ${row.seller_shop_name} ${row.payout_provider} ${row.payout_account_name} ${row.payout_account_number}`
        .toLowerCase()
        .includes(query)
    )
  }, [rows, search])

  const totalGross = filteredRows.reduce((sum, row) => sum + Number(row.gross_sales || 0), 0)

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-xl font-semibold">Seller Payouts</h2>
        <p className="mt-1 text-sm text-gray-500">Dedicated payout tab with seller account snapshots and gross sales from paid shop orders.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by seller or account"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
          />
          <p className="text-sm text-gray-500">
            Showing {filteredRows.length} account{filteredRows.length === 1 ? '' : 's'} · Gross sales GHS {totalGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading seller payouts…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-gray-500">No payout records yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Seller</th>
                  <th className="py-2">Shop</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Account Name</th>
                  <th className="py-2">Account Number</th>
                  <th className="py-2">Items Sold</th>
                  <th className="py-2">Gross Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.key} className="border-t align-top">
                    <td className="py-2 font-medium text-gray-900">{row.seller_name}</td>
                    <td className="py-2">{row.seller_shop_name}</td>
                    <td className="py-2">{row.seller_phone}</td>
                    <td className="py-2">{row.payout_provider}</td>
                    <td className="py-2">{row.payout_account_name}</td>
                    <td className="py-2">{row.payout_account_number}</td>
                    <td className="py-2">{row.items_sold}</td>
                    <td className="py-2 whitespace-nowrap">GHS {Number(row.gross_sales).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
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
