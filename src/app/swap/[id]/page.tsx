'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  PackageCheck,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  BatteryMedium,
  Wrench,
  Camera,
  ShieldAlert,
  Loader2,
  MapPin,
  ClipboardList,
} from 'lucide-react'
import type { SwapSubmission, SwapAvailableSlot, DeductionBreakdownItem } from '@/types/swap'

// ── Extended submission type (includes appointments from API) ──────────────────

type SwapSubmissionWithAppointments = SwapSubmission & {
  appointments: Array<{
    id: string
    slot_id: string
    swap_available_slots?: SwapAvailableSlot
  }>
}

// ── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(target: string | null | undefined) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!target) return

    function tick() {
      const diff = new Date(target!).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Expired')
        return
      }
      const d = Math.floor(diff / 86_400_000)
      const h = Math.floor((diff % 86_400_000) / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m`)
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`)
      else setRemaining(`${m}m ${s}s`)
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [target])

  return remaining
}

// ── Deduction Breakdown accordion ─────────────────────────────────────────────

function DeductionBreakdown({
  baseValue,
  finalValue,
  items,
}: {
  baseValue: number
  finalValue: number
  items: DeductionBreakdownItem[]
}) {
  const [open, setOpen] = useState(false)

  if (!items || items.length === 0) return null

  const totalDeductions = items.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-sm text-gray-800">Deduction Breakdown</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 space-y-3">
          <div className="flex justify-between text-sm pt-3">
            <span className="text-gray-500">Base trade-in value</span>
            <span className="font-semibold text-gray-900">GH₵ {Number(baseValue).toLocaleString()}</span>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {item.reason}
              </span>
              <span className="font-semibold text-red-600 flex-shrink-0 ml-4">
                − GH₵ {Number(item.amount).toLocaleString()}
              </span>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-bold">
            <span className="text-gray-700">Total deductions</span>
            <span className="text-red-600">− GH₵ {Number(totalDeductions).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-gray-900">Final trade-in value</span>
            <span className="text-green-700">GH₵ {Number(finalValue).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Status-specific views ──────────────────────────────────────────────────────

// PENDING DEPOSIT
function PendingDepositView({
  submission,
  onDepositClick,
  depositLoading,
  depositError,
}: {
  submission: SwapSubmissionWithAppointments
  onDepositClick: () => void
  depositLoading: boolean
  depositError: string | null
}) {
  const desiredPhone = submission.swap_inventory?.swap_phone_models
  const desiredName = desiredPhone
    ? `${desiredPhone.brand} ${desiredPhone.model}`
    : null
  const desiredPrice = submission.swap_inventory
    ? Number(submission.swap_inventory.price)
    : null

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-800 text-sm">Deposit Required</p>
          <p className="mt-1 text-xs text-yellow-700 leading-relaxed">
            Pay a refundable GHS 100 deposit to lock in your swap request. Our team will review your
            submission within 24 hours after the deposit is confirmed.
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
        <div className="px-5 py-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Order Summary</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Your phone</span>
              <span className="font-semibold text-gray-900">
                {submission.swap_phone_models
                  ? `${submission.swap_phone_models.brand} ${submission.swap_phone_models.model}`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Storage / Colour</span>
              <span className="font-semibold text-gray-900">
                {submission.storage} · {submission.color}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estimated trade-in value</span>
              <span className="font-semibold text-gray-900">
                GH₵ {Number(submission.calculated_trade_in_value).toLocaleString()}
              </span>
            </div>
            {desiredName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Desired upgrade</span>
                <span className="font-semibold text-gray-900">{desiredName}</span>
              </div>
            )}
            {desiredPrice !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Upgrade phone price</span>
                <span className="font-semibold text-gray-900">
                  GH₵ {desiredPrice.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Deposit to pay now</span>
          <span className="text-xl font-extrabold text-orange-600">GH₵ 100</span>
        </div>
      </div>

      {depositError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {depositError}
        </div>
      )}

      <button
        onClick={onDepositClick}
        disabled={depositLoading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
      >
        {depositLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to payment…
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay GHS 100 Deposit
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Secure payment via Paystack. The deposit is fully refundable if we cannot fulfill your swap.
      </p>
    </div>
  )
}

// PENDING REVIEW
function PendingReviewView() {
  return (
    <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-6 text-center space-y-2">
      <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
        <Clock className="h-6 w-6 text-yellow-600" />
      </div>
      <h3 className="font-bold text-gray-900">Under Review</h3>
      <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
        We&apos;ve received your swap request and deposit. Our team is reviewing your submission and
        will get back to you within <strong>24 hours</strong> with a firm offer.
      </p>
      <p className="text-xs text-gray-400">You&apos;ll be notified by SMS when a decision is made.</p>
    </div>
  )
}

// APPROVED
function ApprovedView({
  submission,
  token,
  onAppointmentBooked,
}: {
  submission: SwapSubmissionWithAppointments
  token: string
  onAppointmentBooked: () => void
}) {
  const [slots, setSlots] = useState<SwapAvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const countdown = useCountdown(submission.offer_expires_at)

  useEffect(() => {
    async function fetchSlots() {
      try {
        const res = await fetch('/api/swap/appointments')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load slots')
        setSlots(data.slots ?? [])
      } catch (err) {
        setSlotsError(err instanceof Error ? err.message : 'Failed to load appointment slots')
      } finally {
        setSlotsLoading(false)
      }
    }
    fetchSlots()
  }, [])

  async function bookAppointment() {
    if (!selectedSlot) return
    setBooking(true)
    setBookingError(null)
    try {
      const res = await fetch('/api/swap/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submission_id: submission.id, slot_id: selectedSlot }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to book appointment')
      onAppointmentBooked()
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to book appointment')
    } finally {
      setBooking(false)
    }
  }

  const desiredPhone = submission.swap_inventory?.swap_phone_models
  const desiredName = desiredPhone
    ? `${desiredPhone.brand} ${desiredPhone.model}`
    : null
  const desiredPrice = submission.swap_inventory ? Number(submission.swap_inventory.price) : null
  const topUp =
    desiredPrice !== null
      ? Math.max(0, desiredPrice - Number(submission.calculated_trade_in_value) - Number(submission.deposit_amount))
      : null

  // Group slots by date
  const slotsByDate = slots.reduce<Record<string, SwapAvailableSlot[]>>((acc, slot) => {
    const date = new Date(slot.slot_datetime).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Approved banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-5">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-800 text-sm">Offer Approved!</p>
          <p className="mt-1 text-xs text-green-700 leading-relaxed">
            Your swap has been approved. Book an appointment below to complete your upgrade in our
            office. This offer expires in{' '}
            <span className="font-bold">{countdown || '…'}</span>.
          </p>
        </div>
      </div>

      {/* Offer details */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
        <div className="px-5 py-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Approved Offer Details</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Condition score</span>
              <span className="font-semibold capitalize text-gray-900">
                {submission.condition_score}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Approved trade-in value</span>
              <span className="font-bold text-green-700">
                GH₵ {Number(submission.calculated_trade_in_value).toLocaleString()}
              </span>
            </div>
            {desiredName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Upgrade phone</span>
                <span className="font-semibold text-gray-900">{desiredName}</span>
              </div>
            )}
            {desiredPrice !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Upgrade phone price</span>
                <span className="font-semibold text-gray-900">
                  GH₵ {desiredPrice.toLocaleString()}
                </span>
              </div>
            )}
            {topUp !== null && (
              <div className="flex justify-between border-t border-gray-50 pt-2.5">
                <span className="text-gray-700 font-semibold">Balance to pay at appointment</span>
                <span className="font-extrabold text-orange-600">
                  GH₵ {topUp.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
        {submission.offer_expires_at && (
          <div className="px-5 py-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            Offer expires:{' '}
            {new Date(submission.offer_expires_at).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {/* Slot picker */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-orange-500" />
          Book Your Appointment
        </h3>

        {slotsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading available slots…
          </div>
        ) : slotsError ? (
          <p className="text-sm text-red-600">{slotsError}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500">
            No appointment slots are available right now. Please check back or contact us.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(slotsByDate).map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {date}
                </p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => {
                    const time = new Date(slot.slot_datetime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const active = selectedSlot === slot.id
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {bookingError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {bookingError}
          </div>
        )}

        <button
          onClick={bookAppointment}
          disabled={!selectedSlot || booking}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {booking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Booking…
            </>
          ) : (
            <>
              <CalendarCheck className="h-4 w-4" />
              Confirm Appointment
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// APPOINTMENT BOOKED
function AppointmentBookedView({
  submission,
}: {
  submission: SwapSubmissionWithAppointments
}) {
  const appointment = submission.appointments?.[0]
  const slotDatetime = appointment?.swap_available_slots?.slot_datetime

  const desiredPhone = submission.swap_inventory?.swap_phone_models
  const desiredName = desiredPhone
    ? `${desiredPhone.brand} ${desiredPhone.model}`
    : null
  const desiredPrice = submission.swap_inventory ? Number(submission.swap_inventory.price) : null
  const remainingBalance =
    desiredPrice !== null
      ? Math.max(0, desiredPrice - Number(submission.calculated_trade_in_value) - Number(submission.deposit_amount))
      : null

  const checklist = [
    { icon: Smartphone, text: 'Your phone (fully charged if possible)' },
    { icon: BatteryMedium, text: 'Phone accessories: charger, box (optional but helps)' },
    { icon: ShieldAlert, text: 'A valid Ghana Card or national ID' },
    { icon: ClipboardList, text: 'Your swap reference number (shown above)' },
    {
      icon: CreditCard,
      text:
        remainingBalance !== null && remainingBalance > 0
          ? `Payment of GH₵ ${remainingBalance.toLocaleString()} (cash or mobile money)`
          : 'Payment method for remaining balance (if applicable)',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <CalendarCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-800 text-sm">Appointment Confirmed!</p>
          {slotDatetime ? (
            <p className="mt-1 text-sm font-bold text-blue-900">
              {new Date(slotDatetime).toLocaleString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : (
            <p className="mt-1 text-xs text-blue-700">Appointment slot details unavailable.</p>
          )}
        </div>
      </div>

      {/* Balance card */}
      {remainingBalance !== null && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
          <div className="px-5 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Trade-in value</span>
              <span className="font-semibold text-green-700">
                GH₵ {Number(submission.calculated_trade_in_value).toLocaleString()}
              </span>
            </div>
            {desiredName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Upgrade phone</span>
                <span className="font-semibold text-gray-900">{desiredName}</span>
              </div>
            )}
            {desiredPrice !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Upgrade phone price</span>
                <span className="font-semibold text-gray-900">
                  GH₵ {desiredPrice.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Balance to pay on arrival</span>
            <span className="text-xl font-extrabold text-orange-600">
              {remainingBalance > 0 ? `GH₵ ${remainingBalance.toLocaleString()}` : 'GH₵ 0'}
            </span>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-500" />
          What to Bring to Your Appointment
        </h3>
        <ul className="space-y-3">
          {checklist.map(({ icon: Icon, text }, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
              <div className="h-6 w-6 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-orange-500" />
              </div>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// REJECTED
function RejectedView({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 space-y-3">
      <div className="flex items-center gap-2">
        <XCircle className="h-5 w-5 text-red-600" />
        <h3 className="font-bold text-red-800">Swap Request Rejected</h3>
      </div>
      {reason ? (
        <p className="text-sm text-red-700 leading-relaxed">{reason}</p>
      ) : (
        <p className="text-sm text-red-600">
          Your swap request was rejected. Please contact our support team for more information.
        </p>
      )}
      <Link
        href="/swap/submit"
        className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Start a New Swap
      </Link>
    </div>
  )
}

// EXPIRED
function ExpiredView() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center space-y-3">
      <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Clock className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="font-bold text-gray-800">Offer Expired</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">
        This swap offer has expired. Offers are valid for 7 days from the date of approval.
        You can start a fresh swap request at any time.
      </p>
      <Link
        href="/swap/submit"
        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Start a New Swap
      </Link>
    </div>
  )
}

// COMPLETED
function CompletedView({ submission }: { submission: SwapSubmissionWithAppointments }) {
  const desiredPhone = submission.swap_inventory?.swap_phone_models
  const upgradeName = desiredPhone
    ? `${desiredPhone.brand} ${desiredPhone.model}`
    : 'your new phone'

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center space-y-3">
      <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
        <PackageCheck className="h-7 w-7 text-emerald-600" />
      </div>
      <h3 className="text-lg font-extrabold text-emerald-800">Swap Completed!</h3>
      <p className="text-sm text-emerald-700 max-w-sm mx-auto leading-relaxed">
        Congratulations! Your trade-in was a success and you&apos;re now the proud owner of{' '}
        <span className="font-bold">{upgradeName}</span>. Enjoy your upgrade!
      </p>
      <Link
        href="/swap"
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
      >
        Back to Swap Home
      </Link>
    </div>
  )
}

// ── Status label for header badge ─────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending_deposit: { label: 'Pending Deposit', cls: 'bg-gray-100 text-gray-600' },
  pending_review: { label: 'Under Review', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  appointment_booked: { label: 'Appointment Booked', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-500' },
}

// ── Page skeleton ──────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 animate-pulse space-y-5">
      <div className="h-4 w-28 bg-gray-100 rounded" />
      <div className="h-8 w-48 bg-gray-100 rounded" />
      <div className="h-5 w-24 bg-gray-100 rounded-full" />
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm h-40" />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SwapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [submission, setSubmission] = useState<SwapSubmissionWithAppointments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string>('')

  // deposit
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)

  const loadSubmission = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError('Please log in to view this swap request.')
        setLoading(false)
        return
      }

      setToken(session.access_token)

      const res = await fetch(`/api/swap/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to load submission.')
        setLoading(false)
        return
      }

      setSubmission(data.submission)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadSubmission()
  }, [loadSubmission])

  async function handleDepositClick() {
    if (!submission) return
    setDepositLoading(true)
    setDepositError(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Could not retrieve your account email.')

      const res = await fetch('/api/swap/deposit/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submission_id: submission.id, email: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to initiate payment.')
      window.location.href = data.authorization_url
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : 'Payment initiation failed.')
      setDepositLoading(false)
    }
  }

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <p className="font-semibold text-gray-800">{error}</p>
        <Link href="/swap/history" className="text-sm font-semibold text-orange-600 hover:underline">
          Back to my swaps
        </Link>
      </div>
    )
  }

  if (!submission) return null

  const statusConfig = STATUS_LABELS[submission.status] ?? {
    label: submission.status,
    cls: 'bg-gray-100 text-gray-600',
  }

  const modelName = submission.swap_phone_models
    ? `${submission.swap_phone_models.brand} ${submission.swap_phone_models.model}`
    : 'Phone Swap'

  const hasDeductions =
    Array.isArray(submission.deduction_breakdown) && submission.deduction_breakdown.length > 0

  const baseValue = submission.swap_phone_models?.base_trade_in_value ?? 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Back */}
      <Link
        href="/swap/history"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        My Swap History
      </Link>

      {/* Heading */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-extrabold text-gray-900">{modelName}</h1>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusConfig.cls}`}
          >
            {statusConfig.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-mono">
          Ref #{submission.id.slice(0, 8).toUpperCase()} &middot; Submitted{' '}
          {new Date(submission.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Status-specific content */}
      <div className="space-y-5">
        {submission.status === 'pending_deposit' && (
          <PendingDepositView
            submission={submission}
            onDepositClick={handleDepositClick}
            depositLoading={depositLoading}
            depositError={depositError}
          />
        )}

        {submission.status === 'pending_review' && <PendingReviewView />}

        {submission.status === 'approved' && (
          <ApprovedView
            submission={submission}
            token={token}
            onAppointmentBooked={loadSubmission}
          />
        )}

        {submission.status === 'appointment_booked' && (
          <AppointmentBookedView submission={submission} />
        )}

        {submission.status === 'rejected' && (
          <RejectedView reason={submission.rejection_reason} />
        )}

        {submission.status === 'expired' && <ExpiredView />}

        {submission.status === 'completed' && <CompletedView submission={submission} />}

        {submission.status === 'cancelled' && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center space-y-3">
            <p className="font-semibold text-gray-700">This swap request was cancelled.</p>
            <Link
              href="/swap/submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Start a New Swap
            </Link>
          </div>
        )}

        {/* Deduction breakdown — shown for all statuses that have data */}
        {hasDeductions && (
          <DeductionBreakdown
            baseValue={baseValue}
            finalValue={submission.calculated_trade_in_value}
            items={submission.deduction_breakdown}
          />
        )}

        {/* Phone details summary */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-orange-500" />
            Submitted Phone Details
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <div>
              <p className="text-xs text-gray-400">Storage</p>
              <p className="font-semibold text-gray-800">{submission.storage}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Colour</p>
              <p className="font-semibold text-gray-800">{submission.color}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Battery Health</p>
              <p className="font-semibold text-gray-800">{submission.battery_health}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Screen Condition</p>
              <p className="font-semibold text-gray-800 capitalize">
                {submission.screen_condition.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Body Condition</p>
              <p className="font-semibold text-gray-800 capitalize">
                {submission.body_condition.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Water Damage</p>
              <p className="font-semibold text-gray-800">{submission.water_damage ? 'Yes' : 'No'}</p>
            </div>
          </div>
          {submission.other_issues && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">Other Issues Noted</p>
              <p className="text-sm text-gray-700">{submission.other_issues}</p>
            </div>
          )}
        </div>

        {/* Camera / biometrics quick summary */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-orange-500" />
            Cameras &amp; Biometrics
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <div>
              <p className="text-xs text-gray-400">Front Camera</p>
              <p className={`font-semibold ${submission.front_camera_working ? 'text-green-700' : 'text-red-600'}`}>
                {submission.front_camera_working ? 'Working' : 'Not Working'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Camera Glass</p>
              <p className={`font-semibold ${submission.camera_glass_cracked ? 'text-red-600' : 'text-green-700'}`}>
                {submission.camera_glass_cracked ? 'Cracked' : 'Intact'}
              </p>
            </div>
            {submission.face_id_working !== null && (
              <div>
                <p className="text-xs text-gray-400">Face ID</p>
                <p className={`font-semibold ${submission.face_id_working ? 'text-green-700' : 'text-red-600'}`}>
                  {submission.face_id_working ? 'Working' : 'Not Working'}
                </p>
              </div>
            )}
            {submission.fingerprint_working !== null && (
              <div>
                <p className="text-xs text-gray-400">Fingerprint</p>
                <p className={`font-semibold ${submission.fingerprint_working ? 'text-green-700' : 'text-red-600'}`}>
                  {submission.fingerprint_working ? 'Working' : 'Not Working'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
