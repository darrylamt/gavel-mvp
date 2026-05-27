import 'server-only'
import { PaystackProvider } from './paystack'
import { HubtelProvider } from './hubtel'
import type { IPaymentProvider } from './types'

/**
 * Returns the active payment provider instance.
 *
 * Controlled by the PAYMENT_PROVIDER environment variable:
 *   PAYMENT_PROVIDER=paystack  (default — existing behaviour)
 *   PAYMENT_PROVIDER=hubtel
 *
 * Usage:
 *   import { getPaymentProvider } from '@/lib/payment'
 *   const provider = getPaymentProvider()
 *   const { authorizationUrl, reference } = await provider.initializePayment({ ... })
 */
export function getPaymentProvider(): IPaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? 'paystack').toLowerCase().trim()
  switch (name) {
    case 'hubtel':
      return new HubtelProvider()
    case 'paystack':
    default:
      return new PaystackProvider()
  }
}

// Re-export types so callers only need to import from '@/lib/payment'
export type {
  IPaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
  ProviderName,
} from './types'
