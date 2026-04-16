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
    // Verify Paystack signature using raw body (same approach as main webhook)
    const rawBody = await req.text()
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex')

    const signature = req.headers.get('x-paystack-signature')

    if (hash !== signature) {
      console.error('Invalid Paystack signature on transfer approval')
      return NextResponse.json({ approved: false }, { status: 400 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ approved: false }, { status: 400 })
    }

    // Paystack sends approval payload as { event: 'transfer.approval', data: { transfer_code, reference, ... } }
    const data = (body.data ?? {}) as Record<string, unknown>
    const transfer_code = String(data.transfer_code || '')
    const reference = String(data.reference || '')

    if (!transfer_code) {
      console.error('Transfer approval missing transfer_code in body.data')
      return NextResponse.json({ approved: false }, { status: 400 })
    }

    // Look up payout by reference (format: payout_{id}_{timestamp}) if available,
    // otherwise fall back to transfer_code already saved on the payout record.
    let payout_id: string | null = null

    if (reference) {
      const parts = reference.split('_')
      if (parts.length >= 3 && parts[0] === 'payout') {
        payout_id = parts[1]
      }
    }

    let payout: { status: string } | null = null

    if (payout_id) {
      const { data: byId, error } = await supabase
        .from('payouts')
        .select('status')
        .eq('id', payout_id)
        .maybeSingle()

      if (!error) payout = byId
    }

    // Fallback: look up by transfer_code saved when the payout was initiated
    if (!payout) {
      const { data: byCode } = await supabase
        .from('payouts')
        .select('id, status')
        .eq('transfer_code', transfer_code)
        .maybeSingle()

      if (byCode) {
        payout_id = byCode.id
        payout = { status: byCode.status }
      }
    }

    if (!payout) {
      console.error('Transfer approval: payout not found for transfer_code:', transfer_code, 'reference:', reference)
      // Return approved: false so Paystack doesn't keep retrying an unknown transfer
      return NextResponse.json({ approved: false })
    }

    // Reject if payout is on hold
    if (payout.status === 'on_hold') {
      console.log('Transfer declined - payout on hold:', payout_id)
      return NextResponse.json({ approved: false })
    }

    // Reject if payout is not in processing state
    if (payout.status !== 'processing') {
      console.log('Transfer declined - invalid status:', payout.status, 'for payout:', payout_id)
      return NextResponse.json({ approved: false })
    }

    // Approve the transfer
    console.log('Transfer approved:', payout_id, transfer_code)
    return NextResponse.json({ approved: true })
  } catch (error) {
    console.error('Error in transfer approval:', error)
    return NextResponse.json({ approved: false }, { status: 500 })
  }
}
