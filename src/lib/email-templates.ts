export const emailTemplates = {
  outbid: (data: {
    userName: string
    auctionTitle: string
    currentBid: number
    auctionUrl: string
  }) => ({
    subject: `You've been outbid on ${data.auctionTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">You've been outbid! 📢</h2>
          <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.5;">Hi ${data.userName},</p>
          <p style="color: #374151; margin: 16px 0; font-size: 16px; line-height: 1.5;">
            Someone just placed a higher bid on <strong>${data.auctionTitle}</strong>.
          </p>
          <p style="color: #374151; margin: 16px 0; font-size: 18px;">
            Current bid: <strong style="color: #111827;">GHS ${data.currentBid}</strong>
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${data.auctionUrl}" style="background: #111827; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            Place a Higher Bid
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px;">
          Gavel Ghana - Online Auctions<br>
          <a href="https://gavelgh.com" style="color: #6b7280; text-decoration: none;">gavelgh.com</a>
        </p>
      </div>
    `,
  }),

  auctionWon: (data: {
    userName: string
    auctionTitle: string
    winningBid: number
    auctionUrl: string
  }) => ({
    subject: `🎉 Congratulations! You won ${data.auctionTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 32px;">🎉 You Won!</h2>
          <p style="color: #d1fae5; margin: 0; font-size: 18px;">Congratulations ${data.userName}!</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <p style="color: #374151; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
            You won the auction for <strong>${data.auctionTitle}</strong>.
          </p>
          <p style="color: #374151; margin: 16px 0; font-size: 18px;">
            Winning bid: <strong style="color: #10b981;">GHS ${data.winningBid}</strong>
          </p>
          <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 14px; line-height: 1.5;">
            The seller will contact you shortly with payment and delivery details.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${data.auctionUrl}" style="background: #111827; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            View Auction Details
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px;">
          Gavel Ghana - Online Auctions<br>
          <a href="https://gavelgh.com" style="color: #6b7280; text-decoration: none;">gavelgh.com</a>
        </p>
      </div>
    `,
  }),

  auctionEnded: (data: {
    sellerName: string
    auctionTitle: string
    winningBid: number
    winnerEmail: string
    winnerPhone?: string
    auctionUrl: string
  }) => ({
    subject: `Your auction ended: ${data.auctionTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">Auction Ended</h2>
          <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.5;">Hi ${data.sellerName},</p>
          <p style="color: #374151; margin: 16px 0; font-size: 16px; line-height: 1.5;">
            Your auction for <strong>${data.auctionTitle}</strong> has ended.
          </p>
          <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #374151; margin: 0 0 12px 0; font-size: 18px;">
              Winning bid: <strong style="color: #10b981;">GHS ${data.winningBid}</strong>
            </p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Winner: ${data.winnerEmail}</p>
            ${data.winnerPhone ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Phone: ${data.winnerPhone}</p>` : ''}
          </div>
          <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
            Please contact the winner to arrange payment and delivery.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${data.auctionUrl}" style="background: #111827; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            View Auction Details
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px;">
          Gavel Ghana - Online Auctions<br>
          <a href="https://gavelgh.com" style="color: #6b7280; text-decoration: none;">gavelgh.com</a>
        </p>
      </div>
    `,
  }),

  newBid: (data: {
    sellerName: string
    auctionTitle: string
    bidAmount: number
    auctionUrl: string
    bidsCount: number
  }) => ({
    subject: `New bid on ${data.auctionTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">New Bid Received 🔔</h2>
          <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.5;">Hi ${data.sellerName},</p>
          <p style="color: #374151; margin: 16px 0; font-size: 16px; line-height: 1.5;">
            Someone just placed a bid on <strong>${data.auctionTitle}</strong>.
          </p>
          <p style="color: #374151; margin: 16px 0; font-size: 18px;">
            Bid amount: <strong style="color: #111827;">GHS ${data.bidAmount}</strong>
          </p>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Total bids: ${data.bidsCount}
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${data.auctionUrl}" style="background: #111827; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            View Auction
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px;">
          Gavel Ghana - Online Auctions<br>
          <a href="https://gavelgh.com" style="color: #6b7280; text-decoration: none;">gavelgh.com</a>
        </p>
      </div>
    `,
  }),

  orderConfirmation: (data: {
    userName: string
    orderRef: string
    total: number
    items: Array<{ name: string; quantity: number; price: number }>
    deliveryAddress: string
    deliveryLocation: string
    estimatedDelivery?: string
  }) => ({
    subject: `Order Confirmation - ${data.orderRef}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px;">Order Confirmed! ✓</h2>
          <p style="color: #dbeafe; margin: 0; font-size: 16px;">Thank you for your order</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px;">Hi ${data.userName},</p>
          <p style="color: #374151; margin: 0 0 24px 0; font-size: 16px;">Your order has been confirmed!</p>
          
          <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</p>
            <p style="color: #111827; margin: 0; font-size: 18px; font-weight: 600;">${data.orderRef}</p>
          </div>

          <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">Order Items</h3>
          ${data.items
            .map(
              (item) => `
            <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <p style="color: #111827; margin: 0 0 4px 0; font-size: 15px; font-weight: 500;">${item.name}</p>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Qty: ${item.quantity}</p>
                </div>
                <p style="color: #111827; margin: 0; font-size: 15px; font-weight: 600;">GHS ${item.price.toFixed(2)}</p>
              </div>
            </div>
          `
            )
            .join('')}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #111827;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <p style="color: #111827; margin: 0; font-size: 18px; font-weight: 600;">Total</p>
              <p style="color: #111827; margin: 0; font-size: 24px; font-weight: 700;">GHS ${data.total.toFixed(2)}</p>
            </div>
          </div>

          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 24px;">
            <h4 style="color: #92400e; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Delivery Information</h4>
            <p style="color: #78350f; margin: 0 0 4px 0; font-size: 14px;">${data.deliveryAddress}</p>
            <p style="color: #78350f; margin: 0; font-size: 14px;">${data.deliveryLocation}</p>
            ${data.estimatedDelivery ? `<p style="color: #92400e; margin: 12px 0 0 0; font-size: 13px;">Estimated delivery: ${data.estimatedDelivery}</p>` : ''}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
          You'll receive updates as your order is processed and shipped.
        </p>
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px;">
          Gavel Ghana - Online Shopping<br>
          <a href="https://gavelgh.com" style="color: #6b7280; text-decoration: none;">gavelgh.com</a>
        </p>
      </div>
    `,
  }),

  auctionEndingSoon: (data: {
    userName: string
    auctionTitle: string
    currentBid: number
    endsAt: string
    auctionUrl: string
  }) => ({
    subject: `⏰ Auction ending soon: ${data.auctionTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px;">⏰ Ending Soon!</h2>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <p style="color: #6b7280; margin: 0; font-size: 16px; line-height: 1.5;">Hi ${data.userName},</p>
          <p style="color: #374151; margin: 16px 0; font-size: 16px; line-height: 1.5;">
            The auction for <strong>${data.auctionTitle}</strong> is ending soon!
          </p>
          <p style="color: #374151; margin: 16px 0; font-size: 18px;">
            Current bid: <strong style="color: #111827;">GHS ${data.currentBid}</strong>
          </p>
          <p style="color: #dc2626; margin: 0; font-size: 14px; font-weight: 600;">
            Ends at: ${data.endsAt}
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${data.auctionUrl}" style="background: #111827; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            Place Your Bid Now
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px;">
          Gavel Ghana - Online Auctions<br>
          <a href="https://gavelgh.com" style="color: #6b7280; text-decoration: none;">gavelgh.com</a>
        </p>
      </div>
    `,
  }),
}

export type EmailTemplateKey = keyof typeof emailTemplates
