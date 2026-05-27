import 'server-only'

/**
 * Shared types for the Gavel payment provider abstraction.
 *
 * Active provider is selected by the PAYMENT_PROVIDER env var:
 *   PAYMENT_PROVIDER=paystack  (default)
 *   PAYMENT_PROVIDER=hubtel
 */

export interface PaymentInitParams {
  /** Payer email address */
  email: string
  /** Amount in GHS (Ghana cedis) */
  amountGHS: number
  /**
   * Arbitrary metadata passed through the payment flow.
   * - Paystack: embedded natively in transaction metadata.
   * - Hubtel: stored in the payment_intents DB table keyed by clientReference.
   */
  metadata: Record<string, unknown>
  /** URL to redirect/callback after payment (provider-specific interpretation) */
  callbackUrl: string
  /** Optional idempotency reference. Auto-generated if omitted. */
  reference?: string
  /** Human-readable description shown on the payment page */
  description?: string
}

export interface PaymentInitResult {
  /** URL to redirect the user to for payment */
  authorizationUrl: string
  /** Unique reference for this payment session */
  reference: string
}

export interface PaymentVerifyResult {
  /** Whether the payment was successful */
  success: boolean
  /** Amount paid in GHS */
  amountGHS: number
  /** Payment reference */
  reference: string
  /**
   * Metadata associated with the payment.
   * - Paystack: from transaction.metadata
   * - Hubtel: from payment_intents table
   */
  metadata: Record<string, unknown>
  /** Currency code (always GHS on Gavel) */
  currency: string
}

export type ProviderName = 'paystack' | 'hubtel'

export interface IPaymentProvider {
  readonly name: ProviderName
  /**
   * Create a new payment session and return the authorization URL to redirect the user.
   * Throws on misconfiguration or API error.
   */
  initializePayment(params: PaymentInitParams): Promise<PaymentInitResult>
  /**
   * Verify a completed payment by its reference.
   * Throws on misconfiguration or API error.
   */
  verifyPayment(reference: string): Promise<PaymentVerifyResult>
  /**
   * Verify the webhook signature coming from the payment provider.
   * Returns true if the signature is valid.
   */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean
}
