'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'
import { Search, Gavel, Plus, Trash2, Pencil, X } from 'lucide-react'

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<DashboardPayload['auctions']>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAuction, setSelectedAuction] = useState<DashboardPayload['auctions'][0] | null>(null)

  const loadAuctions = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok) {
      const data = (await res.json()) as DashboardPayload
      setAuctions(data.auctions)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAuctions()
  }, [])

  const deleteAuction = async (auctionId: string) => {
    const confirmed = confirm('Delete this auction permanently?')
    if (!confirmed) return

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      alert('Unauthorized')
      return
    }

    const res = await fetch('/api/admin/delete-auction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ auctionId }),
    })

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Failed to delete auction')
      return
    }

    setSelectedAuction(null)
    await loadAuctions()
  }

  const statusGraph = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const auction of auctions) {
      const status = auction.status || 'unknown'
      grouped.set(status, (grouped.get(status) ?? 0) + 1)
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }))
  }, [auctions])

  const filteredAuctions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return auctions.filter((auction) => {
      const status = auction.status || 'unknown'
      const statusMatch = statusFilter === 'all' || status === statusFilter
      const textMatch =
        !query ||
        `${auction.title || ''} ${auction.seller_name || ''} ${status}`.toLowerCase().includes(query)
      return statusMatch && textMatch
    })
  }, [auctions, searchQuery, statusFilter])

  const statuses = ['all', 'active', 'scheduled', 'ended', 'delivered']

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Auctions</h2>
            <p className="text-sm text-gray-500">All auction records and current status.</p>
          </div>
        </div>
        <Link
          href="/admin/new"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Auction</span>
          <span className="sm:hidden">Create</span>
        </Link>
      </div>

      {/* Chart */}
      <MiniBarChart title="Auction Status" points={statusGraph} colorClass="bg-sky-500" />

      {/* Table card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search auctions"
                className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">{filteredAuctions.length} shown</span>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="text-sm text-gray-400">Loading auctions…</p>
              </div>
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div className="flex min-h-[20vh] items-center justify-center">
              <p className="text-sm text-gray-400">No auctions found.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {filteredAuctions.map((auction) => {
                  const hasStarted = auction.starts_at ? new Date(auction.starts_at).getTime() <= Date.now() : true
                  return (
                    <div key={auction.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{auction.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{auction.seller_name || '—'}</p>
                          <p className="mt-0.5 text-xs font-medium text-gray-700">
                            GHS {(auction.current_price ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <AuctionStatusBadge status={auction.status || 'unknown'} />
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedAuction(auction)}
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                            >
                              View
                            </button>
                            {!hasStarted && (
                              <Link
                                href={`/admin/auctions/edit/${auction.id}`}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                            )}
                            <button
                              onClick={() => deleteAuction(auction.id)}
                              className="rounded-lg border border-red-100 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden max-h-[60vh] overflow-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pt-1">Title</th>
                      <th className="pb-3 pt-1">Status</th>
                      <th className="pb-3 pt-1">Current</th>
                      <th className="pb-3 pt-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAuctions.map((auction) => {
                      const hasStarted = auction.starts_at ? new Date(auction.starts_at).getTime() <= Date.now() : true

                      return (
                        <tr key={auction.id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="py-3">
                            <p className="font-medium text-gray-900">{auction.title}</p>
                            {auction.seller_name && (
                              <p className="text-xs text-gray-400">{auction.seller_name}</p>
                            )}
                          </td>
                          <td className="py-3">
                            <AuctionStatusBadge status={auction.status || 'unknown'} />
                          </td>
                          <td className="py-3 text-gray-700">
                            GHS {(auction.current_price ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedAuction(auction)}
                                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
                              >
                                View
                              </button>
                              {!hasStarted ? (
                                <Link
                                  href={`/admin/auctions/edit/${auction.id}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-300">Started</span>
                              )}
                              <button
                                onClick={() => deleteAuction(auction.id)}
                                className="rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auction Detail Modal */}
      {selectedAuction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedAuction(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{selectedAuction.title}</h3>
                <AuctionStatusBadge status={selectedAuction.status || 'unknown'} />
              </div>
              <button
                onClick={() => setSelectedAuction(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-6">
              <DetailItem label="Title" value={selectedAuction.title} />
              <DetailItem label="Status" value={selectedAuction.status || '—'} />
              <DetailItem label="Current Price" value={`GHS ${(selectedAuction.current_price ?? 0).toLocaleString()}`} />
              <DetailItem label="Reserve Price" value={selectedAuction.reserve_price != null ? `GHS ${selectedAuction.reserve_price.toLocaleString()}` : '—'} />
              <DetailItem label="Source" value={selectedAuction.sale_source === 'seller' ? 'External Seller' : 'Gavel Products'} />
              <DetailItem label="Seller" value={selectedAuction.seller_name || '—'} />
              {selectedAuction.starts_at && (
                <DetailItem label="Starts At" value={new Date(selectedAuction.starts_at).toLocaleString()} />
              )}
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 pb-6 pt-4">
              {!( selectedAuction.starts_at ? new Date(selectedAuction.starts_at).getTime() <= Date.now() : true) && (
                <Link
                  href={`/admin/auctions/edit/${selectedAuction.id}`}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit Auction
                </Link>
              )}
              <button
                onClick={() => deleteAuction(selectedAuction.id)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete Auction
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function AuctionStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
    ended: 'bg-gray-100 text-gray-600 border-gray-200',
    delivered: 'bg-orange-50 text-orange-700 border-orange-100',
    unknown: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
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
