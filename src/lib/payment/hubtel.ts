import 'server-only'
import crypto from 'crypto'
import type { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerifyResult } from './types'

/**
 * Hubtel Online Checkout payment provider.
 *
 * Env vars (as named in Vercel):
 *   HUBTEL_API_ID          — Hubtel API client ID
 *   HUBTEL_API_KEY         — Hubtel API client secret
 *   HUBTEL_BASIC_AUTH      — Pre-built Basic auth value (overrides ID+KEY if present)
 *   HUBTEL_POS_SALES_ID    — Hubtel merchant account / POS sales ID
 *   HUBTEL_CALLBACK_URL    — Webhook callback URL (overrides auto-constructed one if present)
 *   HUBTEL_RETURN_URL      — Return URL after payment (optional override)
 *   HUBTEL_CANCELLATION_URL — Cancellation URL (optional override)
 *   NEXT_PUBLIC_SITE_URL   — Base site URL (fallback for callbacks)
 *
 * Optional:
 *   HUBTEL_WEBHOOK_SECRET  — Shared secret for validating Hubtel webhook POSTs
 *
 * How metadata works:
 *   Hubtel checkout does not support arbitrary metadata, so we persist it to the
 *   `payment_intents` Supabase table before redirecting. The webhook handler reads
 *   it back by clientReference.
 */
export class HubtelProvider implements IPaymentProvider {
  readonly name = 'hubtel' as const

  /** Basic auth header — use pre-built value if available, else construct from ID+KEY */
  private get authHeader(): string {
    const prebuilt = process.env.HUBTEL_BASIC_AUTH
    if (prebuilt) {
      return prebuilt.startsWith('Basic ') ? prebuilt : `Basic ${prebuilt}`
    }
    const id = process.env.HUBTEL_API_ID
    const key = process.env.HUBTEL_API_KEY
    if (!id || !key) throw new Error('HUBTEL_API_ID and HUBTEL_API_KEY (or HUBTEL_BASIC_AUTH) are not configured')
    return `Basic ${Buffer.from(`${id}:${key}`).toString('base64')}`
  }

  private get merchantAccountNumber(): string {
    const v = process.env.HUBTEL_POS_SALES_ID
    if (!v) throw new Error('HUBTEL_POS_SALES_ID is not configured')
    return v
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    console.log('[Hubtel] initializePayment start, amountGHS:', params.amountGHS)

    // Generate a unique client reference (keep ≤50 chars for Hubtel limits)
    const clientReference =
      params.reference ?? `gvl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    console.log('[Hubtel] clientReference:', clientReference)

    // Resolve auth header early so config errors surface cleanly
    let auth: string
    try {
      auth = this.authHeader
      console.log('[Hubtel] auth header resolved, length:', auth.length)
    } catch (e) {
      console.error('[Hubtel] authHeader error:', e)
      throw e
    }

    let merchantId: string
    try {
      merchantId = this.merchantAccountNumber
      console.log('[Hubtel] merchantAccountNumber resolved:', merchantId)
    } catch (e) {
      console.error('[Hubtel] merchantAccountNumber error:', e)
      throw e
    }

    // Persist metadata so the webhook handler can retrieve it
    console.log('[Hubtel] importing supabase...')
    const { createServiceRoleClient } = await import('@/lib/serverSupabase')
    const supabase = createServiceRoleClient()
    console.log('[Hubtel] inserting payment_intent...')

    const { error: intentError } = await supabase.from('payment_intents').insert({
      id: clientReference,
      provider: 'hubtel',
      metadata: params.metadata,
      amount_ghs: params.amountGHS,
      email: params.email,
    })
    if (intentError) {
      console.error('[Hubtel] payment_intent insert error:', intentError.message, intentError.code)
      throw new Error(`Failed to initialise payment session: ${intentError.message}`)
    }
    console.log('[Hubtel] payment_intent inserted OK')

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL ?? `${siteUrl}/api/webhooks/hubtel`
    const cancellationUrl = process.env.HUBTEL_CANCELLATION_URL ?? `${siteUrl}/payment/cancelled`

    const body = {
      totalAmount: params.amountGHS,
      description: params.description ?? 'Gavel payment',
      callbackUrl,
      returnUrl: params.callbackUrl,
      merchantAccountNumber: merchantId,
      cancellationUrl,
      clientReference,
    }
    console.log('[Hubtel] calling API with body:', JSON.stringify(body))

    let res: Response
    try {
      res = await fetch('https://payproxy.hubtel.com/v110/requestpayment/initiate-payment', {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (fetchErr) {
      console.error('[Hubtel] fetch threw:', fetchErr)
      await supabase.from('payment_intents').delete().eq('id', clientReference)
      throw fetchErr
    }

    console.log('[Hubtel] fetch status:', res.status)
    const rawText = await res.text()
    console.log('[Hubtel] raw response:', rawText)

    let json: Record<string, unknown>
    try {
      json = JSON.parse(rawText)
    } catch {
      await supabase.from('payment_intents').delete().eq('id', clientReference)
      throw new Error(`Hubtel returned non-JSON (status ${res.status}): ${rawText.slice(0, 200)}`)
    }

    // Hubtel success code is "0000"
    if (json.responseCode !== '0000' || !(json.data as Record<string, unknown>)?.checkoutUrl) {
      await supabase.from('payment_intents').delete().eq('id', clientReference)
      throw new Error(
        String(json.message ?? `Hubtel init failed (code: ${json.responseCode ?? 'unknown'})`)
      )
    }

    const checkoutUrl = String((json.data as Record<string, unknown>).checkoutUrl)
    console.log('[Hubtel] checkoutUrl:', checkoutUrl)

    return {
      authorizationUrl: checkoutUrl,
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
   * If HUBTEL_WEBHOOK_SECRET is not set, requests are allowed through (dev-friendly).
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
