import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { env } from '@/src/lib/env'

let configured = false

export async function configureRevenueCat(appUserId: string) {
  if (configured) {
    return
  }

  const apiKey = Platform.OS === 'ios' ? env.revenueCatIosApiKey : env.revenueCatAndroidApiKey
  if (!apiKey) {
    throw new Error('Missing RevenueCat API key for current platform')
  }

  Purchases.setLogLevel(LOG_LEVEL.INFO)
  await Purchases.configure({
    apiKey,
    appUserID: appUserId,
  })

  configured = true
}

export async function getRevenueCatPackages() {
  const offerings = await Purchases.getOfferings()
  return offerings.current?.availablePackages ?? []
}

export async function purchaseRevenueCatPackage(pack: PurchasesPackage) {
  const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pack)
  return {
    customerInfo,
    productIdentifier,
  }
}
