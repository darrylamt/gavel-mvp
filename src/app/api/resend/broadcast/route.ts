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

    // Get email addresses for all users (or all users if no userIds provided)
    let query = service.from('profiles').select('id, email').not('email', 'is', null)

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query = query.in('id', userIds)
    }

    const { data: profiles, error: profileError } = await query

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const validEmails = (profiles ?? []).filter((p) => p.email)

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found' },
        { status: 400 }
      )
    }

    // Send emails in parallel (Resend can handle batch sends)
    const emailPromises = validEmails.map((profile) =>
      resend.emails.send({
        from: 'Gavel Ghana <notifications@gavelghana.com>',
        to: profile.email,
        subject,
        html: htmlContent,
        text: plainText,
      })
    )

    const results = await Promise.allSettled(emailPromises)

    const sent = results.filter((r) => r.status === 'fulfilled' && !r.value.error).length
    const failed = results.length - sent

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
