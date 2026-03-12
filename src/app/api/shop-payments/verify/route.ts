import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueShopOrderPaidNotifications } from '@/lib/arkesel/events'
import { sendNotificationEmail } from '@/lib/resend-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { reference } = (await req.json()) as { reference?: string }

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const json = await res.json()

    if (!json.status || json?.data?.status !== 'success') {
      return NextResponse.json({ error: 'Paystack verification failed' }, { status: 400 })
    }

    if (json?.data?.metadata?.type !== 'shop_payment') {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    const metadata = json.data.metadata as {
      user_id?: string
      buyer_email?: string
      delivery?: {
        full_name?: string
        phone?: string
        address?: string
        city?: string
        notes?: string
      }
      discount?: {
        code?: string | null
        percent_off?: number | null
        amount?: number | null
      }
      items?: Array<{
        product_id: string
        variant_id?: string | null
        variant_label?: string | null
        seller_id?: string | null
        title: string
        quantity: number
        unit_price: number
      }>
    }

    if (!metadata?.user_id || !Array.isArray(metadata.items) || metadata.items.length === 0) {
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    const paidAmount = Number(json.data.amount) / 100
    const paystackCustomerEmail = String(json?.data?.customer?.email || '').trim()
    let buyerAuthUser: { email?: string | null } | null = null
    let buyerEmail = String(metadata.buyer_email || '').trim() || paystackCustomerEmail || null

    if (!buyerEmail && metadata.user_id) {
      const { data: buyerAuthLookup } = await supabase.auth.admin.getUserById(metadata.user_id)
      buyerAuthUser = buyerAuthLookup.user
        ? { email: buyerAuthLookup.user.email ?? null }
        : null
      buyerEmail = String(buyerAuthUser?.email || '').trim() || null
    }

    const { data: orderId, error: processError } = await supabase.rpc('process_shop_payment', {
      p_reference: String(json.data.reference),
      p_user_id: metadata.user_id,
      p_total_amount: paidAmount,
      p_items: metadata.items,
      p_delivery: metadata.delivery ?? {},
      p_buyer_email: buyerEmail,
    })

    if (processError) {
      const message = String(processError.message || '')
      const lowerMessage = message.toLowerCase()

      if (lowerMessage.includes('process_shop_payment')) {
        return NextResponse.json(
          { error: 'Shop checkout migration missing. Run the latest SQL migrations, especially 20260312_shop_checkout_schema_reconcile.sql, then retry verification.' },
          { status: 500 }
        )
      }

      if (lowerMessage.includes('paystack_reference') && lowerMessage.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch: paystack_reference missing on payments/shop_orders. Run 20260312_shop_checkout_schema_reconcile.sql and retry.' },
          { status: 500 }
        )
      }

      if (lowerMessage.includes('null value in column "email"') && lowerMessage.includes('shop_orders')) {
        return NextResponse.json(
          { error: 'Database schema mismatch: shop_orders.email is required. Run 20260312_shop_checkout_schema_reconcile.sql and retry.' },
          { status: 500 }
        )
      }

      if (lowerMessage.includes('title_snapshot') && lowerMessage.includes('shop_order_items') && lowerMessage.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch: shop_order_items.title_snapshot missing. Run 20260312_shop_checkout_schema_reconcile.sql and retry.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: message || 'Failed to process shop payment' }, { status: 500 })
    }

    const paymentReference = String(json.data.reference)
    const discountCode = String(metadata.discount?.code || '').trim().toUpperCase()
    const discountPercent = Number(metadata.discount?.percent_off ?? 0)
    const discountAmount = Math.max(0, Number(metadata.discount?.amount ?? 0))
    const orderSubtotal = (metadata.items ?? []).reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
      0
    )

    let existingPayment: { id: string } | null = null

    const { data: existingByPaystackRef, error: existingByPaystackRefError } = await supabase
      .from('payments')
      .select('id')
      .eq('paystack_reference', paymentReference)
      .maybeSingle()

    const selectErrorMessage = String(existingByPaystackRefError?.message || '').toLowerCase()
    if (selectErrorMessage.includes('paystack_reference') && selectErrorMessage.includes('does not exist')) {
      const { data: existingByReference } = await supabase
        .from('payments')
        .select('id')
        .eq('reference', paymentReference)
        .maybeSingle()
      existingPayment = (existingByReference as { id: string } | null) ?? null
    } else {
      existingPayment = (existingByPaystackRef as { id: string } | null) ?? null
    }

    if (!existingPayment) {
      const paymentPayloadBase = {
        user_id: metadata.user_id,
        amount: paidAmount,
        status: 'success',
      }

      let { error: paymentLogError } = await supabase.from('payments').insert({
        ...paymentPayloadBase,
        paystack_reference: paymentReference,
      })

      const insertErrorMessage = String(paymentLogError?.message || '').toLowerCase()
      if (insertErrorMessage.includes('paystack_reference') && insertErrorMessage.includes('does not exist')) {
        const fallback = await supabase.from('payments').insert({
          ...paymentPayloadBase,
          reference: paymentReference,
        })
        paymentLogError = fallback.error
      }

      if (paymentLogError) {
        return NextResponse.json({ error: paymentLogError.message }, { status: 500 })
      }
    }

    const sellerIds = Array.from(
      new Set(
        (metadata.items ?? [])
          .map((item) => String(item.seller_id || '').trim())
          .filter((value) => value.length > 0)
      )
    )

    if (orderId && metadata.user_id) {
      if (discountCode && discountAmount > 0) {
        const { data: discountRow } = await supabase
          .from('discount_codes')
          .select('id')
          .eq('code', discountCode)
          .maybeSingle()

        const discountId = String((discountRow as { id?: string } | null)?.id || '')

        if (discountId) {
          const usageUpsert = await supabase
            .from('discount_code_usages')
            .upsert(
              {
                discount_code_id: discountId,
                user_id: metadata.user_id,
                paystack_reference: paymentReference,
                shop_order_id: String(orderId),
                discount_amount: discountAmount,
                order_subtotal: Math.max(0, orderSubtotal),
              },
              {
                onConflict: 'paystack_reference',
                ignoreDuplicates: true,
              }
            )
            .select('id')
            .maybeSingle()

          if (!usageUpsert.error && usageUpsert.data) {
            const { data: currentDiscount } = await supabase
              .from('discount_codes')
              .select('used_count')
              .eq('id', discountId)
              .single()

            await supabase
              .from('discount_codes')
              .update({ used_count: Number((currentDiscount as { used_count?: number } | null)?.used_count ?? 0) + 1 })
              .eq('id', discountId)
          }
        }

        await supabase
          .from('shop_orders')
          .update({
            discount_code: discountCode,
            discount_percent: Number.isFinite(discountPercent) && discountPercent > 0 ? discountPercent : null,
            discount_amount: discountAmount,
          })
          .eq('id', String(orderId))
      }

      await queueShopOrderPaidNotifications({
        buyerUserId: metadata.user_id,
        orderId: String(orderId),
        totalAmount: paidAmount,
        sellerIds,
      })

      // Send order confirmation email
      if (!buyerAuthUser) {
        const { data: buyerAuthLookup } = await supabase.auth.admin.getUserById(metadata.user_id)
        buyerAuthUser = buyerAuthLookup.user
          ? { email: buyerAuthLookup.user.email ?? null }
          : null
      }
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', metadata.user_id)
        .single()

      if (buyerAuthUser?.email) {
        const deliveryAddress = [
          metadata.delivery?.address,
          metadata.delivery?.city,
        ]
          .filter(Boolean)
          .join(', ') || 'Not provided'

        const deliveryLocation = metadata.delivery?.city || 'Not specified'

        await sendNotificationEmail(buyerAuthUser.email, 'orderConfirmation', {
          userName: buyerProfile?.username || metadata.delivery?.full_name || buyerAuthUser.email.split('@')[0] || 'there',
          orderRef: paymentReference,
          total: paidAmount,
          items: metadata.items.map((item) => ({
            name: item.variant_label ? `${item.title} (${item.variant_label})` : item.title,
            quantity: item.quantity,
            price: item.unit_price * item.quantity,
          })),
          deliveryAddress,
          deliveryLocation,
          estimatedDelivery: undefined,
        })
      }

      // Create payout records for each seller (escrow with 5-day hold)
      const sellerPayouts = new Map<string, { items: typeof metadata.items, totalAmount: number }>()

      // Group items by seller and calculate totals
      for (const item of metadata.items) {
        if (!item.seller_id) continue

        const sellerId = String(item.seller_id)
        const itemTotal = Number(item.unit_price) * Number(item.quantity)

        if (!sellerPayouts.has(sellerId)) {
          sellerPayouts.set(sellerId, { items: [], totalAmount: 0 })
        }

        const sellerData = sellerPayouts.get(sellerId)!
        sellerData.items.push(item)
        sellerData.totalAmount += itemTotal
      }

      // Create payout for each seller
      for (const [sellerId, sellerData] of sellerPayouts) {
        // For fixed price items, 10% commission already added on top
        // So seller receives full listed price (100%), we keep 10% of that as commission
        const grossAmount = sellerData.totalAmount // Total paid by buyer
        const payoutAmount = grossAmount / 1.1 // Seller's original price (remove the 10% markup)
        const commissionAmount = grossAmount - payoutAmount // Our 10% commission

        // Get seller's default payout account
        const { data: payoutAccount } = await supabase
          .from('seller_payout_accounts')
          .select('recipient_code')
          .eq('seller_id', sellerId)
          .eq('is_default', true)
          .maybeSingle()

        if (payoutAccount?.recipient_code) {
          const scheduledRelease = new Date()
          scheduledRelease.setDate(scheduledRelease.getDate() + 5) // 5 days from now

          const { error: payoutError } = await supabase.from('payouts').insert({
            order_id: String(orderId),
            seller_id: sellerId,
            buyer_id: metadata.user_id,
            gross_amount: grossAmount,
            commission_amount: commissionAmount,
            payout_amount: payoutAmount,
            recipient_code: payoutAccount.recipient_code,
            status: 'pending',
            scheduled_release_at: scheduledRelease.toISOString(),
          })

          if (payoutError) {
            console.error('Failed to create payout record for seller:', sellerId, payoutError)
          } else {
            console.log('Payout record created for seller:', sellerId, 'order:', orderId)
          }
        } else {
          console.warn('No default payout account found for seller:', sellerId)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
