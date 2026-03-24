import { NextResponse } from 'next/server'
import 'server-only'
import { dawuroboRequest, type DawuroboLocation } from '@/lib/dawurobo'

/**
 * GET /api/delivery/locations
 * Proxies Dawurobo GET /locations — keeps the API key server-side.
 * Cached for 1 hour since locations rarely change.
 */
export const revalidate = 3600

export async function GET() {
  const baseUrl = process.env.DAWUROBO_BASE_URL || '(not set)'
  const appId = process.env.DAWUROBO_APP_ID || '(not set)'
  const apiKey = process.env.DAWUROBO_API_KEY || ''
  console.log('[delivery/locations] DAWUROBO_BASE_URL:', baseUrl)
  console.log('[delivery/locations] DAWUROBO_APP_ID:', appId)
  console.log('[delivery/locations] DAWUROBO_API_KEY:', apiKey ? apiKey.slice(0, 10) + '…' : '(not set)')

  try {
    const raw = await dawuroboRequest<DawuroboLocation[] | { data: DawuroboLocation[] }>('GET', '/locations')

    // Dawurobo may return either a top-level array or { data: [...] }
    const locations: DawuroboLocation[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown }).data)
        ? (raw as { data: DawuroboLocation[] }).data
        : []

    return NextResponse.json(
      { locations },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch delivery locations'
    console.error('[delivery/locations] Error:', message)
    return NextResponse.json({ error: message, locations: [] }, { status: 502 })
  }
}
