'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import { supabase } from '@/lib/supabaseClient'
import { GitBranch, TrendingUp, Users, Wallet, RefreshCw, CheckCircle, XCircle, Send } from 'lucide-react'

type ReferralSummary = {
  monthly_paid: number
  total_pending: number
  active_referrers: number
  top_referrer_this_month: string
}

type ReferralCommission = {
  id: string
  referrer_masked: string
  referred_masked: string
  gross_amount: number
  commission_amount: number
  status: string
  triggered_at: string
  order_id: string | null
}

type ReferralPayoutBatch = {
  id: string
  referrer_id: string
  amount: number
  period: string
  status: string
  created_at: string
}

type AdminReferralData = {
  summary: ReferralSummary
  commissions: ReferralCommission[]
  payout_batches: ReferralPayoutBatch[]
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-600',
}

export default function AdminReferralsPage() {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<AdminReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [triggeringPayout, setTriggeringPayout] = useState(false)

  async function load(filter = statusFilter, tok = token) {
    if (!tok) return
    setLoading(true)
    const res = await fetch(`/api/admin/referrals?status=${filter}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token)
        load(statusFilter, session.access_token)
      } else {
        setLoading(false)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCommissionAction(id: string, action: 'approve' | 'cancel') {
    if (!token) return
    setActionLoading(id)
    const res = await fetch(`/api/admin/referrals/commission/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      await load(statusFilter, token)
    }
    setActionLoading(null)
  }

  async function handleTriggerPayout() {
    const secret = prompt('Enter REFERRAL_DISPATCH_SECRET to trigger payout:')
    if (!secret) return
    setTriggeringPayout(true)
    const res = await fetch(`/api/referrals/process-payouts?secret=${encodeURIComponent(secret)}`, {
      method: 'POST',
    })
    const json = await res.json()
    alert(res.ok ? `Done. Processed: ${json.processed}, Skipped: ${json.skipped}, Failed: ${json.failed}` : `Error: ${json.error}`)
    setTriggeringPayout(false)
    if (res.ok) await load(statusFilter, token)
  }

  const commissions = data?.commissions ?? []
  const payoutBatches = data?.payout_batches ?? []

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-orange-500" />
          <h1 className="text-lg font-bold text-gray-900">Referral Programme</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTriggerPayout}
            disabled={triggeringPayout}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {triggeringPayout ? 'Sending…' : 'Trigger Payout'}
          </button>
          <button
            onClick={() => load(statusFilter, token)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Paid This Month"
              value={`GHS ${Number(data.summary.monthly_paid).toFixed(2)}`}
              icon={<Wallet className="h-5 w-5" />}
              color="green"
            />
            <StatCard
              label="Total Pending"
              value={`GHS ${Number(data.summary.total_pending).toFixed(2)}`}
              icon={<GitBranch className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              label="Active Referrers"
              value={String(data.summary.active_referrers)}
              icon={<Users className="h-5 w-5" />}
              color="violet"
            />
            <StatCard
              label="Top Referrer"
              value={data.summary.top_referrer_this_month || '—'}
              icon={<TrendingUp className="h-5 w-5" />}
              color="orange"
            />
          </div>

          {/* Commissions */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Commissions</h2>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'pending', 'approved', 'paid', 'cancelled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setStatusFilter(f)
                      load(f, token)
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
                      statusFilter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {commissions.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">No commissions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="px-5 pb-3 pt-4">Referrer</th>
                      <th className="px-3 pb-3 pt-4">Referred User</th>
                      <th className="px-3 pb-3 pt-4 text-right">Order Value</th>
                      <th className="px-3 pb-3 pt-4 text-right">Commission</th>
                      <th className="px-3 pb-3 pt-4 text-right">Status</th>
                      <th className="px-3 pb-3 pt-4 text-right">Date</th>
                      <th className="px-5 pb-3 pt-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{c.referrer_masked}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">{c.referred_masked}</td>
                        <td className="px-3 py-3 text-right text-xs text-gray-600">
                          GHS {Number(c.gross_amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-orange-600">
                          GHS {Number(c.commission_amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-gray-400">
                          {new Date(c.triggered_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status !== 'paid' && c.status !== 'cancelled' && c.status !== 'approved' && (
                              <button
                                onClick={() => handleCommissionAction(c.id, 'approve')}
                                disabled={actionLoading === c.id}
                                title="Approve"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {c.status !== 'paid' && c.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCommissionAction(c.id, 'cancel')}
                                disabled={actionLoading === c.id}
                                title="Cancel"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payout Batches */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Payout Batches</h2>
            </div>
            {payoutBatches.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">No payout batches yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="px-5 pb-3 pt-4">Period</th>
                      <th className="px-3 pb-3 pt-4 text-right">Amount</th>
                      <th className="px-3 pb-3 pt-4 text-right">Status</th>
                      <th className="px-5 pb-3 pt-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payoutBatches.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{p.period}</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-700">
                          GHS {Number(p.amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-gray-400">
                          {new Date(p.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-sm text-gray-400">Failed to load referral data.</p>
      )}
    </AdminShell>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: 'orange' | 'blue' | 'green' | 'violet'
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-gray-900 truncate">{value}</p>
    </div>
  )
}
