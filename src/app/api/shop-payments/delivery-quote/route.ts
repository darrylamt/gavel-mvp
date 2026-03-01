import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type QuoteItemInput = {
  product_id: string
  quantity: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { user_id, items, delivery_location } = (await req.json()) as {
      user_id?: string
      items?: QuoteItemInput[]
      delivery_location?: string
    }

    if (!user_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedItems = items
      .map((item) => ({
        product_id: String(item.product_id || '').trim(),
        quantity: Math.max(0, Math.floor(Number(item.quantity))),
      }))
      .filter((item) => item.product_id && item.quantity > 0)

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const { data: buyerProfile, error: buyerProfileError } = await supabase
      .from('profiles')
      .select('id, delivery_location')
      .eq('id', user_id)
      .maybeSingle()

    if (buyerProfileError) {
      return NextResponse.json({ error: buyerProfileError.message }, { status: 500 })
    }

    const buyerLocation = String(
      delivery_location ||
      ((buyerProfile as { delivery_location?: string | null } | null)?.delivery_location ?? '')
    ).trim()

    if (!buyerLocation) {
      return NextResponse.json(
        { error: 'Please set your default delivery location in your profile.' },
        { status: 400 }
      )
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.product_id))]

    const { data: products, error: productsError } = await supabase
      .from('shop_products')
      .select('id, title, status, shop_id')
      .in('id', productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const productById = new Map((products ?? []).map((product) => [String(product.id), product]))

    for (const item of normalizedItems) {
      const product = productById.get(item.product_id)
      if (!product) {
        return NextResponse.json({ error: 'One or more products no longer exist' }, { status: 400 })
      }

      if (String(product.status ?? '') !== 'active') {
        return NextResponse.json({ error: `${product.title} is not available for checkout` }, { status: 400 })
      }
    }

    const shopIds = Array.from(
      new Set((products ?? []).map((product) => String(product.shop_id || '')).filter(Boolean))
    )

    const { data: shops, error: shopsError } = shopIds.length
      ? await supabase.from('shops').select('id, owner_id').in('id', shopIds)
      : { data: [], error: null }

    if (shopsError) {
      return NextResponse.json({ error: shopsError.message }, { status: 500 })
    }

    const sellerIds = Array.from(
      new Set((shops ?? []).map((shop) => String(shop.owner_id || '')).filter(Boolean))
    )

    const { data: sellers, error: sellersError } = sellerIds.length
      ? await supabase.from('profiles').select('id, username').in('id', sellerIds)
      : { data: [], error: null }

    if (sellersError) {
      return NextResponse.json({ error: sellersError.message }, { status: 500 })
    }

    const sellerById = new Map((sellers ?? []).map((seller) => [String(seller.id), seller]))

    // Extract region for fallback matching (e.g., "Greater Accra:Osu" -> "Greater Accra")
    const buyerRegion = buyerLocation.includes(':') ? buyerLocation.split(':')[0] : ''
    const regionalFallback = buyerRegion === 'Greater Accra' 
      ? 'Greater Accra:Greater Accra (All)'
      : buyerRegion === 'Ashanti'
      ? 'Ashanti:Kumasi (All)'
      : ''

    // Query for zones matching either exact location OR regional fallback
    const locationValues = regionalFallback ? [buyerLocation, regionalFallback] : [buyerLocation]

    const { data: matchedZones, error: zonesError } = sellerIds.length
      ? await supabase
          .from('seller_delivery_zones')
          .select('seller_id, location_value, delivery_price, delivery_time_days')
          .in('seller_id', sellerIds)
          .eq('is_enabled', true)
          .in('location_value', locationValues)
      : { data: [], error: null }

    if (zonesError) {
      return NextResponse.json({ error: zonesError.message }, { status: 500 })
    }

    // Build map prioritizing exact match over regional fallback
    const zoneBySeller = new Map<string, typeof matchedZones extends (infer U)[] ? U : never>()
    for (const zone of matchedZones ?? []) {
      const sellerId = String(zone.seller_id)
      const existing = zoneBySeller.get(sellerId)
      
      // Prioritize exact location match over regional fallback
      if (!existing || (zone.location_value === buyerLocation && existing.location_value !== buyerLocation)) {
        zoneBySeller.set(sellerId, zone)
      }
    }

    const unsupportedSellers = sellerIds
      .filter((sellerId) => !zoneBySeller.has(sellerId))
      .map((sellerId) => ({
        seller_id: sellerId,
        seller_name: String(sellerById.get(sellerId)?.username || 'Seller'),
      }))

    const deliveryFees = sellerIds
      .map((sellerId) => {
        const zone = zoneBySeller.get(sellerId)
        if (!zone) return null

        return {
          seller_id: sellerId,
          seller_name: String(sellerById.get(sellerId)?.username || 'Seller'),
          location_value: String(zone.location_value),
          delivery_price: Number(zone.delivery_price ?? 0),
          delivery_time_days: Number(zone.delivery_time_days ?? 0),
        }
      })
      .filter(
        (fee): fee is {
          seller_id: string
          seller_name: string
          location_value: string
          delivery_price: number
          delivery_time_days: number
        } => !!fee
      )

    const totalDeliveryFee = deliveryFees.reduce((sum, fee) => sum + Number(fee.delivery_price || 0), 0)
    const estimatedDeliveryTimeDays = deliveryFees.reduce(
      (max, fee) => Math.max(max, Number(fee.delivery_time_days || 0)),
      0
    )

    return NextResponse.json({
      delivery_location: buyerLocation,
      delivery_fees: deliveryFees,
      total_delivery_fee: totalDeliveryFee,
      estimated_delivery_time_days: estimatedDeliveryTimeDays || null,
      unsupported_sellers: unsupportedSellers,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate delivery quote'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
