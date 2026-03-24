'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import PartnerShell from '@/components/partner/PartnerShell'
import Link from 'next/link'
import {
  Calendar,
  CalendarClock,
  Clock,
  Package,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Wallet,
} from 'lucide-react'

type StatsPayload = {
  appointments_today?: number
  pending_review?: number
  [key: string]: unknown
}

type AppointmentRow = {
  id: string
  slot_datetime?: string
  user_name?: string
  trade_in_model?: string
  trade_in_storage?: string
  upgrade_model?: string
  upgrade_storage?: string
  remaining_balance?: number
  status?: string
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PartnerDashboardPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [inventoryCount, setInventoryCount] = useState<number | null>(null)
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const token = await getToken()
      if (!token) {
        setError('Unauthorized')
        setLoading(false)
        return
      }

      // Get user profile for welcome message
      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', auth.user.id)
          .single()
        setUserName(profile?.full_name || profile?.username || '')
      }

      const headers = { Authorization: `Bearer ${token}` }

      // Fetch stats, inventory count, and today's appointments in parallel
      const [statsRes, inventoryRes, apptRes] = await Promise.allSettled([
        fetch('/api/admin/swap/stats', { headers }),
        fetch('/api/admin/swap/inventory', { headers }),
        fetch(`/api/admin/swap/appointments?date=${todayString()}`, { headers }),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const payload = await statsRes.value.json().catch(() => null)
        setStats(payload)
      }

      if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
        const payload = await inventoryRes.value.json().catch(() => null)
        const items: unknown[] = payload?.inventory ?? []
        setInventoryCount(items.length)
      }

      if (apptRes.status === 'fulfilled' && apptRes.value.ok) {
        const payload = await apptRes.value.json().catch(() => null)
        setAppointments(payload?.appointments ?? [])
      } else if (apptRes.status === 'fulfilled' && !apptRes.value.ok) {
        const payload = await apptRes.value.json().catch(() => null)
        setError(payload?.error || 'Failed to load appointments')
      }

      setLoading(false)
    }

    load()
  }, [])

  const sortedAppointments = appointments
    .slice()
    .sort((a, b) => {
      const ta = a.slot_datetime ? new Date(a.slot_datetime).getTime() : 0
      const tb = b.slot_datetime ? new Date(b.slot_datetime).getTime() : 0
      return ta - tb
    })

  if (loading) {
    return (
      <PartnerShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading partner dashboard…</p>
          </div>
        </div>
      </PartnerShell>
    )
  }

  return (
    <PartnerShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Portal</h1>
              <p className="text-sm text-gray-500">
                {userName ? `Welcome back, ${userName}` : 'Welcome back'} — manage your swap inventory and appointments
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Appointments Today */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Appointments Today</p>
              <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <CalendarClock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {stats?.appointments_today != null ? String(stats.appointments_today) : String(appointments.length)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Scheduled for today</p>
          </div>

          {/* Pending Review */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Pending Review</p>
              <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {stats?.pending_review != null ? String(stats.pending_review) : '—'}
            </p>
            <p className="mt-1 text-xs text-gray-400">Submissions awaiting review</p>
          </div>

          {/* Inventory */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Inventory Items</p>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {inventoryCount != null ? String(inventoryCount) : '—'}
            </p>
            <p className="mt-1 text-xs text-gray-400">Active phone listings</p>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h2 className="font-semibold text-gray-900">
                Today&apos;s Appointments
              </h2>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
              {sortedAppointments.length} scheduled
            </span>
          </div>

          {sortedAppointments.length === 0 ? (
            <div className="flex min-h-[12vh] items-center justify-center">
              <p className="text-sm text-gray-400">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sortedAppointments.map((appt) => (
                <div key={appt.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  {/* Time */}
                  <div className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-center min-w-[60px]">
                    <p className="text-base font-bold text-blue-600">
                      {appt.slot_datetime ? formatTime(appt.slot_datetime) : '—'}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {appt.user_name || 'Customer'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-600">
                      <span>
                        Trade-in:{' '}
                        <span className="font-medium text-gray-800">
                          {appt.trade_in_model || '—'}
                          {appt.trade_in_storage ? ` ${appt.trade_in_storage}` : ''}
                        </span>
                      </span>
                      {appt.upgrade_model && (
                        <span>
                          Upgrade:{' '}
                          <span className="font-medium text-gray-800">
                            {appt.upgrade_model}
                            {appt.upgrade_storage ? ` ${appt.upgrade_storage}` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                    {appt.remaining_balance !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-blue-500" />
                        <p className="text-sm font-bold text-blue-700">
                          Collect: GHS {Number(appt.remaining_balance).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {appt.status && (
                    <span className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      appt.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {appt.status === 'completed' ? 'Completed' : 'Booked'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/partner/appointments"
            className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 shadow-sm transition-colors hover:bg-blue-100"
          >
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-700">View All Appointments</p>
                <p className="text-xs text-blue-500">See full schedule and mark completions</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-blue-400" />
          </Link>

          <Link
            href="/partner/inventory"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">Manage Inventory</p>
                <p className="text-xs text-gray-500">Add and update phone stock</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>

        {/* What to Bring Reminder */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-blue-700">Reminder for customers arriving today</p>
              <ul className="mt-2 space-y-1 text-xs text-blue-600">
                <li>• Trade-in phone (factory reset preferred)</li>
                <li>• Valid photo ID</li>
                <li>• Remaining balance payment (cash or mobile money)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PartnerShell>
  )
}
