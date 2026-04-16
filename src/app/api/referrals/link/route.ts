import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { ensureReferralRecord, linkReferral } from '@/lib/referrals'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/referrals/link
 * Called from the auth callback after a new user signs up.
 * Links the new user's account to their referrer using the gavel_ref cookie value.
 * Body: { referral_code: string }
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { referral_code } = (await req.json()) as { referral_code?: string }
    if (!referral_code?.startsWith('GAV-')) {
      return NextResponse.json({ linked: false, reason: 'invalid_code' })
    }

    const userId = authData.user.id

    // Ensure user has a referral record before linking
    await ensureReferralRecord(supabase, userId)

    const result = await linkReferral(supabase, userId, referral_code)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[referrals/link]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
