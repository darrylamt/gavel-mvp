# Paystack API Reference — Gavel Ghana

> Base URL: `https://api.paystack.co`
> Authentication: `Authorization: Bearer YOUR_SECRET_KEY`
> All amounts are in **pesewas** (multiply GHS by 100)
> All responses are JSON with format: `{ status, message, data }`

---

## Authentication

```http
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx
Content-Type: application/json
```

---

## 1. TRANSACTIONS

### Initialize Transaction
Initiate a payment. Returns an `authorization_url` to redirect the customer to.

```http
POST /transaction/initialize
```

**Request Body:**
```json
{
  "email": "buyer@example.com",
  "amount": 50000,
  "currency": "GHS",
  "reference": "GAVEL-ORDER-123",
  "callback_url": "https://gavelgh.com/payment/callback",
  "metadata": {
    "order_id": "uuid",
    "type": "product_purchase"
  },
  "channels": ["card", "mobile_money", "bank_transfer"]
}
```

**Response:**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/xxx",
    "access_code": "xxx",
    "reference": "GAVEL-ORDER-123"
  }
}
```

---

### Verify Transaction
Verify a transaction after payment. Always verify on the server side.

```http
GET /transaction/verify/:reference
```

**Response:**
```json
{
  "status": true,
  "data": {
    "id": 123456,
    "status": "success",
    "reference": "GAVEL-ORDER-123",
    "amount": 50000,
    "currency": "GHS",
    "paid_at": "2026-03-24T10:00:00.000Z",
    "customer": {
      "email": "buyer@example.com"
    },
    "metadata": {
      "order_id": "uuid"
    }
  }
}
```

**Possible statuses:** `success`, `failed`, `abandoned`

---

### List Transactions

```http
GET /transaction?perPage=50&page=1&status=success&from=2026-01-01&to=2026-03-31
```

---

### Transaction Totals

```http
GET /transaction/totals
```

---

## 2. WEBHOOKS

Paystack sends POST requests to your webhook URL for payment events.

### Webhook Events relevant to Gavel:

| Event | Description |
|-------|-------------|
| `charge.success` | Payment was successful |
| `transfer.success` | Transfer to seller completed |
| `transfer.failed` | Transfer to seller failed |
| `transfer.reversed` | Transfer was reversed |

### Verifying Webhook Signature:
```typescript
import crypto from 'node:crypto';

function verifyPaystackWebhook(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');
  return hash === signature;
}

// In your webhook handler:
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';
  
  if (!verifyPaystackWebhook(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(rawBody);
  // handle event...
}
```

### Webhook Payload Example (charge.success):
```json
{
  "event": "charge.success",
  "data": {
    "id": 123456,
    "status": "success",
    "reference": "GAVEL-ORDER-123",
    "amount": 50000,
    "currency": "GHS",
    "paid_at": "2026-03-24T10:00:00.000Z",
    "customer": {
      "email": "buyer@example.com",
      "phone": "0241234567"
    },
    "metadata": {
      "order_id": "uuid",
      "type": "product_purchase"
    }
  }
}
```

---

## 3. TRANSFERS (Seller Payouts)

### Create Transfer Recipient
Register a seller's bank or MoMo account for payouts.

```http
POST /transferrecipient
```

**Bank Account (Ghana — ghipss):**
```json
{
  "type": "ghipss",
  "name": "Seller Full Name",
  "account_number": "1234567890",
  "bank_code": "030",
  "currency": "GHS"
}
```

**Mobile Money:**
```json
{
  "type": "mobile_money",
  "name": "Seller Full Name",
  "account_number": "0241234567",
  "bank_code": "MTN",
  "currency": "GHS"
}
```

**MoMo Bank Codes:**
| Network | Code |
|---------|------|
| MTN | `MTN` |
| Vodafone | `VOD` |
| AirtelTigo | `ATL` |

**Response:**
```json
{
  "status": true,
  "data": {
    "recipient_code": "RCP_xxxxxxxxxx",
    "type": "mobile_money",
    "name": "Seller Full Name",
    "account_number": "0241234567",
    "currency": "GHS"
  }
}
```

> Save `recipient_code` — used for all future transfers to this seller.

---

### Initiate Transfer
Send money to a seller.

```http
POST /transfer
```

```json
{
  "source": "balance",
  "amount": 45000,
  "recipient": "RCP_xxxxxxxxxx",
  "reason": "Payout for Order GAVEL-ORDER-123",
  "reference": "PAYOUT-uuid",
  "currency": "GHS"
}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "transfer_code": "TRF_xxxxxxxxxx",
    "status": "pending",
    "amount": 45000,
    "recipient": "RCP_xxxxxxxxxx"
  }
}
```

> `amount` is in pesewas. GHS 450 = 45000 pesewas.

---

### Fetch Transfer

```http
GET /transfer/:id_or_code
```

---

### List Transfers

```http
GET /transfer?perPage=50&page=1&status=success
```

**Transfer statuses:** `pending`, `success`, `failed`, `reversed`

---

### Transfer Approval Webhook
If you have Transfer Approval enabled in Paystack Settings, Paystack calls this URL before sending a transfer.

```http
POST /your-approval-endpoint
```

**Payload:**
```json
{
  "event": "transfer.approval",
  "data": {
    "transfer_code": "TRF_xxxxxxxxxx",
    "amount": 45000,
    "recipient": {
      "recipient_code": "RCP_xxxxxxxxxx",
      "name": "Seller Name"
    }
  }
}
```

**To approve:** return `{ "approved": true }`
**To reject:** return `{ "approved": false }`

---

## 4. BALANCE

### Fetch Balance
Check your Paystack balance before initiating transfers.

```http
GET /balance
```

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "currency": "GHS",
      "balance": 2500000
    }
  ]
}
```

> Balance is in pesewas. 2500000 = GHS 25,000.

---

## 5. CUSTOMERS

### Create Customer

```http
POST /customer
```

```json
{
  "email": "buyer@example.com",
  "first_name": "Darryl",
  "last_name": "Amoatey",
  "phone": "0547163794"
}
```

---

### Fetch Customer

```http
GET /customer/:email_or_code
```

---

## 6. BANKS (Ghana)

### List Ghanaian Banks

```http
GET /bank?country=ghana&currency=GHS&type=ghipss
```

**For MoMo:**
```http
GET /bank?country=ghana&currency=GHS&type=mobile_money
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "MTN Mobile Money",
      "code": "MTN",
      "type": "mobile_money"
    },
    {
      "id": 2,
      "name": "GCB Bank",
      "code": "040",
      "type": "ghipss"
    }
  ]
}
```

---

### Resolve Account Number
Verify a bank account is valid before creating a recipient.

```http
GET /bank/resolve?account_number=0241234567&bank_code=MTN
```

---

## 7. REFUNDS

### Create Refund

```http
POST /refund
```

```json
{
  "transaction": "GAVEL-ORDER-123",
  "amount": 50000,
  "currency": "GHS",
  "customer_note": "Order cancelled",
  "merchant_note": "Buyer requested refund"
}
```

---

## 8. GAVEL-SPECIFIC USAGE

### Commission Calculation
```typescript
const grossAmount = 50000; // pesewas
const commissionRate = 0.10; // 10%
const commissionAmount = grossAmount * commissionRate; // 5000 pesewas = GHS 50
const sellerPayoutAmount = grossAmount - commissionAmount; // 45000 pesewas = GHS 450
```

### Referral Commission Calculation
```typescript
const grossAmount = 50000; // pesewas
const referralRate = 0.02; // 2%
const referralCommission = grossAmount * referralRate; // 1000 pesewas = GHS 10
const gavelKeeps = grossAmount * 0.08; // 4000 pesewas = GHS 40
```

### Initiating a Transfer (TypeScript utility)
```typescript
export async function initiateTransfer({
  recipientCode,
  amountGHS,
  reason,
  reference,
}: {
  recipientCode: string;
  amountGHS: number;
  reason: string;
  reference: string;
}) {
  const response = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amountGHS * 100), // convert GHS to pesewas
      recipient: recipientCode,
      reason,
      reference,
      currency: 'GHS',
    }),
  });

  const data = await response.json();
  if (!data.status) throw new Error(data.message);
  return data.data;
}
```

### Token Purchase Payment
```typescript
// Token packages
const TOKEN_PACKAGES = {
  starter: { tokens: 10, amountGHS: 10 },
  popular: { tokens: 30, amountGHS: 25 },
  best_value: { tokens: 70, amountGHS: 50 },
};

// Initialize payment
const response = await fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: user.email,
    amount: TOKEN_PACKAGES.popular.amountGHS * 100,
    currency: 'GHS',
    reference: `TOKEN-${userId}-${Date.now()}`,
    metadata: {
      type: 'token_purchase',
      user_id: userId,
      package: 'popular',
      tokens: 30,
    },
  }),
});
```

---

## 9. ERROR CODES

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad request — invalid parameters |
| 401 | Unauthorized — invalid API key |
| 404 | Resource not found |
| 422 | Unprocessable — validation error |
| 429 | Rate limited |
| 500 | Paystack server error |

---

## 10. TEST CREDENTIALS (Ghana)

### Test Cards:
| Card | Number | CVV | Expiry |
|------|--------|-----|--------|
| Success | 4084 0840 8408 4081 | 408 | 01/99 |
| Declined | 4084 0840 8408 4085 | 408 | 01/99 |

### Test MoMo:
- Use any valid Ghana phone number format
- Amount below GHS 10,000 will succeed
- Paystack will send a prompt to the number in test mode

### Test Bank Transfer:
- Use account number `0000000000` with any bank code

---

## 11. IMPORTANT NOTES FOR GAVEL

1. **Always verify transactions server-side** — never trust client-side confirmation
2. **Webhook signature verification is mandatory** — use `x-paystack-signature` header
3. **Amount is always in pesewas** — multiply GHS by 100
4. **Transfer approval is enabled** — your `/api/paystack/approve-transfer` endpoint must respond quickly
5. **Balance must cover transfers** — check balance before initiating bulk payouts
6. **Idempotent references** — use unique references to prevent duplicate charges
7. **Ghana currency code** — always use `GHS` not `NGN`
8. **Ghana bank type** — use `ghipss` for bank accounts, `mobile_money` for MoMo

---

## 12. USEFUL LINKS

- Paystack Dashboard: https://dashboard.paystack.com
- Webhook logs: Dashboard → Settings → API Keys & Webhooks
- Transfer history: Dashboard → Transfers
- Balance: Dashboard → Balance
- Test mode toggle: Top right of dashboard
