import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'
import { getPaymentProvider } from '@/lib/payment'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PACKS: Record<string, { tokens: number; amount: number }> = {
  small: { tokens: 10, amount: 10 },
  medium: { tokens: 30, amount: 25 },
  large: { tokens: 70, amount: 50 },
}

export async function POST(req: Request) {
  // Rate limit: 5 token purchase initiations per minute per IP
  const ip = getClientIp(req)
  const rl = rateLimit('tokens-init', ip, 5, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  let body: { pack?: string; user_id?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { pack, user_id, email } = body

  if (!pack || !user_id || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const selected = PACKS[pack]
  if (!selected) {
    return NextResponse.json({ error: 'Invalid token pack' }, { status: 400 })
  }

  try {
    const provider = getPaymentProvider()
    const result = await provider.initializePayment({
      email,
      amountGHS: selected.amount,
      metadata: {
        type: 'token_purchase',
        tokens: selected.tokens,
        user_id,
      },
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/tokens/success`,
      description: `Gavel ${selected.tokens} bid tokens`,
    })
    return NextResponse.json({ authorization_url: result.authorizationUrl, reference: result.reference })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Token init error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
