import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { verifyDawuroboWebhook } from '@/lib/dawurobo'
import { queueShopNotifications } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SMS_TRIGGER_STATUSES = new Set(['picked_up', 'in_transit', 'delivered', 'failed'])

const STATUS_DESCRIPTIONS: Record<string, string> = {
  order_created: 'Your delivery order has been created.',
  accepted: 'Your delivery order has been accepted.',
  rejected: 'Your delivery order was rejected.',
  received: 'Your package has been received at the facility.',
  assigned: 'A rider has been assigned to your delivery.',
  picked_up: 'Your order has been picked up and is on its way.',
  in_transit: 'Your order is in transit to your address.',
  delivered: 'Your order has been delivered.',
  failed: 'Delivery attempt failed. Our team will contact you.',
  cancelled: 'Your delivery has been cancelled.',
  rescheduled: 'Your delivery has been rescheduled.',
  returned: 'Your order has been returned to the sender.',
  returned_to_vendor: 'Your order has been returned to the vendor.',
  refunded: 'A refund has been initiated for your order.',
  updated: 'Your delivery details have been updated.',
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Webhook-Signature') || ''
  console.log(JSON.stringify({ dwh_body: rawBody.slice(0, 200), dwh_bodyLen: rawBody.length }))

  if (!verifyDawuroboWebhook(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const orderData = payload.order_data as Record<string, unknown> | undefined
  const dawuroboOrderId = orderData?.order_id as string | undefined
  const newStatus = orderData?.status as string | undefined
  const eventTimestamp = (payload.timestamp as string | undefined) ?? new Date().toISOString()

  if (!dawuroboOrderId || !newStatus) {
    return Response.json({ received: true })
  }

  const { data: order } = await supabase
    .from('shop_orders')
    .select('id, user_id')
    .eq('dawurobo_order_id', dawuroboOrderId)
    .maybeSingle()

  if (!order) {
    return Response.json({ received: true })
  }

  await supabase
    .from('shop_orders')
    .update({ dawurobo_status: newStatus })
    .eq('id', order.id)

  await supabase.from('delivery_events').insert({
    order_id: order.id,
    status: newStatus,
    description: STATUS_DESCRIPTIONS[newStatus] ?? newStatus,
    timestamp: eventTimestamp,
    raw_payload: payload,
  })

  if (SMS_TRIGGER_STATUSES.has(newStatus) && order.user_id) {
    const smsType =
      newStatus === 'delivered'
        ? 'order_delivered'
        : newStatus === 'in_transit' || newStatus === 'picked_up'
        ? 'order_shipped'
        : null

    if (smsType) {
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
      }).catch(() => {})
    }
  }

  return Response.json({ received: true })
}
