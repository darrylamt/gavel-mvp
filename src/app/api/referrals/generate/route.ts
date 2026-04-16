import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { ensureReferralRecord } from '@/lib/referrals'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/referrals/generate
 * Ensures the authenticated user has a referral record, creating one if needed.
 * Safe to call on every visit to /referrals — idempotent.
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const record = await ensureReferralRecord(supabase, authData.user.id)
    if (!record) {
      return NextResponse.json({ error: 'Failed to create referral record' }, { status: 500 })
    }

    return NextResponse.json({ referral_code: record.referral_code })
  } catch (err) {
    console.error('[referrals/generate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
