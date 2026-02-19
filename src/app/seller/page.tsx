'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type SellerAuction = {
  id: string
  title: string
  status: string | null
  current_price: number | null
  paid: boolean | null
  auction_payment_due_at: string | null
  created_at: string | null
  ends_at: string | null
}

type SellerBucket = 'active' | 'ended' | 'pending-payment' | 'delivered'

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [auctions, setAuctions] = useState<SellerAuction[]>([])

  const [bucket, setBucket] = useState<SellerBucket>('active')

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('auctions')
        .select('id, title, status, current_price, paid, auction_payment_due_at, created_at, ends_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      setAuctions((data as SellerAuction[] | null) ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const groups = useMemo(() => {
    const active = auctions.filter((auction) => auction.status === 'active' || auction.status === 'scheduled')
    const pendingPayment = auctions.filter(
      (auction) => auction.status === 'ended' && !auction.paid && !!auction.auction_payment_due_at
    )
    const delivered = auctions.filter((auction) => auction.status === 'delivered' || !!auction.paid)
    const ended = auctions.filter(
      (auction) =>
        auction.status === 'ended' &&
        !pendingPayment.some((item) => item.id === auction.id) &&
        !delivered.some((item) => item.id === auction.id)
    )

    return { active, ended, pendingPayment, delivered }
  }, [auctions])

  const visibleAuctions =
    bucket === 'active'
      ? groups.active
      : bucket === 'ended'
      ? groups.ended
      : bucket === 'pending-payment'
      ? groups.pendingPayment
      : groups.delivered

  if (loading) {
    return <p className="p-6">Loading seller dashboard…</p>
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Create auctions and track all your listings in one place.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/auctions/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Create Auction
          </Link>
          <Link
            href="/seller/products"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Add Product
          </Link>
          <Link href="/auctions" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            Browse Auctions
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setBucket('active')}
          className={`rounded-xl border p-4 text-left ${bucket === 'active' ? 'bg-black text-white' : 'bg-white'}`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Active</p>
          <p className="mt-2 text-2xl font-bold">{groups.active.length}</p>
        </button>

        <button
          onClick={() => setBucket('ended')}
          className={`rounded-xl border p-4 text-left ${bucket === 'ended' ? 'bg-black text-white' : 'bg-white'}`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Ended</p>
          <p className="mt-2 text-2xl font-bold">{groups.ended.length}</p>
        </button>

        <button
          onClick={() => setBucket('pending-payment')}
          className={`rounded-xl border p-4 text-left ${bucket === 'pending-payment' ? 'bg-black text-white' : 'bg-white'}`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Pending Payment</p>
          <p className="mt-2 text-2xl font-bold">{groups.pendingPayment.length}</p>
        </button>

        <button
          onClick={() => setBucket('delivered')}
          className={`rounded-xl border p-4 text-left ${bucket === 'delivered' ? 'bg-black text-white' : 'bg-white'}`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Delivered</p>
          <p className="mt-2 text-2xl font-bold">{groups.delivered.length}</p>
        </button>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">My Auctions</h2>

        {visibleAuctions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No auctions in this category yet.</p>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Current Price</th>
                  <th className="py-2">Ends At</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleAuctions.map((auction) => (
                  <tr key={auction.id} className="border-t">
                    <td className="py-2">{auction.title}</td>
                    <td className="py-2">{auction.paid ? 'delivered' : auction.status ?? '-'}</td>
                    <td className="py-2">GHS {Number(auction.current_price ?? 0).toLocaleString()}</td>
                    <td className="py-2">{auction.ends_at ? new Date(auction.ends_at).toLocaleString() : '-'}</td>
                    <td className="py-2">{auction.created_at ? new Date(auction.created_at).toLocaleString() : '-'}</td>
                    <td className="py-2">
                      <Link href={`/auctions/${auction.id}`} className="font-medium underline underline-offset-2">
                        View
                      </Link>
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
