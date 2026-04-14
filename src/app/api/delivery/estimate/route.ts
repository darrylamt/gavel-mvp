import { NextResponse } from 'next/server'
import 'server-only'
import { dawuroboRequest, type DawuroboEstimateResponse } from '@/lib/dawurobo'
import { getCoordinatesForLocation } from '@/lib/ghanaLocations'

/**
 * POST /api/delivery/estimate
 * Body: { pickup_address, dropoff_address, dropoff_city, dropoff_region? }
 * Returns Dawurobo delivery estimate (price + duration).
 */
export async function POST(req: Request) {
  try {
    const { pickup_address, dropoff_address, dropoff_city, dropoff_region } = (await req.json()) as {
      pickup_address?: string
      dropoff_address?: string
      dropoff_city?: string
      dropoff_region?: string
    }

    if (!pickup_address || !dropoff_address) {
      return NextResponse.json({ error: 'pickup_address and dropoff_address are required' }, { status: 400 })
    }

    // Coordinates drive the Haversine estimate. Use region > city > fallback.
    const dropoffCoords = getCoordinatesForLocation(dropoff_region || dropoff_city || '')

    const estimate = await dawuroboRequest<DawuroboEstimateResponse>('POST', '/estimates', {
      pickup_location: {
        address: pickup_address,
      },
      delivery_location: {
        address: dropoff_address,
        coordinates: dropoffCoords,
      },
      order_date: new Date().toISOString(),
    })

    return NextResponse.json(estimate.data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get delivery estimate'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
