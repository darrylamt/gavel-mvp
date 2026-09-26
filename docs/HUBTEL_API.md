# HUBTEL PAYMENT API REFERENCE

> Last updated: April 30, 2026
> This file is a complete reference for all Hubtel payment APIs. Use it to implement any payment flow in a Next.js / TypeScript / Supabase project.

---

## TABLE OF CONTENTS

1. [Authentication](#authentication)
2. [Critical Rules](#critical-rules)
3. [IP Whitelisting](#ip-whitelisting)
4. [Online Checkout API](#online-checkout-api)
5. [Checkout SDK (JavaScript)](#checkout-sdk-javascript)
6. [Direct Receive Money](#direct-receive-money)
7. [Direct Send Money](#direct-send-money)
8. [Direct Send-To-Bank](#direct-send-to-bank)
9. [Direct Debit Money](#direct-debit-money)
10. [Recurring Invoice](#recurring-invoice)
11. [Commission Services](#commission-services)
12. [Invoicing API](#invoicing-api)
13. [Transaction Status Check](#transaction-status-check)
14. [Response Codes Reference](#response-codes-reference)
15. [Available Channels Reference](#available-channels-reference)

---

## AUTHENTICATION

All Hubtel API requests use **HTTP Basic Authentication**.

```
Authorization: Basic <base64(apiId:apiKey)>
```

- Encode your API ID and API Key as a Base64 string.
- **DO NOT** prefix with the word `Basic` in your encoded string — only in the header.
- The encoded string is the same `basicAuth` / `apiKey` value used across all SDKs and APIs.

---

## CRITICAL RULES

These rules apply to every single Hubtel API integration:

1. **`clientReference` must be unique per transaction** — never reuse a clientReference. Duplicates will cause transaction failures.
2. **Maximum length of `clientReference` is 36 characters** — preferably alphanumeric.
3. **Amounts allow only 2 decimal places** — e.g. `0.50`, not `0.5000`.
4. **All callbacks are asynchronous** — never assume a transaction is complete from the initial response alone. Always implement a callback endpoint.
5. **If no callback is received within 5 minutes**, call the Transaction Status Check API. This is mandatory.
6. **Phone numbers must be in international format** — e.g. `233240000000`, not `0240000000`.
7. **All endpoints require IP whitelisting** — maximum 4 IPs per service. Submit IPs to your Retail Systems Engineer.

---

## IP WHITELISTING

- All Hubtel API endpoints are live and only accept requests from whitelisted IPs.
- Requests from non-whitelisted IPs return `403 Forbidden` or timeout.
- Maximum of **4 IP addresses** per service.
- Submit your public IPs to your Retail Systems Engineer.

---

## ONLINE CHECKOUT API

Use this to accept online payments by redirecting customers to Hubtel's checkout page or embedding it on your site.

### When to use
- You want a hosted checkout experience (redirect or iframe).
- You support: Mobile Money, Bank Card, Wallet (Hubtel, G-Money, Zeepay), GhQR, Cash/Cheque.
- You do NOT need to handle the payment flow yourself.

### Two Integration Types
- **Redirect Checkout** — Customer is redirected to `checkoutUrl` on Hubtel's site.
- **Onsite Checkout** — Embed `checkoutDirectUrl` in an iframe on your own page.

### Initiate Checkout

```
POST https://payproxyapi.hubtel.com/items/initiate
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| totalAmount | Float | Yes | Total amount to pay (max 2 decimal places) |
| description | String | Yes | Brief description of the purchase |
| callbackUrl | String | Yes | Your server endpoint to receive final payment status |
| returnUrl | String | Yes | Where to redirect customer after payment |
| merchantAccountNumber | String | Yes | Your Hubtel Collection Account Number |
| cancellationUrl | String | Yes | Where to redirect customer after cancellation |
| clientReference | String | Yes | Unique transaction ID (max 32 chars) |
| payeeName | String | No | Customer name |
| payeeMobileNumber | String | No | Customer phone number |
| payeeEmail | String | No | Customer email |

**Sample Request:**
```json
{
    "totalAmount": 100,
    "description": "Book Shop Checkout",
    "callbackUrl": "https://yourdomain.com/hubtel/callback",
    "returnUrl": "https://yourdomain.com/payment/success",
    "merchantAccountNumber": "YOUR_COLLECTION_ACCOUNT",
    "cancellationUrl": "https://yourdomain.com/payment/cancelled",
    "clientReference": "inv0012"
}
```

**Sample Response (200 OK):**
```json
{
    "responseCode": "0000",
    "status": "Success",
    "data": {
        "checkoutUrl": "https://pay.hubtel.com/7569a11e8b784f21baa9443b3fce31ed",
        "checkoutId": "7569a11e8b784f21baa9443b3fce31ed",
        "clientReference": "inv0012",
        "checkoutDirectUrl": "https://pay.hubtel.com/7569a11e8b784f21baa9443b3fce31ed/direct"
    }
}
```

- Use `checkoutUrl` for Redirect Checkout.
- Use `checkoutDirectUrl` for Onsite/Iframe Checkout.

### Checkout Callback

Hubtel POSTs to your `callbackUrl` when payment completes.

**Sample Successful Callback:**
```json
{
    "ResponseCode": "0000",
    "Status": "Success",
    "Data": {
        "CheckoutId": "59e2fbbff4e443b98e09346881ac7e9a",
        "SalesInvoiceId": "e96ccfb4746045bba13f425bd573a31c",
        "ClientReference": "inv0012",
        "Status": "Success",
        "Amount": 0.5,
        "CustomerPhoneNumber": "233242825109",
        "PaymentDetails": {
            "MobileMoneyNumber": "233242825109",
            "PaymentType": "mobilemoney",
            "Channel": "mtn-gh"
        },
        "Description": "The MTN Mobile Money payment has been approved and processed successfully."
    }
}
```

### Transaction Status Check (Checkout)

```
GET https://api-txnstatus.hubtel.com/transactions/{Collection_Account_Number}/status?clientReference={clientReference}
Authorization: Basic <encoded>
```

---

## CHECKOUT SDK (JAVASCRIPT)

Use this to embed Hubtel checkout in a web app using NPM or CDN.

### Installation

```bash
npm i @hubteljs/checkout
```

Or via CDN in your HTML file.

### Three Integration Methods

#### 1. Redirect (opens in new tab/window)

```javascript
import CheckoutSdk from "@hubteljs/checkout";

const checkout = new CheckoutSdk();

const purchaseInfo = {
  amount: 50,
  purchaseDescription: "Payment for order #1234",
  customerPhoneNumber: "233240000000",
  clientReference: "unique-ref-12345", // must be unique
};

const config = {
  branding: "enabled",           // or "disabled"
  callbackUrl: "https://yourdomain.com/hubtel/callback",
  merchantAccount: 11334,        // your Collection Account Number (as number)
  basicAuth: "your-basic-auth",  // base64 encoded apiId:apiKey
};

checkout.redirect({ purchaseInfo, config });
```

#### 2. Iframe (embeds in your page)

Add a container div to your HTML:
```html
<div id="hubtel-checkout-iframe"></div>
```

Then initialize:
```javascript
checkout.initIframe({
  purchaseInfo,
  config,
  iframeStyle: { width: '100%', height: '100%', border: 'none' },
  callBacks: {
    onInit: () => console.log('Initialized'),
    onPaymentSuccess: (data) => console.log('Success', data),
    onPaymentFailure: (data) => console.log('Failed', data),
    onLoad: () => console.log('Loaded'),
    onFeesChanged: (fees) => console.log('Fees changed', fees),
    onResize: (size) => console.log('Resized', size?.height),
  }
});
```

#### 3. Modal (popup overlay)

```javascript
checkout.openModal({
  purchaseInfo,
  config,
  callBacks: {
    onInit: () => {},
    onPaymentSuccess: (data) => {
      checkout.closePopUp(); // close modal on success
    },
    onPaymentFailure: (data) => {},
    onLoad: () => {},
    onFeesChanged: (fees) => {},
    onResize: (size) => {},
    onClose: () => {},
  },
});
```

### Config Parameters

| Parameter | Type | Description |
|---|---|---|
| branding | String | `"enabled"` or `"disabled"` — show/hide business name and logo |
| callbackUrl | String | Your server URL to receive payment result |
| merchantAccount | Number | Your Hubtel Collection Account Number |
| basicAuth | String | Base64 encoded API credentials |
| integrationType | String | Default `"External"` — leave as is for external integrations |

### Pre-Checkout Pattern

Most apps call their own backend first to create the order, then pass the response to the SDK:

```javascript
// 1. Call your backend
const res = await fetch('/api/create-order', { method: 'POST', body: JSON.stringify({ amount, phoneNumber }) });
const { data } = await res.json();
// data contains: description, clientReference, amount, customerMobileNumber, callbackUrl

// 2. Pass to Hubtel SDK
checkout.openModal({
  purchaseInfo: {
    amount: data.amount,
    purchaseDescription: data.description,
    customerPhoneNumber: data.customerMobileNumber,
    clientReference: data.clientReference,
  },
  config: { ... }
});
```

---

## DIRECT RECEIVE MONEY

Use this to pull money directly from a customer's mobile money wallet into your Hubtel Collection Account. The customer receives a prompt on their phone to approve.

### When to use
- You know the customer's MoMo number.
- You want to charge the customer without redirecting to a checkout page.
- Supported networks: MTN, Telecel, AirtelTigo.

> **Security requirement:** Only allow registered users to trigger this, or send an OTP to verify the number before initiating. Do not allow users to edit their number before payment.

### Initiate Receive Money

```
POST https://rmp.hubtel.com/merchantaccount/merchants/{Collection_Account_Number}/receive/mobilemoney
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| CustomerName | String | No | Name on customer's MoMo wallet |
| CustomerMsisdn | String | Yes | Customer MoMo number in international format (e.g. `233240000000`) |
| CustomerEmail | String | No | Customer email |
| Channel | String | Yes | `mtn-gh`, `vodafone-gh`, or `tigo-gh` |
| Amount | Float | Yes | Amount to debit (max 2 decimal places) |
| PrimaryCallbackUrl | String | Yes | Your endpoint to receive final transaction status |
| Description | String | Yes | Brief transaction description |
| ClientReference | String | Yes | Unique reference (max 36 chars) |

**Sample Request:**
```json
{
    "CustomerName": "Joe Doe",
    "CustomerMsisdn": "233200000000",
    "CustomerEmail": "joe@example.com",
    "Channel": "mtn-gh",
    "Amount": 50.00,
    "PrimaryCallbackUrl": "https://yourdomain.com/hubtel/callback",
    "Description": "Payment for order #1234",
    "ClientReference": "order-1234-unique-ref"
}
```

**Initial Response (200 OK) — ResponseCode `0001` means pending:**
```json
{
    "Message": "Transaction pending. Expect callback request for final state",
    "ResponseCode": "0001",
    "Data": {
        "TransactionId": "09f84e20a283942e807128e8c21d08d6",
        "Description": "Payment for order #1234",
        "ClientReference": "order-1234-unique-ref",
        "Amount": 50.00,
        "Charges": 0.05,
        "AmountAfterCharges": 50.00,
        "AmountCharged": 50.05,
        "DeliveryFee": 0.0
    }
}
```

### Receive Money Callback

Hubtel POSTs to your `PrimaryCallbackUrl` when the customer approves or rejects.

**Successful Callback:**
```json
{
    "ResponseCode": "0000",
    "Message": "success",
    "Data": {
        "Amount": 50.00,
        "Charges": 0.05,
        "AmountAfterCharges": 50.00,
        "Description": "The MTN Mobile Money payment has been approved and processed successfully",
        "ClientReference": "order-1234-unique-ref",
        "TransactionId": "09f84e20a283942e807128e8c21d08d6",
        "ExternalTransactionId": "2116938399",
        "AmountCharged": 50.05,
        "OrderId": "09f84e20a283942e807128e8c21d08d6",
        "PaymentDate": "2024-05-14T00:44:57.5142719Z"
    }
}
```

**Failed Callback:**
```json
{
    "ResponseCode": "2001",
    "Message": "failed",
    "Data": { ... }
}
```

### Transaction Status Check (Receive Money)

```
GET https://api-txnstatus.hubtel.com/transactions/{Collection_Account_Number}/status?clientReference={clientReference}
Authorization: Basic <encoded>
```

---

## DIRECT SEND MONEY

Use this to push money from your Hubtel Disbursement Account to a customer's mobile money wallet.

### When to use
- Payouts, refunds, commissions, winnings.
- You must have enough balance in your **Disbursement Account** (separate from Collection Account).

### Initiate Send Money

```
POST https://smp.hubtel.com/api/merchants/{Disbursement_Account_Number}/send/mobilemoney
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| RecipientName | String | Yes | Name on recipient's MoMo wallet (or use their msisdn if name unknown) |
| RecipientMsisdn | String | Yes | Recipient MoMo number in international format |
| CustomerEmail | String | No | Recipient email |
| Channel | String | Yes | `mtn-gh`, `vodafone-gh`, or `tigo-gh` |
| Amount | Float | Yes | Amount to send (max 2 decimal places) |
| PrimaryCallbackURL | String | Yes | Your endpoint to receive final transaction status |
| Description | String | Yes | Brief transaction description |
| ClientReference | String | Yes | Unique reference (max 36 chars) |

**Sample Request:**
```json
{
    "RecipientName": "Jane Doe",
    "RecipientMsisdn": "233200000000",
    "Channel": "mtn-gh",
    "Amount": 100.00,
    "PrimaryCallbackURL": "https://yourdomain.com/hubtel/callback",
    "Description": "Auction payout",
    "ClientReference": "payout-5678-unique-ref"
}
```

**Initial Response — ResponseCode `0001` means accepted/pending:**
```json
{
    "ResponseCode": "0001",
    "Data": {
        "AmountDebited": 0.0,
        "TransactionId": "09f84e20a283942e807128e8c21d0303",
        "Description": "Your request has been accepted. We will notify you when the transaction is completed.",
        "ClientReference": "payout-5678-unique-ref",
        "Amount": 100.00,
        "Charges": 0.0
    }
}
```

### Send Money Callback

**Successful:**
```json
{
    "ResponseCode": "0000",
    "Data": {
        "AmountDebited": 100.00,
        "TransactionId": "09f84e20a283942e807128e8c21d0303",
        "ExternalTransactionId": "142116938399",
        "Description": "MTN Mobile Money payment made successfully",
        "ClientReference": "payout-5678-unique-ref",
        "Amount": 100.00,
        "Charges": 0.10,
        "RecipientName": "Jane Doe"
    }
}
```

### Transaction Status Check (Send Money)

```
GET https://smrsc.hubtel.com/api/merchants/{Disbursement_Account_Number}/transactions/status?clientReference={clientReference}
Authorization: Basic <encoded>
```

> Note: Send Money uses a different status check endpoint (`smrsc.hubtel.com`) than Receive Money (`api-txnstatus.hubtel.com`).

---

## DIRECT SEND-TO-BANK

Use this to send money from your Hubtel Disbursement Account directly to a Ghana bank account via GhIPSS.

### When to use
- Payouts to bank accounts instead of MoMo wallets.
- Requires sufficient balance in your Disbursement Account.

### Available Banks

| Bank | BankCode |
|---|---|
| STANDARD CHARTERED BANK | 300302 |
| ABSA BANK GHANA LIMITED | 300303 |
| GCB BANK LIMITED | 300304 |
| NATIONAL INVESTMENT BANK | 300305 |
| ARB APEX BANK LIMITED | 300306 |
| AGRICULTURAL DEVELOPMENT BANK | 300307 |
| UNIVERSAL MERCHANT BANK | 300309 |
| REPUBLIC BANK LIMITED | 300310 |
| ZENITH BANK GHANA LTD | 300311 |
| ECOBANK GHANA LTD | 300312 |
| CAL BANK LIMITED | 300313 |
| FIRST ATLANTIC BANK | 300316 |
| PRUDENTIAL BANK LTD | 300317 |
| STANBIC BANK | 300318 |
| FIRST BANK OF NIGERIA | 300319 |
| BANK OF AFRICA | 300320 |
| GUARANTY TRUST BANK | 300322 |
| FIDELITY BANK LIMITED | 300323 |
| SAHEL-SAHARA BANK (BSIC) | 300324 |
| UNITED BANK OF AFRICA | 300325 |
| ACCESS BANK LTD | 300329 |
| CONSOLIDATED BANK GHANA | 300331 |
| FIRST NATIONAL BANK | 300334 |
| GHL BANK | 300362 |

### Initiate Send-To-Bank

```
POST https://smp.hubtel.com/api/merchants/{Disbursement_Account_Number}/send/bank/gh/{BankCode}
Content-Type: application/json
Authorization: Basic <encoded>
```

Replace `{BankCode}` with the recipient's bank code from the table above.

**Request Body:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| Amount | Float | Yes | Amount to send (max 2 decimal places) |
| PrimaryCallbackURL | String | Yes | Your endpoint to receive final transaction status |
| Description | String | Yes | Brief transaction description |
| BankAccountNumber | String | Yes | Recipient's bank account number |
| BankAccountName | String | No | Name on the bank account |
| RecipientPhoneNumber | String | No | Recipient's phone number |
| BankName | String | No | Bank name |
| BankBranch | String | No | Bank branch |
| BankBranchCode | String | No | Branch code (can be empty string) |
| ClientReference | String | Yes | Unique reference (max 36 chars) |

**Sample Request (Zenith Bank):**
```json
{
    "Amount": 500.00,
    "BankAccountNumber": "4XXXXXXXXX",
    "BankAccountName": "Jane Doe",
    "ClientReference": "bank-payout-9012",
    "PrimaryCallbackUrl": "https://yourdomain.com/hubtel/callback",
    "Description": "Seller payout",
    "BankName": "",
    "BankBranch": "",
    "BankBranchCode": "",
    "RecipientPhoneNumber": ""
}
```

### Transaction Status Check (Send-To-Bank)

```
GET https://smrsc.hubtel.com/api/merchants/{Disbursement_Account_Number}/transactions/status?clientReference={clientReference}
Authorization: Basic <encoded>
```

---

## DIRECT DEBIT MONEY

Use this to silently debit a customer's MoMo wallet without requiring a PIN or OTP on each charge — after a one-time customer preapproval. Good for subscriptions.

### When to use
- Subscription billing, membership fees, instalment deductions.
- Supported networks: MTN (`mtn-gh-direct-debit`), Telecel (`vodafone-gh-direct-debit`).
- Requires a one-time preapproval process per customer wallet per merchant account.

### Flow Overview

```
1. Initiate Preapproval  →  Customer approves via USSD or OTP
2. (Optional) Verify OTP  →  Only if verificationType = "OTP"
3. Receive Preapproval Callback  →  PreapprovalStatus = "APPROVED"
4. Initiate Debit Charge  →  Silent debit, no customer action needed
5. Receive Debit Callback
```

---

### STEP 1: Initiate Preapproval

```
POST https://preapproval.hubtel.com/api/v2/merchant/{Collection_Account_Number}/preapproval/initiate
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| clientReferenceId | String | Yes | Unique reference (max 36 chars) |
| customerMsisdn | String | Yes | Customer MoMo number in international format (no `+`) |
| channel | String | Yes | `mtn-gh-direct-debit` or `vodafone-gh-direct-debit` |
| callbackUrl | String | Yes | Your endpoint to receive preapproval status |

**Sample Request:**
```json
{
    "clientReferenceId": "preapproval-customer-001",
    "customerMsisdn": "233200000000",
    "channel": "mtn-gh-direct-debit",
    "callbackUrl": "https://yourdomain.com/hubtel/preapproval-callback"
}
```

**Response:**
```json
{
    "message": "Request received! Pending preapproval",
    "responseCode": "2000",
    "data": {
        "hubtelPreApprovalId": "5f20092321d54eefb974dbfea6de5c34",
        "clientReferenceId": "preapproval-customer-001",
        "verificationType": "OTP",   // or "USSD"
        "otpPrefix": "HNRM",         // null if USSD
        "preapprovalStatus": "PENDING"
    }
}
```

- If `verificationType` is `"USSD"` — customer will get a USSD prompt. Skip to waiting for callback.
- If `verificationType` is `"OTP"` — customer gets an OTP. Proceed to Step 2.

**MTN USSD fallback:** If customer misses the USSD prompt:
```
Dial *170# > 6. My Wallet > 3. My Approvals > 2. PreApprovals > Approve
```

---

### STEP 2: Verify OTP (only if verificationType = "OTP")

```
POST https://preapproval.hubtel.com/api/v2/merchant/{Collection_Account_Number}/preapproval/verifyotp
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**
```json
{
    "customerMsisdn": "233200000000",
    "hubtelPreApprovalId": "5f20092321d54eefb974dbfea6de5c34",
    "clientReferenceId": "preapproval-customer-001",
    "otpCode": "HNRM-8852"   // otpPrefix + "-" + 4-digit code sent to customer
}
```

---

### STEP 3: Preapproval Callback

**Approved:**
```json
{
    "CustomerMsisdn": "233200000000",
    "VerificationType": "USSD",
    "PreapprovalStatus": "APPROVED",
    "HubtelPreapprovalId": "5f20092321d54eefb974dbfea6de5c34",
    "ClientReferenceId": "preapproval-customer-001",
    "CreatedAt": "2022-11-14T21:08:16.7533466Z"
}
```

Only proceed to charge after `PreapprovalStatus === "APPROVED"`.

---

### STEP 4: Direct Debit Charge

Once preapproved, use the standard Receive Money endpoint but with the direct debit channel:

```
POST https://rmp.hubtel.com/merchantaccount/merchants/{Collection_Account_Number}/receive/mobilemoney
Content-Type: application/json
Authorization: Basic <encoded>
```

```json
{
    "CustomerName": "Joe Doe",
    "CustomerMsisdn": "233200000000",
    "Channel": "mtn-gh-direct-debit",   // use direct-debit channel
    "Amount": 50.00,
    "PrimaryCallbackUrl": "https://yourdomain.com/hubtel/callback",
    "Description": "Monthly subscription",
    "ClientReference": "sub-charge-nov-001"
}
```

---

### Other Preapproval Management Endpoints

**Check Preapproval Status:**
```
GET https://preapproval.hubtel.com/api/v2/merchant/{Collection_Account_Number}/preapproval/{clientReferenceId}/status
```

**Cancel Preapproval:**
```
GET https://preapproval.hubtel.com/api/v2/merchant/{Collection_Account_Number}/preapproval/{customerMsisdn}/cancel
```

**Reactivate Preapproval (after customer cancels):**
```
POST https://preapproval.hubtel.com/api/v2/merchant/{Collection_Account_Number}/preapproval/reactivate
Body: { "callbackUrl": "...", "customerMsisdn": "233200000000" }
```

---

## RECURRING INVOICE

Use this to set up scheduled automatic debits on a customer's MoMo wallet — Hubtel handles the scheduling. Customer approves once via OTP.

### When to use
- Subscription billing with flexible intervals (daily/weekly/monthly/quarterly/yearly).
- Supported networks: MTN (`mtn_gh_rec`), Telecel (`vodafone_gh_rec`).

### Flow

```
1. Create Invoice  →  Customer receives OTP
2. Verify Invoice  →  Customer provides OTP
3. Hubtel handles all subsequent debits automatically
4. You receive a callback for each debit
```

---

### STEP 1: Create Invoice

```
POST https://rip.hubtel.com/api/proxy/{Collection_Account_Number}/create-invoice
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| orderDate | String | Yes | Invoice creation date (ISO 8601: `"2024-01-01T08:00:00"`) |
| invoiceEndDate | String | Yes | When the recurring invoice should stop |
| description | String | Yes | Brief description |
| startTime | String | Yes | Time of day for debit (`"14:00"`) |
| paymentInterval | String | Yes | `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, or `YEARLY` |
| customerMobileNumber | String | Yes | Customer MoMo number (international format) |
| paymentOption | String | Yes | `"MobileMoney"` |
| channel | String | Yes | `mtn_gh_rec` or `vodafone_gh_rec` |
| customerName | String | No | Customer name |
| recurringAmount | Float | Yes | Amount debited on each recurring cycle |
| totalAmount | Float | Yes | Total amount (currently pass same as `recurringAmount`) |
| initialAmount | Float | Yes | Amount for first payment (can differ from `recurringAmount`) |
| currency | String | Yes | `"GHS"` |
| callbackUrl | String | Yes | Your endpoint for all callbacks (creation + every debit) |

**Sample Request:**
```json
{
    "orderDate": "2024-01-01T08:00:00",
    "invoiceEndDate": "2024-12-31T08:00:00",
    "description": "Monthly subscription",
    "startTime": "09:00",
    "paymentInterval": "MONTHLY",
    "customerMobileNumber": "233240000000",
    "paymentOption": "MobileMoney",
    "channel": "mtn_gh_rec",
    "customerName": "Joe Doe",
    "recurringAmount": 50.00,
    "totalAmount": 50.00,
    "initialAmount": 50.00,
    "currency": "GHS",
    "callbackUrl": "https://yourdomain.com/hubtel/recurring-callback"
}
```

**Response:**
```json
{
    "responseCode": "0001",
    "message": "Your request has been processed successfully.",
    "data": {
        "recurringInvoiceId": "0f84e20a2839482e807128e8c21d08d6",
        "requestId": "a6487bc44eae44849fd80326a0dd802a",
        "otpPrefix": "OQDM"
    }
}
```

---

### STEP 2: Verify Invoice

```
POST https://rip.hubtel.com/api/proxy/verify-invoice
Content-Type: application/json
Authorization: Basic <encoded>
```

```json
{
    "recurringInvoiceId": "0f84e20a2839482e807128e8c21d08d6",
    "requestId": "a6487bc44eae44849fd80326a0dd802a",
    "otpCode": "OQDM-9514"    // otpPrefix + "-" + 4-digit code sent to customer
}
```

---

### Cancel Invoice

```
DELETE https://rip.hubtel.com/api/proxy/{Collection_Account_Number}/cancel-invoice/{recurringInvoiceId}
Authorization: Basic <encoded>
```

---

## COMMISSION SERVICES

Use this to offer value-added services (airtime, data, utility bills) to your users. You earn a commission on each transaction.

### When to use
- Your app lets users buy airtime, data bundles, or pay utility bills.
- Funds are deducted from your Disbursement Account.
- You earn a commission per transaction (returned in `Meta.Commission`).

### Base URL Pattern

```
https://cs.hubtel.com/commissionservices/{Disbursement_Account_Number}/{ServiceID}
```

### Service IDs

| Service | ServiceID |
|---|---|
| MTN Airtime | `fdd76c884e614b1c8f669a3207b09a98` |
| Telecel Airtime | `f4be83ad74c742e185224fdae1304800` |
| AirtelTigo Airtime | `dae2142eb5a14c298eace60240c09e4b` |
| ECG Prepaid & PostPaid | `e6d6bac062b5499cb1ece1ac3d742a84` |
| Telecel Broadband | `b9a1aa246ba748f9ba01ca4cdbb3d1d3` |
| MTN Data | `b230733cd56b4a0fad820e39f66bc27c` |
| Telecel Data | `fa27127ba039455da04a2ac8a1613e00` |
| AirtelTigo Data | `06abd92da459428496967612463575ca` |
| DSTV | `297a96656b5846ad8b00d5d41b256ea7` |
| GOtv | `e6ceac7f3880435cb30b048e9617eb41` |
| Telecel Postpaid Bills | `a3ab78c84c6b4976b78a6f393e247a72` |
| Ghana Water | `6c1e8a82d2e84feeb8bfd6be2790d71d` |
| StarTimes TV | `6598652d34ea4112949c93c079c501ce` |

---

### Airtime Top-Up (Any Network)

All three networks use the same request structure — just swap the ServiceID.

```
POST https://cs.hubtel.com/commissionservices/{Disbursement_Account_Number}/{ServiceID}
Content-Type: application/json
Authorization: Basic <encoded>
```

```json
{
    "Destination": "233240000000",
    "Amount": 5.00,
    "CallbackUrl": "https://yourdomain.com/hubtel/callback",
    "ClientReference": "airtime-001-unique"
}
```

> Max airtime top-up: GHS 100 per request.

---

### Data Bundle — Query First, Then Top-Up

**Query available bundles (GET):**
```
GET https://cs.hubtel.com/commissionservices/{Disbursement_Account_Number}/{ServiceID}?destination={RecipientNumber}
```

Returns an array of bundle options with `Display`, `Value`, and `Amount`.

**Top-Up with selected bundle (POST):**
```json
{
    "Destination": "233240000000",
    "Amount": 10.00,
    "CallbackUrl": "https://yourdomain.com/hubtel/callback",
    "ClientReference": "data-001-unique",
    "Extradata": {
        "bundle": "data_bundle_3"   // Value from query response
    }
}
```

> Bundle `Value` and `Amount` must match exactly what was returned from the query — mismatches will fail.

---

### Utility Bills (DSTV, GOtv, StarTimes)

**Query account first (GET):**
```
GET https://cs.hubtel.com/commissionservices/{Disbursement_Account_Number}/{ServiceID}?destination={AccountNumber}
```

Returns account name and amount due.

**Pay bill (POST):**
```json
{
    "Destination": "7029864396",
    "Amount": 50.00,
    "CallbackUrl": "https://yourdomain.com/hubtel/callback",
    "ClientReference": "tv-pay-001-unique"
}
```

---

### ECG Meter Top-Up

**Query meters linked to a phone number (GET):**
```
GET https://cs.hubtel.com/commissionservices/{Disbursement_Account_Number}/e6d6bac062b5499cb1ece1ac3d742a84?destination={PhoneNumber}
```

Returns list of meters linked to the number.

**Top-up meter (POST):**
```json
{
    "Destination": "233240000000",
    "Amount": 20.00,
    "CallbackUrl": "https://yourdomain.com/hubtel/callback",
    "ClientReference": "ecg-topup-001",
    "Extradata": {
        "bundle": "P09137104"   // Meter number from query
    }
}
```

---

### Ghana Water Top-Up

**Query account (GET):**
```
GET .../6c1e8a82d2e84feeb8bfd6be2790d71d?destination={MeterNumber}&mobile={PhoneNumber}
```

Returns account name, amount due, and a `sessionId` (required for top-up).

**Top-up (POST):**
```json
{
    "Destination": "233240000000",
    "Amount": 50.00,
    "CallbackUrl": "https://yourdomain.com/hubtel/callback",
    "ClientReference": "water-topup-001",
    "Extradata": {
        "bundle": "091019010006",
        "Email": "customer@example.com",
        "SessionId": "3792660ccf0e687b64cdb3f776fd6e368ca4260d"   // from query response
    }
}
```

> `SessionId` is unique per query request. Get a fresh one each time before topping up.

### Transaction Status Check (Commission Services)

```
GET https://api-txnstatus.hubtel.com/transactions/{Collection_Account_Number}/status?clientReference={clientReference}
Authorization: Basic <encoded>
```

---

## INVOICING API

Use this for generating formal invoices with payment links. Supports one-time, installment, and auto-debit payment schedules.

### Three Invoice Types

| Type | Endpoint | Description |
|---|---|---|
| Pay at Once | `/pay-at-once` | Single full payment |
| Pay in Installments | `/pay-in-installments` | Customer pays in partial amounts until due date |
| Auto Debit | `/auto-debit` | Automatically debits wallet on schedule |

### Base URL
```
https://invoicing.hubtel.com/api/invoice/{Collection_Account_Number}/
```

---

### Pay at Once

```
POST https://invoicing.hubtel.com/api/invoice/{Collection_Account_Number}/pay-at-once
Content-Type: application/json
Authorization: Basic <encoded>
```

**Request Body:**
```json
{
    "invoiceNumber": "INV-001",
    "customerName": "John Doe",
    "customerPhoneNumber": "0240000000",
    "customerEmail": "john@example.com",
    "hasTax": false,
    "issuedBy": "Admin",
    "createdBy": "Admin",
    "dueDate": "2024-12-31T08:00:00.000Z",
    "isDefault": true,
    "callbackUrl": "https://yourdomain.com/hubtel/invoice-callback",
    "note": "Invoice for services",
    "reminders": [
        { "days": 5, "isBefore": true }
    ],
    "items": [
        {
            "description": "Web development services",
            "quantity": 1,
            "unitPrice": 2000.00
        }
    ]
}
```

**Response:**
```json
{
    "message": "Invoice Created Successfully",
    "code": 200,
    "data": {
        "invoiceId": "hA344ftcBZ",
        "paymentUrl": "https://invdebit.com/hA344ftcBZ"
    }
}
```

Send `paymentUrl` to the customer — they use it to pay.

---

### Auto Debit (additional fields)

Auto Debit uses the same base request as Pay at Once, but adds:

| Parameter | Type | Required | Description |
|---|---|---|---|
| firstPaymentAmount | Decimal | Yes | Amount for first debit |
| firstPaymentDueDate | DateTime | Yes | When to take first payment |
| frequency | String | Yes | `Daily`, `Weekly`, `Monthly`, or `Yearly` |

```json
{
    "firstPaymentDueDate": "2024-02-01T09:00:00.000Z",
    "firstPaymentAmount": 100.00,
    "frequency": "Monthly",
    ...
}
```

---

### Retry Failed Auto Debit Payment

```
POST https://invoicing.hubtel.com/api/invoice/{Collection_Account_Number}/payments/{PaymentDetailId}/retry
Authorization: Basic <encoded>
```

`PaymentDetailId` is returned in the auto debit callback.

---

### Transaction Status Check (Invoicing)

```
GET https://invoicing.hubtel.com/api/invoice/{Collection_Account_Number}/{invoiceId}/status-check
Authorization: Basic <encoded>
```

Returns `paymentStatus` (`Paid In Full`, `Partly Paid`, `Pending`) and individual payment details.

---

## TRANSACTION STATUS CHECK

> **Mandatory** — call this if you do not receive a callback within 5 minutes.

### Receive Money / Checkout / Commission Services / Direct Debit
```
GET https://api-txnstatus.hubtel.com/transactions/{Collection_Account_Number}/status
Authorization: Basic <encoded>
```

Query params: `?clientReference={ref}` (preferred), or `?hubtelTransactionId={id}`, or `?networkTransactionId={id}`

### Send Money / Send-To-Bank
```
GET https://smrsc.hubtel.com/api/merchants/{Disbursement_Account_Number}/transactions/status
Authorization: Basic <encoded>
```

Query params: same as above.

### Invoicing
```
GET https://invoicing.hubtel.com/api/invoice/{Collection_Account_Number}/{invoiceId}/status-check
Authorization: Basic <encoded>
```

### Status Check Response

```json
{
    "message": "Successful",
    "responseCode": "0000",
    "data": {
        "date": "2024-04-25T21:45:48.4740964Z",
        "status": "Paid",             // "Paid", "Unpaid", or "Refunded"
        "transactionId": "7fd01221faeb41469daec7b3561bddc5",
        "externalTransactionId": "0000006824852622",
        "paymentMethod": "mobilemoney",
        "clientReference": "your-ref",
        "currencyCode": null,
        "amount": 50.00,
        "charges": 0.05,
        "amountAfterCharges": 49.95,
        "isFulfilled": null
    }
}
```

---

## RESPONSE CODES REFERENCE

### Universal Codes (appear across all APIs)

| Code | Meaning | Action |
|---|---|---|
| `0000` | Transaction successful (final state) | None — update your records |
| `0001` | Accepted / Pending — await callback | Wait for callback; poll status after 5 min |
| `0005` | HTTP failure reaching payment partner | Contact Retail Systems Engineer |
| `2000` | Success / Preapproval pending (Direct Debit) | None |
| `2001` | Transaction failed — various reasons | Check description; retry or notify customer |
| `4000` | Validation error | Check request parameters |
| `4070` / `4075` | Insufficient balance | Top up disbursement account |
| `4101` | Authorization denied / scope missing | Check API keys and Collection Account number |
| `4103` | Permission denied | Verify API keys with Retail Systems Engineer |
| `5000` | Server error | Retry or contact support |

### Specific Codes

| Code | Meaning |
|---|---|
| `3050` | Mobile number not registered for MoMo on specified channel |
| `4105` | Merchant account number and API key mismatch |
| `4204` | Preapproval initiation failed |
| `4505` | Transaction already refunded |
| `2050` | MTN MoMo insufficient funds |
| `2051` | Number not registered on MTN MoMo |
| `2200` | Recipient not registered on Telecel Cash |
| `2201` | Customer not registered on Telecel Cash |

---

## AVAILABLE CHANNELS REFERENCE

### Receive Money / Direct Debit (Collection)

| Network | Channel |
|---|---|
| MTN Ghana | `mtn-gh` |
| Telecel Ghana | `vodafone-gh` |
| AirtelTigo Ghana | `tigo-gh` |
| MTN Direct Debit | `mtn-gh-direct-debit` |
| Telecel Direct Debit | `vodafone-gh-direct-debit` |

### Recurring Invoice

| Network | Channel |
|---|---|
| MTN Ghana | `mtn_gh_rec` |
| Telecel Ghana | `vodafone_gh_rec` |

### Send Money (Disbursement)

| Network | Channel |
|---|---|
| MTN Ghana | `mtn-gh` |
| Telecel Ghana | `vodafone-gh` |
| AirtelTigo Ghana | `tigo-gh` |

---

## ACCOUNT NUMBERS QUICK REFERENCE

| Account Type | Used For | Where to Find |
|---|---|---|
| Collection Account Number | Receive Money, Checkout, Direct Debit, Commission Services (status check), Invoicing | Hubtel merchant dashboard |
| Disbursement Account Number | Send Money, Send-To-Bank, Commission Services (top-ups) | Hubtel merchant dashboard |

> These are two different accounts. Make sure you use the correct one for each API. Using the wrong account number will cause `4101` or `4103` errors.

---

## CALLBACK IMPLEMENTATION GUIDE

Every API that is asynchronous (which is all of them) requires you to implement a callback endpoint.

### What to implement

```typescript
// Example: Next.js API route — /api/hubtel/callback
export async function POST(req: Request) {
  const body = await req.json();

  const responseCode = body.ResponseCode ?? body.responseCode;
  const clientReference = body.Data?.ClientReference ?? body.data?.clientReference;

  if (responseCode === "0000") {
    // Payment successful — fulfill order
    await fulfillOrder(clientReference);
  } else {
    // Payment failed — update status
    await markOrderFailed(clientReference, body.Data?.Description);
  }

  // Always return 200 to acknowledge receipt
  return new Response("OK", { status: 200 });
}
```

### Important notes

- Always return HTTP `200` to Hubtel — otherwise Hubtel will keep retrying.
- Hubtel callbacks use **PascalCase** keys (`ResponseCode`, `ClientReference`, etc.) in most APIs.
- Some APIs (Recurring Invoice, Invoicing) use `Status` field instead of / alongside `ResponseCode`.
- Validate `clientReference` against your database before processing to avoid duplicate fulfillment.
- If you don't receive a callback within 5 minutes, call the Transaction Status Check endpoint.

---

*End of HUBTEL_API.md*
