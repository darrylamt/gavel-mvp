import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/swap/appointments
// Returns all appointments with full joins (submission + user + slot + phone model + inventory).
// Query param: date (YYYY-MM-DD) to filter by day.
// Returns: { appointments: [...] }
export async function GET(req: Request) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  let query = supabase
    .from('swap_appointments')
    .select(`
      *,
      swap_submissions(
        *,
        swap_phone_models(*),
        swap_inventory(
          *,
          swap_phone_models(*)
        ),
        profiles(
          id,
          full_name,
          email
        )
      ),
      swap_available_slots(*)
    `)
    .order('created_at', { ascending: false })

  if (date) {
    // Filter by day: slot_datetime between start and end of the given date
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Filter via slot — done post-fetch since nested filter isn't straightforward
    const { data: slots, error: slotsError } = await supabase
      .from('swap_available_slots')
      .select('id')
      .gte('slot_datetime', startOfDay)
      .lte('slot_datetime', endOfDay)

    if (slotsError) {
      console.error('Failed to fetch slots for date filter:', slotsError)
      return NextResponse.json({ error: 'Failed to filter appointments by date' }, { status: 500 })
    }

    const slotIds = (slots ?? []).map((s) => s.id)

    if (slotIds.length === 0) {
      return NextResponse.json({ appointments: [] })
    }

    query = query.in('slot_id', slotIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch swap appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }

  return NextResponse.json({ appointments: data ?? [] })
}
