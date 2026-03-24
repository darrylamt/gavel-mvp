'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Flag,
  Smartphone,
  CalendarClock,
  X,
  ZoomIn,
} from 'lucide-react'
import type { SwapSubmission, SwapStatus, DeductionBreakdownItem } from '@/types/swap'

function statusBadge(status: SwapStatus) {
  const map: Record<SwapStatus, string> = {
    pending_deposit: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    appointment_booked: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-500',
    expired: 'bg-gray-100 text-gray-500',
  }
  const label: Record<SwapStatus, string> = {
    pending_deposit: 'Pending Deposit',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    appointment_booked: 'Appointment Booked',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  )
}

type FullSubmission = SwapSubmission & {
  appointments?: Array<{
    id: string
    created_at: string
    swap_available_slots?: { slot_datetime: string } | null
  }>
  // extra denormalized fields from admin API
  user_name?: string
  user_email?: string
}

export default function AdminSwapDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [submission, setSubmission] = useState<FullSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagReason, setFlagReason] = useState('')

  // Photo lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const load = async () => {
    setLoading(true)
    setError(null)

    const token = await getToken()
    if (!token) {
      setError('Unauthorized')
      setLoading(false)
      return
    }

    const res = await fetch(`/api/swap/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load submission')
      setLoading(false)
      return
    }

    setSubmission(payload?.submission ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  const doApprove = async () => {
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to approve')
    } else {
      setActionSuccess('Submission approved.')
      await load()
    }
    setActionBusy(false)
  }

  const doReject = async () => {
    if (!rejectReason.trim()) { setActionError('Please enter a rejection reason.'); return }
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to reject')
    } else {
      setActionSuccess('Submission rejected.')
      setShowRejectModal(false)
      setRejectReason('')
      await load()
    }
    setActionBusy(false)
  }

  const doFlag = async () => {
    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/${id}/flag`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flag: !submission?.account_flagged,
        reason: flagReason || null,
      }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to update flag')
    } else {
      setActionSuccess(submission?.account_flagged ? 'Account flag removed.' : 'Account flagged.')
      setShowFlagModal(false)
      setFlagReason('')
      await load()
    }
    setActionBusy(false)
  }

  const phoneModel = submission?.swap_phone_models
  const upgradeItem = submission?.swap_inventory
  const upgradeModel = upgradeItem?.swap_phone_models

  const allPhotos: { url: string; label: string }[] = []
  if (submission) {
    if (submission.battery_health_screenshot) {
      allPhotos.push({ url: submission.battery_health_screenshot, label: 'Battery Screenshot' })
    }
    submission.photos?.forEach((url, i) => {
      allPhotos.push({ url, label: `Photo ${i + 1}` })
    })
  }

  const appointment = submission?.appointments?.[0]
  const slotDatetime = appointment?.swap_available_slots?.slot_datetime

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Back */}
        <button
          onClick={() => router.push('/admin/swaps')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Swaps
        </button>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading submission…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : submission ? (
          <>
            {/* Header */}
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {submission.user_name || 'Unknown User'}
                    </h1>
                    {submission.user_email && (
                      <p className="text-sm text-gray-500">{submission.user_email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(submission.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(submission.status)}
                  {submission.account_flagged && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                      Flagged
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action feedback */}
            {actionError && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{actionError}</p>
              </div>
            )}
            {actionSuccess && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-sm text-emerald-700">{actionSuccess}</p>
              </div>
            )}

            {/* Appointment info */}
            {submission.status === 'appointment_booked' && appointment && slotDatetime && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">Appointment Scheduled</p>
                </div>
                <p className="text-sm text-blue-700">
                  {new Date(slotDatetime).toLocaleDateString('en-GH', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(slotDatetime).toLocaleTimeString('en-GH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {submission.arrival_recalculated && (
                  <p className="mt-1 text-xs text-blue-600">
                    Arrival recalculated — new value: GHS {Number(submission.arrival_new_value).toLocaleString()}
                    {submission.arrival_decision && ` · Decision: ${submission.arrival_decision}`}
                  </p>
                )}
              </div>
            )}

            {/* Photos */}
            {allPhotos.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Photos</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {allPhotos.map(({ url, label }) => (
                    <div key={url} className="group relative">
                      <button
                        onClick={() => setLightboxUrl(url)}
                        className="relative block w-full overflow-hidden rounded-xl border border-gray-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={label}
                          className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </button>
                      <p className="mt-1 truncate text-center text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Phone details */}
              <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Phone Details</h2>
                <dl className="grid grid-cols-2 gap-2">
                  <DetailItem label="Brand" value={phoneModel?.brand ?? '—'} />
                  <DetailItem label="Model" value={phoneModel?.model ?? '—'} />
                  <DetailItem label="Storage" value={submission.storage} />
                  <DetailItem label="Color" value={submission.color} />
                  <DetailItem label="Battery Health" value={`${submission.battery_health}%`} />
                  <DetailItem label="Battery Replaced" value={submission.battery_replaced ? 'Yes' : 'No'} />
                  <DetailItem label="Screen Condition" value={submission.screen_condition.replace(/_/g, ' ')} />
                  <DetailItem label="Screen Replaced" value={submission.screen_replaced ? 'Yes' : 'No'} />
                  {submission.back_glass_condition !== null && (
                    <DetailItem label="Back Glass" value={submission.back_glass_condition?.replace(/_/g, ' ') ?? '—'} />
                  )}
                  {submission.back_glass_replaced !== null && (
                    <DetailItem label="Back Glass Replaced" value={submission.back_glass_replaced ? 'Yes' : 'No'} />
                  )}
                  <DetailItem label="Camera Glass Cracked" value={submission.camera_glass_cracked ? 'Yes' : 'No'} />
                  <DetailItem label="Front Camera" value={submission.front_camera_working ? 'Working' : 'Faulty'} />
                  <DetailItem label="Body Condition" value={submission.body_condition.replace(/_/g, ' ')} />
                  <DetailItem label="Water Damage" value={submission.water_damage ? 'Yes' : 'No'} />
                  {submission.face_id_working !== null && (
                    <DetailItem label="Face ID" value={submission.face_id_working ? 'Working' : 'Faulty'} />
                  )}
                  {submission.fingerprint_working !== null && (
                    <DetailItem label="Fingerprint" value={submission.fingerprint_working ? 'Working' : 'Faulty'} />
                  )}
                  <DetailItem label="Condition Score" value={submission.condition_score} />
                  {submission.other_issues && (
                    <div className="col-span-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">Other Issues</p>
                      <p className="mt-1 text-sm text-gray-800">{submission.other_issues}</p>
                    </div>
                  )}
                </dl>
              </div>

              <div className="space-y-4">
                {/* Desired upgrade */}
                {upgradeItem && (
                  <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Desired Upgrade</h2>
                    <dl className="grid grid-cols-2 gap-2">
                      <DetailItem label="Brand" value={upgradeModel?.brand ?? '—'} />
                      <DetailItem label="Model" value={upgradeModel?.model ?? '—'} />
                      <DetailItem label="Storage" value={upgradeItem.storage} />
                      <DetailItem label="Color" value={upgradeItem.color} />
                      <DetailItem label="Condition" value={upgradeItem.condition.replace(/_/g, ' ')} />
                      <DetailItem label="Price" value={`GHS ${Number(upgradeItem.price).toLocaleString()}`} />
                    </dl>
                  </div>
                )}

                {/* Trade-in value */}
                <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Trade-in Valuation</h2>
                  <p className="text-3xl font-bold text-orange-600">
                    GHS {Number(submission.calculated_trade_in_value).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Deposit: GHS {Number(submission.deposit_amount).toLocaleString()} ·{' '}
                    {submission.deposit_paid ? 'Paid' : 'Not paid'}
                  </p>
                </div>
              </div>
            </div>

            {/* Deduction breakdown */}
            {submission.deduction_breakdown && submission.deduction_breakdown.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">Deduction Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Amount (GHS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(submission.deduction_breakdown as DeductionBreakdownItem[]).map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 text-gray-700">{item.reason}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-red-600">
                            − {Number(item.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td className="px-4 py-2.5 font-semibold text-gray-900">Trade-in Value</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                          GHS {Number(submission.calculated_trade_in_value).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {submission.status === 'rejected' && submission.rejection_reason && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 shadow-sm">
                <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-600">{submission.rejection_reason}</p>
              </div>
            )}

            {/* Admin actions */}
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">Admin Actions</h2>

              <div className="flex flex-wrap gap-3">
                {submission.status === 'pending_review' && (
                  <>
                    <button
                      onClick={doApprove}
                      disabled={actionBusy}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actionBusy ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionBusy}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setFlagReason(submission.flag_reason ?? '')
                    setShowFlagModal(true)
                  }}
                  disabled={actionBusy}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    submission.account_flagged
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'border border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
                  }`}
                >
                  <Flag className="h-4 w-4" />
                  {submission.account_flagged ? 'Unflag Account' : 'Flag Account'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">Reject Submission</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this submission is being rejected…"
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              {actionError && (
                <p className="mt-2 text-sm text-red-600">{actionError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={doReject}
                  disabled={actionBusy || !rejectReason.trim()}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionBusy ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag modal */}
      {showFlagModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowFlagModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">
                {submission?.account_flagged ? 'Remove Account Flag' : 'Flag Account'}
              </h3>
              <button
                onClick={() => setShowFlagModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reason {!submission?.account_flagged && <span className="text-gray-400">(optional)</span>}
              </label>
              <input
                type="text"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Reason for flagging…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={doFlag}
                  disabled={actionBusy}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    submission?.account_flagged ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionBusy ? 'Saving…' : submission?.account_flagged ? 'Remove Flag' : 'Flag Account'}
                </button>
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AdminShell>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-gray-800">{value}</p>
    </div>
  )
}
