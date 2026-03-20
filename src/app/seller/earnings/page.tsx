'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PieChartCard from '@/components/base/PieChartCard'
import { TrendingUp, ShoppingBag, Gavel, X } from 'lucide-react'

type EarningsSummary = {
  productSales: number
  auctionSales: number
  totalEarnings: number
}

const PERIOD_OPTIONS: Array<{ key: '7d' | '30d' | '90d' | 'all'; label: string }> = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
]

export default function SellerEarningsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
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

      const res = await fetch(`/api/seller/earnings?period=${period}`, {
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
  }, [period])

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
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Earnings</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Track how much you&apos;re making from product and auction sales.
            </p>
          </div>
          {/* Period pill tabs */}
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  period === key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-white py-16 shadow-sm border border-gray-100">
          <div className="text-center">
            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="text-sm text-gray-400">Loading earnings…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-orange-500 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-100">
                    Total Earnings
                  </p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    GH₵{' '}
                    {Number(summary.totalEarnings ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="rounded-xl bg-white/20 p-2">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Product Sales
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    GH₵{' '}
                    {Number(summary.productSales ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2">
                  <ShoppingBag className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Auction Sales
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    GH₵{' '}
                    {Number(summary.auctionSales ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2">
                  <Gavel className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Charts */}
          <section className="grid gap-4 lg:grid-cols-2">
            <PieChartCard title="Earnings by Source" points={sourcePie} emptyLabel="No earnings yet" />
            <PieChartCard title="Earnings Mix" points={contributionPie} emptyLabel="No earnings yet" />
          </section>
        </>
      )}
    </div>
  )
}
