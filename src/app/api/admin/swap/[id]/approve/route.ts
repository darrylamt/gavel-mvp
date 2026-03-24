import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUserWithRole } from '@/lib/apiAuth'
import { queueSwapApprovedNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/swap/[id]/approve
// Approve a swap submission. Requires admin.
// Sets status='approved', approved_at=now, offer_expires_at=now+7days, reviewed_by=admin_id
// Sends queueSwapApprovedNotification to the user.
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

  // Fetch the submission
  const { data: submission, error: fetchError } = await supabase
    .from('swap_submissions')
    .select('id, user_id, status, calculated_trade_in_value')
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
      { error: `Submission must be in 'pending_review' status to approve. Current status: ${submission.status}` },
      { status: 400 }
    )
  }

  const now = new Date()
  const offerExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const approvedAt = now.toISOString()

  const { error: updateError } = await supabase
    .from('swap_submissions')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      offer_expires_at: offerExpiresAt,
      reviewed_by: user.id,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to approve swap submission:', updateError)
    return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 })
  }

  // Send approval notification
  await queueSwapApprovedNotification({
    userId: submission.user_id,
    submissionId: id,
    tradeInValue: Number(submission.calculated_trade_in_value) || 0,
    offerExpiresAt,
  }).catch((err) => {
    console.error('Failed to send swap approved notification:', err)
  })

  return NextResponse.json({ success: true })
}
