import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueSwapExpiredNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/swap/expire
// Auto-expiry cron endpoint. Called by scheduled job.
// Auth: query param ?secret=PAYOUT_DISPATCH_SECRET
// Finds all approved submissions with offer_expires_at < now and marks them expired.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (!secret || secret !== process.env.PAYOUT_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Find all approved submissions whose offer has expired
  const { data: expiredSubmissions, error: fetchError } = await supabase
    .from('swap_submissions')
    .select('id, user_id')
    .eq('status', 'approved')
    .not('offer_expires_at', 'is', null)
    .lt('offer_expires_at', now)

  if (fetchError) {
    console.error('Failed to fetch expired swap submissions:', fetchError)
    return NextResponse.json(
      { error: 'Failed to fetch expired submissions' },
      { status: 500 }
    )
  }

  if (!expiredSubmissions || expiredSubmissions.length === 0) {
    return NextResponse.json({ expired: 0 })
  }

  const ids = expiredSubmissions.map((s) => s.id)

  // Bulk update status to expired
  const { error: updateError } = await supabase
    .from('swap_submissions')
    .update({ status: 'expired' })
    .in('id', ids)

  if (updateError) {
    console.error('Failed to expire swap submissions:', updateError)
    return NextResponse.json(
      { error: 'Failed to update submission statuses' },
      { status: 500 }
    )
  }

  // Send expiry notifications to each user
  await Promise.allSettled(
    expiredSubmissions.map((submission) =>
      queueSwapExpiredNotification({
        userId: submission.user_id,
        submissionId: submission.id,
      })
    )
  )

  return NextResponse.json({ expired: expiredSubmissions.length })
}
