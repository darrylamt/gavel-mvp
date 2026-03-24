import crypto from 'crypto'

const BASE_URL = process.env.DAWUROBO_BASE_URL || 'https://api.dawurobo.com'
const APP_ID = process.env.DAWUROBO_APP_ID || ''
const API_KEY = process.env.DAWUROBO_API_KEY || ''
const WEBHOOK_SECRET = process.env.DAWUROBO_WEBHOOK_SECRET || ''

/**
 * Make an authenticated request to the Dawurobo API.
 * Paths like `/estimates` are automatically resolved to
 * `/api/third-party/apps/{APP_ID}/estimates` when DAWUROBO_APP_ID is set.
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

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: bodyStr || undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Dawurobo ${method} ${path} → ${res.status}: ${text}`)
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
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    )
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

export type DawuroboEstimate = {
  estimated_price: number
  currency: string
  estimated_duration_minutes: number
}

export type DawuroboOrder = {
  id: string
  status: string
  tracking_url?: string
}
