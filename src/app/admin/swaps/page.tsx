'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { Smartphone, Search, AlertCircle, ClipboardList, CheckCircle2, CalendarClock, Trophy } from 'lucide-react'
import type { SwapStatus, SwapStats } from '@/types/swap'

type SubmissionRow = {
  id: string
  user_id: string
  status: SwapStatus
  deposit_paid: boolean
  calculated_trade_in_value: number
  created_at: string
  // joined
  swap_phone_models?: {
    brand: string
    model: string
  } | null
  swap_inventory?: {
    storage: string
    color: string
    swap_phone_models?: {
      brand: string
      model: string
    } | null
  } | null
  // user profile joined via user_id
  profiles?: {
    full_name: string | null
    email: string | null
    username: string | null
  } | null
  // denormalized convenience fields from API
  storage?: string
  color?: string
  user_email?: string
  user_name?: string
  condition_score?: string
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'appointment_booked', label: 'Appointment Booked' },
  { value: 'completed', label: 'Completed' },
]

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
    appointment_booked: 'Appt. Booked',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  )
}

export default function AdminSwapsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [stats, setStats] = useState<SwapStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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

    try {
      const [statsRes, subsRes] = await Promise.all([
        fetch('/api/admin/swap/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/swap/submissions', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const statsPayload = await statsRes.json().catch(() => null)
      const subsPayload = await subsRes.json().catch(() => null)

      if (!statsRes.ok) {
        setError(statsPayload?.error || 'Failed to load stats')
      } else {
        setStats(statsPayload?.stats ?? null)
      }

      if (!subsRes.ok) {
        setError(subsPayload?.error || 'Failed to load submissions')
      } else {
        setSubmissions(subsPayload?.submissions ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = submissions.filter((row) => {
    const q = search.toLowerCase()
    const nameMatch = !q ||
      (row.user_name ?? '').toLowerCase().includes(q) ||
      (row.user_email ?? '').toLowerCase().includes(q) ||
      (row.swap_phone_models?.brand ?? '').toLowerCase().includes(q) ||
      (row.swap_phone_models?.model ?? '').toLowerCase().includes(q)
    const statusMatch = !statusFilter || row.status === statusFilter
    return nameMatch && statusMatch
  })

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Phone Swaps</h1>
              <p className="text-sm text-gray-500">Manage phone swap submissions and appointments</p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Pending Review"
              value={stats.pending_review}
              color="yellow"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Approved"
              value={stats.approved}
              color="green"
            />
            <StatCard
              icon={<CalendarClock className="h-5 w-5" />}
              label="Appointments Today"
              value={stats.appointments_today}
              color="blue"
            />
            <StatCard
              icon={<Trophy className="h-5 w-5" />}
              label="Completed This Month"
              value={stats.completed_this_month}
              color="emerald"
            />
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user or phone model…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading submissions…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No submissions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Phone Model</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Condition</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Trade-in Value</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Desired Upgrade</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Deposit Paid</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((row) => {
                  const model = row.swap_phone_models
                  const upgrade = row.swap_inventory
                  const upgradeModel = upgrade?.swap_phone_models
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-orange-50/30">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{row.user_name || '—'}</p>
                        {row.user_email && <p className="text-xs text-gray-400">{row.user_email}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {model ? (
                          <>
                            <p className="font-medium text-gray-900">{model.brand} {model.model}</p>
                            <p className="text-xs text-gray-400">{row.storage} · {row.color}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-gray-600">{row.condition_score || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        GHS {Number(row.calculated_trade_in_value).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {upgradeModel ? (
                          <>
                            <p className="font-medium text-gray-900">{upgradeModel.brand} {upgradeModel.model}</p>
                            <p className="text-xs text-gray-400">{upgrade?.storage} · {upgrade?.color}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.deposit_paid ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(row.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/swaps/${row.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-orange-300 hover:text-orange-600"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'yellow' | 'green' | 'blue' | 'emerald'
}) {
  const colorMap = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
    </div>
  )
}
