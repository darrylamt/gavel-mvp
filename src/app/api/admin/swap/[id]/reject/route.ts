import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'
import { queueSwapRejectedNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/swap/[id]/reject
// Reject a swap submission. Requires admin.
// Body: { rejection_reason: string }
// Sets status='rejected', rejection_reason, reviewed_by=admin_id
// Sends queueSwapRejectedNotification to the user.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getAuthUserWithRole(req)
  if ('error' in authResult) return authResult.error

  const { user, role } = authResult
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })
  }

  let body: { rejection_reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { rejection_reason } = body

  if (!rejection_reason || rejection_reason.trim() === '') {
    return NextResponse.json({ error: 'rejection_reason is required' }, { status: 400 })
  }

  // Fetch the submission
  const { data: submission, error: fetchError } = await supabase
    .from('swap_submissions')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch swap submission:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (submission.status !== 'pending_review') {
    return NextResponse.json(
      { error: `Submission must be in 'pending_review' status to reject. Current status: ${submission.status}` },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('swap_submissions')
    .update({
      status: 'rejected',
      rejection_reason: rejection_reason.trim(),
      reviewed_by: user.id,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to reject swap submission:', updateError)
    return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 })
  }

  // Send rejection notification
  await queueSwapRejectedNotification({
    userId: submission.user_id,
    submissionId: id,
    reason: rejection_reason.trim(),
  }).catch((err) => {
    console.error('Failed to send swap rejected notification:', err)
  })

  return NextResponse.json({ success: true })
}
