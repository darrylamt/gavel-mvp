'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import PieChartCard from '@/components/base/PieChartCard'
import { TrendingUp, AlertCircle, DollarSign } from 'lucide-react'

type RevenueSummary = {
  productSales: number
  auctionSales: number
  tokenSales: number
  websiteRevenue: number
  gavelRevenue: number
  paystackFee: number
  gavelProfit: number
}

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
] as const

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [summary, setSummary] = useState<RevenueSummary>({
    productSales: 0,
    auctionSales: 0,
    tokenSales: 0,
    websiteRevenue: 0,
    gavelRevenue: 0,
    paystackFee: 0,
    gavelProfit: 0,
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

      const res = await fetch(`/api/admin/revenue?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setError(payload?.error || 'Failed to load revenue')
        setLoading(false)
        return
      }

      const incoming = (payload?.summary ?? {}) as Partial<RevenueSummary>
      setSummary({
        productSales: incoming.productSales ?? 0,
        auctionSales: incoming.auctionSales ?? 0,
        tokenSales: incoming.tokenSales ?? 0,
        websiteRevenue: incoming.websiteRevenue ?? 0,
        gavelRevenue: incoming.gavelRevenue ?? 0,
        paystackFee: incoming.paystackFee ?? 0,
        gavelProfit: incoming.gavelProfit ?? 0,
      })
      setLoading(false)
    }

    load()
  }, [period])

  const sourcePie = useMemo(
    () => [
      { label: 'Product Sales', value: summary.productSales },
      { label: 'Auction Sales', value: summary.auctionSales },
      { label: 'Token Sales', value: summary.tokenSales },
    ],
    [summary.auctionSales, summary.productSales, summary.tokenSales]
  )

  const gavelPie = useMemo(
    () => [
      { label: 'Gavel Revenue', value: summary.gavelRevenue },
      { label: 'Paystack Fee (~1.95%)', value: summary.paystackFee },
      { label: 'Gavel Profit', value: summary.gavelProfit },
    ],
    [summary.gavelProfit, summary.gavelRevenue, summary.paystackFee]
  )

  return (
    <AdminShell>
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenue</h2>
              <p className="text-sm text-gray-500">Website revenue and Gavel profit across product markups, token sales, and paystack costs.</p>
            </div>
          </div>

          {/* Period tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="text-sm text-gray-400">Loading revenue data…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hero cards — highlight cards first */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <HeroMetricCard
              label="Total Website Revenue"
              value={summary.websiteRevenue}
              icon={<DollarSign className="h-5 w-5" />}
              accent
            />
            <HeroMetricCard
              label="Gavel Profit"
              value={summary.gavelProfit}
              icon={<TrendingUp className="h-5 w-5" />}
              positive
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Product Sales" value={summary.productSales} />
            <MetricCard label="Auction Sales" value={summary.auctionSales} />
            <MetricCard label="Token Sales" value={summary.tokenSales} />
            <MetricCard label="Gavel Revenue (markup + tokens)" value={summary.gavelRevenue} />
            <MetricCard label="Paystack Cost (~1.95%)" value={summary.paystackFee} negative />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <PieChartCard title="Website Revenue Split" points={sourcePie} emptyLabel="No revenue data" />
            <PieChartCard title="Gavel Revenue & Profit" points={gavelPie} emptyLabel="No profit data" />
          </div>
        </>
      )}
    </AdminShell>
  )
}

function HeroMetricCard({
  label,
  value,
  icon,
  accent = false,
  positive = false,
}: {
  label: string
  value: number
  icon?: React.ReactNode
  accent?: boolean
  positive?: boolean
}) {
  const bg = accent
    ? 'bg-orange-500 text-white border-orange-500'
    : positive
    ? 'bg-emerald-600 text-white border-emerald-600'
    : 'bg-white text-gray-900 border-gray-100'

  return (
    <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${bg}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accent || positive ? 'text-white/80' : 'text-gray-400'}`}>
          {label}
        </p>
        {icon && (
          <span className={`rounded-xl p-2 ${accent || positive ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold">
        GH&#8373; {Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  negative = false,
}: {
  label: string
  value: number
  negative?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${negative ? 'text-red-600' : 'text-gray-900'}`}>
        GH&#8373; {Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}
