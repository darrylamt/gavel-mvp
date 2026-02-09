import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Token packs (you can adjust prices later)
const TOKEN_PACKS: Record<
  string,
  { tokens: number; amountGHS: number }
> = {
  small: { tokens: 10, amountGHS: 10 },
  medium: { tokens: 50, amountGHS: 45 },
  large: { tokens: 100, amountGHS: 80 },
}

export async function POST(req: Request) {
  const { pack, user_id, email } = await req.json()

  if (!pack || !user_id || !email) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  const selected = TOKEN_PACKS[pack]
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
        amount: selected.amountGHS * 100, // Paystack = kobo
        metadata: {
          type: 'token_purchase', // 🔑 VERY IMPORTANT
          user_id,
          tokens: selected.tokens,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tokens/success`,
      }),
    }
  )

  const json = await res.json()

  if (!json.status) {
    return NextResponse.json(
      { error: 'Paystack initialization failed' },
      { status: 500 }
    )
  }

  return NextResponse.json(json.data)
}