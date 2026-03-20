'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'
import SellerProfileNotification from '@/components/seller/SellerProfileNotification'
import { Gavel, Package, Clock, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react'

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
  const [needsDeliveryZones, setNeedsDeliveryZones] = useState(false)

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

      const { count } = await supabase
        .from('seller_delivery_zones')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('is_enabled', true)

      setAuctions((data as SellerAuction[] | null) ?? [])
      setNeedsDeliveryZones((count ?? 0) === 0)
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Active',
      value: groups.active.length,
      icon: TrendingUp,
      accent: true,
    },
    {
      label: 'Ended',
      value: groups.ended.length,
      icon: Clock,
      accent: false,
    },
    {
      label: 'Pending Payment',
      value: groups.pendingPayment.length,
      icon: AlertTriangle,
      accent: false,
    },
    {
      label: 'Delivered',
      value: groups.delivered.length,
      icon: CheckCircle2,
      accent: false,
    },
  ]

  return (
    <>
      <SellerProfileNotification />

      {/* Delivery zones warning */}
      {needsDeliveryZones && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-medium">Delivery zones not set.</span>{' '}
            You haven&apos;t configured your delivery locations yet.{' '}
            <Link
              href="/seller/shop"
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-700"
            >
              Set up now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Header card */}
      <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Seller Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Use My Auctions for auction listings and My Products for buy-now inventory.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/seller/auctions"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <Gavel className="h-4 w-4" />
            My Auctions
          </Link>
          <Link
            href="/seller/products"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Package className="h-4 w-4" />
            My Products
          </Link>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 shadow-sm ${
              accent
                ? 'border-orange-200 bg-orange-500 text-white'
                : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${accent ? 'text-orange-100' : 'text-gray-500'}`}>
                  {label}
                </p>
                <p className={`mt-2 text-3xl font-bold ${accent ? 'text-white' : 'text-gray-900'}`}>
                  {value}
                </p>
              </div>
              <div className={`rounded-xl p-2 ${accent ? 'bg-white/20' : 'bg-gray-50'}`}>
                <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <PieChartCard title="Auction Lifecycle" points={lifecyclePie} emptyLabel="No auctions yet" />
        <PieChartCard title="Payment Completion" points={paymentPie} emptyLabel="No payment data yet" />
      </section>
    </>
  )
}
