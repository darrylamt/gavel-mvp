import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { auction_id, amount } = await req.json()

  const initRes = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100,
        email: 'customer@gavel.com',
        callback_url: 'http://localhost:3000',
      }),
    }
  )

  const initData = await initRes.json()

  await supabase.from('payments').insert({
    auction_id,
    amount,
    paystack_reference: initData.data.reference,
    status: 'pending',
  })

  return NextResponse.json(initData.data)
}
