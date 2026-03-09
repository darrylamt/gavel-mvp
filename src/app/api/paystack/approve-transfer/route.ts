import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Paystack Transfer Approval Webhook
 * Paystack calls this URL before sending each transfer
 * We can approve or reject the transfer here
 */
export async function POST(req: Request) {
  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(await req.clone().json()))
      .digest('hex')

    const signature = req.headers.get('x-paystack-signature')

    if (hash !== signature) {
      console.error('Invalid Paystack signature')
      return NextResponse.json(
        { status: 'declined', reason: 'Invalid signature' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { transfer_code, reference } = body

    if (!transfer_code || !reference) {
      return NextResponse.json(
        { status: 'declined', reason: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Extract payout_id from reference (format: payout_{id}_{timestamp})
    const parts = reference.split('_')
    if (parts.length < 3 || parts[0] !== 'payout') {
      console.error('Invalid reference format:', reference)
      return NextResponse.json(
        { status: 'declined', reason: 'Invalid reference format' },
        { status: 400 }
      )
    }

    const payout_id = parts[1]

    // Fetch payout to check if it's on hold
    const { data: payout, error } = await supabase
      .from('payouts')
      .select('status')
      .eq('id', payout_id)
      .single()

    if (error || !payout) {
      console.error('Payout not found:', payout_id, error)
      return NextResponse.json(
        { status: 'declined', reason: 'Payout not found' },
        { status: 404 }
      )
    }

    // Reject if payout is on hold
    if (payout.status === 'on_hold') {
      console.log('Transfer declined - payout on hold:', payout_id)
      return NextResponse.json({
        status: 'declined',
        reason: 'Payout is currently on hold',
      })
    }

    // Reject if payout is not in processing state
    if (payout.status !== 'processing') {
      console.log('Transfer declined - invalid status:', payout.status)
      return NextResponse.json({
        status: 'declined',
        reason: `Invalid payout status: ${payout.status}`,
      })
    }

    // Approve the transfer
    console.log('Transfer approved:', payout_id, transfer_code)
    return NextResponse.json({
      status: 'approved',
    })
  } catch (error) {
    console.error('Error in transfer approval:', error)
    return NextResponse.json(
      { status: 'declined', reason: 'Internal server error' },
      { status: 500 }
    )
  }
}
