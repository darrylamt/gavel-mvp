import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/serverAdminAuth'

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const result = await resend.broadcasts.list()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const body = (await request.json()) as {
    segmentId?: string
    from?: string
    subject?: string
    html?: string
  }

  const segmentId = body.segmentId || process.env.RESEND_BROADCAST_SEGMENT_ID
  const from = body.from || process.env.RESEND_BROADCAST_FROM || 'Gavel Ghana <notifications@gavelghana.com>'

  if (!segmentId || !body.subject || !body.html) {
    return NextResponse.json(
      { error: 'segmentId, subject and html are required' },
      { status: 400 }
    )
  }

  const result = await resend.broadcasts.create({
    segmentId,
    from,
    subject: body.subject,
    html: body.html,
  })

  return NextResponse.json(result)
}
