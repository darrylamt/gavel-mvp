import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { sendNotificationEmail } from '@/lib/resend-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

type AuctionForReminder = {
  id: string
  title: string
  winner_id: string
  current_price: number
  auction_payment_due_at: string
}

/**
 * Cron job endpoint to send payment reminder emails to auction winners
 * Should be called periodically (e.g., every hour) via Vercel Cron or similar
 * 
 * Authorization: Add CRON_SECRET to env and check it in production
 */
export async function POST(request: Request) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Find auctions with unpaid winners where payment is due within 24 hours
  const { data: auctions, error } = await supabase
    .from('auctions')
    .select('id, title, winner_id, current_price, auction_payment_due_at')
    .eq('status', 'ended')
    .eq('paid', false)
    .not('winner_id', 'is', null)
    .not('auction_payment_due_at', 'is', null)
    .lte('auction_payment_due_at', in24Hours.toISOString())
    .returns<AuctionForReminder[]>()

  if (error) {
    console.error('[Payment Reminders] Error fetching auctions:', error)
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
  }

  if (!auctions || auctions.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: 'No auctions requiring payment reminders',
      sent: 0 
    })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
  const results = await Promise.allSettled(
    auctions.map(async (auction) => {
      try {
        // Get winner's email from auth
        const { data: { user: winnerAuth } } = await supabase.auth.admin.getUserById(auction.winner_id)
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', auction.winner_id)
          .single()

        if (!winnerAuth?.email) {
          console.warn(`[Payment Reminders] No email for winner ${auction.winner_id}`)
          return { success: false, reason: 'No email' }
        }

        const userName = winnerProfile?.username || winnerAuth.email.split('@')[0] || 'there'
        const auctionUrl = `${siteUrl}/auctions/${auction.id}`
        
        // Format due date
        const dueDate = new Date(auction.auction_payment_due_at)
        const isOverdue = dueDate < now
        const formattedDate = isOverdue 
          ? `Overdue (was ${dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})` 
          : dueDate.toLocaleDateString('en-GB', { 
              weekday: 'short',
              day: 'numeric', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })

        await sendNotificationEmail(winnerAuth.email, 'paymentReminder', {
          userName,
          auctionTitle: auction.title || 'Auction',
          winningBid: Number(auction.current_price),
          dueDate: formattedDate,
          auctionUrl,
        })

        console.log(`[Payment Reminders] Sent reminder to ${winnerAuth.email} for auction ${auction.id}`)
        return { success: true }
      } catch (error) {
        console.error(`[Payment Reminders] Failed to send reminder for auction ${auction.id}:`, error)
        return { success: false, reason: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - sent

  console.log(`[Payment Reminders] Sent ${sent} reminders, ${failed} failed (total: ${results.length})`)

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: results.length,
  })
}

// Optional GET endpoint for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Payment reminders endpoint',
    usage: 'POST to this endpoint to send payment reminder emails',
    note: 'Should be called by a cron job (e.g., Vercel Cron)',
  })
}
