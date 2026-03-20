import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { initiateTransfer } from '@/lib/paystack-transfer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Initiate a payout transfer to seller
 * Called when buyer confirms delivery or 5-day auto-release triggers
 */
export async function POST(req: Request) {
  try {
    const { payout_id } = await req.json()

    if (!payout_id) {
      return NextResponse.json(
        { error: 'Missing payout_id' },
        { status: 400 }
      )
    }

    // Fetch payout details
    const { data: payout, error: fetchError } = await supabase
      .from('payouts')
      .select('*')
      .eq('id', payout_id)
      .single()

    if (fetchError || !payout) {
      console.error('Failed to fetch payout:', fetchError)
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Check if payout is on hold
    if (payout.status === 'on_hold') {
      return NextResponse.json(
        { error: 'Payout is on hold. Admin must release it first.' },
        { status: 400 }
      )
    }

    // Check if already processed
    if (payout.status === 'success') {
      return NextResponse.json(
        { message: 'Payout already processed' },
        { status: 200 }
      )
    }

    // Check if already processing
    if (payout.status === 'processing') {
      return NextResponse.json(
        { message: 'Payout is already being processed' },
        { status: 200 }
      )
    }

    // Mark as processing
    await supabase
      .from('payouts')
      .update({ status: 'processing' })
      .eq('id', payout_id)

    try {
      // Generate unique reference
      const reference = `payout_${payout_id}_${Date.now()}`

      // Get item description for reason
      let reason = 'Seller payout'
      if (payout.order_id) {
        reason = `Shop order payout - Order ${payout.order_id.slice(0, 8)}`
      } else if (payout.auction_id) {
        reason = `Auction payout - Auction ${payout.auction_id.slice(0, 8)}`
      }

      // Initiate transfer on Paystack
      const transferResponse = await initiateTransfer(
        payout.recipient_code,
        payout.payout_amount,
        reason,
        reference
      )

      if (!transferResponse.data?.transfer_code) {
        throw new Error('Invalid transfer response from Paystack')
      }

      // Update payout with transfer details
      const { error: updateError } = await supabase
        .from('payouts')
        .update({
          transfer_code: transferResponse.data.transfer_code,
          released_at: new Date().toISOString(),
        })
        .eq('id', payout_id)

      if (updateError) {
        console.error('Failed to update payout with transfer code:', payout_id, updateError)
      }

      return NextResponse.json({
        success: true,
        data: {
          transfer_code: transferResponse.data.transfer_code,
          reference,
        },
      })
    } catch (transferError) {
      console.error('Transfer failed:', transferError)

      // Mark as failed
      await supabase
        .from('payouts')
        .update({
          status: 'failed',
        })
        .eq('id', payout_id)

      return NextResponse.json(
        {
          error:
            transferError instanceof Error
              ? transferError.message
              : 'Transfer failed',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error initiating payout:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
