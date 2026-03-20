'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { Search, Wallet, TrendingUp, X, AlertCircle, Package } from 'lucide-react'

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
  const [selectedRow, setSelectedRow] = useState<PayoutSummary | null>(null)

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
  const totalItems = filteredRows.reduce((sum, row) => sum + Number(row.items_sold || 0), 0)

  return (
    <AdminShell>
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Seller Payouts</h2>
            <p className="text-sm text-gray-500">Seller account snapshots and gross sales from paid shop orders.</p>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Sellers</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{filteredRows.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Items Sold</p>
              <Package className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{totalItems.toLocaleString()}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow sm:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Gross Sales</p>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              GHS {totalGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by seller or account"
                className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <p className="text-sm text-gray-400">
              {filteredRows.length} account{filteredRows.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="text-sm text-gray-400">Loading seller payouts…</p>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[20vh] items-center justify-center">
              <p className="text-sm text-gray-400">No payout records yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {filteredRows.map((row) => (
                  <div key={row.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{row.seller_name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{row.seller_shop_name}</p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          GHS {Number(row.gross_sales).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedRow(row)}
                        className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pt-1">Seller</th>
                      <th className="pb-3 pt-1">Shop</th>
                      <th className="pb-3 pt-1">Items Sold</th>
                      <th className="pb-3 pt-1 text-right">Gross Sales</th>
                      <th className="pb-3 pt-1"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRows.map((row) => (
                      <tr key={row.key} className="hover:bg-orange-50/30 transition-colors align-top">
                        <td className="py-3">
                          <p className="font-medium text-gray-900">{row.seller_name}</p>
                          <p className="text-xs text-gray-400">{row.seller_phone}</p>
                        </td>
                        <td className="py-3 text-gray-600">{row.seller_shop_name}</td>
                        <td className="py-3 text-gray-600">{row.items_sold}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">
                          GHS {Number(row.gross_sales).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setSelectedRow(row)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payout Detail Modal */}
      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{selectedRow.seller_name}</h3>
                <p className="text-sm text-gray-400">{selectedRow.seller_shop_name}</p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-6">
              <DetailItem label="Seller Name" value={selectedRow.seller_name} />
              <DetailItem label="Shop Name" value={selectedRow.seller_shop_name} />
              <DetailItem label="Phone" value={selectedRow.seller_phone} />
              <DetailItem label="Provider" value={selectedRow.payout_provider} />
              <DetailItem label="Account Name" value={selectedRow.payout_account_name} />
              <DetailItem label="Account Number" value={selectedRow.payout_account_number} />
              <DetailItem label="Items Sold" value={String(selectedRow.items_sold)} />
              <DetailItem
                label="Gross Sales"
                value={`GHS ${Number(selectedRow.gross_sales).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              />
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
