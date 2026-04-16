import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { sendArkeselSMS, normalizePhoneNumber } from '@/lib/arkesel/provider'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OTP_TTL_MINUTES = 10

/**
 * POST /api/referrals/send-otp
 * Sends a 6-digit OTP to the user's phone for referral verification.
 * Body: { phone: string }
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone } = (await req.json()) as { phone?: string }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhoneNumber(phone.trim())
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Invalid Ghana phone number' }, { status: 400 })
    }

    // Rate-limit: check if OTP was sent in the last 60 seconds
    const { data: existing } = await supabase
      .from('referrals')
      .select('phone_otp_expires_at')
      .eq('user_id', authData.user.id)
      .maybeSingle<{ phone_otp_expires_at: string | null }>()

    if (existing?.phone_otp_expires_at) {
      const expiry = new Date(existing.phone_otp_expires_at)
      const tooSoon = expiry.getTime() - Date.now() > (OTP_TTL_MINUTES - 1) * 60 * 1000
      if (tooSoon) {
        return NextResponse.json({ error: 'Please wait before requesting another OTP' }, { status: 429 })
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

    // Store OTP in referrals record (upsert in case record doesn't exist yet)
    const { error: upsertErr } = await supabase
      .from('referrals')
      .upsert(
        {
          user_id: authData.user.id,
          referral_code: '', // will be set if missing by generate endpoint
          phone_otp: otp,
          phone_otp_expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )

    if (upsertErr) {
      // Try update if upsert fails (record already exists but code can't be blank)
      await supabase
        .from('referrals')
        .update({ phone_otp: otp, phone_otp_expires_at: expiresAt.toISOString() })
        .eq('user_id', authData.user.id)
    }

    // Send OTP via Arkesel directly (real-time security flow — skip queue)
    const result = await sendArkeselSMS({
      toPhone: normalizedPhone,
      message: `Your Gavel verification code is: ${otp}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
    })

    if (!result.success) {
      console.error('[referrals/send-otp] SMS failed:', result.error)
      return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[referrals/send-otp]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
