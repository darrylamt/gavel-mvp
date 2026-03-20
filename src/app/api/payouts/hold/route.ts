import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queuePayoutHeldNotification } from '@/lib/arkesel/events'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Admin endpoint to place a hold on a pending payout
 */
export async function POST(req: Request) {
  try {
    const { payout_id, hold_reason, admin_id } = await req.json()

    if (!payout_id || !hold_reason || !admin_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify admin
    const { data: admin } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', admin_id)
      .single()

    if (!admin?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      )
    }

    // Fetch payout
    const { data: payout, error: fetchError } = await supabase
      .from('payouts')
      .select('*, seller_id')
      .eq('id', payout_id)
      .single()

    if (fetchError || !payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Can only hold pending payouts
    if (payout.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot hold payout with status: ${payout.status}` },
        { status: 400 }
      )
    }

    // Update payout to on_hold
    const { error: updateError } = await supabase
      .from('payouts')
      .update({
        status: 'on_hold',
        hold_reason,
        held_by: admin_id,
        held_at: new Date().toISOString(),
      })
      .eq('id', payout_id)

    if (updateError) {
      console.error('Failed to hold payout:', updateError)
      return NextResponse.json(
        { error: 'Failed to hold payout' },
        { status: 500 }
      )
    }

    await queuePayoutHeldNotification({ sellerUserId: payout.seller_id })

    return NextResponse.json({
      success: true,
      message: 'Payout placed on hold',
    })
  } catch (error) {
    console.error('Error holding payout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
