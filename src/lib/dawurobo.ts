import crypto from 'node:crypto'

const BASE_URL = process.env.DAWUROBO_BASE_URL || 'https://delivery.dawurobo.com'
const APP_ID = process.env.DAWUROBO_APP_ID || 'gavelgh'
const API_KEY = process.env.DAWUROBO_API_KEY ?? ''
const WEBHOOK_SECRET = process.env.DAWUROBO_WEBHOOK_SECRET ?? ''

/**
 * Make an authenticated request to the Dawurobo API.
 * Paths like `/estimates` are resolved to `/api/third-party/apps/{APP_ID}/estimates`
 * when DAWUROBO_APP_ID is set.
 *
 * Signing: canonical = METHOD\nPATHNAME\nQUERY\nSHA256_BODY\nTIMESTAMP\nNONCE
 * HMAC-SHA256 of that string using API_KEY as the secret.
 */
export async function dawuroboRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const resolvedPath = APP_ID
    ? `/api/third-party/apps/${APP_ID}${path}`
    : path
  const url = new URL(resolvedPath, BASE_URL)
  const bodyStr = body ? JSON.stringify(body) : ''

  const METHOD    = method.toUpperCase()
  const PATHNAME  = url.pathname
  const QUERY     = url.search
  const SHA256_BODY = crypto.createHash('sha256').update(bodyStr).digest('hex')
  const TIMESTAMP = String(Math.floor(Date.now() / 1000))
  const NONCE     = crypto.randomUUID()

  const canonical = [METHOD, PATHNAME, QUERY, SHA256_BODY, TIMESTAMP, NONCE].join('\n')

  const signature = crypto
    .createHmac('sha256', API_KEY)
    .update(canonical)
    .digest('hex')

  const idempotencyKey = (METHOD === 'POST' || METHOD === 'PATCH' || METHOD === 'DELETE')
    ? crypto.randomUUID()
    : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key':    API_KEY,
    'X-Timestamp':  TIMESTAMP,
    'X-Nonce':      NONCE,
    'X-Signature':  signature,
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const res = await fetch(url.toString(), {
    method: METHOD,
    headers,
    body: bodyStr || undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    console.error(`[dawurobo] ${METHOD} ${path} → ${res.status}: ${text}`)
    throw new Error(`Dawurobo ${METHOD} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

/**
 * Verify an incoming Dawurobo webhook using HMAC-SHA256 + timing-safe comparison.
 */
export function verifyDawuroboWebhook(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')
  const sig = signature.trim()
  if (expected.length !== sig.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

export type DawuroboLocation = {
  id: string | number
  name: string
  city?: string
  region?: string
  [key: string]: unknown
}

export type DawuroboCreateOrderResponse = {
  status: string
  data: {
    order_details: {
      order_id: string
      estimated_delivery?: string
    }
    status: string
  }
}

export type DawuroboEstimateOption = {
  priority: 'economy' | 'standard' | 'cargo'
  price: number
  description: string
}

export type DawuroboEstimateResponse = {
  status: string
  data: {
    estimated_price: number
    pickup_time?: string
    delivery_time?: string
    delivery_window?: { earliest: string; latest: string }
    priority_level?: string
    service_type: string
    available_options: DawuroboEstimateOption[]
    location_coverage?: {
      delivery_available: boolean
      service_area: string
    }
  }
}

export type DawuroboWebhookOrderData = {
  external_order_reference?: string
  order_id: string
  status: string
  status_reason?: string
  rider_info?: { id: string; name: string; phone: string }
  delivery_info?: {
    recipient_name: string
    recipient_phone: string
    delivery_address: string
    delivery_date: string
  }
  timestamps?: Record<string, string>
  tracking_url?: string
}

export type DawuroboWebhookPayload = {
  event_type: string
  timestamp: string
  order_data: DawuroboWebhookOrderData
}
