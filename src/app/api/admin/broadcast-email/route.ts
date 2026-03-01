import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  // Verify admin
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { subject, htmlContent } = await request.json()

  if (!subject?.trim() || !htmlContent?.trim()) {
    return NextResponse.json(
      { error: 'Subject and content are required' },
      { status: 400 }
    )
  }

  // Get all users with emails
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('email')
    .not('email', 'is', null)

  if (profilesError || !profiles || profiles.length === 0) {
    return NextResponse.json(
      { error: 'No users found or error fetching users' },
      { status: 400 }
    )
  }

  // Check if Resend is available
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return NextResponse.json(
      {
        error: 'Email service not configured',
        message: 'Please set RESEND_API_KEY environment variable and install resend package',
        recipientCount: profiles.length
      },
      { status: 503 }
    )
  }

  try {
    // Dynamic import of Resend (will fail gracefully if not installed)
    const { Resend } = await import('resend').catch(() => ({ Resend: null }))
    if (!Resend) {
      throw new Error('Cannot find module \'resend\'')
    }
    const resend = new Resend(resendApiKey)

    const emails = profiles.map((p) => p.email).filter(Boolean) as string[]

    // Send in batches of 100 (Resend limit)
    const batchSize = 100
    const batches: string[][] = []

    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize))
    }

    let successCount = 0
    const errors: string[] = []

    for (const batch of batches) {
      try {
        await resend.emails.send({
          from: 'Gavel Ghana <no-reply@gavelghana.com>',
          to: batch,
          subject,
          html: htmlContent
        })
        successCount += batch.length
      } catch (err) {
        errors.push(`Batch failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      sent: successCount,
      total: emails.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot find module')) {
      return NextResponse.json(
        {
          error: 'Resend package not installed',
          message: 'Run: npm install resend',
          recipientCount: profiles.length
        },
        { status: 503 }
      )
    }

    console.error('Broadcast email error:', err)
    return NextResponse.json(
      { error: 'Failed to send emails', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
