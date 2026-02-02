import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const { reference } = await req.json()

  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  const verifyData = await verifyRes.json()

  if (!verifyData.status || verifyData.data.status !== 'success') {
    return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
  }

  const auctionId = verifyData.data.metadata.auction_id

  if (!auctionId) {
    return NextResponse.json({ error: 'Missing auction ID' }, { status: 400 })
  }

  // Mark auction as paid
  const { error } = await supabase
    .from('auctions')
    .update({ paid: true })
    .eq('id', auctionId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update auction' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
