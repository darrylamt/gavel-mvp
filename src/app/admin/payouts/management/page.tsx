'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  PlayCircle,
  Download,
  CheckSquare,
} from 'lucide-react'
import { formatGhs } from '@/lib/formatGhs'

type Payout = {
  id: string
  order_id: string | null
  auction_id: string | null
  seller_id: string
  buyer_id: string
  gross_amount: number
  commission_amount: number
  payout_amount: number
  status: 'pending' | 'on_hold' | 'processing' | 'success' | 'failed' | 'reversed'
  hold_reason: string | null
  payout_trigger: string | null
  scheduled_release_at: string | null
  created_at: string
  seller?: { username: string; phone: string }
  buyer?: { username: string }
  order?: { id: string; total_amount: number }
  auction?: { title: string; current_price: number }
}

type Summary = {
  total_pending: number
  total_pending_value: number
  total_on_hold: number
  total_on_hold_value: number
  total_processing: number
  total_processing_value: number
  total_success: number
  total_success_value: number
  total_failed: number
  total_commission: number
}

const STATUS_TABS = ['all', 'ready', 'pending', 'on_hold', 'processing', 'success', 'failed'] as const
type StatusTab = typeof STATUS_TABS[number]

function isReady(payout: Payout): boolean {
  if (payout.status !== 'pending') return false
  if (!payout.scheduled_release_at) return true
  return new Date(payout.scheduled_release_at) <= new Date()
}

export default function AdminPayoutsManagementPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusTab>('ready')
  const [userId, setUserId] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  const loadPayouts = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(new Set())

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Unauthorized'); setLoading(false); return }

      // "ready" tab fetches all pending from server then filters client-side
      const serverStatus = statusFilter === 'ready' ? 'pending' : statusFilter
      const res = await fetch(`/api/admin/payouts?mode=management&status=${serverStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()

      if (res.ok) {
        let data: Payout[] = result.data || []
        if (statusFilter === 'ready') data = data.filter(isReady)
        setPayouts(data)
        setSummary(result.summary || null)
      } else {
        setError(result.error || 'Failed to load payouts')
      }
    } catch {
      setError('Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      await loadPayouts()
    }
    init()
  }, [loadPayouts])

  // ── Selection helpers ───────────────────────────────────────────────────────
  const allSelected = payouts.length > 0 && selected.size === payouts.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(payouts.map((p) => p.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  async function exportCsv() {
    if (selected.size === 0) return
    setExporting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Unauthorized'); return }

      const ids = [...selected].join(',')
      const res = await fetch(`/api/admin/payouts/export?ids=${encodeURIComponent(ids)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Export failed')
        return
      }

      const exported = res.headers.get('X-Exported-Count') ?? '?'
      const skipped = res.headers.get('X-Skipped-Count') ?? '0'

      // Trigger file download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gavel-payouts-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)

      const msg = skipped !== '0'
        ? `Exported ${exported} payout(s). ${skipped} skipped (no payout account).`
        : `Exported ${exported} payout(s). They are now marked as "processing".`
      alert(`✓ ${msg}`)
      await loadPayouts()
    } catch {
      setError('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── Hold / Release ──────────────────────────────────────────────────────────
  async function holdPayout(payoutId: string) {
    const reason = prompt('Enter reason for holding this payout:')
    if (!reason || !userId) return

    setActionInProgress(payoutId)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/payouts/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payout_id: payoutId, hold_reason: reason, admin_id: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        alert('✓ Payout placed on hold')
        await loadPayouts()
      } else {
        setError(data.error || 'Failed to hold payout')
      }
    } catch {
      setError('Failed to hold payout')
    } finally {
      setActionInProgress(null)
    }
  }

  async function releasePayout(payoutId: string) {
    if (!confirm('Release this payout?') || !userId) return

    setActionInProgress(payoutId)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/payouts/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payout_id: payoutId, admin_id: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        alert('✓ Payout released')
        await loadPayouts()
      } else {
        setError(data.error || 'Failed to release payout')
      }
    } catch {
      setError('Failed to release payout')
    } finally {
      setActionInProgress(null)
    }
  }

  // ── Status helpers ──────────────────────────────────────────────────────────
  function getStatusIcon(status: Payout['status']) {
    switch (status) {
      case 'pending': return <Clock className="h-3.5 w-3.5" />
      case 'on_hold': return <Ban className="h-3.5 w-3.5" />
      case 'processing': return <PlayCircle className="h-3.5 w-3.5" />
      case 'success': return <CheckCircle2 className="h-3.5 w-3.5" />
      case 'failed':
      case 'reversed': return <XCircle className="h-3.5 w-3.5" />
      default: return <AlertCircle className="h-3.5 w-3.5" />
    }
  }

  function getStatusColor(status: Payout['status']) {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800'
      case 'on_hold': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'success': return 'bg-green-100 text-green-800'
      case 'failed':
      case 'reversed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const selectedTotal = payouts
    .filter((p) => selected.has(p.id))
    .reduce((sum, p) => sum + Number(p.payout_amount), 0)

  return (
    <AdminShell>
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payout Management</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage seller payouts · select eligible ones · export CSV for Hubtel
            </p>
          </div>
          {selected.size > 0 && (
            <button
              onClick={exportCsv}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors"
            >
              <Download className="h-4 w-4" />
              {exporting
                ? 'Exporting…'
                : `Export ${selected.size} (${formatGhs(selectedTotal)})`}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{summary.total_pending}</p>
            <p className="text-xs text-amber-600">{formatGhs(summary.total_pending_value)}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">On Hold</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{summary.total_on_hold}</p>
            <p className="text-xs text-red-600">{formatGhs(summary.total_on_hold_value)}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Processing</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{summary.total_processing}</p>
            <p className="text-xs text-blue-600">{formatGhs(summary.total_processing_value)}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Paid Out</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{summary.total_success}</p>
            <p className="text-xs text-green-600">{formatGhs(summary.total_success_value)}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-5 pt-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab === 'ready' ? '✅ Ready to Pay' : tab.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Selection bar */}
        {(statusFilter === 'ready' || statusFilter === 'pending') && payouts.length > 0 && (
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2.5">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              <CheckSquare className={`h-4 w-4 ${allSelected ? 'text-black' : someSelected ? 'text-gray-400' : 'text-gray-300'}`} />
              {allSelected ? 'Deselect all' : `Select all ${payouts.length}`}
            </button>
            {selected.size > 0 && (
              <span className="text-xs text-gray-500">
                {selected.size} selected · {formatGhs(selectedTotal)}
              </span>
            )}
          </div>
        )}

        <div className="p-5">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="text-sm text-gray-400">Loading payouts…</p>
              </div>
            </div>
          ) : payouts.length === 0 ? (
            <div className="flex min-h-[20vh] items-center justify-center">
              <p className="text-sm text-gray-400">
                {statusFilter === 'ready'
                  ? 'No payouts ready — either all are still in their 5-day hold period or none exist yet.'
                  : 'No payouts found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {(statusFilter === 'ready' || statusFilter === 'pending') && (
                      <th className="pb-3 pt-1 pr-3 w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected }}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 accent-black"
                        />
                      </th>
                    )}
                    <th className="pb-3 pt-1">Date / Release</th>
                    <th className="pb-3 pt-1">Seller</th>
                    <th className="pb-3 pt-1">For</th>
                    <th className="pb-3 pt-1 text-right">Gross</th>
                    <th className="pb-3 pt-1 text-right">Commission</th>
                    <th className="pb-3 pt-1 text-right">Payout</th>
                    <th className="pb-3 pt-1">Status</th>
                    <th className="pb-3 pt-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className={`align-top transition-colors ${
                        selected.has(payout.id) ? 'bg-orange-50/50' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      {(statusFilter === 'ready' || statusFilter === 'pending') && (
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            checked={selected.has(payout.id)}
                            onChange={() => toggleOne(payout.id)}
                            className="h-4 w-4 rounded border-gray-300 accent-black"
                          />
                        </td>
                      )}
                      <td className="py-3">
                        <p className="text-xs text-gray-600">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                        {payout.scheduled_release_at && payout.status === 'pending' && (
                          <p className={`text-xs ${isReady(payout) ? 'text-green-600 font-medium' : 'text-amber-600'}`}>
                            {isReady(payout) ? '✓ Ready' : `Releases ${new Date(payout.scheduled_release_at).toLocaleDateString()}`}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-gray-900">
                          {payout.seller?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400">{payout.seller?.phone}</p>
                      </td>
                      <td className="py-3 text-xs text-gray-500 max-w-[140px]">
                        {payout.auction_id
                          ? (payout.auction as { title?: string } | null)?.title?.slice(0, 30) ?? 'Auction'
                          : payout.order_id
                            ? `Order ${String(payout.order_id).slice(0, 8)}`
                            : '—'}
                      </td>
                      <td className="py-3 text-right text-gray-600 whitespace-nowrap">
                        {formatGhs(payout.gross_amount)}
                      </td>
                      <td className="py-3 text-right text-gray-400 whitespace-nowrap text-xs">
                        {formatGhs(payout.commission_amount)}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatGhs(payout.payout_amount)}
                      </td>
                      <td className="py-3">
                        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(payout.status)}`}>
                          {getStatusIcon(payout.status)}
                          {payout.status.replace('_', ' ')}
                        </div>
                        {payout.hold_reason && (
                          <p className="mt-0.5 text-xs text-gray-400 max-w-[120px] truncate" title={payout.hold_reason}>
                            {payout.hold_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => holdPayout(payout.id)}
                            disabled={actionInProgress === payout.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            Hold
                          </button>
                        )}
                        {payout.status === 'on_hold' && (
                          <button
                            onClick={() => releasePayout(payout.id)}
                            disabled={actionInProgress === payout.id}
                            className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            Release
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Export hint */}
        {(statusFilter === 'ready' || statusFilter === 'pending') && payouts.length > 0 && selected.size === 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              ☝️ Select payouts above then click <strong>Export CSV</strong> to download a file ready for Hubtel's Pay Suppliers upload.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
