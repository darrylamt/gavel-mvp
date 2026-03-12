import { createServiceRoleClient } from '@/lib/serverSupabase'
import { queueArkeselNotification } from './queue'

export async function queueSellerApplicationReceivedNotification(userId: string, businessName: string, phoneOverride?: string | null) {
  return queueArkeselNotification({
    userId,
    message: `Hello! We've received your Gavel seller application for "${businessName}". We'll review it shortly and get back to you.`,
    category: 'transactional',
    dedupeKey: `seller-application-received:${userId}:${businessName}`,
    phoneOverride: phoneOverride ?? null,
  })
}

export async function queueSellerApplicationReviewedNotification(input: {
  userId: string
  status: 'approved' | 'rejected'
  reason?: string | null
  phoneOverride?: string | null
}) {
  const isApproved = input.status === 'approved'
  const message = isApproved
    ? `Great! Your Gavel seller account has been approved. You can now start listing items.`
    : `Unfortunately, your Gavel seller application was not approved. Reason: ${input.reason || 'Does not meet requirements'}. Please contact support for more details.`

  return queueArkeselNotification({
    userId: input.userId,
    message,
    category: 'transactional',
    dedupeKey: `seller-application-reviewed:${input.userId}:${input.status}`,
    phoneOverride: input.phoneOverride ?? null,
  })
}

export async function queueBidNotifications(input: {
  auctionId: string
  auctionTitle: string
  bidderUserId: string
  bidderAmount: number
  previousTopBidderUserId?: string | null
  sellerUserId?: string | null
}) {
  const tasks: Promise<unknown>[] = []

  tasks.push(
    queueArkeselNotification({
      userId: input.bidderUserId,
      message: `You're the highest bidder on "${input.auctionTitle}" at GH₵ ${input.bidderAmount}. Keep an eye on your bid!`,
      category: 'transactional',
      dedupeKey: `highest:${input.auctionId}:${input.bidderUserId}:${input.bidderAmount}`,
    })
  )

  if (input.previousTopBidderUserId && input.previousTopBidderUserId !== input.bidderUserId) {
    tasks.push(
      queueArkeselNotification({
        userId: input.previousTopBidderUserId,
        message: `You've been outbid on "${input.auctionTitle}". New bid: GH₵ ${input.bidderAmount}. Place a new bid now!`,
        category: 'transactional',
        dedupeKey: `outbid:${input.auctionId}:${input.previousTopBidderUserId}:${input.bidderAmount}`,
      })
    )
  }

  if (input.sellerUserId && input.sellerUserId !== input.bidderUserId) {
    tasks.push(
      queueArkeselNotification({
        userId: input.sellerUserId,
        message: `New bid on "${input.auctionTitle}": GH₵ ${input.bidderAmount}. Check your Gavel account!`,
        category: 'transactional',
        dedupeKey: `seller-new-bid:${input.auctionId}:${input.bidderAmount}`,
      })
    )
  }

  await Promise.allSettled(tasks)
}

export async function queueAuctionClosedNotifications(input: {
  auctionId: string
  auctionTitle: string
  sellerUserId?: string | null
  winnerUserId?: string | null
  winnerAmount?: number | null
  reserveMet: boolean
}) {
  if (!input.reserveMet || !input.winnerUserId) {
    if (input.sellerUserId) {
      await queueArkeselNotification({
        userId: input.sellerUserId,
        message: `Your auction "${input.auctionTitle}" has ended. Reserve price was not met.`,
        category: 'transactional',
        dedupeKey: `reserve-not-met:${input.auctionId}`,
      })
    }
    return
  }

  await queueArkeselNotification({
    userId: input.winnerUserId,
    message: `Congratulations! You won "${input.auctionTitle}" for GH₵ ${input.winnerAmount}. Please proceed to payment.`,
    category: 'transactional',
    dedupeKey: `auction-won:${input.auctionId}:${input.winnerUserId}`,
  })

  if (input.sellerUserId) {
    await queueArkeselNotification({
      userId: input.sellerUserId,
      message: `Your auction "${input.auctionTitle}" has sold for GH₵ ${input.winnerAmount}. Proceed to ship the item.`,
      category: 'transactional',
      dedupeKey: `seller-item-sold:${input.auctionId}`,
    })
  }
}

export async function queuePaymentNotifications(input: {
  userId: string
  auctionTitle: string
  amount: number
  type: 'reminder_30m' | 'final_reminder' | 'confirmed'
}) {
  const messages = {
    reminder_30m: `Payment reminder: Your auction "${input.auctionTitle}" requires payment of GH₵ ${input.amount}. Pay now to secure your item.`,
    final_reminder: `FINAL: "${input.auctionTitle}" payment due GH₵ ${input.amount}. Complete payment to avoid cancellation.`,
    confirmed: `Payment confirmed for "${input.auctionTitle}". Thank you! Your item will be shipped soon.`,
  }

  return queueArkeselNotification({
    userId: input.userId,
    message: messages[input.type],
    category: input.type === 'confirmed' ? 'transactional' : 'transactional',
    dedupeKey: `payment-${input.type}:${input.userId}:${input.auctionTitle}`,
  })
}

export async function queueAuctionReminderNotifications(input: {
  auctionId: string
  auctionTitle: string
  starredByUserIds: string[]
  hoursUntilStart: number
}) {
  const tasks = input.starredByUserIds.map((userId) =>
    queueArkeselNotification({
      userId,
      message: `Your starred auction "${input.auctionTitle}" starts in ${input.hoursUntilStart} hour${input.hoursUntilStart !== 1 ? 's' : ''}. Be ready!`,
      category: 'marketing',
      dedupeKey: `auction-reminder:${input.auctionId}:${userId}:${input.hoursUntilStart}h`,
    })
  )

  await Promise.allSettled(tasks)
}

export async function queueAccountCreatedNotification(userId: string) {
  return queueArkeselNotification({
    userId,
    message: `Welcome to Gavel! Your account is ready. Start bidding on auctions or become a seller now.`,
    category: 'transactional',
    dedupeKey: `account-created:${userId}`,
  })
}

export async function queueSecurityNotifications(input: {
  userId: string
  type: 'suspicious_login' | 'failed_logins' | 'password_changed'
}) {
  const messages = {
    suspicious_login: `Security alert: Unusual login detected on your Gavel account. If this wasn't you, change your password immediately.`,
    failed_logins: `Security alert: Multiple failed login attempts on your Gavel account. Your password may be compromised. Change it now.`,
    password_changed: `Your Gavel password has been changed successfully.`,
  }

  return queueArkeselNotification({
    userId: input.userId,
    message: messages[input.type],
    category: 'security',
    dedupeKey: `security-${input.type}:${input.userId}:${Date.now()}`,
  })
}

export async function queueTokenNotifications(input: {
  userId: string
  type: 'tokens_purchased' | 'low_balance'
  amount?: number
}) {
  let message = ''

  if (input.type === 'tokens_purchased') {
    message = `You've purchased GH₵ ${input.amount} in Gavel tokens. Use them for instant payments!`
  } else if (input.type === 'low_balance') {
    message = `Your Gavel token balance is running low (${input.amount} tokens). Buy more to keep bidding.`
  }

  return queueArkeselNotification({
    userId: input.userId,
    message,
    category: 'marketing',
    dedupeKey: `token-${input.type}:${input.userId}:${Date.now()}`,
  })
}

export async function queueShippingNotifications(input: {
  userId: string
  auctionTitle: string
  type: 'seller_ship_item' | 'buyer_item_shipped' | 'buyer_item_delivered'
}) {
  const messages = {
    seller_ship_item: `Please ship the item "${input.auctionTitle}" ASAP. Buyer is waiting.`,
    buyer_item_shipped: `Great news! Your item "${input.auctionTitle}" has been shipped. Track your delivery.`,
    buyer_item_delivered: `Your item "${input.auctionTitle}" has been delivered. Please confirm receipt in your Gavel account.`,
  }

  return queueArkeselNotification({
    userId: input.userId,
    message: messages[input.type],
    category: 'transactional',
    dedupeKey: `shipping-${input.type}:${input.userId}:${input.auctionTitle}`,
  })
}

export async function queueShopNotifications(input: {
  userId: string
  type: 'buy_now_order_confirmation' | 'order_shipped' | 'order_delivered'
  productTitle: string
}) {
  const messages = {
    buy_now_order_confirmation: `Order confirmed for "${input.productTitle}". Check your Gavel account for details.`,
    order_shipped: `Your order for "${input.productTitle}" has been shipped!`,
    order_delivered: `Your order for "${input.productTitle}" has been delivered!`,
  }

  return queueArkeselNotification({
    userId: input.userId,
    message: messages[input.type],
    category: 'transactional',
    dedupeKey: `shop-${input.type}:${input.userId}:${input.productTitle}`,
  })
}

export async function queueAuctionPaymentReceivedNotifications(input: {
  auctionId: string
  auctionTitle: string
  winnerUserId: string
  sellerUserId?: string | null
  amount: number
}) {
  await queueArkeselNotification({
    userId: input.winnerUserId,
    message: `Payment confirmed for "${input.auctionTitle}". Thank you! Your item will be shipped soon.`,
    category: 'transactional',
    dedupeKey: `auction-payment-received:${input.auctionId}:${input.winnerUserId}`,
  })

  if (input.sellerUserId) {
    await Promise.allSettled([
      queueArkeselNotification({
        userId: input.sellerUserId,
        message: `Payment received for "${input.auctionTitle}" (GH₵ ${input.amount}). Funds will be transferred soon.`,
        category: 'transactional',
        dedupeKey: `seller-auction-payment-received:${input.auctionId}:${input.sellerUserId}`,
      }),
      queueArkeselNotification({
        userId: input.sellerUserId,
        message: `Your funds from "${input.auctionTitle}" (GH₵ ${input.amount}) are pending. Expect transfer within 2-3 business days.`,
        category: 'transactional',
        dedupeKey: `seller-auction-funds-pending:${input.auctionId}:${input.sellerUserId}`,
      }),
    ])
  }
}

export async function queueShopOrderPaidNotifications(input: {
  buyerUserId: string
  orderId: string
  totalAmount: number
  sellerIds: string[]
}) {
  await queueArkeselNotification({
    userId: input.buyerUserId,
    message: `Order ${input.orderId} confirmed! We've charged GH₵ ${input.totalAmount}. Your items will be shipped soon.`,
    category: 'transactional',
    dedupeKey: `shop-order-confirmed:${input.orderId}:${input.buyerUserId}`,
  })

  await Promise.allSettled(
    input.sellerIds.map((sellerId) =>
      Promise.allSettled([
        queueArkeselNotification({
          userId: sellerId,
          message: `Order ${input.orderId} has been paid in full (GH₵ ${input.totalAmount}). Please prepare and ship the items.`,
          category: 'transactional',
          dedupeKey: `shop-seller-payment-received:${input.orderId}:${sellerId}`,
        }),
        queueArkeselNotification({
          userId: sellerId,
          message: `Please ship the items in order ${input.orderId} ASAP. Buyer is waiting.`,
          category: 'transactional',
          dedupeKey: `shop-seller-ship:${input.orderId}:${sellerId}`,
        }),
      ])
    )
  )
}

export async function queueBuyerDeliveredNotification(input: {
  buyerUserId: string
  orderId: string
  productTitle: string
}) {
  return queueArkeselNotification({
    userId: input.buyerUserId,
    message: `Your order for "${input.productTitle}" (Order # ${input.orderId}) has been delivered! Please confirm receipt.`,
    category: 'transactional',
    dedupeKey: `buyer-delivered:${input.orderId}:${input.productTitle}:${input.buyerUserId}`,
  })
}

export async function queueWatchlistAuctionStartingNotification(input: {
  userId: string
  auctionTitle: string
  auctionId: string
  minutesUntilStart: number
}) {
  return queueArkeselNotification({
    userId: input.userId,
    message: `Your watchlist auction "${input.auctionTitle}" starts in ${input.minutesUntilStart} minute${input.minutesUntilStart !== 1 ? 's' : ''}! Get ready to bid.`,
    category: 'transactional',
    dedupeKey: `watchlist-auction-starting:${input.auctionId}:${input.userId}:${input.minutesUntilStart}m`,
  })
}

export async function queueParticipatingAuctionEndingNotification(input: {
  userId: string
  auctionTitle: string
  auctionId: string
  minutesUntilEnd: number
}) {
  return queueArkeselNotification({
    userId: input.userId,
    message: `Auction "${input.auctionTitle}" (you're participating) ends in ${input.minutesUntilEnd} minute${input.minutesUntilEnd !== 1 ? 's' : ''}! Place your final bid now.`,
    category: 'transactional',
    dedupeKey: `participating-auction-ending:${input.auctionId}:${input.userId}:${input.minutesUntilEnd}m`,
  })
}

/**
 * Queue countdown notifications for bidders on an auction
 * Supports: 10h, 5h, 1h, 30m, 5m intervals
 */
export async function queueAuctionCountdownNotification(input: {
  auctionId: string
  auctionTitle: string
  bidderUserIds: string[]
  timeRemaining: '10h' | '5h' | '1h' | '30m' | '5m'
}) {
  const timeLabels = {
    '10h': '10 hours',
    '5h': '5 hours',
    '1h': '1 hour',
    '30m': '30 minutes',
    '5m': '5 minutes',
  }

  const preferenceFields = {
    '10h': 'sms_auction_countdown_10h',
    '5h': 'sms_auction_countdown_5h',
    '1h': 'sms_auction_countdown_1h',
    '30m': 'sms_auction_countdown_30m',
    '5m': 'sms_auction_countdown_5m',
  }

  const service = createServiceRoleClient()

  type ProfilePreferenceRow = {
    id: string
    [key: string]: boolean | string | null
  }

  // Get profiles with preference check
  const { data: profiles } = await service
    .from('profiles')
    .select(`id, ${preferenceFields[input.timeRemaining]}`)
    .in('id', input.bidderUserIds)

  const enabledUserIds = ((profiles ?? []) as ProfilePreferenceRow[])
    .filter((profile) => profile[preferenceFields[input.timeRemaining]] !== false)
    .map((profile) => profile.id)

  if (enabledUserIds.length === 0) return

  const tasks = enabledUserIds.map((userId) =>
    queueArkeselNotification({
      userId,
      message: `⏰ Auction "${input.auctionTitle}" ends in ${timeLabels[input.timeRemaining]}! You're currently bidding. Place your final bid now at gavelgh.com`,
      category: 'transactional',
      dedupeKey: `auction-countdown:${input.auctionId}:${userId}:${input.timeRemaining}`,
    })
  )

  await Promise.allSettled(tasks)
}
