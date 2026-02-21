import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type CheckoutItemInput = {
  product_id: string
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
        quantity: Math.max(0, Math.floor(Number(item.quantity))),
      }))
      .filter((item) => item.product_id && item.quantity > 0)

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.product_id))]

    const { data: products, error: productsError } = await supabase
      .from('shop_products')
      .select('id, title, price, stock, status, shop_id')
      .in('id', productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const productById = new Map((products ?? []).map((product) => [product.id as string, product]))

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

      const unitPrice = Number(product.price)
      const currentStock = Number(product.stock)
      const status = String(product.status ?? '')

      if (status !== 'active') {
        throw new Error(`${product.title} is not available for checkout`)
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid price for ${product.title}`)
      }

      if (!Number.isFinite(currentStock) || currentStock < item.quantity) {
        throw new Error(`${product.title} does not have enough stock`)
      }

      totalAmount += unitPrice * item.quantity

      return {
        product_id: product.id,
        title: product.title,
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

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(totalAmount * 100),
        metadata: {
          type: 'shop_payment',
          user_id,
          buyer_email: email,
          delivery: deliveryPayload,
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
