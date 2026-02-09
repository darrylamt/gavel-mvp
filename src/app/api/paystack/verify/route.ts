import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { reference } = await req.json()

  if (!reference) {
    return NextResponse.json(
      { error: 'Missing reference' },
      { status: 400 }
    )
  }

  // 1️⃣ Verify with Paystack
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
      { error: 'Paystack verification failed' },
      { status: 400 }
    )
  }

  const { metadata } = json.data

  // 2️⃣ HARD CHECK — token purchases ONLY
  if (metadata?.type !== 'token_purchase') {
    return NextResponse.json(
      { error: 'Invalid transaction type' },
      { status: 400 }
    )
  }

  const userId = metadata.user_id
  const tokens = metadata.tokens
  const referenceId = json.data.reference

  if (!userId || !tokens) {
    return NextResponse.json(
      { error: 'Invalid metadata' },
      { status: 400 }
    )
  }

  // 3️⃣ Prevent double credit
  const { data: existing } = await supabase
    .from('token_transactions')
    .select('id')
    .eq('reference', referenceId)
    .single()

  if (existing) {
    return NextResponse.json({ success: true })
  }

  // 4️⃣ Credit tokens
  await supabase.rpc('increment_tokens', {
    uid: userId,
    amount: tokens,
  })

  // 5️⃣ Log transaction
  await supabase.from('token_transactions').insert({
    user_id: userId,
    amount: tokens,
    type: 'purchase',
    reference: referenceId,
  })

  return NextResponse.json({ success: true })
}