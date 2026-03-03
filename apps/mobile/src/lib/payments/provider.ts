import { Platform } from 'react-native'
import type { PaymentProvider, ProductKind } from './types'

type ProviderSelectionOptions = {
  productKind: ProductKind
  paystackAllowed?: boolean
}

export function resolvePaymentProvider(options: ProviderSelectionOptions): PaymentProvider {
  if (options.productKind === 'physical') {
    return 'paystack'
  }

  if (Platform.OS === 'ios') {
    return 'app_store'
  }

  if (Platform.OS === 'android') {
    return 'play_billing'
  }

  return options.paystackAllowed ? 'paystack' : 'play_billing'
}
