import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature')!

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const reference = event.data.reference
    const amount = event.data.amount / 100
    const email = event.data.customer.email

    // Find pending payment
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('paystack_reference', reference)
      .single()

    if (payment) {
      await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('id', payment.id)

      await supabase
        .from('auctions')
        .update({ paid: true })
        .eq('id', payment.auction_id)
    }
  }

  return NextResponse.json({ received: true })
}
