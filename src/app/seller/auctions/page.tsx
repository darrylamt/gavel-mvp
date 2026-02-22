'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'

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

export default function SellerAuctionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [auctions, setAuctions] = useState<SellerAuction[]>([])
  const [bucket, setBucket] = useState<AuctionBucket>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Auctions</h1>
            <p className="mt-1 text-sm text-gray-500">Create, track, edit, and review your auction history in one place.</p>
          </div>
          <Link
            href="/auctions/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            New Auction
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PieChartCard title="Auction Lifecycle" points={lifecyclePie} emptyLabel="No auctions yet" />
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">Recent History</h3>
          {recentHistory.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No completed auction history yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentHistory.map((auction) => (
                <div key={auction.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <p className="font-medium text-gray-900">{auction.title}</p>
                  <p className="text-xs text-gray-500">
                    {auction.status === 'delivered' || auction.paid ? 'Delivered' : 'Ended'} · {auction.ends_at ? new Date(auction.ends_at).toLocaleString() : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {([
          ['all', 'All'],
          ['active', 'Active'],
          ['scheduled', 'Scheduled'],
          ['ended', 'Ended'],
          ['delivered', 'Delivered'],
        ] as Array<[AuctionBucket, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBucket(key)}
            className={`rounded-xl border p-4 text-left shadow-sm ${bucket === key ? 'bg-black text-white' : 'bg-white'}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-2 text-2xl font-bold">{groups[key].length}</p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search auctions by title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
          />
          <p className="text-xs text-gray-500">
            Showing {filteredAuctions.length} of {visibleAuctions.length} in this view
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading auctions…</p>
        ) : filteredAuctions.length === 0 ? (
          <p className="text-sm text-gray-500">No auctions in this category yet.</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Current Price</th>
                  <th className="py-2">Starts</th>
                  <th className="py-2">Ends</th>
                  <th className="py-2">Created</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuctions.map((auction) => (
                  <tr key={auction.id} className="border-t">
                    <td className="py-2">{auction.title}</td>
                    <td className="py-2">{auction.paid ? 'delivered' : auction.status ?? '-'}</td>
                    <td className="py-2">GHS {Number(auction.current_price ?? 0).toLocaleString()}</td>
                    <td className="py-2">{auction.starts_at ? new Date(auction.starts_at).toLocaleString() : '-'}</td>
                    <td className="py-2">{auction.ends_at ? new Date(auction.ends_at).toLocaleString() : '-'}</td>
                    <td className="py-2">{auction.created_at ? new Date(auction.created_at).toLocaleString() : '-'}</td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/auctions/${auction.id}`} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50">
                          View
                        </Link>
                        {canModify(auction) && (
                          <>
                            <Link href={`/seller/auctions/edit/${auction.id}`} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50">
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteAuction(auction)}
                              disabled={deletingId === auction.id}
                              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === auction.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
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
