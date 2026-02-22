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
  auction_payment_due_at: string | null
  created_at: string | null
  ends_at: string | null
}

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [auctions, setAuctions] = useState<SellerAuction[]>([])

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

  const lifecyclePie = useMemo(
    () => [
      { label: 'Active', value: groups.active.length },
      { label: 'Ended', value: groups.ended.length },
      { label: 'Pending Payment', value: groups.pendingPayment.length },
      { label: 'Delivered', value: groups.delivered.length },
    ],
    [groups.active.length, groups.ended.length, groups.pendingPayment.length, groups.delivered.length]
  )

  const paymentPie = useMemo(() => {
    const paid = auctions.filter((auction) => !!auction.paid).length
    const unpaid = Math.max(auctions.length - paid, 0)

    return [
      { label: 'Paid/Delivered', value: paid },
      { label: 'Not Paid Yet', value: unpaid },
    ]
  }, [auctions])

  if (loading) {
    return <p className="p-6">Loading seller dashboard…</p>
  }

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-xl font-semibold">Seller Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Use My Auctions for auction listings and My Products for buy-now inventory.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/seller/auctions"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            My Auctions
          </Link>
          <Link
            href="/seller/products"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            My Products
          </Link>
          <Link
            href="/auctions/new"
            className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50 md:inline-flex"
          >
            New Auction
          </Link>
          <Link
            href="/seller/products"
            className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50 md:inline-flex"
          >
            Add Product
          </Link>
          <Link
            href="/seller/shop"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50"
          >
            Edit Shop
          </Link>
          <Link
            href="/seller/deliveries"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50"
          >
            Delivery Details
          </Link>
          <Link href="/auctions" className="hidden rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 md:inline-flex">
            Browse Auctions
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PieChartCard title="Auction Lifecycle" points={lifecyclePie} emptyLabel="No auctions yet" />
        <PieChartCard title="Payment Completion" points={paymentPie} emptyLabel="No payment data yet" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 text-left shadow-sm">
          <p className="text-xs uppercase tracking-wide opacity-80">Active</p>
          <p className="mt-2 text-2xl font-bold">{groups.active.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 text-left shadow-sm">
          <p className="text-xs uppercase tracking-wide opacity-80">Ended</p>
          <p className="mt-2 text-2xl font-bold">{groups.ended.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 text-left shadow-sm">
          <p className="text-xs uppercase tracking-wide opacity-80">Pending Payment</p>
          <p className="mt-2 text-2xl font-bold">{groups.pendingPayment.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 text-left shadow-sm">
          <p className="text-xs uppercase tracking-wide opacity-80">Delivered</p>
          <p className="mt-2 text-2xl font-bold">{groups.delivered.length}</p>
        </div>
      </section>
    </>
  )
}
