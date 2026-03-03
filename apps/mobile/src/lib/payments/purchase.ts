import { Linking } from 'react-native'
import type { PurchasePack, PurchaseResult } from './types'
import { resolvePaymentProvider } from './provider'
import { apiRequest } from '@/src/lib/api/client'
import { configureRevenueCat, getRevenueCatPackages, purchaseRevenueCatPackage } from './revenuecat'

type TokenInitResponse = {
  authorization_url: string
  reference: string
}

type StartPurchaseInput = {
  pack: PurchasePack
  userId: string
  email: string
}

export async function startPurchaseFlow(input: StartPurchaseInput): Promise<PurchaseResult> {
  const provider = resolvePaymentProvider({ productKind: 'digital' })

  if (provider === 'paystack') {
    const init = await apiRequest<TokenInitResponse>('/api/tokens/init', {
      method: 'POST',
      body: {
        pack: input.pack.id,
        user_id: input.userId,
        email: input.email,
      },
    })

    await Linking.openURL(init.authorization_url)

    return {
      success: true,
      provider,
      transactionId: init.reference,
      message: 'Redirected to Paystack checkout',
    }
  }

  await configureRevenueCat(input.userId)
  const packages = await getRevenueCatPackages()
  const selected = packages.find((pkg) => pkg.identifier === input.pack.id)

  if (!selected) {
    return {
      success: false,
      provider,
      message: `No RevenueCat package found for ${input.pack.id}`,
    }
  }

  const result = await purchaseRevenueCatPackage(selected)

  await apiRequest('/api/mobile/purchases/verify', {
    method: 'POST',
    body: {
      provider,
      productId: input.pack.id,
      platformTransactionId: result.productIdentifier,
      rawPayload: result.customerInfo,
    },
  })

  return {
    success: true,
    provider,
    transactionId: result.productIdentifier,
  }
}
