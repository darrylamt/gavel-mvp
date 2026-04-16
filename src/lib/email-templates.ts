// ─── Shared layout helpers ────────────────────────────────────────────────────

const ORANGE = '#F97316'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT_BG = '#F9FAFB'
const BORDER = '#E5E7EB'

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gavel</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${ORANGE};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">GAVEL</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${LIGHT_BG};padding:32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F3F4F6;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border:1px solid ${BORDER};border-top:none;">
            <p style="margin:0;color:${GRAY};font-size:13px;">Ghana's auction & marketplace platform</p>
            <p style="margin:6px 0 0 0;">
              <a href="https://gavelgh.com" style="color:${ORANGE};font-size:13px;text-decoration:none;">gavelgh.com</a>
              &nbsp;·&nbsp;
              <a href="mailto:support@gavelgh.com" style="color:${GRAY};font-size:13px;text-decoration:none;">support@gavelgh.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function btn(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:${ORANGE};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:600;font-size:16px;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px 0;color:${DARK};font-size:24px;font-weight:700;">${text}</h1>`
}

function p(text: string, style = ''): string {
  return `<p style="margin:0 0 16px 0;color:#374151;font-size:16px;line-height:1.6;${style}">${text}</p>`
}

function label(text: string): string {
  return `<p style="margin:0 0 4px 0;color:${GRAY};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${text}</p>`
}

function value(text: string, color = DARK): string {
  return `<p style="margin:0 0 16px 0;color:${color};font-size:20px;font-weight:700;">${text}</p>`
}

function infoBox(content: string, bg = '#ffffff', border = BORDER): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:2px solid ${border};border-radius:8px;margin:16px 0;">
    <tr><td style="padding:16px;">${content}</td></tr>
  </table>`
}

function warningBox(content: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF7ED;border-left:4px solid ${ORANGE};border-radius:0 8px 8px 0;margin:16px 0;">
    <tr><td style="padding:16px;">${content}</td></tr>
  </table>`
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const emailTemplates = {

  // ── Bidding ────────────────────────────────────────────────────────────────

  outbid: (data: {
    userName: string
    auctionTitle: string
    currentBid: number
    auctionUrl: string
  }) => ({
    subject: `You've been outbid on "${data.auctionTitle}"`,
    text: `Hi ${data.userName},\n\nSomeone placed a higher bid on "${data.auctionTitle}".\n\nCurrent bid: GHS ${data.currentBid}\n\nPlace a higher bid: ${data.auctionUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('You\'ve been outbid 📢')}
      ${p(`Hi ${data.userName},`)}
      ${p(`Someone just placed a higher bid on <strong>${data.auctionTitle}</strong>.`)}
      ${infoBox(`
        ${label('Current bid')}
        ${value(`GHS ${data.currentBid}`, ORANGE)}
      `)}
      ${btn(data.auctionUrl, 'Place a Higher Bid')}
      ${p('Act fast — auctions move quickly!', `color:${GRAY};font-size:14px;`)}
    `),
  }),

  auctionWon: (data: {
    userName: string
    auctionTitle: string
    winningBid: number
    auctionUrl: string
  }) => ({
    subject: `🎉 You won "${data.auctionTitle}"!`,
    text: `Hi ${data.userName},\n\nCongratulations! You won the auction for "${data.auctionTitle}" with a winning bid of GHS ${data.winningBid}.\n\nView auction: ${data.auctionUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('🎉 You Won!')}
      ${p(`Congratulations, <strong>${data.userName}</strong>!`)}
      ${p(`You won the auction for <strong>${data.auctionTitle}</strong>.`)}
      ${infoBox(`
        ${label('Winning bid')}
        ${value(`GHS ${data.winningBid}`, ORANGE)}
      `)}
      ${btn(data.auctionUrl, 'View Auction')}
      ${warningBox(p('The seller will be in touch shortly with payment and delivery details. Complete payment promptly to secure your item.', `color:#92400E;margin:0;`))}
    `),
  }),

  auctionEnded: (data: {
    sellerName: string
    auctionTitle: string
    winningBid: number
    winnerEmail: string
    winnerPhone?: string
    auctionUrl: string
  }) => ({
    subject: `Your auction ended — "${data.auctionTitle}"`,
    text: `Hi ${data.sellerName},\n\nYour auction for "${data.auctionTitle}" has ended.\n\nWinning bid: GHS ${data.winningBid}\nWinner email: ${data.winnerEmail}${data.winnerPhone ? `\nWinner phone: ${data.winnerPhone}` : ''}\n\nView auction: ${data.auctionUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('Your Auction Has Ended')}
      ${p(`Hi ${data.sellerName},`)}
      ${p(`Your auction for <strong>${data.auctionTitle}</strong> has closed.`)}
      ${infoBox(`
        ${label('Winning bid')}
        ${value(`GHS ${data.winningBid}`, ORANGE)}
        ${label('Winner')}
        <p style="margin:0;color:#374151;font-size:15px;">${data.winnerEmail}</p>
        ${data.winnerPhone ? `<p style="margin:4px 0 0 0;color:${GRAY};font-size:14px;">📞 ${data.winnerPhone}</p>` : ''}
      `)}
      ${btn(data.auctionUrl, 'View Auction Details')}
      ${p('Please arrange delivery with the winner. Funds will be held in escrow until delivery is confirmed.', `color:${GRAY};font-size:14px;`)}
    `),
  }),

  newBid: (data: {
    sellerName: string
    auctionTitle: string
    bidAmount: number
    auctionUrl: string
    bidsCount: number
  }) => ({
    subject: `New bid on "${data.auctionTitle}" — GHS ${data.bidAmount}`,
    text: `Hi ${data.sellerName},\n\nSomeone placed a bid of GHS ${data.bidAmount} on "${data.auctionTitle}".\n\nTotal bids: ${data.bidsCount}\n\nView auction: ${data.auctionUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('New Bid Received 🔔')}
      ${p(`Hi ${data.sellerName},`)}
      ${p(`Someone just bid on <strong>${data.auctionTitle}</strong>.`)}
      ${infoBox(`
        ${label('Bid amount')}
        ${value(`GHS ${data.bidAmount}`, ORANGE)}
        ${label('Total bids')}
        <p style="margin:0;color:#374151;font-size:15px;font-weight:600;">${data.bidsCount}</p>
      `)}
      ${btn(data.auctionUrl, 'View Auction')}
    `),
  }),

  auctionEndingSoon: (data: {
    userName: string
    auctionTitle: string
    currentBid: number
    endsAt: string
    auctionUrl: string
  }) => ({
    subject: `⏰ Ending soon — "${data.auctionTitle}"`,
    text: `Hi ${data.userName},\n\nThe auction for "${data.auctionTitle}" is ending soon!\n\nCurrent bid: GHS ${data.currentBid}\nEnds at: ${data.endsAt}\n\nBid now: ${data.auctionUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('⏰ Auction Ending Soon!')}
      ${p(`Hi ${data.userName},`)}
      ${p(`The auction for <strong>${data.auctionTitle}</strong> is almost over.`)}
      ${infoBox(`
        ${label('Current bid')}
        ${value(`GHS ${data.currentBid}`, ORANGE)}
        ${label('Ends at')}
        <p style="margin:0;color:#DC2626;font-size:15px;font-weight:600;">${data.endsAt}</p>
      `)}
      ${btn(data.auctionUrl, 'Place Your Bid Now')}
    `),
  }),

  paymentReminder: (data: {
    userName: string
    auctionTitle: string
    winningBid: number
    dueDate: string
    auctionUrl: string
  }) => ({
    subject: `Payment reminder — "${data.auctionTitle}"`,
    text: `Hi ${data.userName},\n\nThis is a reminder to complete your payment for "${data.auctionTitle}".\n\nAmount due: GHS ${data.winningBid.toFixed(2)}\nDue date: ${data.dueDate}\n\nComplete payment: ${data.auctionUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('Payment Reminder')}
      ${p(`Hi ${data.userName},`)}
      ${p(`Payment is still pending for your winning bid on <strong>${data.auctionTitle}</strong>.`)}
      ${infoBox(`
        ${label('Amount due')}
        ${value(`GHS ${data.winningBid.toFixed(2)}`)}
        ${label('Due date')}
        <p style="margin:0;color:#DC2626;font-size:15px;font-weight:600;">${data.dueDate}</p>
      `)}
      ${btn(data.auctionUrl, 'Complete Payment')}
      ${warningBox(p('Failure to pay by the due date may result in your order being cancelled and your account flagged.', `color:#92400E;margin:0;`))}
    `),
  }),

  // ── Shop Orders ────────────────────────────────────────────────────────────

  orderConfirmation: (data: {
    userName: string
    orderRef: string
    total: number
    items: Array<{ name: string; quantity: number; price: number }>
    deliveryAddress: string
    deliveryLocation: string
    estimatedDelivery?: string
  }) => ({
    subject: `Order confirmed — ${data.orderRef}`,
    text: `Hi ${data.userName},\n\nYour order has been confirmed!\n\nOrder: ${data.orderRef}\n\nItems:\n${data.items.map(i => `- ${i.name} x${i.quantity} — GHS ${i.price.toFixed(2)}`).join('\n')}\n\nTotal: GHS ${data.total.toFixed(2)}\n\nDelivery to: ${data.deliveryAddress}, ${data.deliveryLocation}${data.estimatedDelivery ? `\nEstimated delivery: ${data.estimatedDelivery}` : ''}\n\nTrack your order at gavelgh.com\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('Order Confirmed ✓')}
      ${p(`Hi <strong>${data.userName}</strong>, your payment was successful!`)}
      ${infoBox(`
        ${label('Order reference')}
        <p style="margin:0 0 0 0;color:${DARK};font-size:18px;font-weight:700;font-family:monospace;">${data.orderRef}</p>
      `)}

      <p style="margin:24px 0 12px 0;color:${DARK};font-size:16px;font-weight:700;">Order Items</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${data.items.map(item => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};">
            <p style="margin:0 0 2px 0;color:${DARK};font-size:15px;font-weight:500;">${item.name}</p>
            <p style="margin:0;color:${GRAY};font-size:13px;">Qty: ${item.quantity}</p>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">
            <p style="margin:0;color:${DARK};font-size:15px;font-weight:600;">GHS ${item.price.toFixed(2)}</p>
          </td>
        </tr>`).join('')}
        <tr>
          <td style="padding:16px 0 0 0;">
            <p style="margin:0;color:${DARK};font-size:17px;font-weight:700;">Total</p>
          </td>
          <td style="padding:16px 0 0 0;text-align:right;">
            <p style="margin:0;color:${ORANGE};font-size:22px;font-weight:800;">GHS ${data.total.toFixed(2)}</p>
          </td>
        </tr>
      </table>

      ${warningBox(`
        <p style="margin:0 0 8px 0;color:#92400E;font-size:14px;font-weight:700;">Delivery Details</p>
        <p style="margin:0 0 4px 0;color:#78350F;font-size:14px;">${data.deliveryAddress}</p>
        <p style="margin:0;color:#78350F;font-size:14px;">${data.deliveryLocation}</p>
        ${data.estimatedDelivery ? `<p style="margin:8px 0 0 0;color:#92400E;font-size:13px;">Estimated delivery: ${data.estimatedDelivery}</p>` : ''}
      `)}
      ${p('You\'ll receive an update when your order is dispatched. Your payment is protected until you confirm delivery.', `color:${GRAY};font-size:14px;`)}
    `),
  }),

  // ── Seller Applications ────────────────────────────────────────────────────

  sellerApplicationApproved: (data: {
    userName: string
    businessName: string
    dashboardUrl: string
  }) => ({
    subject: `Your seller account is approved — ${data.businessName}`,
    text: `Hi ${data.userName},\n\nGreat news! Your seller application for "${data.businessName}" has been approved.\n\nYou can now list products and run auctions on Gavel.\n\nGo to your seller dashboard: ${data.dashboardUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('You\'re Approved to Sell on Gavel ✅')}
      ${p(`Hi <strong>${data.userName}</strong>,`)}
      ${p(`Your seller application for <strong>${data.businessName}</strong> has been approved. Welcome to the Gavel seller community!`)}
      ${infoBox(`
        <p style="margin:0 0 10px 0;color:${DARK};font-size:15px;font-weight:600;">What you can do now:</p>
        <p style="margin:0 0 6px 0;color:#374151;font-size:14px;">📦 &nbsp;List products at fixed prices</p>
        <p style="margin:0 0 6px 0;color:#374151;font-size:14px;">🔨 &nbsp;Create live auctions</p>
        <p style="margin:0 0 6px 0;color:#374151;font-size:14px;">💰 &nbsp;Receive payouts directly to your account</p>
        <p style="margin:0;color:#374151;font-size:14px;">📊 &nbsp;Track your sales and earnings in your dashboard</p>
      `)}
      ${btn(data.dashboardUrl, 'Go to Seller Dashboard')}
    `),
  }),

  sellerApplicationRejected: (data: {
    userName: string
    businessName: string
    reason: string
    supportUrl: string
  }) => ({
    subject: `Seller application update — ${data.businessName}`,
    text: `Hi ${data.userName},\n\nThank you for applying to sell on Gavel. After reviewing your application for "${data.businessName}", we're unable to approve it at this time.\n\nReason: ${data.reason}\n\nPlease contact support if you have questions: ${data.supportUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('Application Update')}
      ${p(`Hi ${data.userName},`)}
      ${p(`Thank you for your interest in selling on Gavel. After reviewing your application for <strong>${data.businessName}</strong>, we're unable to approve it at this time.`)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 8px 8px 0;margin:16px 0;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 6px 0;color:#991B1B;font-size:14px;font-weight:700;">Reason</p>
          <p style="margin:0;color:#7F1D1D;font-size:14px;line-height:1.5;">${data.reason}</p>
        </td></tr>
      </table>
      ${p('You\'re welcome to submit a new application once you\'ve addressed the issue above.')}
      ${btn(data.supportUrl, 'Contact Support')}
    `),
  }),

  // ── Account ────────────────────────────────────────────────────────────────

  accountCreated: (data: {
    userName: string
  }) => ({
    subject: `Welcome to Gavel, ${data.userName}!`,
    text: `Hi ${data.userName},\n\nWelcome to Gavel — Ghana's auction and marketplace platform!\n\nYou can now bid on live auctions, buy products, and earn by referring friends.\n\nStart exploring: https://gavelgh.com/auctions\n\n— Gavel`,
    html: emailWrapper(`
      ${h1(`Welcome to Gavel, ${data.userName}! 🎉`)}
      ${p('You\'ve joined Ghana\'s premier online auction and marketplace.')}
      ${infoBox(`
        <p style="margin:0 0 10px 0;color:${DARK};font-size:15px;font-weight:600;">Here\'s what you can do:</p>
        <p style="margin:0 0 8px 0;color:#374151;font-size:14px;">🔨 &nbsp;<strong>Bid on live auctions</strong> — get rare finds at great prices</p>
        <p style="margin:0 0 8px 0;color:#374151;font-size:14px;">🛒 &nbsp;<strong>Shop the marketplace</strong> — buy at fixed prices instantly</p>
        <p style="margin:0 0 8px 0;color:#374151;font-size:14px;">💰 &nbsp;<strong>Earn with referrals</strong> — share your code, earn 2% forever</p>
        <p style="margin:0;color:#374151;font-size:14px;">📦 &nbsp;<strong>Become a seller</strong> — list your items to thousands of buyers</p>
      `)}
      ${btn('https://gavelgh.com/auctions', 'Start Exploring')}
    `),
  }),

  // ── Referrals ──────────────────────────────────────────────────────────────

  referralEarning: (data: {
    referrerName: string
    commissionGHS: number
    totalPendingGHS: number
    dashboardUrl: string
  }) => ({
    subject: `You earned GHS ${data.commissionGHS.toFixed(2)} in referral commission!`,
    text: `Hi ${data.referrerName},\n\nGreat news! One of your referrals just made a purchase and you've earned GHS ${data.commissionGHS.toFixed(2)} in commission.\n\nTotal pending earnings: GHS ${data.totalPendingGHS.toFixed(2)}\n\nView your dashboard: ${data.dashboardUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('You Earned a Referral Commission! 💰')}
      ${p(`Hi <strong>${data.referrerName}</strong>,`)}
      ${p('One of your referrals just made a purchase — here\'s your cut.')}
      ${infoBox(`
        ${label('Commission earned')}
        ${value(`GHS ${data.commissionGHS.toFixed(2)}`, ORANGE)}
        ${label('Total pending earnings')}
        <p style="margin:0;color:${DARK};font-size:18px;font-weight:700;">GHS ${data.totalPendingGHS.toFixed(2)}</p>
      `)}
      ${btn(data.dashboardUrl, 'View Earnings Dashboard')}
      ${p('Commissions are paid out on the 1st of every month once you reach GHS 50. Keep sharing your referral link to earn more!', `color:${GRAY};font-size:14px;`)}
    `),
  }),

  referralPayout: (data: {
    referrerName: string
    amountGHS: number
    period: string
    dashboardUrl: string
  }) => ({
    subject: `Your referral payout of GHS ${data.amountGHS.toFixed(2)} has been sent!`,
    text: `Hi ${data.referrerName},\n\nYour referral payout of GHS ${data.amountGHS.toFixed(2)} for ${data.period} has been sent to your account.\n\nIt should arrive within 1-2 business days.\n\nView your earnings history: ${data.dashboardUrl}\n\n— Gavel`,
    html: emailWrapper(`
      ${h1('Referral Payout Sent! 🎉')}
      ${p(`Hi <strong>${data.referrerName}</strong>,`)}
      ${p(`Your referral earnings for <strong>${data.period}</strong> have been sent to your payout account.`)}
      ${infoBox(`
        ${label('Amount sent')}
        ${value(`GHS ${data.amountGHS.toFixed(2)}`, ORANGE)}
        ${label('Period')}
        <p style="margin:0;color:#374151;font-size:15px;font-weight:600;">${data.period}</p>
      `)}
      ${btn(data.dashboardUrl, 'View Earnings History')}
      ${p('Funds typically arrive within 1–2 business days depending on your bank or mobile money provider.', `color:${GRAY};font-size:14px;`)}
      ${p('Keep sharing your referral link to build passive income every month!', `color:${GRAY};font-size:14px;`)}
    `),
  }),

}

export type EmailTemplateKey = keyof typeof emailTemplates
