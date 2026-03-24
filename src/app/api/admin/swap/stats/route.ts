import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/stats
// Returns swap dashboard stats. Requires admin.
// Returns: { pending_review, approved, appointments_today, completed_this_month }
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  // Today boundaries (UTC)
  const startOfToday = new Date(now)
  startOfToday.setUTCHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setUTCHours(23, 59, 59, 999)

  // Current calendar month boundaries (UTC)
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))

  // Run all queries in parallel
  const [
    pendingReviewResult,
    approvedResult,
    appointmentsTodayResult,
    completedThisMonthResult,
  ] = await Promise.all([
    // Count pending_review submissions
    supabase
      .from('swap_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),

    // Count approved submissions
    supabase
      .from('swap_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),

    // Count appointments with slot_datetime today
    supabase
      .from('swap_appointments')
      .select('id', { count: 'exact', head: true })
      .gte('swap_available_slots.slot_datetime', startOfToday.toISOString())
      .lte('swap_available_slots.slot_datetime', endOfToday.toISOString()),

    // Count completed submissions this calendar month (by approved_at)
    supabase
      .from('swap_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('approved_at', startOfMonth.toISOString())
      .lt('approved_at', startOfNextMonth.toISOString()),
  ])

  if (pendingReviewResult.error) {
    console.error('Failed to count pending_review submissions:', pendingReviewResult.error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  if (approvedResult.error) {
    console.error('Failed to count approved submissions:', approvedResult.error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  // For appointments_today we query via slot join — fall back to a direct slots query approach
  // since Supabase doesn't support filtering on joined columns in .select count directly.
  // Use a two-step approach: get slot ids for today, then count appointments.
  const { data: todaySlots, error: todaySlotsError } = await supabase
    .from('swap_available_slots')
    .select('id')
    .gte('slot_datetime', startOfToday.toISOString())
    .lte('slot_datetime', endOfToday.toISOString())

  if (todaySlotsError) {
    console.error('Failed to fetch today slots:', todaySlotsError)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  const todaySlotIds = (todaySlots ?? []).map((s) => s.id)

  let appointments_today = 0
  if (todaySlotIds.length > 0) {
    const { count, error: apptCountError } = await supabase
      .from('swap_appointments')
      .select('id', { count: 'exact', head: true })
      .in('slot_id', todaySlotIds)

    if (apptCountError) {
      console.error('Failed to count appointments today:', apptCountError)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    appointments_today = count ?? 0
  }

  if (completedThisMonthResult.error) {
    console.error('Failed to count completed submissions this month:', completedThisMonthResult.error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  return NextResponse.json({
    pending_review: pendingReviewResult.count ?? 0,
    approved: approvedResult.count ?? 0,
    appointments_today,
    completed_this_month: completedThisMonthResult.count ?? 0,
  })
}
