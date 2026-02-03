import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PACKS: Record<string, { tokens: number; amount: number }> = {
  small: { tokens: 10, amount: 10 },
  medium: { tokens: 50, amount: 45 },
  large: { tokens: 100, amount: 80 },
}

export async function POST(req: Request) {
  const { pack, user_id, email } = await req.json()

  const selected = PACKS[pack]
  if (!selected) {
    return NextResponse.json(
      { error: 'Invalid token pack' },
      { status: 400 }
    )
  }

  const res = await fetch(
    'https://api.paystack.co/transaction/initialize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: selected.amount * 100,
        metadata: {
          type: 'token_purchase',
          tokens: selected.tokens,
          user_id,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tokens/success`,
      }),
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json(
      { error: 'Paystack init failed' },
      { status: 500 }
    )
  }

  return NextResponse.json(json.data)
}
