import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { dawuroboRequest, type DawuroboEstimateResponse } from '@/lib/dawurobo'
import { getCoordinatesForLocation } from '@/lib/ghanaLocations'

export type DeliveryOption = {
  priority: 'economy' | 'standard' | 'cargo'
  label: string
  description: string
  price: number
  duration_label: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/delivery/estimate-checkout
 * Accepts cart items + buyer delivery address. Looks up the seller's pickup address
 * server-side, checks whether any product requires cargo, calls Dawurobo /estimates,
 * and returns the appropriate delivery tier options.
 *
 * requires_cargo = false → Economy + Standard options
 * requires_cargo = true  → Cargo option only
 * Mixed cart             → Cargo only (covers all items safely)
 *
 * Body: {
 *   items: { product_id, quantity }[]
 *   dropoff_address: string
 *   dropoff_city: string
 *   dropoff_region?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const {
      items,
      dropoff_address,
      dropoff_city,
      dropoff_region,
    } = (await req.json()) as {
      items?: { product_id: string; quantity: number }[]
      dropoff_address?: string
      dropoff_city?: string
      dropoff_region?: string
    }

    if (!Array.isArray(items) || items.length === 0 || !dropoff_address?.trim()) {
      return NextResponse.json({ options: [] }, { status: 400 })
    }

    const productIds = items.map((i) => i.product_id).filter(Boolean)

    // Resolve seller and check cargo requirement
    const { data: products } = await supabase
      .from('shop_products')
      .select('id, shop_id, requires_cargo')
      .in('id', productIds)

    if (!products || products.length === 0) {
      return NextResponse.json({ options: [] })
    }

    const hasCargo = products.some((p) => p.requires_cargo === true)
    const shopId = products[0]?.shop_id

    if (!shopId) {
      return NextResponse.json({ options: [] })
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', String(shopId))
      .maybeSingle()

    if (!shop?.owner_id) {
      return NextResponse.json({ options: [] })
    }

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('address')
      .eq('id', String(shop.owner_id))
      .maybeSingle()

    if (!sellerProfile?.address) {
      return NextResponse.json({ options: [] })
    }

    // Resolve dropoff coordinates from region > city — drives the Haversine estimate.
    // Pickup coordinates are optional per Dawurobo docs; ORS will resolve from the address.
    const dropoffCoords = getCoordinatesForLocation(dropoff_region || dropoff_city || '')

    let estimate: DawuroboEstimateResponse
    try {
      estimate = await dawuroboRequest<DawuroboEstimateResponse>('POST', '/estimates', {
        pickup_location: {
          address: String(sellerProfile.address),
        },
        delivery_location: {
          address: dropoff_address.trim(),
          coordinates: dropoffCoords,
        },
        priority: hasCargo ? 'cargo' : 'standard',
        order_date: new Date().toISOString(),
      })
    } catch {
      return NextResponse.json({ options: [] })
    }

    const available_options = estimate.data?.available_options ?? []
    const service_type = estimate.data?.service_type ?? 'standard'
    const isIntercity = service_type === 'Intercity'

    let options: DeliveryOption[]

    if (isIntercity) {
      const intercity = available_options[0]
      options = [
        {
          priority: 'standard',
          label: 'Intercity',
          description: intercity?.description ?? 'Intercity delivery',
          price: intercity?.price ?? 50,
          duration_label: '1-2 days',
        },
      ]
    } else if (hasCargo) {
      const cargoOption = available_options.find((o) => o.priority === 'cargo')
      options = [
        {
          priority: 'cargo',
          label: 'Cargo',
          description: cargoOption?.description ?? 'Large / heavy items',
          price: cargoOption?.price ?? 70,
          duration_label: 'Same day',
        },
      ]
    } else {
      const economyOption = available_options.find((o) => o.priority === 'economy')
      const standardOption = available_options.find((o) => o.priority === 'standard')
      options = [
        {
          priority: 'economy',
          label: 'Economy',
          description: economyOption?.description ?? 'Standard delivery',
          price: economyOption?.price ?? 28,
          duration_label: 'Same day',
        },
        {
          priority: 'standard',
          label: 'Standard',
          description: standardOption?.description ?? 'Faster pickup',
          price: standardOption?.price ?? 35,
          duration_label: 'Same day',
        },
      ]
    }

    return NextResponse.json({ options })
  } catch (err: unknown) {
    console.error('[delivery/estimate-checkout] Unhandled error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ options: [] })
  }
}
