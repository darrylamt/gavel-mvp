import 'server-only'

type Store = Map<string, { count: number; resetAt: number }>

const stores = new Map<string, Store>()

function getStore(name: string): Store {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)!
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number }

/**
 * Simple in-process sliding-window rate limiter.
 *
 * Not shared across serverless instances — each cold-start gets a fresh store.
 * Good for burst protection on a single instance; for strict multi-instance
 * enforcement, swap the store for an Upstash Redis client.
 *
 * @param name     Limiter name (one store per name)
 * @param key      Per-user/IP key to track
 * @param limit    Max requests in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(
  name: string,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const store = getStore(name)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count += 1
  return { allowed: true }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

/** Returns a 429 NextResponse with Retry-After header */
export function rateLimitResponse(retryAfterMs: number) {
  const { NextResponse } = require('next/server') as typeof import('next/server')
  return NextResponse.json(
    { error: 'Too many requests. Please wait before trying again.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    }
  )
}
