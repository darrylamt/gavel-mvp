# Gavel Backend Integration — Payments (Hubtel) and Delivery (Dawurobo)

Written for the mobile app. Describes how the web app at gavelgh.com actually talks to Hubtel and Dawurobo, what state lands in Supabase, and which parts the app should rely on.

---

## 0. The rule that governs both

**The app never calls Hubtel or Dawurobo directly.** Both require secrets that must not ship in a binary:

- Hubtel — Basic auth built from `HUBTEL_API_ID` + `HUBTEL_API_KEY`
- Dawurobo — HMAC-SHA256 request signing with `DAWUROBO_API_KEY`

Hubtel additionally **whitelists IPs**. Only Vercel's egress ranges are approved, so a direct call from a phone is blocked before auth is even considered. The app calls gavelgh.com API routes; those hold the credentials and sign server-side.

---

# Part 1 — Payments (Hubtel)

## 1.1 Provider abstraction

`PAYMENT_PROVIDER` selects the live provider (`hubtel` or `paystack`, default `paystack`) via `getPaymentProvider()` in `src/lib/payment/index.ts`. Both implement the same `IPaymentProvider` interface, so every route returns an identical shape regardless of which is active. **The app should never branch on provider.**

## 1.2 The flow

1. App calls an **init route** and gets `{ authorization_url, reference }`
2. User pays on the hosted checkout page
3. **Two independent confirmations fire** — a server-to-server webhook, and a browser redirect that triggers a verify call

Step 3 is the important part: those two paths are redundant on purpose, and crediting must not depend on the user returning.

## 1.3 The `gvl_` reference

Generated in `HubtelProvider.initializePayment()`:

```
gvl_{base36 timestamp}_{6 random base36 chars}
```

Kept under 50 characters for Hubtel's `clientReference` limit. This value is the join key for the entire payment: it is `payment_intents.id`, it is echoed back as `ClientReference` in the webhook, it is embedded in the return URL, and it is `token_transactions.reference` for dedupe.

The init route returns it to the caller **before** the checkout page opens. The app should hold it.

## 1.4 `payment_intents` — how metadata survives

Hubtel's checkout has no arbitrary-metadata field. So before redirecting, the web inserts a `payment_intents` row keyed by `clientReference`, holding `metadata`, `amount_ghs`, and `email`. The webhook and the verify path read it back.

If the Hubtel call then fails, that row is deleted, so a failed init leaves no orphan.

`metadata.type` drives every downstream branch:

| `metadata.type` | Meaning |
|---|---|
| `token_purchase` | bid token pack — carries `tokens`, `user_id` |
| `auction_payment` | auction win — carries `auction_id`, `bid_id`, `user_id`, `winner_rank` |
| shop types | legacy fixed-price shop (disabled) |

## 1.5 Init routes

| Route | Auth | Rate limited | Notes |
|---|---|---|---|
| `POST /api/tokens/init` | none | 5/min per IP | packs `small` (10 tok / GHS 10), `medium` (30 / 25), `large` (70 / 50) |
| `POST /api/auction-payments/init` | **none** | no | takes `user_id` + `email` from the body; verifies the caller is the current winning candidate |
| `POST /api/shop-payments/init` | none | no | blocked while `SHOP_ENABLED` is false |

All return `{ authorization_url, reference }`.

## 1.6 What the web sends Hubtel

`POST https://payproxyapi.hubtel.com/items/initiate`, Basic auth:

```json
{
  "totalAmount": 25,
  "description": "Gavel 30 bid tokens",
  "callbackUrl": "https://gavelgh.com/api/webhooks/hubtel",
  "returnUrl": "https://gavelgh.com/tokens/success?reference=gvl_...",
  "cancellationUrl": "https://gavelgh.com/payment/cancelled",
  "merchantAccountNumber": "<HUBTEL_POS_SALES_ID>",
  "clientReference": "gvl_..."
}
```

Success is `responseCode === "0000"` **and** a present `data.checkoutUrl`.

## 1.7 The three URLs — only one returns the user

| Field | Who receives it | Points to |
|---|---|---|
| `callbackUrl` | Hubtel's **server**, POST | `/api/webhooks/hubtel` |
| `returnUrl` | The **user's browser**, GET | caller's page + `?reference=gvl_…` |
| `cancellationUrl` | The **user's browser**, GET | `/payment/cancelled` |

`returnUrl` is built from the init route's `callbackUrl` parameter — badly named, it is the user-facing page, not the webhook — with the reference appended (`&` if a query string already exists):

| Init route | User lands on |
|---|---|
| `tokens/init` | `/tokens/success?reference=gvl_…` |
| `auction-payments/init` | `/payment/success?type=auction&reference=gvl_…` |
| `shop-payments/init` | `/payment/success?type=shop&reference=gvl_…` |

## 1.8 The webhook — source of truth

`POST /api/webhooks/hubtel`. Handles both PascalCase and camelCase payloads. Processes only `ResponseCode === "0000"` with `Status === "success"`, looks the reference up in `payment_intents`, then branches on `metadata.type`. Token purchases credit via the `increment_tokens` RPC and insert a `token_transactions` row keyed by reference.

Unknown or missing references return `{ received: true }` rather than an error, so Hubtel does not retry something unmatched.

## 1.9 The verify path — the browser's job

`HubtelProvider.verifyPayment()` calls `https://rmsc.hubtel.com/v1/merchantaccount/merchants/{merchant}/transactions/status?clientReference=…`. Notably this endpoint needs **no IP whitelisting**, which is why status checks work from anywhere. It returns `Paid`, `Unpaid`, or `Refunded`.

Both webhook and verify credit the same purchase. Double-crediting is prevented by a uniqueness check on `token_transactions.reference` before the RPC runs.

## 1.10 What the app should do

1. Call the init route and **keep `reference` before opening anything**
2. Open `authorization_url` in a browser sheet
3. **Do not depend on the redirect.** Poll a status endpoint keyed on the reference. If the user swipes the sheet away, the webhook still credits them
4. For deep links, use a **Universal Link / App Link** on an `https://gavelgh.com` path, not a `gavel://` scheme — Hubtel issues an HTTP redirect and browser sheets may refuse to follow a non-http target
5. Treat the webhook as authoritative; the return trip is UX only

## 1.11 Mobile in-app purchases are a separate path

`/api/mobile/purchases/verify` and `/api/mobile/purchases/revenuecat-webhook` handle RevenueCat IAP, **not** Hubtel. References there are `{provider}:{transactionId}`, and both endpoints credit idempotently against the same `token_transactions` table.

---

# Part 2 — Delivery (Dawurobo)

## 2.1 Auth

Every request carries `X-API-Key`, `X-Signature`, `X-Timestamp`, `X-Nonce`, plus `Idempotency-Key` on writes. The signature is HMAC-SHA256 over:

```
METHOD \n PATHNAME \n QUERY \n SHA256_BODY \n TIMESTAMP \n NONCE
```

Paths resolve to `/api/third-party/apps/{DAWUROBO_APP_ID}{path}` — app id `gavelgh`. Full reference: `docs/DAWUROBO_API.md`.

## 2.2 Routes the web exposes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/delivery/estimate` | **none** | price + time quote |
| `POST /api/delivery/estimate-checkout` | **none** | checkout-time quote |
| `GET /api/delivery/locations` | **none** | serviceable locations |
| `POST /api/delivery/create` | Bearer token | seller dispatches a paid order |
| `POST /api/webhooks/dawurobo` | HMAC | status updates inbound |

`delivery/create` verifies the seller's token, requires the order in `paid` status, refuses if `dawurobo_order_id` is already set, and requires the seller's profile address as the pickup point. It sends `order_reference` as `GAVEL-{order_id}` and sets `webhook_url` per order, so **mobile-originated deliveries still call back to the web app** — the app needs no webhook of its own.

## 2.3 The webhook

Verifies HMAC over the raw body against `X-Webhook-Signature`, resolves the order by `shop_orders.dawurobo_order_id`, updates `dawurobo_status`, inserts a `delivery_events` row, and queues Arkesel SMS on `picked_up`, `in_transit`, `delivered`, and `failed`.

The app reads `dawurobo_status` and `delivery_events` straight from Supabase — it does not need to poll Dawurobo.

## 2.4 The blocker

**The entire delivery path is keyed to `shop_orders`, and the fixed-price shop is retired.** `shop_orders` rows are created only by `process_shop_payment`, and `shop-payments/init` is gated behind `SHOP_ENABLED`, which is `false`. Auction wins produce no order record.

So delivery is dormant. Connecting the app to Dawurobo is not an integration task — the client code is written and working. It is a data-model decision: either extend `shop_orders` to accept auction-sourced orders, or add an auction fulfilment table and generalise the delivery layer over both.

## 2.5 Gotchas

- **Cancel takes `order_reference`** (`GAVEL-{order_id}`), not the `DO-XXXXXX` id Dawurobo assigns
- **Nonce must be fresh on every retry** — reuse returns 409 `REPLAY_DETECTED`
- **±5 minute timestamp window** — sync clocks via NTP
- **Rate limits are per API key**, shared between web and mobile: 120 read/min, 60 write/min
- Seller ID uploads use the private `seller-documents` bucket; store the storage path, never a public URL

---

# Part 3 — Shared state the app reads

| Table / column | Written by | Meaning |
|---|---|---|
| `payment_intents` | init | metadata bridge, keyed by `gvl_…` |
| `token_transactions.reference` | webhook + verify | dedupe key; `type` is `purchase`, `bid`, or `refund` |
| `profiles.token_balance` | service role only | bid tokens; **not directly writable** |
| `shop_orders.dawurobo_status` | Dawurobo webhook | current delivery state |
| `delivery_events` | Dawurobo webhook | delivery timeline |

`profiles.token_balance` and `profiles.role` are protected by a BEFORE UPDATE trigger. The app cannot write them under a user JWT and should not try.

---

# Part 4 — Open issues

Updated 2026-09-26. Fixed since the first version of this doc:

- **Hubtel webhook authentication.** Hubtel does not sign callbacks, so the `callbackUrl` sent at checkout carries an HMAC (`?sig=`) of the payment's reference, keyed by `HUBTEL_WEBHOOK_SECRET`. Unsigned callbacks are rejected. Each payment is also confirmed against Hubtel's public status API before crediting.
- **Hubtel status parsing.** The status API returns `Data` as an array (`TransactionStatus`, `TransactionAmount`); it was being read as an object, so every payment looked unpaid.
- **`auction-payments/init` and `paystack/init`** now take the user from the bearer token and ignore `user_id`/`email` in the body.
- **Delivery quote routes** are rate-limited per IP.
- **`/payment/cancelled`** exists.
- **Bidding** is atomic (`place_bid`); sellers cannot bid on their own auctions.
- **Private auction access codes** moved to `auction_access_codes` (server-only). **The app must not select `auctions.access_code`** — that column is being dropped.

Still open:

1. **Delivery is bound to the retired shop** (see 2.4). Auction wins need an address capture step and a fulfilment record first.
2. **Deep links** need the Apple Team ID and release SHA-256 fingerprint for the association files.
