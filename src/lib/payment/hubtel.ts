import 'server-only'
import crypto from 'crypto'
import type { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerifyResult } from './types'

/**
 * Hubtel Online Checkout payment provider.
 *
 * Required env vars:
 *   HUBTEL_CLIENT_ID               — Hubtel API client ID
 *   HUBTEL_CLIENT_SECRET           — Hubtel API client secret
 *   HUBTEL_MERCHANT_ACCOUNT_NUMBER — Hubtel merchant account number (e.g. HBT000001)
 *   NEXT_PUBLIC_SITE_URL           — Base URL for webhook & cancellation callbacks
 *
 * Optional:
 *   HUBTEL_WEBHOOK_SECRET          — Shared secret for validating Hubtel webhook requests
 *
 * How metadata works:
 *   Hubtel's checkout API does not natively support arbitrary metadata, so we persist
 *   the metadata to the `payment_intents` Supabase table before redirecting.
 *   The webhook handler reads it back by clientReference.
 */
export class HubtelProvider implements IPaymentProvider {
  readonly name = 'hubtel' as const

  private get clientId(): string {
    const v = process.env.HUBTEL_CLIENT_ID
    if (!v) throw new Error('HUBTEL_CLIENT_ID is not configured')
    return v
  }

  private get clientSecret(): string {
    const v = process.env.HUBTEL_CLIENT_SECRET
    if (!v) throw new Error('HUBTEL_CLIENT_SECRET is not configured')
    return v
  }

  private get merchantAccountNumber(): string {
    const v = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER
    if (!v) throw new Error('HUBTEL_MERCHANT_ACCOUNT_NUMBER is not configured')
    return v
  }

  /** Basic auth header for Hubtel API */
  private get authHeader(): string {
    const encoded = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    return `Basic ${encoded}`
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    // Generate a unique client reference (max 50 chars to stay within Hubtel limits)
    const clientReference =
      params.reference ?? `gvl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    // Persist metadata so the webhook handler can retrieve it
    const { createServiceRoleClient } = await import('@/lib/serverSupabase')
    const supabase = createServiceRoleClient()
    const { error: intentError } = await supabase.from('payment_intents').insert({
      id: clientReference,
      provider: 'hubtel',
      metadata: params.metadata,
      amount_ghs: params.amountGHS,
      email: params.email,
    })
    if (intentError) {
      console.error('Failed to store Hubtel payment intent:', intentError)
      throw new Error('Failed to initialise payment session')
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    const res = await fetch('https://payproxy.hubtel.com/v110/requestpayment/initiate-payment', {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        totalAmount: params.amountGHS,
        description: params.description ?? 'Gavel payment',
        callbackUrl: `${siteUrl}/api/webhooks/hubtel`,
        returnUrl: params.callbackUrl,
        merchantAccountNumber: this.merchantAccountNumber,
        cancellationUrl: `${siteUrl}/payment/cancelled`,
        clientReference,
      }),
    })

    const json = await res.json()

    // Hubtel success code is "0000"
    if (json.responseCode !== '0000' || !json.data?.checkoutUrl) {
      // Clean up the intent we just inserted
      await supabase.from('payment_intents').delete().eq('id', clientReference)
      throw new Error(json.message ?? 'Hubtel payment initialization failed')
    }

    return {
      authorizationUrl: json.data.checkoutUrl,
      reference: clientReference,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    const res = await fetch(
      `https://payproxy.hubtel.com/v110/requestpayment/transaction-status/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: this.authHeader },
      }
    )

    const json = await res.json()

    if (json.responseCode !== '0000') {
      throw new Error(json.message ?? 'Hubtel verification failed')
    }

    const data = json.data ?? {}
    const success = String(data.Status ?? data.status ?? '').toLowerCase() === 'success'
    const amountGHS = Number(data.Amount ?? data.amount ?? 0)

    // Retrieve metadata from payment_intents table
    const { createServiceRoleClient } = await import('@/lib/serverSupabase')
    const supabase = createServiceRoleClient()
    const { data: intent } = await supabase
      .from('payment_intents')
      .select('metadata')
      .eq('id', reference)
      .maybeSingle()

    return {
      success,
      amountGHS,
      reference: data.ClientReference ?? data.clientReference ?? reference,
      metadata: (intent?.metadata as Record<string, unknown>) ?? {},
      currency: 'GHS',
    }
  }

  /**
   * Hubtel webhook signature verification.
   *
   * If HUBTEL_WEBHOOK_SECRET is set, we verify using HMAC-SHA256 on the raw body.
   * Expected header: x-hubtel-signature (hex digest).
   *
   * If the secret is not configured we log a warning and allow the request through
   * so development / testing is not blocked.
   */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const secret = process.env.HUBTEL_WEBHOOK_SECRET
    if (!secret) {
      console.warn('[Hubtel] HUBTEL_WEBHOOK_SECRET not set — skipping signature verification')
      return true
    }

    const signature = headers.get('x-hubtel-signature') ?? ''
    if (!signature) return false

    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'))
    } catch {
      return false
    }
  }
}
