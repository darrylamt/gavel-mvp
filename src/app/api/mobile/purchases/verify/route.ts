import { NextResponse } from 'next/server'
import 'server-only'
import { createServiceClient, getAuthUser } from '@/lib/apiAuth'

type PurchaseProvider = 'app_store' | 'play_billing'

type VerifyPayload = {
  provider: PurchaseProvider
  productId: string
  platformTransactionId: string
}

const PRODUCT_TOKENS: Record<string, number> = {
  small: 10,
  medium: 30,
  large: 70,
}

function resolveTokenAmount(productId: string): number {
  return PRODUCT_TOKENS[productId] ?? 0
}

async function verifyRevenueCatOwnership(userId: string, productId: string): Promise<boolean> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY
  if (!secret) {
    return false
  }

  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  const subscriber = data?.subscriber

  const subscriptions = subscriber?.subscriptions ?? {}
  if (subscriptions[productId]) {
    return true
  }

  const nonSubscriptions = subscriber?.non_subscriptions ?? {}
  const grants = nonSubscriptions[productId]
  return Array.isArray(grants) && grants.length > 0
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if ('error' in auth) {
    return auth.error
  }

  const body = (await request.json()) as Partial<VerifyPayload>
  const provider = body.provider
  const productId = body.productId
  const platformTransactionId = body.platformTransactionId

  if (!provider || !['app_store', 'play_billing'].includes(provider)) {
    return NextResponse.json({ error: 'Unsupported provider for digital goods' }, { status: 400 })
  }

  if (!productId || !platformTransactionId) {
    return NextResponse.json({ error: 'Missing productId or platformTransactionId' }, { status: 400 })
  }

  if (!process.env.REVENUECAT_SECRET_API_KEY) {
    return NextResponse.json(
      {
        error: 'RevenueCat server verification not configured',
        requiredEnv: ['REVENUECAT_SECRET_API_KEY'],
      },
      { status: 501 }
    )
  }

  const verified = await verifyRevenueCatOwnership(auth.user.id, productId)
  if (!verified) {
    return NextResponse.json({ error: 'Purchase could not be verified' }, { status: 400 })
  }

  const tokenAmount = resolveTokenAmount(productId)
  if (!tokenAmount) {
    return NextResponse.json({ error: 'No token mapping found for productId' }, { status: 400 })
  }

  const reference = `${provider}:${platformTransactionId}`
  const service = createServiceClient()

  const { data: existing } = await service
    .from('token_transactions')
    .select('id')
    .eq('reference', reference)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, alreadyCredited: true })
  }

  await service.rpc('increment_tokens', {
    uid: auth.user.id,
    amount: tokenAmount,
  })

  await service.from('token_transactions').insert({
    user_id: auth.user.id,
    amount: tokenAmount,
    type: 'purchase',
    reference,
    purchase_amount: null,
    purchase_currency: 'IAP',
  })

  return NextResponse.json({ success: true, provider, productId, creditedTokens: tokenAmount })
}
