import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/swap/appointments/[id]/mismatch
// Record an arrival mismatch (phone condition worse than reported). Requires admin.
// Body: { new_value: number }
// Updates submission: arrival_recalculated=true, arrival_new_value
// Returns: { success: true, new_value: number }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { role } = authResult
  if (role !== 'admin' && role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 })
  }

  let body: { new_value?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { new_value } = body

  if (new_value === undefined || new_value === null || !Number.isFinite(new_value)) {
    return NextResponse.json({ error: 'new_value must be a valid number' }, { status: 400 })
  }

  if (new_value < 0) {
    return NextResponse.json({ error: 'new_value must be non-negative' }, { status: 400 })
  }

  // Fetch the appointment to get the submission_id
  const { data: appointment, error: fetchError } = await supabase
    .from('swap_appointments')
    .select('id, submission_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch swap appointment:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
  }

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  // Update submission with mismatch data
  const { error: updateError } = await supabase
    .from('swap_submissions')
    .update({
      arrival_recalculated: true,
      arrival_new_value: new_value,
    })
    .eq('id', appointment.submission_id)

  if (updateError) {
    console.error('Failed to update submission mismatch:', updateError)
    return NextResponse.json({ error: 'Failed to record mismatch' }, { status: 500 })
  }

  return NextResponse.json({ success: true, new_value })
}
