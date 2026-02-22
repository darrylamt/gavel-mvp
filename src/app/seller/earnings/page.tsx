'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'

type EarningsSummary = {
  productSales: number
  auctionSales: number
  totalEarnings: number
}

export default function SellerEarningsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<EarningsSummary>({
    productSales: 0,
    auctionSales: 0,
    totalEarnings: 0,
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

      const res = await fetch('/api/seller/earnings', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error || 'Failed to load earnings')
        setLoading(false)
        return
      }

      setSummary((payload?.summary ?? {}) as EarningsSummary)
      setLoading(false)
    }

    load()
  }, [])

  const sourcePie = useMemo(
    () => [
      { label: 'Product Sales', value: summary.productSales },
      { label: 'Auction Sales', value: summary.auctionSales },
    ],
    [summary.auctionSales, summary.productSales]
  )

  const contributionPie = useMemo(
    () => [
      { label: 'Total Seller Earnings', value: summary.totalEarnings },
      { label: 'Product Portion', value: summary.productSales },
      { label: 'Auction Portion', value: summary.auctionSales },
    ],
    [summary.auctionSales, summary.productSales, summary.totalEarnings]
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="mt-1 text-sm text-gray-500">Track how much you are making from product sales and auction sales.</p>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <p className="text-sm text-gray-500">Loading earnings…</p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Product Sales" value={summary.productSales} />
            <MetricCard label="Auction Sales" value={summary.auctionSales} />
            <MetricCard label="Total Earnings" value={summary.totalEarnings} highlight />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <PieChartCard title="Earnings by Source" points={sourcePie} emptyLabel="No earnings yet" />
            <PieChartCard title="Earnings Mix" points={contributionPie} emptyLabel="No earnings yet" />
          </section>
        </>
      )}
    </main>
  )
}

function MetricCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? 'bg-black text-white' : 'bg-white'}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">GHS {Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
    </div>
  )
}
