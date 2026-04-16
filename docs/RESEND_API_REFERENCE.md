# Resend Email API Reference — Gavel Ghana

> Base URL: `https://api.resend.com`
> Authentication: `Authorization: Bearer YOUR_API_KEY`
> SDK: `npm install resend`
> Dashboard: https://resend.com/overview

---

## 1. AUTHENTICATION

```http
Authorization: Bearer re_xxxxxxxxx
Content-Type: application/json
```

**Gavel's API key** is stored in Vercel as `RESEND_API_KEY`

---

## 2. SEND EMAIL

### Send Single Email (REST)
```http
POST https://api.resend.com/emails
```

**Headers:**
```http
Authorization: Bearer re_xxxxxxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "from": "Gavel <noreply@gavelgh.com>",
  "to": ["buyer@example.com"],
  "subject": "Your order has been confirmed!",
  "html": "<h1>Order Confirmed</h1><p>Your payment was successful.</p>",
  "text": "Order Confirmed. Your payment was successful."
}
```

**All Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Sender. Format: `"Name <email@domain.com>"` |
| `to` | array | Yes | Recipient emails. Max 50 |
| `subject` | string | Yes | Email subject line |
| `html` | string | No* | HTML body |
| `text` | string | No* | Plain text body |
| `react` | ReactElement | No* | React Email component |
| `cc` | array | No | CC recipients |
| `bcc` | array | No | BCC recipients |
| `reply_to` | array | No | Reply-to addresses |
| `attachments` | array | No | File attachments |
| `headers` | object | No | Custom headers |
| `tags` | array | No | Tags for analytics |
| `scheduled_at` | string | No | Schedule send time (ISO 8601) |

*At least one of `html`, `text`, or `react` is required.

**Success Response (200):**
```json
{
  "id": "email_xxx"
}
```

**Error Response:**
```json
{
  "name": "missing_required_field",
  "message": "\"from\" field is required",
  "statusCode": 422
}
```

---

### Send Email (Node.js SDK — Recommended)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'Gavel <noreply@gavelgh.com>',
  to: ['buyer@example.com'],
  subject: 'Your order has been confirmed!',
  html: '<h1>Order Confirmed</h1><p>Your payment was successful.</p>',
});

if (error) {
  console.error('Email failed:', error);
}
```

---

### Send Batch Emails
Send multiple emails in a single API call:

```http
POST https://api.resend.com/emails/batch
```

```typescript
const { data, error } = await resend.batch.send([
  {
    from: 'Gavel <noreply@gavelgh.com>',
    to: ['seller1@example.com'],
    subject: 'Your payout has been sent',
    html: '<p>GHS 450 has been transferred to your account.</p>',
  },
  {
    from: 'Gavel <noreply@gavelgh.com>',
    to: ['seller2@example.com'],
    subject: 'Your payout has been sent',
    html: '<p>GHS 900 has been transferred to your account.</p>',
  },
]);
```

---

### Schedule Email
Send at a specific future time:

```typescript
await resend.emails.send({
  from: 'Gavel <noreply@gavelgh.com>',
  to: ['user@example.com'],
  subject: 'Your auction ends soon!',
  html: '<p>Your watched item ends in 1 hour.</p>',
  scheduled_at: '2026-04-01T09:00:00Z',
});
```

---

## 3. EMAIL MANAGEMENT

### Get Email Details
```http
GET https://api.resend.com/emails/{email_id}
```

```typescript
const { data } = await resend.emails.get('email_xxx');
```

**Response:**
```json
{
  "id": "email_xxx",
  "from": "Gavel <noreply@gavelgh.com>",
  "to": ["buyer@example.com"],
  "subject": "Order Confirmed",
  "status": "delivered",
  "created_at": "2026-03-24T10:00:00.000Z",
  "last_event": "delivered"
}
```

**Email Statuses:**
| Status | Meaning |
|--------|---------|
| `sent` | Submitted to Resend |
| `delivered` | Delivered to recipient's mail server |
| `delivery_delayed` | Temporary delay — will retry |
| `bounced` | Permanently failed delivery |
| `complained` | Marked as spam |
| `opened` | Email was opened (if tracking enabled) |
| `clicked` | Link was clicked (if tracking enabled) |

---

### Cancel Scheduled Email
```http
PATCH https://api.resend.com/emails/{email_id}/cancel
```

```typescript
await resend.emails.cancel('email_xxx');
```

---

## 4. DOMAINS

### List Domains
```http
GET https://api.resend.com/domains
```

```typescript
const { data } = await resend.domains.list();
```

---

### Verify Domain
After adding DNS records, verify your domain:
```http
POST https://api.resend.com/domains/{domain_id}/verify
```

**Gavel's domain:** `gavelgh.com`
DNS records needed: SPF, DKIM, DMARC

---

## 5. WEBHOOKS

Resend sends POST requests to your webhook URL for email events.

### Configure Webhook
In Resend dashboard → Webhooks → Add endpoint:
- URL: `https://gavelgh.com/api/webhooks/resend`
- Events: `email.delivered`, `email.bounced`, `email.complained`

### Webhook Payload:
```json
{
  "type": "email.delivered",
  "created_at": "2026-03-24T10:00:00.000Z",
  "data": {
    "email_id": "email_xxx",
    "from": "Gavel <noreply@gavelgh.com>",
    "to": ["buyer@example.com"],
    "subject": "Order Confirmed"
  }
}
```

### Webhook Events:
| Event | Description |
|-------|-------------|
| `email.sent` | Email submitted to Resend |
| `email.delivered` | Successfully delivered |
| `email.delivery_delayed` | Temporary delay |
| `email.bounced` | Permanent delivery failure |
| `email.complained` | Marked as spam |
| `email.opened` | Email opened |
| `email.clicked` | Link clicked |

---

## 6. CONTACTS & AUDIENCES

### Create Contact
```typescript
await resend.contacts.create({
  email: 'user@example.com',
  first_name: 'Darryl',
  last_name: 'Amoatey',
  unsubscribed: false,
  audience_id: 'audience_xxx',
});
```

### Remove Contact
```typescript
await resend.contacts.remove({
  email: 'user@example.com',
  audience_id: 'audience_xxx',
});
```

---

## 7. GAVEL-SPECIFIC IMPLEMENTATION

### Email Utility Function

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'Gavel <noreply@gavelgh.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo ? [replyTo] : undefined,
    });

    if (error) {
      console.error('[EMAIL FAILED]', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    return false;
  }
}
```

---

### Gavel Email Templates

```typescript
// lib/email-templates.ts

export const EMAIL_TEMPLATES = {

  // ─── ORDERS ───────────────────────────────────────────────

  orderConfirmed: (buyerName: string, itemName: string, amount: string, orderId: string) => ({
    subject: `✅ Order Confirmed — ${itemName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Order Confirmed!</h2>
        <p>Hi ${buyerName},</p>
        <p>Your payment of <strong>GHS ${amount}</strong> for <strong>${itemName}</strong> has been confirmed.</p>
        <p>The seller has been notified and will dispatch your item shortly.</p>
        <p>You'll receive another email when your item is on its way.</p>
        <a href="https://gavelgh.com/orders/${orderId}" 
           style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          View Order
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          Your payment is protected — funds are held securely until you confirm delivery.
        </p>
      </div>
    `,
  }),

  orderDispatched: (buyerName: string, itemName: string, trackingUrl: string, orderId: string) => ({
    subject: `🚚 Your order is on its way — ${itemName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Your Order Is On Its Way!</h2>
        <p>Hi ${buyerName},</p>
        <p><strong>${itemName}</strong> has been dispatched by the seller.</p>
        ${trackingUrl ? `
          <a href="${trackingUrl}" 
             style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Track Delivery
          </a>
        ` : ''}
        <p>Once you receive your item, please confirm delivery on Gavel to release payment to the seller.</p>
        <a href="https://gavelgh.com/orders/${orderId}" 
           style="color: #F97316; text-decoration: none;">
          View Order →
        </a>
      </div>
    `,
  }),

  orderDelivered: (buyerName: string, itemName: string, orderId: string) => ({
    subject: `📦 Confirm delivery — ${itemName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Did You Receive Your Order?</h2>
        <p>Hi ${buyerName},</p>
        <p>Your order for <strong>${itemName}</strong> has been marked as delivered.</p>
        <p>Please confirm that you've received it in good condition so we can release payment to the seller.</p>
        <a href="https://gavelgh.com/orders/${orderId}" 
           style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Confirm Delivery
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          If you don't confirm within 5 days, payment will be automatically released to the seller.
        </p>
      </div>
    `,
  }),

  // ─── AUCTIONS ─────────────────────────────────────────────

  auctionWon: (buyerName: string, itemName: string, amount: string, paymentLink: string) => ({
    subject: `🔨 You won! — ${itemName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">🎉 Congratulations, You Won!</h2>
        <p>Hi ${buyerName},</p>
        <p>You won the auction for <strong>${itemName}</strong> with a winning bid of <strong>GHS ${amount}</strong>.</p>
        <p>Complete your payment to secure your item:</p>
        <a href="${paymentLink}" 
           style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Complete Payment
        </a>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          Please complete payment within 48 hours to avoid losing your item.
        </p>
      </div>
    `,
  }),

  // ─── PAYOUTS ──────────────────────────────────────────────

  payoutSent: (sellerName: string, amount: string, orderId: string) => ({
    subject: `💰 Your payout of GHS ${amount} has been sent`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Payout Sent!</h2>
        <p>Hi ${sellerName},</p>
        <p>Your payout of <strong>GHS ${amount}</strong> for Order #${orderId} has been sent to your account.</p>
        <p>It should arrive within 1-2 business days depending on your bank or mobile money provider.</p>
        <a href="https://gavelgh.com/seller/payouts" 
           style="color: #F97316; text-decoration: none;">
          View Payout History →
        </a>
      </div>
    `,
  }),

  payoutOnHold: (sellerName: string, orderId: string) => ({
    subject: `⏸️ Your payout is under review`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Payout Under Review</h2>
        <p>Hi ${sellerName},</p>
        <p>Your payout for Order #${orderId} is currently under review by our team.</p>
        <p>We'll resolve this within 48 hours and notify you once it's released.</p>
        <p>If you have any questions, please contact us at support@gavelgh.com</p>
      </div>
    `,
  }),

  // ─── REFERRALS ────────────────────────────────────────────

  referralWelcome: (referrerName: string, referralCode: string, referralLink: string) => ({
    subject: `💰 Your Gavel referral link is ready`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Start Earning with Gavel!</h2>
        <p>Hi ${referrerName},</p>
        <p>Your referral code is: <strong>${referralCode}</strong></p>
        <p>Share your link and earn <strong>2% of every purchase</strong> your referrals make — forever!</p>
        <div style="background: #FFF7ED; border: 1px solid #F97316; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Your referral link:</p>
          <p style="margin: 4px 0; font-weight: bold;">${referralLink}</p>
        </div>
        <a href="https://gavelgh.com/referrals" 
           style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          View My Dashboard
        </a>
      </div>
    `,
  }),

  referralPayoutSent: (referrerName: string, amount: string, period: string) => ({
    subject: `💰 Your referral payout for ${period} has been sent`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Referral Payout Sent!</h2>
        <p>Hi ${referrerName},</p>
        <p>Your referral commission payout of <strong>GHS ${amount}</strong> for ${period} has been sent.</p>
        <a href="https://gavelgh.com/referrals" 
           style="color: #F97316; text-decoration: none;">
          View Earnings Dashboard →
        </a>
      </div>
    `,
  }),

  // ─── ACCOUNT ──────────────────────────────────────────────

  welcomeEmail: (userName: string) => ({
    subject: `Welcome to Gavel 🔨`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">Welcome to Gavel!</h2>
        <p>Hi ${userName},</p>
        <p>You've joined Ghana's first online auction and marketplace.</p>
        <p>Here's what you can do on Gavel:</p>
        <ul>
          <li>🔨 Bid on live auctions</li>
          <li>🛒 Buy products at fixed prices</li>
          <li>💰 Sell your items to 100+ buyers</li>
        </ul>
        <a href="https://gavelgh.com/market" 
           style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Start Exploring
        </a>
      </div>
    `,
  }),

  sellerApproved: (sellerName: string, shopName: string) => ({
    subject: `✅ Your seller account has been approved — ${shopName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F97316;">You're Approved to Sell on Gavel!</h2>
        <p>Hi ${sellerName},</p>
        <p>Your seller application for <strong>${shopName}</strong> has been approved.</p>
        <p>You can now start listing products and auctions on Gavel.</p>
        <a href="https://gavelgh.com/seller/dashboard" 
           style="background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Go to Seller Dashboard
        </a>
      </div>
    `,
  }),

};
```

---

## 8. ENVIRONMENT VARIABLES

```env
RESEND_API_KEY=re_xxxxxxxxx
```

---

## 9. DOMAIN SETUP FOR GAVELGH.COM

To send from `noreply@gavelgh.com`, add these DNS records:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
```

**DKIM Record:**
```
Type: TXT  
Name: resend._domainkey
Value: (provided by Resend dashboard)
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:darryl.amoatey@gavelgh.com
```

After adding records, go to Resend Dashboard → Domains → Verify.

---

## 10. PRICING (as of 2026)

| Plan | Emails/month | Price |
|------|-------------|-------|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20/mo |
| Scale | 100,000+ | $90/mo |

Gavel is likely on Free tier — 3,000 emails/month is enough for current scale.

---

## 11. ERROR CODES

| Code | Name | Meaning |
|------|------|---------|
| 401 | `missing_api_key` | API key not provided |
| 403 | `invalid_api_key` | Wrong API key |
| 422 | `missing_required_field` | Required field missing |
| 422 | `invalid_from_address` | From address not verified |
| 422 | `invalid_to_address` | Invalid recipient address |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_server_error` | Resend server error |

---

## 12. IMPORTANT NOTES FOR GAVEL

1. **Verify your domain** — emails from unverified domains go to spam
2. **From address must match verified domain** — `noreply@gavelgh.com` requires gavelgh.com to be verified
3. **HTML emails only** — always provide both `html` and `text` fallback
4. **Gavel orange** in emails — use `#F97316` for brand consistency
5. **Rate limits** — Free plan: 3,000/month, 100/day. Don't batch blast all users at once
6. **Test mode** — use `delivered@resend.dev` as recipient for testing without sending real emails
7. **React Email** — Resend supports React components as email templates for more complex designs
