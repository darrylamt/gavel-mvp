import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { queueArkeselNotification } from '@/lib/arkesel/queue'

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json()

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 })
    }

    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Queue the SMS
    await queueArkeselNotification({
      userId: user.id,
      message,
      phoneOverride: phone,
      category: 'transactional',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SMS send error:', error)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }
}