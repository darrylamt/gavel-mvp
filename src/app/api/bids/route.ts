import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: Request) {
  const { auction_id, amount, user_id } = await req.json()

  if (!auction_id || !amount || !user_id) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  /* ---------------- 1️⃣ Fetch auction ---------------- */

const { data: auction } = await supabase
  .from('auctions')
  .select('status, ends_at')
  .eq('id', auction_id)
  .single()

if (!auction) {
  return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
}

if (
  auction.status === 'ended' ||
  new Date(auction.ends_at).getTime() <= Date.now()
) {
  return NextResponse.json(
    { error: 'Auction has ended' },
    { status: 400 }
  )
}

  /* ---------------- 2️⃣ Fetch token balance ---------------- */

  const { data: profile } = await supabase
    .from('profiles')
    .select('token_balance')
    .eq('id', user_id)
    .single()

  if (!profile || profile.token_balance < 1) {
    return NextResponse.json(
      { error: 'Not enough tokens to place bid' },
      { status: 403 }
    )
  }

  /* ---------------- 3️⃣ Create bid ---------------- */

  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .insert({
      auction_id,
      amount,
      user_id,
    })
    .select()
    .single()

  if (bidError) {
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    )
  }

  /* ---------------- 4️⃣ Deduct token ---------------- */

  const { error: tokenError } = await supabase
    .from('profiles')
    .update({
      token_balance: profile.token_balance - 1,
    })
    .eq('id', user_id)

  if (tokenError) {
    // rollback bid (VERY IMPORTANT)
    await supabase.from('bids').delete().eq('id', bid.id)

    return NextResponse.json(
      { error: 'Failed to deduct token' },
      { status: 500 }
    )
  }

  /* ---------------- 5️⃣ Update auction price ---------------- */

  await supabase
    .from('auctions')
    .update({ current_price: amount })
    .eq('id', auction_id)

  return NextResponse.json({ success: true })
}
