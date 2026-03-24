'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { CalendarClock, Plus, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import type { SwapAvailableSlot } from '@/types/swap'

function formatDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('en-GH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupByDate(slots: SwapAvailableSlot[]): Record<string, SwapAvailableSlot[]> {
  const groups: Record<string, SwapAvailableSlot[]> = {}
  for (const slot of slots) {
    const dateKey = slot.slot_datetime.slice(0, 10)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(slot)
  }
  return groups
}

export default function AdminSwapSlotsPage() {
  const [slots, setSlots] = useState<SwapAvailableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newSlotDatetime, setNewSlotDatetime] = useState('')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const loadSlots = async () => {
    setLoading(true)
    setError(null)

    const token = await getToken()
    if (!token) { setError('Unauthorized'); setLoading(false); return }

    const res = await fetch('/api/admin/swap/slots', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setError(payload?.error || 'Failed to load slots')
    } else {
      setSlots(payload?.slots ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadSlots() }, [])

  const addSlot = async () => {
    if (!newSlotDatetime) {
      setActionError('Please select a date and time.')
      return
    }

    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch('/api/admin/swap/slots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_datetime: new Date(newSlotDatetime).toISOString() }),
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to add slot')
    } else {
      setActionSuccess('Slot added.')
      setNewSlotDatetime('')
      setShowAddForm(false)
      await loadSlots()
    }
    setActionBusy(false)
  }

  const deleteSlot = async (slot: SwapAvailableSlot) => {
    if (slot.is_booked) return
    if (!confirm(`Delete slot on ${formatDate(slot.slot_datetime)} at ${formatTime(slot.slot_datetime)}?`)) return

    setActionBusy(true)
    setActionError(null)
    setActionSuccess(null)

    const token = await getToken()
    if (!token) { setActionError('Unauthorized'); setActionBusy(false); return }

    const res = await fetch(`/api/admin/swap/slots/${slot.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setActionError(payload?.error || 'Failed to delete slot')
    } else {
      setActionSuccess('Slot deleted.')
      await loadSlots()
    }
    setActionBusy(false)
  }

  const grouped = groupByDate(slots)
  const sortedDates = Object.keys(grouped).sort()

  const isPast = (datetime: string) => new Date(datetime) < new Date()

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Appointment Slots</h1>
                <p className="text-sm text-gray-500">Manage available time slots for swap appointments</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Slot
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">New Appointment Slot</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={newSlotDatetime}
                  onChange={(e) => setNewSlotDatetime(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <button
                onClick={addSlot}
                disabled={actionBusy || !newSlotDatetime}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {actionBusy ? 'Adding…' : 'Add Slot'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewSlotDatetime('') }}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {actionError && (
              <p className="mt-2 text-sm text-red-600">{actionError}</p>
            )}
          </div>
        )}

        {/* Feedback */}
        {actionSuccess && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-700">{actionSuccess}</p>
          </div>
        )}
        {!showAddForm && actionError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{actionError}</p>
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
              <p className="text-sm text-gray-400">Loading slots…</p>
            </div>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No appointment slots yet — add one above</p>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const daySlots = grouped[dateKey].slice().sort((a, b) =>
              new Date(a.slot_datetime).getTime() - new Date(b.slot_datetime).getTime()
            )
            return (
              <div key={dateKey} className="space-y-2">
                <h2 className="px-1 text-sm font-semibold text-gray-500">
                  {formatDate(`${dateKey}T00:00:00`)}
                </h2>
                <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <table className="w-full text-sm text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Time</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Booked</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {daySlots.map((slot) => {
                        const past = isPast(slot.slot_datetime)
                        return (
                          <tr key={slot.id} className={`transition-colors hover:bg-orange-50/20 ${past ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {formatTime(slot.slot_datetime)}
                            </td>
                            <td className="px-5 py-3">
                              {slot.is_booked ? (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {past ? (
                                <span className="text-xs text-gray-400">Past</span>
                              ) : (
                                <span className="text-xs text-emerald-600 font-medium">Upcoming</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {!slot.is_booked ? (
                                <button
                                  onClick={() => deleteSlot(slot)}
                                  disabled={actionBusy}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
                                  title="Delete slot"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">Cannot delete</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>
    </AdminShell>
  )
}
