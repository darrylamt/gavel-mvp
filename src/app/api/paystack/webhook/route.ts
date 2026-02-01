import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import 'server-only'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const auction_id = event.data?.metadata?.auction_id

    if (auction_id) {
      await supabase
        .from('auctions')
        .update({ paid: true })
        .eq('id', auction_id)
    }
  }

  return NextResponse.json({ received: true })
}
