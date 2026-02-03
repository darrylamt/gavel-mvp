import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // 🔴 1️⃣ FIRST LINE INSIDE POST
  console.log('VERIFY ROUTE HIT')

  // 🔴 2️⃣ READ BODY + LOG IT
  const body = await req.json()
  console.log('VERIFY BODY:', body)

  const { reference } = body

  if (!reference) {
    return NextResponse.json(
      { error: 'Missing reference' },
      { status: 400 }
    )
  }

  // 🔴 3️⃣ PAYSTACK VERIFY CALL
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const json = await res.json()

  // 🔴 4️⃣ LOG PAYSTACK RESPONSE
  console.log('PAYSTACK VERIFY RESPONSE:', json)

  if (!json.status) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 400 }
    )
  }

  // 🔴 5️⃣ EXTRACT METADATA (CORRECTLY)
const { metadata, reference: ref } = json.data

if (metadata?.type !== 'token_purchase') {
  return NextResponse.json(
    { error: 'Invalid transaction type' },
    { status: 400 }
  )
}

const userId = metadata.user_id
const tokens = metadata.tokens

if (!userId || !tokens) {
  return NextResponse.json(
    { error: 'Invalid metadata' },
    { status: 400 }
  )
}

  // 🔴 6️⃣ PREVENT DOUBLE CREDIT
  const { data: existing } = await supabase
    .from('token_transactions')
    .select('id')
    .eq('reference', ref)
    .single()

  if (existing) {
    return NextResponse.json({ success: true })
  }

  // 🔴 7️⃣ CREDIT TOKENS
  await supabase.rpc('increment_tokens', {
    uid: userId,
    amount: tokens,
  })

  // 🔴 8️⃣ LOG TRANSACTION
  await supabase.from('token_transactions').insert({
    user_id: userId,
    amount: tokens,
    type: 'purchase',
    reference: ref,
  })

  return NextResponse.json({ success: true })
}
