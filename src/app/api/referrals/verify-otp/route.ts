import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/referrals/verify-otp
 * Verifies the OTP and marks the referral account as verified.
 * Also approves any pending commissions queued while unverified.
 * Body: { phone: string, otp: string }
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, otp } = (await req.json()) as { phone?: string; otp?: string }
    if (!phone?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 })
    }

    const userId = authData.user.id

    const { data: record } = await supabase
      .from('referrals')
      .select('phone_otp, phone_otp_expires_at, is_verified')
      .eq('user_id', userId)
      .maybeSingle<{
        phone_otp: string | null
        phone_otp_expires_at: string | null
        is_verified: boolean
      }>()

    if (!record) {
      return NextResponse.json({ error: 'Referral record not found' }, { status: 404 })
    }

    if (record.is_verified) {
      return NextResponse.json({ verified: true, already: true })
    }

    if (!record.phone_otp || !record.phone_otp_expires_at) {
      return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 })
    }

    if (new Date(record.phone_otp_expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
    }

    if (record.phone_otp !== otp.trim()) {
      return NextResponse.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 })
    }

    // Mark verified and clear OTP fields
    await supabase
      .from('referrals')
      .update({
        is_verified: true,
        verified_phone: phone.trim(),
        phone_otp: null,
        phone_otp_expires_at: null,
      })
      .eq('user_id', userId)

    // Also update profile.phone if not already set
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle<{ phone: string | null }>()

    if (!profile?.phone) {
      await supabase
        .from('profiles')
        .update({ phone: phone.trim() })
        .eq('id', userId)
    }

    // Approve any pending commissions for this referrer (queued while unverified)
    const { data: pendingCommissions } = await supabase
      .from('referral_commissions')
      .select('id, commission_amount')
      .eq('referrer_id', userId)
      .eq('status', 'pending')

    if (pendingCommissions && pendingCommissions.length > 0) {
      const totalPending = pendingCommissions.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      )

      await supabase
        .from('referral_commissions')
        .update({ status: 'approved' })
        .eq('referrer_id', userId)
        .eq('status', 'pending')

      // Add all previously queued commissions to earnings now
      await supabase.rpc('increment_referral_pending_earnings', {
        p_referrer_id: userId,
        p_amount: totalPending,
      })
    }

    return NextResponse.json({ verified: true })
  } catch (err) {
    console.error('[referrals/verify-otp]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
