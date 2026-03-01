import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { calculateDiscountAmount, resolveDiscountCode } from '@/lib/discounts'

type DiscountItemInput = {
  product_id: string
  variant_id?: string | null
  quantity: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { items, discount_code } = (await req.json()) as {
      items?: DiscountItemInput[]
      discount_code?: string
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const normalizedItems = items
      .map((item) => ({
        product_id: String(item.product_id || '').trim(),
        variant_id: item.variant_id ? String(item.variant_id).trim() : null,
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
      .select('id, title, price, stock, status')
      .in('id', productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const { data: variants, error: variantsError } = variantIds.length
      ? await supabase
          .from('shop_product_variants')
          .select('id, product_id, price, stock, is_active')
          .in('id', variantIds)
      : { data: [], error: null }

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 500 })
    }

    const productById = new Map((products ?? []).map((product) => [String(product.id), product]))
    const variantById = new Map((variants ?? []).map((variant) => [String(variant.id), variant]))

    let subtotal = 0

    for (const item of normalizedItems) {
      const product = productById.get(item.product_id)
      if (!product) {
        return NextResponse.json({ error: 'One or more products no longer exist' }, { status: 400 })
      }

      const variant = item.variant_id ? variantById.get(item.variant_id) : null

      if (String(product.status ?? '') !== 'active') {
        return NextResponse.json({ error: `${product.title} is not available for checkout` }, { status: 400 })
      }

      if (item.variant_id && !variant) {
        return NextResponse.json({ error: `${product.title} variant is not available` }, { status: 400 })
      }

      if (variant && String(variant.product_id) !== String(product.id)) {
        return NextResponse.json({ error: `${product.title} variant does not match product` }, { status: 400 })
      }

      if (variant && !Boolean(variant.is_active)) {
        return NextResponse.json({ error: `${product.title} variant is not active` }, { status: 400 })
      }

      const unitPrice = Number(variant ? variant.price : product.price)
      const currentStock = Number(variant ? variant.stock : product.stock)

      if (!Number.isFinite(currentStock) || currentStock < item.quantity) {
        return NextResponse.json({ error: `${product.title} does not have enough stock` }, { status: 400 })
      }

      subtotal += unitPrice * item.quantity
    }

    const discount = await resolveDiscountCode(supabase, discount_code)
    if (!discount.ok || !discount.row) {
      return NextResponse.json({ error: discount.error || 'Invalid discount code' }, { status: 400 })
    }

    const discountAmount = calculateDiscountAmount(subtotal, Number(discount.row.percent_off ?? 0))

    return NextResponse.json({
      code: discount.row.code,
      percent_off: Number(discount.row.percent_off),
      discount_amount: discountAmount,
      subtotal,
      subtotal_after_discount: Number((subtotal - discountAmount).toFixed(2)),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate discount code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
