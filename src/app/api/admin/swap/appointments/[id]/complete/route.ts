import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'
import { queueSwapCompletedNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/swap/appointments/[id]/complete
// Mark an appointment as complete. Requires admin.
// Updates submission status='completed' and sends queueSwapCompletedNotification.
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

  // Fetch the appointment with submission and the upgrade phone model
  const { data: appointment, error: fetchError } = await supabase
    .from('swap_appointments')
    .select(`
      id,
      submission_id,
      swap_submissions(
        id,
        user_id,
        status,
        desired_inventory_id,
        swap_inventory(
          id,
          swap_phone_models(
            id,
            brand,
            model
          )
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch swap appointment:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
  }

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  const submission = appointment.swap_submissions as unknown as {
    id: string
    user_id: string
    status: string
    desired_inventory_id: string | null
    swap_inventory: {
      id: string
      swap_phone_models: { id: string; brand: string; model: string } | null
    } | null
  } | null

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found for this appointment' }, { status: 404 })
  }

  // Update submission status to completed
  const { error: updateError } = await supabase
    .from('swap_submissions')
    .update({ status: 'completed' })
    .eq('id', submission.id)

  if (updateError) {
    console.error('Failed to update submission status to completed:', updateError)
    return NextResponse.json({ error: 'Failed to complete appointment' }, { status: 500 })
  }

  // Determine the upgrade phone model name
  const upgradeModel = submission.swap_inventory?.swap_phone_models
  const upgradedModelName = upgradeModel
    ? `${upgradeModel.brand} ${upgradeModel.model}`.trim()
    : 'your new phone'

  // Send completion notification
  await queueSwapCompletedNotification({
    userId: submission.user_id,
    submissionId: submission.id,
    upgradedModel: upgradedModelName,
  }).catch((err) => {
    console.error('Failed to send swap completed notification:', err)
  })

  return NextResponse.json({ success: true })
}
