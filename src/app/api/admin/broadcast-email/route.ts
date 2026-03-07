import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/serverAdminAuth'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json(
      { error: 'Email service not configured', message: 'Missing RESEND_API_KEY' },
      { status: 503 }
    )
  }

  const { subject, htmlContent, segmentId, scheduledAt } = (await request.json()) as {
    subject?: string
    htmlContent?: string
    segmentId?: string
    scheduledAt?: string
  }

  if (!subject?.trim() || !htmlContent?.trim()) {
    return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 })
  }

  const effectiveSegmentId = segmentId || process.env.RESEND_BROADCAST_SEGMENT_ID
  if (!effectiveSegmentId) {
    return NextResponse.json(
      {
        error: 'Missing segmentId',
        message: 'Pass segmentId in request body or set RESEND_BROADCAST_SEGMENT_ID',
      },
      { status: 400 }
    )
  }

  const resend = new Resend(resendApiKey)
  const from = process.env.RESEND_BROADCAST_FROM || 'Gavel Ghana <notifications@gavelghana.com>'

  const createResult = await resend.broadcasts.create({
    segmentId: effectiveSegmentId,
    from,
    subject: subject.trim(),
    html: htmlContent,
  })

  if (createResult.error || !createResult.data?.id) {
    return NextResponse.json(
      { error: createResult.error?.message || 'Failed to create broadcast' },
      { status: 500 }
    )
  }

  const sendResult = await resend.broadcasts.send(createResult.data.id, {
    scheduledAt,
  })

  if (sendResult.error) {
    return NextResponse.json(
      {
        error: sendResult.error.message,
        broadcastId: createResult.data.id,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    broadcastId: createResult.data.id,
    message: scheduledAt ? 'Broadcast scheduled successfully' : 'Broadcast sent successfully',
  })
}
