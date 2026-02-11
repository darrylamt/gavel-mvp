import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { auctionId } = body

    if (!auctionId) {
      return NextResponse.json({ error: 'auctionId required' }, { status: 400 })
    }

    const { error } = await adminClient.from('auctions').delete().eq('id', auctionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
