'use server'

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/serverSupabase'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function authorized(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.ARKESEL_DISPATCH_SECRET || process.env.CRON_SECRET || ''
  return !!expected && bearer === expected
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!resend) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 500 })
  }

  try {
    const { userIds, subject, htmlContent, plainText } = (await request.json()) as {
      userIds?: string[]
      subject: string
      htmlContent: string
      plainText?: string
    }

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'subject and htmlContent are required' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    // Pull recipients from Supabase auth users instead of profiles.email
    const { data: usersResponse, error: usersError } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    let validEmails = (usersResponse.users ?? [])
      .filter((user: { id: string; email?: string | null }) => !!user.email)
      .map((user: { id: string; email?: string | null }) => ({ id: user.id, email: user.email as string }))

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const targetSet = new Set(userIds)
      validEmails = validEmails.filter((user) => targetSet.has(user.id))
    }

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found' },
        { status: 400 }
      )
    }

    // Use Resend batch API for broadcast delivery
    const batchPayload = validEmails.map((profile) => ({
      from: 'Gavel Ghana <notifications@gavelghana.com>',
      to: [profile.email],
      subject,
      html: htmlContent,
      text: plainText,
    }))

    const batchResult = await resend.batch.send(batchPayload)

    if (batchResult.error) {
      return NextResponse.json({ error: batchResult.error.message }, { status: 500 })
    }

    const sent = validEmails.length
    const failed = 0

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: validEmails.length,
      message: `Broadcast email sent to ${sent} users (${failed} failed)`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
