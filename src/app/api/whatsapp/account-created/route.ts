import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueAccountCreatedNotification } from '@/lib/arkesel/events'
import { sendArkeselSMS } from '@/lib/arkesel/provider'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const ADMIN_PHONE = '0547163794'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Welcome SMS to the new user
  await queueAccountCreatedNotification(user.id)

  // Alert admin of new signup — fire and forget
  const email = user.email ?? 'unknown'
  const createdAt = new Date().toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  sendArkeselSMS({
    toPhone: ADMIN_PHONE,
    message: `New Gavel signup: ${email} at ${createdAt}`,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
