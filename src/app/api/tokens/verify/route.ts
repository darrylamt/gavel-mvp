import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { reference } = await req.json()

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 400 }
    )
  }

const {
  metadata,
  reference: ref,
} = json.data

const userId = metadata.user_id
const tokens = metadata.tokens


  if (metadata?.type !== 'token_purchase') {
    return NextResponse.json(
      { error: 'Invalid transaction type' },
      { status: 400 }
    )
  }

  // const userId = customer.metadata?.user_id
  // const tokens = metadata.tokens

  if (!userId || !tokens) {
    return NextResponse.json(
      { error: 'Invalid metadata' },
      { status: 400 }
    )
  }

  // Prevent double credit
  const { data: existing } = await supabase
    .from('token_transactions')
    .select('id')
    .eq('reference', ref)
    .single()

  if (existing) {
    return NextResponse.json({ success: true })
  }

console.log('VERIFY PAYLOAD:', json.data)


  // Credit tokens
  await supabase.rpc('increment_tokens', {
    uid: userId,
    amount: tokens,
  })

  // Log transaction
  await supabase.from('token_transactions').insert({
    user_id: userId,
    amount: tokens,
    type: 'purchase',
    reference: ref,
  })

  return NextResponse.json({ success: true })
}
