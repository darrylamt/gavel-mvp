import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

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
      items?: Array<{
        product_id: string
        title: string
        quantity: number
        unit_price: number
      }>
    }

    if (!metadata?.user_id || !Array.isArray(metadata.items) || metadata.items.length === 0) {
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    const paidAmount = Number(json.data.amount) / 100

    const { error: processError } = await supabase.rpc('process_shop_payment', {
      p_reference: String(json.data.reference),
      p_user_id: metadata.user_id,
      p_total_amount: paidAmount,
      p_items: metadata.items,
    })

    if (processError) {
      const message = String(processError.message || '')
      if (message.toLowerCase().includes('process_shop_payment')) {
        return NextResponse.json(
          { error: 'Shop checkout migration missing. Run the latest SQL migration, then retry verification.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: message || 'Failed to process shop payment' }, { status: 500 })
    }

    const paymentReference = String(json.data.reference)

    let existingPayment: { id: string } | null = null

    const { data: existingByPaystackRef, error: existingByPaystackRefError } = await supabase
      .from('payments')
      .select('id')
      .eq('paystack_reference', paymentReference)
      .maybeSingle()

    if (existingByPaystackRefError?.message?.toLowerCase().includes('column "paystack_reference" does not exist')) {
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

      if (paymentLogError?.message?.toLowerCase().includes('column "paystack_reference" does not exist')) {
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

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
