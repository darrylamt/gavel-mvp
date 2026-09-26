import 'server-only'
import crypto from 'crypto'
import type { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerifyResult } from './types'
import { parseHubtelStatus } from './hubtelStatus'

/**
 * Hubtel Online Checkout payment provider.
 * Docs: docs/HUBTEL_API.md — Online Checkout API section
 *
 * Env vars (as named in Vercel):
 *   HUBTEL_API_ID           — Hubtel API ID (used to build Basic auth)
 *   HUBTEL_API_KEY          — Hubtel API Key (used to build Basic auth)
 *   HUBTEL_BASIC_AUTH       — Pre-built Basic auth value (overrides ID+KEY if present)
 *   HUBTEL_POS_SALES_ID     — Collection Account Number (merchantAccountNumber)
 *   HUBTEL_CALLBACK_URL     — Webhook callback URL override
 *   HUBTEL_CANCELLATION_URL — Cancellation URL override
 *   NEXT_PUBLIC_SITE_URL    — Base site URL (fallback for callbacks)
 *
 * Optional:
 *   HUBTEL_WEBHOOK_SECRET   — Shared secret for validating Hubtel webhook POSTs
 *
 * ⚠️  IP WHITELISTING REQUIRED
 *   Hubtel blocks requests from non-whitelisted IPs (returns 403 or timeout).
 *   Vercel's outbound IPs must be whitelisted with your Hubtel Retail Systems Engineer.
 *   See: https://vercel.com/docs/edge-network/regions for Vercel IP ranges.
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
    const callbackBase = process.env.HUBTEL_CALLBACK_URL ?? `${siteUrl}/api/webhooks/hubtel`
    // Hubtel does not sign its callbacks, so we sign the callback URL itself.
    // It goes server-to-server to Hubtel and is never shown to the buyer; the
    // webhook recomputes the signature from the ClientReference in the payload.
    const callbackSig = this.callbackSignature(clientReference)
    if (!callbackSig) {
      console.error('[Hubtel] HUBTEL_WEBHOOK_SECRET not set — this payment\'s webhook will be rejected; it can still complete via the return-page verify path')
    }
    const callbackUrl = callbackSig
      ? `${callbackBase}${callbackBase.includes('?') ? '&' : '?'}sig=${callbackSig}`
      : callbackBase
    const cancellationUrl = process.env.HUBTEL_CANCELLATION_URL ?? `${siteUrl}/payment/cancelled`

    // Embed our clientReference into the returnUrl so the success page
    // can retrieve it even if Hubtel replaces/appends its own params.
    const separator = params.callbackUrl.includes('?') ? '&' : '?'
    const returnUrl = `${params.callbackUrl}${separator}reference=${encodeURIComponent(clientReference)}`

    const body = {
      totalAmount: params.amountGHS,
      description: params.description ?? 'Gavel payment',
      callbackUrl,
      returnUrl,
      merchantAccountNumber: merchantId,
      cancellationUrl,
      clientReference,
    }

    // Online Checkout initiate endpoint (from HUBTEL_API.md)
    const HUBTEL_ENDPOINT = 'https://payproxyapi.hubtel.com/items/initiate'

    let res: Response
    try {
      res = await fetch(HUBTEL_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? `${fetchErr.name}: ${fetchErr.message}` : String(fetchErr)
      console.error('[Hubtel] fetch threw:', msg)
      await supabase.from('payment_intents').delete().eq('id', clientReference)
      throw new Error(`Hubtel API unreachable: ${msg}`)
    }

    console.log('[Hubtel] fetch status:', res.status)
    const rawText = await res.text()
    if (!res.ok) console.error('[Hubtel] initiate failed, status:', res.status)

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
    // Public transaction status check endpoint (no IP whitelisting required)
    const statusUrl = `https://rmsc.hubtel.com/v1/merchantaccount/merchants/${encodeURIComponent(this.merchantAccountNumber)}/transactions/status?clientReference=${encodeURIComponent(reference)}`

    const res = await fetch(statusUrl, {
      headers: { Authorization: this.authHeader },
    })

    const json = await res.json().catch(() => null)
    console.log('[Hubtel] verifyPayment responseCode:', json?.ResponseCode ?? json?.responseCode, 'http:', res.status)

    // Throws HubtelStatusError for non-0000 codes (e.g. 4720 = no matching record).
    const { success, amountGHS, clientReference } = parseHubtelStatus(json)

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
      reference: clientReference ?? reference,
      metadata: (intent?.metadata as Record<string, unknown>) ?? {},
      currency: 'GHS',
    }
  }

  /**
   * HMAC of a clientReference, embedded in the callbackUrl we give Hubtel.
   * Returns null when HUBTEL_WEBHOOK_SECRET is not configured.
   */
  callbackSignature(clientReference: string): string | null {
    const secret = process.env.HUBTEL_WEBHOOK_SECRET
    if (!secret) return null
    return crypto.createHmac('sha256', secret).update(`hubtel-callback:${clientReference}`).digest('hex')
  }

  /**
   * Verifies the `sig` query parameter on an incoming Hubtel callback against
   * the payload's ClientReference. Fails closed: no secret, no signature, or a
   * mismatch all return false. A signature is bound to one reference, so a
   * callback URL for one payment cannot be replayed to confirm another.
   */
  verifyCallbackSignature(clientReference: string, sig: string | null): boolean {
    const expected = this.callbackSignature(clientReference)
    if (!expected || !sig || !/^[0-9a-f]{64}$/i.test(sig)) return false
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  }

  /**
   * Header-based webhook signature verification. Kept for the IPaymentProvider
   * interface; Hubtel's Online Checkout does not send a signature header, so
   * the Hubtel webhook authenticates with verifyCallbackSignature() instead.
   *
   * Fails closed: if HUBTEL_WEBHOOK_SECRET is not set, every request is rejected.
   * This webhook credits tokens and marks auctions paid, so a missing secret must
   * never look the same as a valid signature. Set the variable to accept webhooks.
   */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const secret = process.env.HUBTEL_WEBHOOK_SECRET
    if (!secret) {
      console.error('[Hubtel] HUBTEL_WEBHOOK_SECRET not set — rejecting webhook')
      return false
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
