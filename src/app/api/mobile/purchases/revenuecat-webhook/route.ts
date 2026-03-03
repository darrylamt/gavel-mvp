import { NextResponse } from 'next/server'
import 'server-only'
import { createServiceClient } from '@/lib/apiAuth'

type RevenueCatWebhookEvent = {
  event?: {
    type?: string
    app_user_id?: string
    product_id?: string
    transaction_id?: string
    store?: 'APP_STORE' | 'PLAY_STORE' | string
  }
}

const PRODUCT_TOKENS: Record<string, number> = {
  small: 35,
  medium: 120,
  large: 250,
}

function providerFromStore(store?: string): 'app_store' | 'play_billing' | null {
  if (store === 'APP_STORE') return 'app_store'
  if (store === 'PLAY_STORE') return 'play_billing'
  return null
}

export async function POST(request: Request) {
  const expectedAuth = process.env.REVENUECAT_WEBHOOK_AUTH
  const header = request.headers.get('authorization')

  if (expectedAuth && header !== `Bearer ${expectedAuth}`) {
    return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
  }

  const payload = (await request.json()) as RevenueCatWebhookEvent
  const event = payload.event

  const eventType = event?.type
  const isCreditable = eventType === 'INITIAL_PURCHASE' || eventType === 'NON_RENEWING_PURCHASE'

  if (!isCreditable) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const userId = event?.app_user_id
  const productId = event?.product_id
  const transactionId = event?.transaction_id
  const provider = providerFromStore(event?.store)

  if (!userId || !productId || !transactionId || !provider) {
    return NextResponse.json({ error: 'Missing required webhook fields' }, { status: 400 })
  }

  const tokenAmount = PRODUCT_TOKENS[productId]
  if (!tokenAmount) {
    return NextResponse.json({ error: 'No token mapping for product_id' }, { status: 400 })
  }

  const service = createServiceClient()
  const reference = `${provider}:${transactionId}`

  const { data: existing } = await service
    .from('token_transactions')
    .select('id')
    .eq('reference', reference)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, alreadyCredited: true })
  }

  await service.rpc('increment_tokens', {
    uid: userId,
    amount: tokenAmount,
  })

  await service.from('token_transactions').insert({
    user_id: userId,
    amount: tokenAmount,
    type: 'purchase',
    reference,
    purchase_amount: null,
    purchase_currency: 'IAP',
  })

  return NextResponse.json({ ok: true, creditedTokens: tokenAmount })
}
