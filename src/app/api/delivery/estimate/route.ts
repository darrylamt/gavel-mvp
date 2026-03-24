import { NextResponse } from 'next/server'
import 'server-only'
import { dawuroboRequest, type DawuroboEstimate } from '@/lib/dawurobo'

/**
 * POST /api/delivery/estimate
 * Body: { pickup_address, dropoff_address, dropoff_city }
 * Returns Dawurobo delivery estimate (price + duration).
 */
export async function POST(req: Request) {
  try {
    const { pickup_address, dropoff_address, dropoff_city } = (await req.json()) as {
      pickup_address?: string
      dropoff_address?: string
      dropoff_city?: string
    }

    if (!pickup_address || !dropoff_address) {
      return NextResponse.json({ error: 'pickup_address and dropoff_address are required' }, { status: 400 })
    }

    const estimate = await dawuroboRequest<DawuroboEstimate>('POST', '/estimates', {
      pickup: { address: pickup_address },
      dropoff: { address: dropoff_address, city: dropoff_city || '' },
    })

    return NextResponse.json(estimate)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get delivery estimate'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
