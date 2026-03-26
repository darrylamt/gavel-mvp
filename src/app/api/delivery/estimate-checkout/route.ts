import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { dawuroboRequest, type DawuroboEstimate } from '@/lib/dawurobo'

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

// Ghana approximate center — used as coordinate fallback
const GHANA_CENTER = { lat: 5.6037, lng: -0.1870 }

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

    let estimate: DawuroboEstimate
    try {
      estimate = await dawuroboRequest<DawuroboEstimate>('POST', '/estimates', {
        pickup_location: {
          address: String(sellerProfile.address),
          coordinates: GHANA_CENTER,
        },
        delivery_location: {
          address: dropoff_address.trim(),
          coordinates: GHANA_CENTER,
        },
        priority: hasCargo ? 'cargo' : 'standard',
        order_date: new Date().toISOString(),
      })
    } catch {
      return NextResponse.json({ options: [] })
    }

    const base = Math.max(0, Number(estimate.estimated_price) || 0)
    const mins = Math.max(10, Number(estimate.estimated_duration_minutes) || 30)

    let options: DeliveryOption[]

    if (hasCargo) {
      options = [
        {
          priority: 'cargo',
          label: 'Cargo',
          description: 'Large / heavy items',
          price: Math.round(base * 100) / 100,
          duration_label: `~${Math.ceil(mins)} min`,
        },
      ]
    } else {
      options = [
        {
          priority: 'economy',
          label: 'Economy',
          description: 'Standard delivery',
          price: Math.round(base * 100) / 100,
          duration_label: `~${Math.ceil(mins * 1.3)} min`,
        },
        {
          priority: 'standard',
          label: 'Standard',
          description: 'Faster pickup',
          price: Math.round(base * 1.2 * 100) / 100,
          duration_label: `~${Math.ceil(mins)} min`,
        },
      ]
    }

    return NextResponse.json({ options })
  } catch (err: unknown) {
    console.error('[delivery/estimate-checkout] Unhandled error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ options: [] })
  }
}
