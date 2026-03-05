'use server'

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import { sendArkeselSMS } from '@/lib/arkesel/provider'

function authorized(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.ARKESEL_DISPATCH_SECRET || process.env.CRON_SECRET || ''
  return !!expected && bearer === expected
}

type QueueRow = {
  id: string
  phone: string
  message: string
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await service
    .from('sms_notifications')
    .select('id, phone, message')
    .eq('status', 'pending')
    .lte('send_after', nowIso)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const jobs = (rows ?? []) as QueueRow[]
  if (jobs.length === 0) {
    return NextResponse.json({ success: true, processed: 0 })
  }

  let sent = 0
  let failed = 0

  for (const job of jobs) {
    const result = await sendArkeselSMS({
      toPhone: job.phone,
      message: job.message,
    })

    if (result.success) {
      sent += 1
      await service
        .from('sms_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: result.messageId ?? null,
          reason: null,
        })
        .eq('id', job.id)
    } else {
      failed += 1
      await service
        .from('sms_notifications')
        .update({ status: 'failed', reason: result.error ?? 'Unknown error' })
        .eq('id', job.id)
    }
  }

  return NextResponse.json({ success: true, processed: jobs.length, sent, failed })
}
