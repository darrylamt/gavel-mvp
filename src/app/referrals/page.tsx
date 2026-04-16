'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Copy, Check, Share2, Phone, ShieldCheck, AlertCircle,
  TrendingUp, Users, Wallet, ArrowDownToLine, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Commission = {
  id: string
  referred_user_masked: string
  gross_amount: number
  commission_amount: number
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  triggered_at: string
}

type Payout = {
  id: string
  amount: number
  period: string
  status: 'pending' | 'processing' | 'paid' | 'failed'
  paid_at: string | null
  created_at: string
}

type DashboardData = {
  referral_code: string
  referral_link: string
  is_verified: boolean
  leaderboard_display: 'name' | 'anonymous'
  total_earnings: number
  pending_earnings: number
  paid_earnings: number
  total_referrals: number
  buyer_referrals: number
  seller_referrals: number
  can_withdraw: boolean
  min_withdrawal: number
  commissions: Commission[]
  payouts: Payout[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGHS(n: number) {
  return `GHS ${n.toFixed(2)}`
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-blue-50 text-blue-700',
    paid: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-600',
    processing: 'bg-blue-50 text-blue-700',
    failed: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function nextFirstOfMonth() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Phone Verification ───────────────────────────────────────────────────────

function PhoneVerificationPanel({
  onVerified,
  token,
}: {
  onVerified: () => void
  token: string
}) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [smsOptIn, setSmsOptIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/referrals/send-otp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to send OTP'); return }
    setStep('otp')
  }

  async function verifyOtp() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/referrals/verify-otp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, sms_opt_in: smsOptIn }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Verification failed'); return }
    onVerified()
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-600 shrink-0">
          <Phone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Verify your phone to unlock earnings</h3>
          <p className="mt-0.5 text-sm text-gray-600">
            Your referral link is shareable now — commissions will be released once you verify.
          </p>

          {error && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {step === 'phone' ? (
            <div className="mt-4 flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0241234567"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <button
                onClick={sendOtp}
                disabled={loading || !phone.trim()}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">Enter the 6-digit code sent to <strong>{phone}</strong></p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm tracking-widest focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </div>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500 cursor-pointer"
                />
                <span className="text-xs text-gray-500">
                  Send me SMS updates about new auctions, deals, and offers from Gavel
                </span>
              </label>
              <button
                onClick={() => { setStep('phone'); setOtp('') }}
                className="text-xs text-gray-500 underline"
              >
                Wrong number?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawMsg, setWithdrawMsg] = useState('')
  const [updatingDisplay, setUpdatingDisplay] = useState(false)
  const [showPayouts, setShowPayouts] = useState(false)

  const loadDashboard = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/referrals/dashboard', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      loadDashboard(session.access_token)
    })
  }, [loadDashboard])

  async function copyLink() {
    if (!data) return
    await navigator.clipboard.writeText(data.referral_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleWithdraw() {
    if (!token) return
    setWithdrawing(true)
    setWithdrawMsg('')
    const res = await fetch('/api/referrals/early-withdraw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    setWithdrawing(false)
    if (res.ok) {
      setWithdrawMsg(`Withdrawal of ${fmtGHS(json.amount)} initiated successfully!`)
      loadDashboard(token)
    } else {
      setWithdrawMsg(json.error ?? 'Withdrawal failed')
    }
  }

  async function toggleLeaderboardDisplay() {
    if (!token || !data) return
    setUpdatingDisplay(true)
    const next = data.leaderboard_display === 'name' ? 'anonymous' : 'name'
    await fetch('/api/referrals/dashboard', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaderboard_display: next }),
    })
    setData({ ...data, leaderboard_display: next })
    setUpdatingDisplay(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (!token || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Sign in to access your referral dashboard</h2>
          <p className="mt-2 text-sm text-gray-500">Log in to get your unique link and start earning.</p>
          <a href="/login" className="mt-4 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
            Sign in
          </a>
        </div>
      </div>
    )
  }

  const filteredCommissions = data.commissions.filter(
    (c) => commissionFilter === 'all' || c.status === commissionFilter
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const shareText = `Shop and bid on Gavel Ghana — Ghana's top auction marketplace! Use my link: ${data.referral_link}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.referral_link)}`

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Earn with Gavel</h1>
        <p className="mt-2 text-gray-600">
          Share your link. Earn <strong>2%</strong> of every purchase or sale* your referrals make — forever.
        </p>
      </div>

      {/* Phone Verification Banner */}
      {!data.is_verified && (
        <div className="mb-6">
          <PhoneVerificationPanel
            token={token}
            onVerified={() => loadDashboard(token)}
          />
        </div>
      )}

      {data.is_verified && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-800">Phone verified — you're earning commissions</span>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Earnings" value={fmtGHS(data.total_earnings)} accent="orange" />
        <StatCard label="Pending" value={fmtGHS(data.pending_earnings)} accent="blue" />
        <StatCard label="Paid Out" value={fmtGHS(data.paid_earnings)} accent="green" />
        <StatCard label="Total Referrals" value={String(data.total_referrals)} accent="violet" />
        <StatCard label="Buyers Referred" value={String(data.buyer_referrals)} accent="gray" />
        <StatCard label="Sellers Referred" value={String(data.seller_referrals)} accent="gray" />
      </div>

      {/* Referral Link */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Your Referral Link</h2>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <span className="flex-1 truncate text-sm text-gray-700">{data.referral_link}</span>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-orange-500"
            title="Copy link"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white hover:opacity-80">
            <Share2 className="h-3.5 w-3.5" /> X / Twitter
          </a>
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            <Share2 className="h-3.5 w-3.5" /> Facebook
          </a>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">Withdraw</h2>
        <p className="mb-4 text-2xl font-bold text-gray-900">{fmtGHS(data.pending_earnings)}</p>

        {withdrawMsg && (
          <p className={`mb-3 text-sm ${withdrawMsg.includes('success') || withdrawMsg.includes('initiated') ? 'text-emerald-600' : 'text-red-600'}`}>
            {withdrawMsg}
          </p>
        )}

        {data.can_withdraw && data.is_verified ? (
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <ArrowDownToLine className="h-4 w-4" />
            {withdrawing ? 'Processing…' : 'Request Early Withdrawal'}
          </button>
        ) : (
          <p className="text-sm text-gray-500">
            {!data.is_verified
              ? 'Verify your phone to enable withdrawals.'
              : `Minimum GHS ${data.min_withdrawal} required. Next auto-payout: ${nextFirstOfMonth()}.`}
          </p>
        )}
      </div>

      {/* Commissions Table */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Commissions</h2>
          <div className="flex gap-1.5">
            {(['all', 'pending', 'approved', 'paid'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setCommissionFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  commissionFilter === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {filteredCommissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              {data.commissions.length === 0 ? 'No commissions yet. Share your link to start earning!' : 'No commissions match this filter.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Referred User</th>
                    <th className="pb-2 text-right">Order Amount</th>
                    <th className="pb-2 text-right">Commission</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCommissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2.5 text-gray-500 text-xs">
                        {new Date(c.triggered_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-gray-700">{c.referred_user_masked}</td>
                      <td className="py-2.5 text-right text-gray-700">GHS {Number(c.gross_amount).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-medium text-orange-600">GHS {Number(c.commission_amount).toFixed(2)}</td>
                      <td className="py-2.5 text-right">{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payout History */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <button
          onClick={() => setShowPayouts(!showPayouts)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <h2 className="text-base font-semibold text-gray-900">Payout History ({data.payouts.length})</h2>
          {showPayouts ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showPayouts && (
          <div className="border-t border-gray-100 p-5">
            {data.payouts.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No payouts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Period</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2.5 text-xs text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 text-gray-700">{p.period}</td>
                        <td className="py-2.5 text-right font-medium text-gray-900">GHS {Number(p.amount).toFixed(2)}</td>
                        <td className="py-2.5 text-right">{statusBadge(p.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard Privacy */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">Leaderboard Privacy</h2>
        <p className="mb-4 text-sm text-gray-600">Show your name on the public leaderboard?</p>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLeaderboardDisplay}
            disabled={updatingDisplay}
            className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
              data.leaderboard_display === 'name' ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              data.leaderboard_display === 'name' ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
          <span className="text-sm text-gray-700">
            {data.leaderboard_display === 'name' ? 'Showing my name' : 'Anonymous'}
          </span>
        </div>
      </div>

      {/* View Leaderboard Link */}
      <div className="text-center">
        <a
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600"
        >
          <TrendingUp className="h-4 w-4" /> View public leaderboard
        </a>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'orange' | 'blue' | 'green' | 'violet' | 'gray'
}) {
  const map = {
    orange: 'text-orange-600 bg-orange-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    violet: 'text-violet-600 bg-violet-50',
    gray: 'text-gray-600 bg-gray-50',
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-2 text-lg font-bold ${map[accent].split(' ')[0]}`}>{value}</p>
    </div>
  )
}
