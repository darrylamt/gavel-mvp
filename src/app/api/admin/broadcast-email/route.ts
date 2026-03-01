import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  // Verify admin first using anon client with token
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Verify user with anon client
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey!)
  const { data: { user }, error: authError } = await anonSupabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role with service role client
  const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const { data: profile } = await serviceSupabase
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

  // Get all users with emails using Supabase Admin API
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const { data: { users }, error: fetchUsersError } = await adminSupabase.auth.admin.listUsers()

  if (fetchUsersError) {
    console.error('Error fetching users:', {
      message: fetchUsersError.message
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        message: fetchUsersError.message
      },
      { status: 500 }
    )
  }

  const authUsers = users?.filter(u => u.email) ?? []

  if (authUsers.length === 0) {
    return NextResponse.json(
      { error: 'No users found with email addresses' },
      { status: 400 }
    )
  }

  console.log(`[Broadcast] Found ${authUsers.length} users with emails`)


  // Check if Resend is available
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return NextResponse.json(
      {
        error: 'Email service not configured',
        message: 'Please set RESEND_API_KEY environment variable and install resend package',
        recipientCount: authUsers.length
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

    const emails = authUsers.map((u) => u.email).filter(Boolean) as string[]

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
          recipientCount: authUsers.length
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
