import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Auto-release payouts after 5 days if buyer hasn't confirmed delivery
 * This endpoint should be called by a cron job (e.g., EasyCron) daily
 */
export async function POST(req: Request) {
  try {
    // Validate secret
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.PAYOUT_DISPATCH_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find all pending payouts where scheduled_release_at is in the past
    const { data: payouts, error: fetchError } = await supabase
      .from('payouts')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_release_at', 'is', null)
      .lt('scheduled_release_at', new Date().toISOString())

    if (fetchError) {
      console.error('Failed to fetch pending payouts:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch pending payouts' },
        { status: 500 }
      )
    }

    if (!payouts || payouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No payouts to release',
        released: 0,
      })
    }

    const results = {
      total: payouts.length,
      released: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each payout
    for (const payout of payouts) {
      try {
        // Mark the trigger as auto-released
        await supabase
          .from('payouts')
          .update({ payout_trigger: 'auto_released' })
          .eq('id', payout.id)

        // Initiate the transfer
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/payouts/initiate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payout_id: payout.id }),
          }
        )

        if (response.ok) {
          results.released++

          // TODO: Notify buyer and seller
          // await queueBuyerNotification({
          //   userId: payout.buyer_id,
          //   message: `Funds have been automatically released to the seller. If you have an issue, contact support.`
          // })
          //
          // await queueSellerNotification({
          //   userId: payout.seller_id,
          //   message: `Your payout of GHS ${payout.payout_amount} has been automatically released.`
          // })
        } else {
          results.failed++
          const errorData = await response.json()
          results.errors.push(
            `Payout ${payout.id}: ${errorData.error || 'Unknown error'}`
          )
        }
      } catch (error) {
        results.failed++
        results.errors.push(
          `Payout ${payout.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-release completed: ${results.released} released, ${results.failed} failed`,
      ...results,
    })
  } catch (error) {
    console.error('Error in auto-release:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
