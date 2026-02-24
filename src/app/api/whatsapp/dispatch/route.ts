import { NextResponse } from 'next/server'
import 'server-only'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp/provider'
import { WHATSAPP_TEMPLATE_MAP, type WhatsAppTemplateKey } from '@/lib/whatsapp/templates'

function authorized(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.WHATSAPP_DISPATCH_SECRET || process.env.CRON_SECRET || ''
  return !!expected && bearer === expected
}

type QueueRow = {
  id: string
  phone: string
  template_key: string
  template_params: Record<string, string | number | boolean | null> | null
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await service
    .from('whatsapp_notifications')
    .select('id, phone, template_key, template_params')
    .eq('status', 'queued')
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
    const key = job.template_key as WhatsAppTemplateKey
    if (!WHATSAPP_TEMPLATE_MAP[key]) {
      await service
        .from('whatsapp_notifications')
        .update({ status: 'failed', reason: `Unknown template key: ${job.template_key}` })
        .eq('id', job.id)
      failed += 1
      continue
    }

    const result = await sendWhatsAppTemplateMessage({
      toPhone: job.phone,
      templateKey: key,
      params: job.template_params ?? {},
    })

    if (result.success) {
      sent += 1
      await service
        .from('whatsapp_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: result.providerMessageId ?? null,
          reason: null,
        })
        .eq('id', job.id)
    } else {
      failed += 1
      await service
        .from('whatsapp_notifications')
        .update({ status: 'failed', reason: result.error ?? 'Unknown error' })
        .eq('id', job.id)
    }
  }

  return NextResponse.json({ success: true, processed: jobs.length, sent, failed })
}
