import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueArkeselNotification } from '@/lib/arkesel/queue'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/seller-applications/notify-phone
 * Saves a phone number for seller application status notifications.
 * Sends a confirmation SMS and saves the phone to the application.
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, business_name } = (await req.json()) as { phone?: string; business_name?: string }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    const userId = authData.user.id

    // Update the most recent pending application with this phone
    await supabase
      .from('seller_applications')
      .update({ phone: phone.trim() })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    // Send confirmation SMS via the queue (uses phoneOverride so no profile phone needed)
    await queueArkeselNotification({
      userId,
      message: `Hi! You're signed up for SMS updates on your Gavel seller application${business_name ? ` for "${business_name}"` : ''}. We'll text you as soon as we've reviewed it. — Gavel Team`,
      category: 'transactional',
      dedupeKey: `seller-notify-phone:${userId}:${phone.trim()}`,
      phoneOverride: phone.trim(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[seller-applications/notify-phone]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
