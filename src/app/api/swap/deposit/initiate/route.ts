import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getAuthUser } from '@/lib/apiAuth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/swap/deposit/initiate
// Initiates a GHS 100 Paystack payment for the swap deposit.
// Requires auth.
// Body: { submission_id: string, email: string }
export async function POST(req: Request) {
  const authResult = await getAuthUser(req)
  if ('error' in authResult) return authResult.error

  const { user } = authResult

  let body: { submission_id?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { submission_id, email } = body

  if (!submission_id || !email) {
    return NextResponse.json(
      { error: 'Missing required fields: submission_id, email' },
      { status: 400 }
    )
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY not configured')
    return NextResponse.json(
      { error: 'Payment service not configured' },
      { status: 500 }
    )
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error('NEXT_PUBLIC_SITE_URL not configured')
    return NextResponse.json(
      { error: 'Site URL not configured' },
      { status: 500 }
    )
  }

  // Fetch the submission — must belong to user and be pending_deposit
  const { data: submission, error: submissionError } = await supabase
    .from('swap_submissions')
    .select('id, user_id, status')
    .eq('id', submission_id)
    .maybeSingle()

  if (submissionError) {
    console.error('Failed to fetch swap submission:', submissionError)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (submission.status !== 'pending_deposit') {
    return NextResponse.json(
      { error: `Deposit cannot be initiated for a submission with status: ${submission.status}` },
      { status: 400 }
    )
  }

  // Initiate Paystack transaction — GHS 100 = 10000 pesewas
  const paystackRes = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: 10000, // GHS 100 in pesewas
        metadata: {
          type: 'swap_deposit',
          submission_id,
          user_id: user.id,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/swap/${submission_id}`,
      }),
    }
  )

  const json = await paystackRes.json()

  if (!json.status) {
    console.error('Paystack init failed:', json)
    return NextResponse.json(
      { error: json.message || 'Paystack initialization failed' },
      { status: 500 }
    )
  }

  if (!json.data?.authorization_url) {
    console.error('No authorization_url in Paystack response:', json.data)
    return NextResponse.json({ error: 'Invalid Paystack response' }, { status: 500 })
  }

  return NextResponse.json({
    authorization_url: json.data.authorization_url,
    reference: json.data.reference,
  })
}
