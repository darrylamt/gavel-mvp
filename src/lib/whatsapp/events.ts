import { createServiceRoleClient } from '@/lib/serverSupabase'
import { queueWhatsAppNotification } from './queue'

export async function queueSellerApplicationReceivedNotification(userId: string, businessName: string) {
  return queueWhatsAppNotification({
    userId,
    templateKey: 'seller_application_received',
    params: { business_name: businessName },
    dedupeKey: `seller-application-received:${userId}:${businessName}`,
  })
}

export async function queueSellerApplicationReviewedNotification(input: {
  userId: string
  status: 'approved' | 'rejected'
  reason?: string | null
}) {
  return queueWhatsAppNotification({
    userId: input.userId,
    templateKey: input.status === 'approved' ? 'seller_application_approved' : 'seller_application_rejected',
    params: { reason: input.reason ?? '' },
    dedupeKey: `seller-application-reviewed:${input.userId}:${input.status}`,
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
    queueWhatsAppNotification({
      userId: input.bidderUserId,
      templateKey: 'highest_bidder',
      params: { auction_title: input.auctionTitle, amount: input.bidderAmount },
      dedupeKey: `highest:${input.auctionId}:${input.bidderUserId}:${input.bidderAmount}`,
    })
  )

  if (input.previousTopBidderUserId && input.previousTopBidderUserId !== input.bidderUserId) {
    tasks.push(
      queueWhatsAppNotification({
        userId: input.previousTopBidderUserId,
        templateKey: 'outbid',
        params: { auction_title: input.auctionTitle, amount: input.bidderAmount },
        dedupeKey: `outbid:${input.auctionId}:${input.previousTopBidderUserId}:${input.bidderAmount}`,
      })
    )
  }

  if (input.sellerUserId && input.sellerUserId !== input.bidderUserId) {
    tasks.push(
      queueWhatsAppNotification({
        userId: input.sellerUserId,
        templateKey: 'seller_new_bid',
        params: { auction_title: input.auctionTitle, amount: input.bidderAmount },
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
  const service = createServiceRoleClient()

  if (!input.reserveMet || !input.winnerUserId) {
    if (input.sellerUserId) {
      await queueWhatsAppNotification({
        userId: input.sellerUserId,
        templateKey: 'reserve_not_met',
        params: { auction_title: input.auctionTitle },
        dedupeKey: `reserve-not-met:${input.auctionId}`,
      })
    }
    return
  }

  await queueWhatsAppNotification({
    userId: input.winnerUserId,
    templateKey: 'auction_won',
    params: {
      auction_title: input.auctionTitle,
      amount: input.winnerAmount ?? '',
      payment_url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/profile`,
    },
    dedupeKey: `auction-won:${input.auctionId}:${input.winnerUserId}`,
  })

  if (input.sellerUserId) {
    await queueWhatsAppNotification({
      userId: input.sellerUserId,
      templateKey: 'seller_item_sold',
      params: { auction_title: input.auctionTitle, amount: input.winnerAmount ?? '' },
      dedupeKey: `seller-item-sold:${input.auctionId}:${input.sellerUserId}`,
    })
  }

  const { data: bids } = await service
    .from('bids')
    .select('user_id')
    .eq('auction_id', input.auctionId)

  const losers = Array.from(new Set((bids ?? []).map((row) => String(row.user_id || '')).filter(Boolean))).filter(
    (userId) => userId !== input.winnerUserId
  )

  await Promise.allSettled(
    losers.map((userId) =>
      queueWhatsAppNotification({
        userId,
        templateKey: 'auction_lost',
        params: { auction_title: input.auctionTitle },
        dedupeKey: `auction-lost:${input.auctionId}:${userId}`,
      })
    )
  )
}

export async function queueAuctionPaymentReceivedNotifications(input: {
  auctionId: string
  auctionTitle: string
  winnerUserId: string
  sellerUserId?: string | null
  amount: number
}) {
  await queueWhatsAppNotification({
    userId: input.winnerUserId,
    templateKey: 'payment_received',
    params: { auction_title: input.auctionTitle, amount: input.amount },
    dedupeKey: `auction-payment-received:${input.auctionId}:${input.winnerUserId}`,
  })

  if (input.sellerUserId) {
    await Promise.allSettled([
      queueWhatsAppNotification({
        userId: input.sellerUserId,
        templateKey: 'payment_received',
        params: { auction_title: input.auctionTitle, amount: input.amount },
        dedupeKey: `seller-auction-payment-received:${input.auctionId}:${input.sellerUserId}`,
      }),
      queueWhatsAppNotification({
        userId: input.sellerUserId,
        templateKey: 'seller_funds_pending',
        params: { auction_title: input.auctionTitle, amount: input.amount },
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
  await queueWhatsAppNotification({
    userId: input.buyerUserId,
    templateKey: 'buy_now_order_confirmation',
    params: { order_id: input.orderId, amount: input.totalAmount },
    dedupeKey: `shop-order-confirmed:${input.orderId}:${input.buyerUserId}`,
  })

  await Promise.allSettled(
    input.sellerIds.map((sellerId) =>
      Promise.allSettled([
        queueWhatsAppNotification({
          userId: sellerId,
          templateKey: 'payment_received',
          params: { order_id: input.orderId, amount: input.totalAmount },
          dedupeKey: `shop-seller-payment-received:${input.orderId}:${sellerId}`,
        }),
        queueWhatsAppNotification({
          userId: sellerId,
          templateKey: 'seller_ship_item',
          params: { order_id: input.orderId },
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
  return queueWhatsAppNotification({
    userId: input.buyerUserId,
    templateKey: 'buyer_item_delivered',
    params: { order_id: input.orderId, product_title: input.productTitle },
    dedupeKey: `buyer-delivered:${input.orderId}:${input.productTitle}:${input.buyerUserId}`,
  })
}
