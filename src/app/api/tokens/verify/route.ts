import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { getPaymentProvider } from '@/lib/payment'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  console.log('VERIFY ROUTE HIT')

  const body = await req.json()
  console.log('VERIFY BODY:', body)

  const { reference } = body
  if (!reference) {
    return NextResponse.json(
      { error: 'Missing reference' },
      { status: 400 }
    )
  }

  let verifyResult: Awaited<ReturnType<ReturnType<typeof getPaymentProvider>['verifyPayment']>>
  try {
    const provider = getPaymentProvider()
    verifyResult = await provider.verifyPayment(reference)
    console.log('PAYMENT VERIFY RESULT:', { success: verifyResult.success, reference: verifyResult.reference })
  } catch (err) {
    console.error('Token payment verify error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
  }

  if (!verifyResult.success) {
    return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 })
  }

  const metadata = verifyResult.metadata
  const ref = verifyResult.reference
  const amountGHS = verifyResult.amountGHS
  const currency = verifyResult.currency

  if (metadata?.type !== 'token_purchase') {
    return NextResponse.json(
      { error: 'Invalid transaction type' },
      { status: 400 }
    )
  }

  const userId = metadata.user_id as string | undefined
  const tokens = metadata.tokens as number | undefined

  if (!userId || !tokens) {
    return NextResponse.json(
      { error: 'Invalid metadata' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('token_transactions')
    .select('id')
    .eq('reference', ref)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true })
  }

  // CREDIT TOKENS
  await supabase.rpc('increment_tokens', {
    uid: userId,
    amount: tokens,
  })

  // LOG TRANSACTION
  await supabase.from('token_transactions').insert({
    user_id: userId,
    amount: tokens,
    type: 'purchase',
    reference: ref,
    purchase_amount: amountGHS > 0 ? amountGHS : null,
    purchase_currency: currency || 'GHS',
  })

  return NextResponse.json({ success: true })
}
