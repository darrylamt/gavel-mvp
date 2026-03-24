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
 * Accepts cart items + the Dawurobo location the buyer selected.
 * Looks up the seller's pickup address server-side, calls Dawurobo /estimates,
 * and returns three delivery tier options (Economy / Standard / Cargo).
 *
 * Body: {
 *   items: { product_id, quantity }[]
 *   dropoff_address: string      – buyer's street address
 *   dropoff_location_id: string  – Dawurobo location ID selected from the dropdown
 *   dropoff_location_name: string – human-readable name, used as city fallback
 * }
 */
export async function POST(req: Request) {
  const baseUrl = process.env.DAWUROBO_BASE_URL || '(not set)'
  const appId = process.env.DAWUROBO_APP_ID || '(not set)'
  const apiKey = process.env.DAWUROBO_API_KEY || ''
  console.log('[delivery/estimate-checkout] DAWUROBO_BASE_URL:', baseUrl)
  console.log('[delivery/estimate-checkout] DAWUROBO_APP_ID:', appId)
  console.log('[delivery/estimate-checkout] DAWUROBO_API_KEY:', apiKey ? apiKey.slice(0, 10) + '…' : '(not set)')

  try {
    const {
      items,
      dropoff_address,
      dropoff_location_id,
      dropoff_location_name,
    } = (await req.json()) as {
      items?: { product_id: string; quantity: number }[]
      dropoff_address?: string
      dropoff_location_id?: string | number
      dropoff_location_name?: string
    }

    if (!Array.isArray(items) || items.length === 0 || !dropoff_address?.trim()) {
      return NextResponse.json(
        { error: 'items and dropoff_address are required' },
        { status: 400 }
      )
    }

    if (!dropoff_location_id && !dropoff_location_name) {
      return NextResponse.json(
        { error: 'A delivery location must be selected' },
        { status: 400 }
      )
    }

    const productIds = items.map((i) => i.product_id).filter(Boolean)

    // Resolve the primary seller for this cart
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
      return NextResponse.json({
        options: null,
        error: 'Seller pickup address not configured. Contact the seller directly.',
      })
    }

    // Build the Dawurobo estimate payload
    const dropoffPayload: Record<string, unknown> = {
      address: dropoff_address.trim(),
      city: dropoff_location_name?.trim() || '',
    }
    if (dropoff_location_id !== undefined && dropoff_location_id !== null) {
      dropoffPayload.location_id = String(dropoff_location_id)
    }

    let estimate: DawuroboEstimate
    try {
      estimate = await dawuroboRequest<DawuroboEstimate>('POST', '/estimates', {
        pickup: { address: String(sellerProfile.address) },
        dropoff: dropoffPayload,
      })
    } catch (err: unknown) {
      console.error('[delivery/estimate-checkout] Dawurobo estimate error:', err instanceof Error ? err.message : err)
      return NextResponse.json({ options: [] })
    }

    const base = Math.max(0, Number(estimate.estimated_price) || 0)
    const mins = Math.max(10, Number(estimate.estimated_duration_minutes) || 30)

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
    console.error('[delivery/estimate-checkout] Unhandled error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ options: [] })
  }
}
