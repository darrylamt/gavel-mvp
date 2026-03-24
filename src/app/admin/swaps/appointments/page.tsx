'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { CalendarClock, AlertCircle, CheckCircle2, X } from 'lucide-react'

type AppointmentRow = {
  id: string
  submission_id: string
  user_id: string
  slot_id: string
  created_at: string
  // from API joins
  slot_datetime?: string
  user_name?: string
  user_email?: string
  trade_in_model?: string
  trade_in_storage?: string
  upgrade_model?: string
  upgrade_storage?: string
  remaining_balance?: number
  status?: string
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('en-GH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminSwapAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState(todayString())
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Mismatch modal
  const [mismatchAppt, setMismatchAppt] = useState<AppointmentRow | null>(null)
  const [mismatchValue, setMismatchValue] = useState('')

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

    const url = dateFilter
      ? `/api/admin/swap/appointments?date=${dateFilter}`
      : '/api/admin/swap/appointments'

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load appointments')
    } else {
      setAppointments(payload?.appointments ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter])

  const markComplete = async (appt: AppointmentRow) => {
    setActionBusy(appt.id)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(null); return }

    const res = await fetch(`/api/admin/swap/appointments/${appt.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to mark complete')
    } else {
      setActionSuccess('Appointment marked as complete.')
      await load()
    }
    setActionBusy(null)
  }

  const submitMismatch = async () => {
    if (!mismatchAppt) return
    const val = Number(mismatchValue)
    if (!mismatchValue.trim() || isNaN(val) || val < 0) {
      setActionError('Please enter a valid amount.')
      return
    }

    setActionBusy(mismatchAppt.id)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(null); return }

    const res = await fetch(`/api/admin/swap/appointments/${mismatchAppt.id}/mismatch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_value: val }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to submit mismatch')
    } else {
      setActionSuccess('Arrival mismatch recorded.')
      setMismatchAppt(null)
      setMismatchValue('')
      await load()
    }
    setActionBusy(null)
  }

  // Group by date
  const grouped: Record<string, AppointmentRow[]> = {}
  for (const appt of appointments) {
    const dateKey = appt.slot_datetime ? appt.slot_datetime.slice(0, 10) : 'unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(appt)
  }
  const sortedDates = Object.keys(grouped).sort()

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Swap Appointments</h1>
                <p className="text-sm text-gray-500">Scheduled phone swap handover appointments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Date:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Show All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feedback */}
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
              <p className="text-sm text-gray-400">Loading appointments…</p>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No appointments found for this date</p>
          </div>
        ) : (
          sortedDates.map((dateKey) => (
            <div key={dateKey} className="space-y-3">
              <h2 className="px-1 text-sm font-semibold text-gray-500">
                {dateKey === 'unknown'
                  ? 'Unknown Date'
                  : formatDate(`${dateKey}T00:00:00`)}
              </h2>

              {grouped[dateKey]
                .slice()
                .sort((a, b) => {
                  const ta = a.slot_datetime ? new Date(a.slot_datetime).getTime() : 0
                  const tb = b.slot_datetime ? new Date(b.slot_datetime).getTime() : 0
                  return ta - tb
                })
                .map((appt) => (
                  <div key={appt.id} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Time pill */}
                        <div className="shrink-0 rounded-xl bg-orange-50 px-3 py-2 text-center">
                          <p className="text-lg font-bold text-orange-600">
                            {appt.slot_datetime ? formatTime(appt.slot_datetime) : '—'}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">
                            {appt.user_name || 'Unknown User'}
                          </p>
                          {appt.user_email && (
                            <p className="text-xs text-gray-500">{appt.user_email}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            <span>
                              Trading in:{' '}
                              <span className="font-medium text-gray-800">
                                {appt.trade_in_model || '—'}
                                {appt.trade_in_storage ? ` ${appt.trade_in_storage}` : ''}
                              </span>
                            </span>
                            {appt.upgrade_model && (
                              <span>
                                Upgrading to:{' '}
                                <span className="font-medium text-gray-800">
                                  {appt.upgrade_model}
                                  {appt.upgrade_storage ? ` ${appt.upgrade_storage}` : ''}
                                </span>
                              </span>
                            )}
                          </div>
                          {appt.remaining_balance !== undefined && (
                            <p className="text-sm">
                              Remaining to collect:{' '}
                              <span className="font-bold text-gray-900">
                                GHS {Number(appt.remaining_balance).toLocaleString()}
                              </span>
                            </p>
                          )}
                          {appt.status && (
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                              appt.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {appt.status === 'completed' ? 'Completed' : 'Booked'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {appt.status !== 'completed' && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            onClick={() => markComplete(appt)}
                            disabled={actionBusy === appt.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {actionBusy === appt.id ? 'Saving…' : 'Mark Complete'}
                          </button>
                          <button
                            onClick={() => {
                              setMismatchAppt(appt)
                              setMismatchValue('')
                              setActionError(null)
                            }}
                            disabled={actionBusy === appt.id}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 transition-colors"
                          >
                            Arrival Mismatch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

      {/* Mismatch modal */}
      {mismatchAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setMismatchAppt(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">Arrival Mismatch</h3>
              <button
                onClick={() => setMismatchAppt(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="mb-3 text-sm text-gray-600">
                Enter the recalculated trade-in value after inspecting the phone in person.
              </p>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                New Trade-in Value (GHS)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={mismatchValue}
                onChange={(e) => setMismatchValue(e.target.value)}
                placeholder="e.g. 850"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              {actionError && (
                <p className="mt-2 text-sm text-red-600">{actionError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={submitMismatch}
                  disabled={actionBusy === mismatchAppt.id || !mismatchValue.trim()}
                  className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {actionBusy === mismatchAppt.id ? 'Saving…' : 'Submit'}
                </button>
                <button
                  onClick={() => setMismatchAppt(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
