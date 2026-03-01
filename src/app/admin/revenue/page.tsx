'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import PieChartCard from '@/components/base/PieChartCard'

type RevenueSummary = {
  productSales: number
  auctionSales: number
  tokenSales: number
  websiteRevenue: number
  gavelRevenue: number
  paystackFee: number
  gavelProfit: number
}

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
      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Revenue</h2>
            <p className="mt-1 text-sm text-gray-500">Website revenue and Gavel profit across product markups, token sales, and paystack costs.</p>
          </div>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as '7d' | '30d' | '90d' | 'all')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <p className="text-sm text-gray-500">Loading revenue data…</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Total Website Revenue" value={summary.websiteRevenue} highlight />
            <MetricCard label="Product Sales" value={summary.productSales} />
            <MetricCard label="Auction Sales" value={summary.auctionSales} />
            <MetricCard label="Token Sales" value={summary.tokenSales} />
            <MetricCard label="Gavel Revenue (markup + tokens)" value={summary.gavelRevenue} />
            <MetricCard label="Paystack Cost (~1.95%)" value={summary.paystackFee} />
            <MetricCard label="Gavel Profit" value={summary.gavelProfit} highlight />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PieChartCard title="Website Revenue Split" points={sourcePie} emptyLabel="No revenue data" />
            <PieChartCard title="Gavel Revenue & Profit" points={gavelPie} emptyLabel="No profit data" />
          </div>
        </>
      )}
    </AdminShell>
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
