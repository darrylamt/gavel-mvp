import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUser } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/swap/[id]
// Returns a single swap submission with joined model, inventory, and appointments.
// Requires auth. User must own the submission or be an admin.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUser(req)
  if ('error' in authResult) return authResult.error

  const { user } = authResult

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })
  }

  // Fetch submission with joined model and inventory (with nested model)
  const { data: submission, error: submissionError } = await supabase
    .from('swap_submissions')
    .select(`
      *,
      swap_phone_models(*),
      swap_inventory(
        *,
        swap_phone_models(*)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (submissionError) {
    console.error('Failed to fetch swap submission:', submissionError)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Check ownership or admin role
  if (submission.user_id !== user.id) {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Fetch appointments for this submission
  const { data: appointments, error: appointmentsError } = await supabase
    .from('swap_appointments')
    .select(`
      *,
      swap_available_slots(*)
    `)
    .eq('submission_id', id)
    .order('created_at', { ascending: false })

  if (appointmentsError) {
    console.error('Failed to fetch swap appointments:', appointmentsError)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }

  return NextResponse.json({
    submission: {
      ...submission,
      appointments: appointments ?? [],
    },
  })
}
