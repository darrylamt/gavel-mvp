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

/**
 * POST /api/delivery/estimate-checkout
 * Accepts cart items + buyer dropoff address.
 * Looks up the seller's pickup address, calls Dawurobo for a base estimate,
 * and returns three delivery tier options (Economy / Standard / Cargo).
 */
export async function POST(req: Request) {
  try {
    const { items, dropoff_address, dropoff_city } = (await req.json()) as {
      items?: { product_id: string; quantity: number }[]
      dropoff_address?: string
      dropoff_city?: string
    }

    if (!Array.isArray(items) || items.length === 0 || !dropoff_address?.trim()) {
      return NextResponse.json({ error: 'items and dropoff_address are required' }, { status: 400 })
    }

    const productIds = items.map((i) => i.product_id).filter(Boolean)

    // Resolve seller from the first product (primary seller for this cart)
    const { data: products } = await supabase
      .from('shop_products')
      .select('id, shop_id')
      .in('id', productIds)
      .limit(1)

    const shopId = products?.[0]?.shop_id
    if (!shopId) {
      return NextResponse.json({ options: null, error: 'Product not found' }, { status: 404 })
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', String(shopId))
      .maybeSingle()

    if (!shop?.owner_id) {
      return NextResponse.json({ options: null, error: 'Shop not found' }, { status: 404 })
    }

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('address')
      .eq('id', String(shop.owner_id))
      .maybeSingle()

    if (!sellerProfile?.address) {
      // Seller hasn't configured their pickup address yet
      return NextResponse.json({
        options: null,
        error: "Seller pickup address not configured. Delivery fee will be confirmed separately.",
      })
    }

    // Fetch Dawurobo estimate
    let estimate: DawuroboEstimate
    try {
      estimate = await dawuroboRequest<DawuroboEstimate>('POST', '/estimates', {
        pickup: { address: String(sellerProfile.address) },
        dropoff: {
          address: dropoff_address.trim(),
          city: dropoff_city?.trim() || '',
        },
      })
    } catch {
      return NextResponse.json({
        options: null,
        error: 'Delivery estimate unavailable right now. You can still proceed — the delivery fee will be confirmed at dispatch.',
      })
    }

    const base = Math.max(0, Number(estimate.estimated_price) || 0)
    const mins = Math.max(10, Number(estimate.estimated_duration_minutes) || 30)

    // Three tiers derived from the base Dawurobo price
    const options: DeliveryOption[] = [
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
      {
        priority: 'cargo',
        label: 'Cargo',
        description: 'Bulky / heavy items',
        price: Math.round(base * 1.5 * 100) / 100,
        duration_label: `~${Math.ceil(mins * 1.1)} min`,
      },
    ]

    return NextResponse.json({ options })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to estimate delivery'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
