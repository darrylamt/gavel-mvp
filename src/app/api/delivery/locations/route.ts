import { NextResponse } from 'next/server'
import 'server-only'
import { dawuroboRequest, type DawuroboLocation } from '@/lib/dawurobo'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit'

/**
 * GET /api/delivery/locations
 * Proxies Dawurobo GET /locations – keeps the API key server-side.
 * Public (used before login), so rate-limited per IP: the Dawurobo read quota
 * is per API key and shared with every other delivery call.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const rl = rateLimit('delivery-locations', getClientIp(req), 30, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs)

  try {
    const raw = await dawuroboRequest<DawuroboLocation[] | { data: DawuroboLocation[] }>('GET', '/locations')

    // Dawurobo may return either a top-level array or { data: [...] }
    const locations: DawuroboLocation[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown }).data)
        ? (raw as { data: DawuroboLocation[] }).data
        : []

    return NextResponse.json({ locations })
  } catch (err: unknown) {
    console.error('[delivery/locations] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ locations: [] })
  }
}
