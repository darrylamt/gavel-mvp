export type ProductKind = 'digital' | 'physical'

export type PaymentProvider = 'app_store' | 'play_billing' | 'paystack'

export type PurchasePack = {
  id: string
  title: string
  tokens: number
}

export type PurchaseResult = {
  success: boolean
  provider: PaymentProvider
  transactionId?: string
  message?: string
}
