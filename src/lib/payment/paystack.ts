import 'server-only'
import crypto from 'crypto'
import type { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerifyResult } from './types'

/**
 * Paystack payment provider.
 *
 * Required env vars:
 *   PAYSTACK_SECRET_KEY  — Paystack secret key (sk_live_... or sk_test_...)
 */
export class PaystackProvider implements IPaymentProvider {
  readonly name = 'paystack' as const

  private get secretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY
    if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured')
    return key
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amountGHS * 100), // pesewas
        metadata: params.metadata,
        callback_url: params.callbackUrl,
        ...(params.reference ? { reference: params.reference } : {}),
      }),
    })

    const json = await res.json()

    if (!json.status || !json.data?.authorization_url) {
      throw new Error(json.message || 'Paystack initialization failed')
    }

    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerifyResult> {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      }
    )

    const json = await res.json()

    if (!json.status) {
      throw new Error(json.message || 'Paystack verification failed')
    }

    const data = json.data ?? {}

    return {
      success: String(data.status) === 'success',
      amountGHS: Number(data.amount ?? 0) / 100,
      reference: data.reference ?? reference,
      metadata: data.metadata ?? {},
      currency: data.currency ?? 'GHS',
    }
  }

  /**
   * Paystack signs webhooks with HMAC-SHA512 using the secret key.
   * Header: x-paystack-signature
   */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const signature = headers.get('x-paystack-signature') ?? ''
    if (!signature) return false
    const hash = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'))
  }
}
