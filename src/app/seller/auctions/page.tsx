'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Gavel,
  CalendarDays,
  Clock,
  DollarSign,
} from 'lucide-react'

type SellerAuction = {
  id: string
  title: string
  status: string | null
  current_price: number | null
  paid: boolean | null
  created_at: string | null
  starts_at: string | null
  ends_at: string | null
}

type AuctionBucket = 'all' | 'active' | 'scheduled' | 'ended' | 'delivered'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  ended: 'bg-gray-100 text-gray-700',
  delivered: 'bg-orange-100 text-orange-700',
}

function statusLabel(auction: SellerAuction) {
  if (auction.paid) return 'delivered'
  return auction.status ?? 'unknown'
}

export default function SellerAuctionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [auctions, setAuctions] = useState<SellerAuction[]>([])
  const [bucket, setBucket] = useState<AuctionBucket>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailAuction, setDetailAuction] = useState<SellerAuction | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user
      if (!user) {
        setError('Unauthorized')
        setLoading(false)
        return
      }

      const { data, error: loadError } = await supabase
        .from('auctions')
        .select('id, title, status, current_price, paid, created_at, starts_at, ends_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (loadError) {
        setError(loadError.message)
        setLoading(false)
        return
      }

      setAuctions((data as SellerAuction[] | null) ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const groups = useMemo(() => {
    const active = auctions.filter((auction) => auction.status === 'active')
    const scheduled = auctions.filter((auction) => auction.status === 'scheduled')
    const delivered = auctions.filter((auction) => auction.status === 'delivered' || !!auction.paid)
    const ended = auctions.filter(
      (auction) => auction.status === 'ended' && !delivered.some((item) => item.id === auction.id)
    )

    return {
      all: auctions,
      active,
      scheduled,
      ended,
      delivered,
    }
  }, [auctions])

  const visibleAuctions = groups[bucket]

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredAuctions = normalizedQuery
    ? visibleAuctions.filter((auction) => auction.title.toLowerCase().includes(normalizedQuery))
    : visibleAuctions

  const lifecyclePie = useMemo(
    () => [
      { label: 'Active', value: groups.active.length },
      { label: 'Scheduled', value: groups.scheduled.length },
      { label: 'Ended', value: groups.ended.length },
      { label: 'Delivered', value: groups.delivered.length },
    ],
    [groups.active.length, groups.scheduled.length, groups.ended.length, groups.delivered.length]
  )

  const recentHistory = useMemo(
    () =>
      [...auctions]
        .filter((auction) => auction.status === 'ended' || auction.status === 'delivered' || !!auction.paid)
        .sort((a, b) => new Date(b.ends_at ?? b.created_at ?? 0).getTime() - new Date(a.ends_at ?? a.created_at ?? 0).getTime())
        .slice(0, 5),
    [auctions]
  )

  const canModify = (auction: SellerAuction) => {
    if (!auction.starts_at) return false
    return new Date(auction.starts_at).getTime() > Date.now()
  }

  const deleteAuction = async (auction: SellerAuction) => {
    if (!canModify(auction)) {
      setError('Only auctions that have not started can be deleted.')
      return
    }

    const confirmed = window.confirm(`Delete "${auction.title}"?`)
    if (!confirmed) return

    setDeletingId(auction.id)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) throw new Error('Unauthorized')

      const res = await fetch(`/api/seller/auction/${auction.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Failed to delete auction')

      setAuctions((previous) => previous.filter((item) => item.id !== auction.id))
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete auction')
    } finally {
      setDeletingId(null)
    }
  }

  const bucketTabs: Array<{ key: AuctionBucket; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'ended', label: 'Ended' },
    { key: 'delivered', label: 'Delivered' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Auctions</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Create, track, edit, and review your auction history.
            </p>
          </div>
          <Link
            href="/auctions/new"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Auction</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <PieChartCard title="Auction Lifecycle" points={lifecyclePie} emptyLabel="No auctions yet" />
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent History</h3>
          {recentHistory.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No completed auction history yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentHistory.map((auction) => (
                <div
                  key={auction.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{auction.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {auction.status === 'delivered' || auction.paid ? 'Delivered' : 'Ended'} ·{' '}
                      {auction.ends_at ? new Date(auction.ends_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <span
                    className={`ml-3 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_BADGE[statusLabel(auction)] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {statusLabel(auction)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bucket pill tabs */}
      <section className="flex flex-wrap gap-2">
        {bucketTabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setBucket(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              bucket === key
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                bucket === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {groups[key].length}
            </span>
          </button>
        ))}
      </section>

      {/* Search + list */}
      <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search auctions…"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <p className="text-xs text-gray-400">
            {filteredAuctions.length} of {visibleAuctions.length} shown
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Gavel className="mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No auctions in this category yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="space-y-3 sm:hidden">
              {filteredAuctions.map((auction) => {
                const sl = statusLabel(auction)
                return (
                  <div
                    key={auction.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900 text-sm">{auction.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            GHS {Number(auction.current_price ?? 0).toLocaleString()}
                          </span>
                          {auction.ends_at && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(auction.ends_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_BADGE[sl] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {sl}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailAuction(auction)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                      <Link
                        href={`/auctions/${auction.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View Listing
                      </Link>
                      {canModify(auction) && (
                        <>
                          <Link
                            href={`/seller/auctions/edit/${auction.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteAuction(auction)}
                            disabled={deletingId === auction.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === auction.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Table */}
            <div className="hidden sm:block overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
                    <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAuctions.map((auction) => {
                    const sl = statusLabel(auction)
                    return (
                      <tr key={auction.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-gray-900">{auction.title}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              STATUS_BADGE[sl] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {sl}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          GHS {Number(auction.current_price ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailAuction(auction)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <Link
                              href={`/auctions/${auction.id}`}
                              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Listing
                            </Link>
                            {canModify(auction) && (
                              <>
                                <Link
                                  href={`/seller/auctions/edit/${auction.id}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => deleteAuction(auction)}
                                  disabled={deletingId === auction.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  {deletingId === auction.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </>
                            )}
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
      </section>

      {/* Detail modal */}
      {detailAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">Auction Details</h3>
              <button
                type="button"
                onClick={() => setDetailAuction(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Title</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">{detailAuction.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_BADGE[statusLabel(detailAuction)] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {statusLabel(detailAuction)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Current Price</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    GHS {Number(detailAuction.current_price ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <Clock className="h-3 w-3" /> Starts
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700">
                    {detailAuction.starts_at ? new Date(detailAuction.starts_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <CalendarDays className="h-3 w-3" /> Ends
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700">
                    {detailAuction.ends_at ? new Date(detailAuction.ends_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <CalendarDays className="h-3 w-3" /> Created
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700">
                    {detailAuction.created_at ? new Date(detailAuction.created_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailAuction(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                href={`/auctions/${detailAuction.id}`}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                View Listing
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
