# Arkesel SMS API Reference — Gavel Ghana

> Base URL (v2): `https://sms.arkesel.com/api/v2`
> Authentication: API key in request **header** as `api-key`
> Phone format: Always use international format `233XXXXXXXXX` (no + prefix)
> Dashboard: https://sms.arkesel.com

---

## IMPORTANT — Gavel Uses v2 API

Arkesel has two API versions:
- **v1** — legacy, API key in URL query param (DO NOT USE)
- **v2** — current, API key in header (USE THIS)

Always use v2. The key difference is authentication method.

---

## 1. AUTHENTICATION

```http
api-key: YOUR_API_KEY
Content-Type: application/json
```

**Gavel's API key** is stored in Vercel as `ARKESEL_API_KEY`

---

## 2. SEND SMS

### Send Single SMS
```http
POST https://sms.arkesel.com/api/v2/sms/send
```

**Headers:**
```http
api-key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "sender": "Gavel",
  "message": "Your order has been confirmed!",
  "recipients": ["233241234567"],
  "sandbox": false
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sender` | string | Yes | Sender ID (max 11 chars). Must be registered with Arkesel |
| `message` | string | Yes | SMS message content |
| `recipients` | array | Yes | Array of phone numbers in international format |
| `sandbox` | boolean | No | Set `true` for testing — SMS not actually sent, not billed |

**Success Response:**
```json
{
  "status": "success",
  "data": [
    {
      "recipient": "233241234567",
      "id": "msg_xxx",
      "status": "sent"
    }
  ]
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Authentication Failed"
}
```

---

### Send Bulk SMS (Multiple Recipients)
Same endpoint — just pass multiple numbers in `recipients` array:

```json
{
  "sender": "Gavel",
  "message": "Eid Mubarak from Gavel! 🌙",
  "recipients": [
    "233241234567",
    "233501234567",
    "233271234567"
  ],
  "sandbox": false
}
```

---

### Send Scheduled SMS
```json
{
  "sender": "Gavel",
  "message": "Your appointment is tomorrow at 10am",
  "recipients": ["233241234567"],
  "scheduled_date": "2026-04-01 09:00:00",
  "sandbox": false
}
```

> Date format: `YYYY-MM-DD HH:MM:SS`

---

## 3. OTP (One-Time Password)

### Generate & Send OTP
```http
POST https://sms.arkesel.com/api/otp/generate
```

**Headers:**
```http
api-key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "expiry": 5,
  "length": 6,
  "medium": "sms",
  "message": "Your Gavel OTP is %otp_code%. Valid for 5 minutes.",
  "number": "233241234567",
  "sender_id": "Gavel",
  "type": "numeric"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `expiry` | integer | OTP expiry in minutes |
| `length` | integer | OTP code length (4-8 digits) |
| `medium` | string | `sms` or `voice` |
| `message` | string | Message template — use `%otp_code%` as placeholder |
| `number` | string | Recipient phone in international format |
| `sender_id` | string | Sender ID (max 11 chars) |
| `type` | string | `numeric`, `alphabetic`, or `alphanumeric` |

**Success Response:**
```json
{
  "code": "1001",
  "message": "OTP sent successfully"
}
```

---

### Verify OTP
```http
POST https://sms.arkesel.com/api/otp/verify
```

```json
{
  "code": "123456",
  "number": "233241234567"
}
```

**Headers:**
```http
api-key: YOUR_API_KEY
Content-Type: application/json
```

**Success Response:**
```json
{
  "code": "1001",
  "message": "OTP verified successfully"
}
```

**Failed Response:**
```json
{
  "code": "1003",
  "message": "OTP is not valid"
}
```

---

### OTP Response Codes
| Code | Meaning |
|------|---------|
| `1001` | OTP sent/verified successfully |
| `1002` | OTP expired |
| `1003` | OTP is not valid |
| `1004` | OTP already verified |
| `1005` | Phone number not found |
| `1006` | OTP generation failed |
| `1007` | Insufficient balance |
| `1008` | Balance depleted |
| `1009` | Message exceeds 500 chars (voice only) |

---

## 4. CHECK BALANCE

```http
GET https://sms.arkesel.com/api/v2/clients/balance-details
```

**Headers:**
```http
api-key: YOUR_API_KEY
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "balance": "1635",
    "currency": "SMS Credits"
  }
}
```

> Gavel currently has ~1,635 SMS credits. Monitor this and top up when low.

---

## 5. CHECK MESSAGE STATUS

```http
GET https://sms.arkesel.com/api/v2/sms/{message_id}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "msg_xxx",
    "recipient": "233241234567",
    "status": "delivered",
    "sent_at": "2026-03-24T10:00:00Z"
  }
}
```

**Message Statuses:**
| Status | Meaning |
|--------|---------|
| `sent` | Submitted to network |
| `delivered` | Confirmed delivered to handset |
| `failed` | Delivery failed |
| `pending` | Queued for delivery |

---

## 6. GAVEL-SPECIFIC IMPLEMENTATION

### Phone Number Formatting
Always convert Ghanaian numbers to international format:

```typescript
export function formatGhanaPhone(phone: string): string {
  // Remove all spaces and special chars
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  // Already has country code
  if (cleaned.startsWith('233')) return cleaned;
  
  // Has + prefix
  if (cleaned.startsWith('0')) {
    return '233' + cleaned.slice(1);
  }
  
  return cleaned;
}

// Examples:
// 0241234567 → 233241234567
// +233241234567 → 233241234567
// 233241234567 → 233241234567
```

---

### Gavel SMS Utility Function
Located at `lib/arkesel.ts` or `lib/sms.ts`:

```typescript
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!process.env.ARKESEL_ENABLED || process.env.ARKESEL_ENABLED !== 'true') {
    console.log(`[SMS SKIPPED] To: ${phone} | Message: ${message}`);
    return true;
  }

  const formattedPhone = formatGhanaPhone(phone);

  try {
    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': process.env.ARKESEL_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: 'Gavel',
        message,
        recipients: [formattedPhone],
        sandbox: false,
      }),
    });

    const data = await response.json();

    if (data.status !== 'success') {
      console.error('[SMS FAILED]', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SMS ERROR]', error);
    return false;
  }
}
```

---

### OTP Flow for Phone Verification (Referral System)

```typescript
// Step 1 — Send OTP
export async function sendPhoneOTP(phone: string): Promise<boolean> {
  const formattedPhone = formatGhanaPhone(phone);
  
  const response = await fetch('https://sms.arkesel.com/api/otp/generate', {
    method: 'POST',
    headers: {
      'api-key': process.env.ARKESEL_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expiry: 5,
      length: 6,
      medium: 'sms',
      message: 'Your Gavel verification code is %otp_code%. Valid for 5 minutes.',
      number: formattedPhone,
      sender_id: 'Gavel',
      type: 'numeric',
    }),
  });

  const data = await response.json();
  return data.code === '1001';
}

// Step 2 — Verify OTP
export async function verifyPhoneOTP(phone: string, code: string): Promise<boolean> {
  const formattedPhone = formatGhanaPhone(phone);

  const response = await fetch('https://sms.arkesel.com/api/otp/verify', {
    method: 'POST',
    headers: {
      'api-key': process.env.ARKESEL_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      number: formattedPhone,
    }),
  });

  const data = await response.json();
  return data.code === '1001';
}
```

---

### Gavel SMS Templates

```typescript
export const SMS_TEMPLATES = {
  // Orders
  orderConfirmed: (itemName: string) =>
    `Your Gavel payment is confirmed! Your item "${itemName}" will be dispatched soon.`,

  orderDispatched: (trackingUrl: string) =>
    `Your Gavel order has been dispatched! Track it here: ${trackingUrl}`,

  orderDelivered: () =>
    `Your Gavel order has been delivered! Please confirm receipt on gavelgh.com 🎉`,

  // Auctions
  outbid: (itemName: string, currentBid: string) =>
    `You've been outbid on "${itemName}"! Current bid is GHS ${currentBid}. Bid again: gavelgh.com`,

  auctionWon: (itemName: string) =>
    `🎉 You won "${itemName}" on Gavel! Complete your payment at gavelgh.com`,

  auctionEndingSoon: (itemName: string) =>
    `"${itemName}" you're watching ends in 1 hour! Bid now: gavelgh.com`,

  // Payouts
  payoutSent: (amount: string) =>
    `Your Gavel payout of GHS ${amount} has been sent! 🎉`,

  payoutOnHold: () =>
    `Your Gavel payout is under review. Our team will resolve this within 24 hours.`,

  // Referrals
  referralEarned: (amount: string, referredUser: string) =>
    `You earned GHS ${amount} from ${referredUser}'s purchase on Gavel! 💰`,

  referralPayout: (amount: string, month: string) =>
    `Your Gavel referral payout of GHS ${amount} for ${month} has been sent! 🎉`,

  // Phone Swap
  swapApproved: (expiryDate: string) =>
    `Your Gavel phone swap is approved! Book your appointment before ${expiryDate}: gavelgh.com/swap`,

  swapAppointmentReminder: (time: string, balance: string) =>
    `Reminder: Your Gavel phone swap appointment is tomorrow at ${time}. Bring your phone and GHS ${balance}.`,

  swapComplete: () =>
    `Swap complete! Enjoy your new phone 🎉 - Gavel`,
};
```

---

## 7. ENVIRONMENT VARIABLES

```env
ARKESEL_API_KEY=your_api_key_here
ARKESEL_ENABLED=true
ARKESEL_DEFAULT_COUNTRY_CODE=233
ARKESEL_DISPATCH_SECRET=gavel-sms-dispatch-7f3a9c2e1b4d6k8h
```

---

## 8. EasyCron Dispatch Setup

Gavel uses EasyCron to batch-dispatch queued SMS notifications:

- **Endpoint:** `https://gavelgh.com/api/arkesel/dispatch`
- **Method:** GET
- **Auth:** `?secret=ARKESEL_DISPATCH_SECRET`
- **Frequency:** Every 5-10 minutes
- **Purpose:** Processes `sms_notifications` table queue and sends pending messages

---

## 9. SENDER ID REGISTRATION

The sender ID `Gavel` must be registered with Arkesel before use in production.

To register:
1. Log in to https://sms.arkesel.com
2. Go to **Sender IDs**
3. Submit `Gavel` for approval
4. Approval typically takes 1-3 business days

Until approved, use `ArkeselSMS` as fallback sender ID.

---

## 10. ERROR CODES (v2)

| Code | Meaning | Fix |
|------|---------|-----|
| `error` | Authentication failed | Check API key in header (not URL) |
| `invalid_phone` | Phone number invalid | Ensure international format `233XXXXXXXXX` |
| `insufficient_balance` | Not enough credits | Top up at sms.arkesel.com |
| `invalid_sender` | Sender ID not registered | Register sender ID in dashboard |
| `message_too_long` | Message exceeds 160 chars | Split into multiple SMS or shorten |

---

## 11. IMPORTANT NOTES FOR GAVEL

1. **Always use v2 API** — key goes in header as `api-key`, NOT in URL
2. **Phone format** — always `233XXXXXXXXX`, never `0XXXXXXXXX` or `+233XXXXXXXXX`
3. **Sender ID max 11 characters** — `Gavel` is 5 chars, fine
4. **Sandbox mode** — set `"sandbox": true` for testing, no credits charged
5. **Balance monitoring** — check balance regularly, SMS fails silently when balance is 0
6. **ARKESEL_ENABLED flag** — set to `false` in local dev to avoid accidental SMS sends
