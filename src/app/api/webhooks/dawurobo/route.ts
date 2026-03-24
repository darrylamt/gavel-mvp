import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { verifyDawuroboWebhook } from '@/lib/dawurobo'
import { queueShopNotifications } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map Dawurobo statuses to buyer-facing SMS events
const SMS_TRIGGER_STATUSES = new Set(['picked_up', 'in_transit', 'delivered', 'failed'])

const STATUS_DESCRIPTIONS: Record<string, string> = {
  assigned: 'A rider has been assigned to your delivery.',
  picked_up: 'Your order has been picked up and is on its way.',
  in_transit: 'Your order is in transit to your address.',
  delivered: 'Your order has been delivered.',
  failed: 'Delivery attempt failed. Our team will contact you.',
  returned: 'Your order has been returned to the sender.',
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-dawurobo-signature') ?? ''

  if (!verifyDawuroboWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dawuroboOrderId = event.order_id as string | undefined
  const newStatus = event.status as string | undefined
  const eventTimestamp = (event.timestamp as string | undefined) ?? new Date().toISOString()

  if (!dawuroboOrderId || !newStatus) {
    return NextResponse.json({ received: true })
  }

  // Look up the shop order
  const { data: order } = await supabase
    .from('shop_orders')
    .select('id, user_id')
    .eq('dawurobo_order_id', dawuroboOrderId)
    .maybeSingle()

  if (!order) {
    // Unknown order — still acknowledge
    return NextResponse.json({ received: true })
  }

  // Update order's Dawurobo status
  await supabase
    .from('shop_orders')
    .update({ dawurobo_status: newStatus })
    .eq('id', order.id)

  // Log delivery event
  await supabase.from('delivery_events').insert({
    order_id: order.id,
    status: newStatus,
    description: STATUS_DESCRIPTIONS[newStatus] ?? newStatus,
    timestamp: eventTimestamp,
    raw_payload: event,
  })

  // Send SMS to buyer for key status transitions
  if (SMS_TRIGGER_STATUSES.has(newStatus) && order.user_id) {
    const smsType =
      newStatus === 'delivered'
        ? 'order_delivered'
        : newStatus === 'in_transit' || newStatus === 'picked_up'
        ? 'order_shipped'
        : null

    if (smsType) {
      // Get first item title for the notification
      const { data: items } = await supabase
        .from('shop_order_items')
        .select('title_snapshot')
        .eq('order_id', order.id)
        .limit(1)

      const productTitle = items?.[0]?.title_snapshot ?? 'your order'

      await queueShopNotifications({
        userId: order.user_id,
        type: smsType,
        productTitle,
      }).catch(() => {
        // Non-fatal — don't fail the webhook if SMS queuing fails
      })
    }
  }

  return NextResponse.json({ received: true })
}
