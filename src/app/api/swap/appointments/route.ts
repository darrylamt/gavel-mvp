import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUser } from '@/lib/apiAuth'
import { queueSwapAppointmentConfirmedNotification } from '@/lib/arkesel/events'
import type { SwapAvailableSlot } from '@/types/swap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/swap/appointments
// Returns available (not booked) slots in the future.
// Returns { slots: SwapAvailableSlot[] }
export async function GET() {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('swap_available_slots')
    .select('*')
    .eq('is_booked', false)
    .gt('slot_datetime', now)
    .order('slot_datetime', { ascending: true })

  if (error) {
    console.error('Failed to fetch available slots:', error)
    return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 })
  }

  const slots = (data ?? []) as SwapAvailableSlot[]

  return NextResponse.json({ slots })
}

// POST /api/swap/appointments
// Books a swap appointment. Requires auth.
// Body: { submission_id: string, slot_id: string }
export async function POST(req: Request) {
  const authResult = await getAuthUser(req)
  if ('error' in authResult) return authResult.error

  const { user } = authResult

  let body: { submission_id?: string; slot_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { submission_id, slot_id } = body

  if (!submission_id || !slot_id) {
    return NextResponse.json(
      { error: 'Missing required fields: submission_id, slot_id' },
      { status: 400 }
    )
  }

  // Fetch the submission — must belong to user and be approved
  const { data: submission, error: submissionError } = await supabase
    .from('swap_submissions')
    .select('id, user_id, status, offer_expires_at, desired_inventory_id, calculated_trade_in_value, deposit_amount')
    .eq('id', submission_id)
    .maybeSingle()

  if (submissionError) {
    console.error('Failed to fetch swap submission:', submissionError)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (submission.status !== 'approved') {
    return NextResponse.json(
      { error: `Appointment can only be booked for approved submissions. Current status: ${submission.status}` },
      { status: 400 }
    )
  }

  // Check offer has not expired
  if (submission.offer_expires_at && new Date(submission.offer_expires_at) <= new Date()) {
    return NextResponse.json(
      { error: 'This swap offer has expired. Please resubmit a new swap request.' },
      { status: 400 }
    )
  }

  // Fetch the slot — must exist and not be booked
  const { data: slot, error: slotError } = await supabase
    .from('swap_available_slots')
    .select('*')
    .eq('id', slot_id)
    .maybeSingle()

  if (slotError) {
    console.error('Failed to fetch slot:', slotError)
    return NextResponse.json({ error: 'Failed to fetch slot' }, { status: 500 })
  }

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  if (slot.is_booked) {
    return NextResponse.json(
      { error: 'This slot has already been booked. Please choose another.' },
      { status: 409 }
    )
  }

  // Create the appointment record
  const { data: appointment, error: appointmentError } = await supabase
    .from('swap_appointments')
    .insert({
      submission_id,
      user_id: user.id,
      slot_id,
    })
    .select('id')
    .single()

  if (appointmentError || !appointment) {
    console.error('Failed to create appointment:', appointmentError)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }

  // Mark the slot as booked
  const { error: slotUpdateError } = await supabase
    .from('swap_available_slots')
    .update({ is_booked: true })
    .eq('id', slot_id)

  if (slotUpdateError) {
    console.error('Failed to mark slot as booked:', slotUpdateError)
    // Non-fatal — appointment was created; log and continue
  }

  // Update submission status to appointment_booked
  const { error: statusUpdateError } = await supabase
    .from('swap_submissions')
    .update({ status: 'appointment_booked' })
    .eq('id', submission_id)

  if (statusUpdateError) {
    console.error('Failed to update submission status:', statusUpdateError)
    // Non-fatal — appointment was created; log and continue
  }

  // Calculate remaining balance
  // Fetch desired inventory price if available
  let inventoryPrice = 0
  if (submission.desired_inventory_id) {
    const { data: inventoryItem } = await supabase
      .from('swap_inventory')
      .select('price')
      .eq('id', submission.desired_inventory_id)
      .maybeSingle()

    if (inventoryItem) {
      inventoryPrice = Number(inventoryItem.price) || 0
    }
  }

  const tradeInValue = Number(submission.calculated_trade_in_value) || 0
  const depositAmount = Number(submission.deposit_amount) || 0
  const remaining_balance = Math.max(0, inventoryPrice - tradeInValue - depositAmount)

  // Send appointment confirmation SMS
  await queueSwapAppointmentConfirmedNotification({
    userId: user.id,
    submissionId: submission_id,
    appointmentDate: slot.slot_datetime,
    remainingBalance: remaining_balance,
  }).catch((err) => {
    console.error('Failed to send appointment confirmation SMS:', err)
  })

  return NextResponse.json({
    appointment_id: appointment.id,
    slot_datetime: slot.slot_datetime,
    remaining_balance,
  })
}
