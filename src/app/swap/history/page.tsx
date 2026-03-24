'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  RefreshCw,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  PackageCheck,
  Ban,
  TimerOff,
} from 'lucide-react'
import type { SwapStatus } from '@/types/swap'

// ── Types ──────────────────────────────────────────────────────────────────────

type HistoryItem = {
  id: string
  created_at: string
  status: SwapStatus
  calculated_trade_in_value: number
  swap_phone_models: {
    brand: string
    model: string
  } | null
}

// ── Status badge config ────────────────────────────────────────────────────────

type BadgeConfig = {
  label: string
  cls: string
  icon: React.ElementType
}

const statusBadge: Record<SwapStatus, BadgeConfig> = {
  pending_deposit: {
    label: 'Pending Deposit',
    cls: 'bg-gray-100 text-gray-600',
    icon: Clock,
  },
  pending_review: {
    label: 'Under Review',
    cls: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    cls: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  appointment_booked: {
    label: 'Appointment Booked',
    cls: 'bg-blue-100 text-blue-700',
    icon: CalendarCheck,
  },
  completed: {
    label: 'Completed',
    cls: 'bg-emerald-100 text-emerald-700',
    icon: PackageCheck,
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-gray-100 text-gray-500',
    icon: Ban,
  },
  expired: {
    label: 'Expired',
    cls: 'bg-gray-100 text-gray-500',
    icon: TimerOff,
  },
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-100 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
            <div className="h-6 w-24 bg-gray-100 rounded-full" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
        <RefreshCw className="h-6 w-6 text-orange-400" />
      </div>
      <p className="text-base font-semibold text-gray-800">No swap requests yet</p>
      <p className="mt-1 text-sm text-gray-400">
        Submit your first phone and start your upgrade journey.
      </p>
      <Link
        href="/swap/submit"
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
      >
        Start a Swap
      </Link>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SwapHistoryPage() {
  const [submissions, setSubmissions] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError('Please log in to view your swap history.')
          setLoading(false)
          return
        }

        const { data, error: dbError } = await supabase
          .from('swap_submissions')
          .select(
            `
            id,
            created_at,
            status,
            calculated_trade_in_value,
            swap_phone_models (
              brand,
              model
            )
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (dbError) throw dbError

        setSubmissions((data ?? []) as unknown as HistoryItem[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load swap history.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Swap Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track the status of all your phone trade-in submissions.
          </p>
        </div>
        <Link
          href="/swap/submit"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New Swap
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <HistorySkeleton />
      ) : submissions.length === 0 && !error ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const badge = statusBadge[sub.status] ?? {
              label: sub.status,
              cls: 'bg-gray-100 text-gray-600',
              icon: Clock,
            }
            const BadgeIcon = badge.icon
            const modelName = sub.swap_phone_models
              ? `${sub.swap_phone_models.brand} ${sub.swap_phone_models.model}`
              : 'Unknown Phone'

            return (
              <Link
                key={sub.id}
                href={`/swap/${sub.id}`}
                className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{modelName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      #{sub.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold flex-shrink-0 ${badge.cls}`}
                  >
                    <BadgeIcon className="h-3 w-3" />
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Trade-in value:{' '}
                    <span className="font-semibold text-gray-800">
                      GH₵ {Number(sub.calculated_trade_in_value).toLocaleString()}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(sub.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Mobile new swap button */}
      <div className="mt-8 sm:hidden">
        <Link
          href="/swap/submit"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Start a New Swap
        </Link>
      </div>
    </div>
  )
}
