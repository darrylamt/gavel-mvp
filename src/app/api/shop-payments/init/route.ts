import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type CheckoutItemInput = {
  product_id: string
  variant_id?: string | null
  variant_label?: string | null
  quantity: number
}

type DeliveryInput = {
  full_name?: string
  phone?: string
  address?: string
  city?: string
  notes?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { user_id, email, items, delivery } = (await req.json()) as {
      user_id?: string
      email?: string
      items?: CheckoutItemInput[]
      delivery?: DeliveryInput
    }

    if (!user_id || !email || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const deliveryPayload = {
      full_name: String(delivery?.full_name || '').trim(),
      phone: String(delivery?.phone || '').trim(),
      address: String(delivery?.address || '').trim(),
      city: String(delivery?.city || '').trim(),
      notes: String(delivery?.notes || '').trim(),
    }

    if (!deliveryPayload.full_name || !deliveryPayload.phone || !deliveryPayload.address || !deliveryPayload.city) {
      return NextResponse.json({ error: 'Delivery details are required' }, { status: 400 })
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json({ error: 'Site URL not configured' }, { status: 500 })
    }

    const normalizedItems = items
      .map((item) => ({
        product_id: String(item.product_id || '').trim(),
        variant_id: item.variant_id ? String(item.variant_id).trim() : null,
        variant_label: item.variant_label ? String(item.variant_label).trim() : null,
        quantity: Math.max(0, Math.floor(Number(item.quantity))),
      }))
      .filter((item) => item.product_id && item.quantity > 0)

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.product_id))]
    const variantIds = [...new Set(normalizedItems.map((item) => item.variant_id).filter((value): value is string => !!value))]

    const { data: products, error: productsError } = await supabase
      .from('shop_products')
      .select('id, title, price, stock, status, shop_id, shipping_profile_id')
      .in('id', productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const productById = new Map((products ?? []).map((product) => [product.id as string, product]))

    const { data: variants, error: variantsError } = variantIds.length
      ? await supabase
          .from('shop_product_variants')
          .select('id, product_id, color, size, price, stock, is_active')
          .in('id', variantIds)
      : { data: [], error: null }

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 500 })
    }

    const variantById = new Map((variants ?? []).map((variant) => [String(variant.id), variant]))

    const shopIds = Array.from(new Set((products ?? []).map((product) => String(product.shop_id || '')).filter(Boolean)))

    const { data: shops, error: shopsError } = shopIds.length
      ? await supabase
          .from('shops')
          .select('id, owner_id, name, payout_account_name, payout_account_number, payout_provider')
          .in('id', shopIds)
      : { data: [], error: null }

    if (shopsError) {
      return NextResponse.json({ error: shopsError.message }, { status: 500 })
    }

    const sellerIds = Array.from(new Set((shops ?? []).map((shop) => String(shop.owner_id || '')).filter(Boolean)))

    const { data: sellerProfiles, error: sellersError } = sellerIds.length
      ? await supabase.from('profiles').select('id, username, phone').in('id', sellerIds)
      : { data: [], error: null }

    if (sellersError) {
      return NextResponse.json({ error: sellersError.message }, { status: 500 })
    }

    const shopById = new Map((shops ?? []).map((shop) => [String(shop.id), shop]))
    const sellerById = new Map((sellerProfiles ?? []).map((seller) => [String(seller.id), seller]))

    let totalAmount = 0

    const paystackItems = normalizedItems.map((item) => {
      const product = productById.get(item.product_id)

      if (!product) {
        throw new Error('One or more products no longer exist')
      }

      const variant = item.variant_id ? variantById.get(item.variant_id) : null

      if (item.variant_id && !variant) {
        throw new Error(`${product.title} variant is not available`)
      }

      if (variant && String(variant.product_id) !== String(product.id)) {
        throw new Error(`${product.title} variant does not match product`)
      }

      const unitPrice = Number(variant ? variant.price : product.price)
      const currentStock = Number(variant ? variant.stock : product.stock)
      const status = String(product.status ?? '')
      const variantActive = variant ? Boolean(variant.is_active) : true

      if (status !== 'active') {
        throw new Error(`${product.title} is not available for checkout`)
      }

      if (!variantActive) {
        throw new Error(`${product.title} variant is not active`)
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid price for ${product.title}`)
      }

      if (!Number.isFinite(currentStock) || currentStock < item.quantity) {
        throw new Error(`${product.title} does not have enough stock`)
      }

      totalAmount += unitPrice * item.quantity

      const variantLabel = variant
        ? [variant.color, variant.size].filter((value): value is string => !!value && value.trim().length > 0).join(' / ')
        : ''

      const resolvedVariantLabel = variantLabel || item.variant_label || null

      const title = resolvedVariantLabel ? `${product.title} (${resolvedVariantLabel})` : product.title

      return {
        product_id: product.id,
        variant_id: variant ? String(variant.id) : null,
        variant_label: resolvedVariantLabel,
        title,
        quantity: item.quantity,
        unit_price: unitPrice,
        seller_id: String(shopById.get(String(product.shop_id || ''))?.owner_id || ''),
        seller_name: String(
          sellerById.get(String(shopById.get(String(product.shop_id || ''))?.owner_id || ''))?.username ||
            'Seller'
        ),
        seller_phone: String(
          sellerById.get(String(shopById.get(String(product.shop_id || ''))?.owner_id || ''))?.phone || ''
        ),
        seller_shop_name: String(shopById.get(String(product.shop_id || ''))?.name || ''),
        seller_payout_account_name: String(shopById.get(String(product.shop_id || ''))?.payout_account_name || ''),
        seller_payout_account_number: String(shopById.get(String(product.shop_id || ''))?.payout_account_number || ''),
        seller_payout_provider: String(shopById.get(String(product.shop_id || ''))?.payout_provider || ''),
      }
    })

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid checkout total' }, { status: 400 })
    }

    // --- PHASE 2: SERVER-SIDE SHIPPING FEE ENFORCEMENT ---
    // 1. Fetch city and region
    const { data: cityRow, error: cityError } = await supabase
      .from('cities')
      .select('id, name, region_id, region:regions(id, name)')
      .eq('name', deliveryPayload.city)
      .single();
    if (cityError || !cityRow) {
      return NextResponse.json({ error: 'Delivery city not found' }, { status: 400 });
    }
    const delivery_city_id = cityRow.id;
    const delivery_region_id = cityRow.region_id;

    // 2. Fetch shipping profiles for all products
    const { data: shippingProfiles, error: shippingProfilesError } = await supabase
      .from('shipping_profiles')
      .select('id, free_shipping_threshold')
      .in('id', (products ?? []).map((p: any) => p.shipping_profile_id).filter(Boolean));
    if (shippingProfilesError) {
      return NextResponse.json({ error: shippingProfilesError.message }, { status: 500 });
    }
    const shippingProfileById = new Map((shippingProfiles ?? []).map((sp: any) => [sp.id, sp]));

    // 3. Fetch shipping rates for all profiles/city
    const shippingProfileIds = (products ?? []).map((p: any) => p.shipping_profile_id).filter(Boolean);
    const { data: shippingRates, error: shippingRatesError } = await supabase
      .from('shipping_rates')
      .select('id, shipping_profile_id, city_id, price, delivery_estimate_min_days, delivery_estimate_max_days')
      .in('shipping_profile_id', shippingProfileIds)
      .eq('city_id', delivery_city_id);
    if (shippingRatesError) {
      return NextResponse.json({ error: shippingRatesError.message }, { status: 500 });
    }
    const shippingRateByProfile = new Map((shippingRates ?? []).map((r: any) => [r.shipping_profile_id, r]));

    // 4. Calculate delivery fee per item and sum
    let totalDeliveryFee = 0;
    const deliveryFees: any[] = [];
    for (const item of normalizedItems) {
      const product = productById.get(item.product_id);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 });
      const shipping_profile_id = (product as any).shipping_profile_id;
      if (!shipping_profile_id) return NextResponse.json({ error: 'Product missing shipping profile' }, { status: 400 });
      const shippingProfile = shippingProfileById.get(shipping_profile_id);
      if (!shippingProfile) return NextResponse.json({ error: 'Shipping profile not found' }, { status: 400 });
      const shippingRate = shippingRateByProfile.get(shipping_profile_id);
      if (!shippingRate) return NextResponse.json({ error: 'No shipping rate for this city' }, { status: 400 });
      // Apply free shipping threshold
      const itemTotal = (item.quantity || 1) * Number(product.price);
      let fee = Number(shippingRate.price);
      if (shippingProfile.free_shipping_threshold && itemTotal >= Number(shippingProfile.free_shipping_threshold)) {
        fee = 0;
      }
      totalDeliveryFee += fee;
      deliveryFees.push({
        product_id: product.id,
        shipping_profile_id,
        shipping_rate_id: shippingRate.id,
        delivery_fee: fee,
        delivery_estimate_min_days: shippingRate.delivery_estimate_min_days,
        delivery_estimate_max_days: shippingRate.delivery_estimate_max_days,
      });
    }

    // Add delivery fee to total amount
    const grandTotal = totalAmount + totalDeliveryFee;

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(grandTotal * 100),
        metadata: {
          type: 'shop_payment',
          user_id,
          buyer_email: email,
          delivery: {
            ...deliveryPayload,
            delivery_region_id,
            delivery_city_id,
            delivery_fees: deliveryFees,
            total_delivery_fee: totalDeliveryFee,
          },
          items: paystackItems,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?type=shop`,
      }),
    })

    const json = await initRes.json()

    if (!json.status || !json.data?.authorization_url) {
      return NextResponse.json({ error: json.message || 'Paystack init failed' }, { status: 500 })
    }

    return NextResponse.json(json.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initialize checkout payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
