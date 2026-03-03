# Mobile Payments Migration Notes

## Goal

Make iOS and Android purchases App Store/Play compliant for digital token products while keeping existing web Paystack flows intact.

## Policy-safe provider strategy

- iOS digital goods: StoreKit (via RevenueCat)
- Android digital goods: Play Billing (via RevenueCat)
- Paystack: web checkout and physical-goods use-cases only

## New backend endpoints

- `POST /api/mobile/purchases/verify`
  - Authenticated with Supabase Bearer token
  - Verifies ownership via RevenueCat API
  - Idempotently credits tokens
- `POST /api/mobile/purchases/revenuecat-webhook`
  - Called by RevenueCat webhooks
  - Verifies webhook auth header (`REVENUECAT_WEBHOOK_AUTH`)
  - Idempotently credits tokens for creditable events

## Entitlement/token crediting model

1. Mobile completes purchase through RevenueCat SDK.
2. Mobile calls `POST /api/mobile/purchases/verify` with `provider`, `productId`, `platformTransactionId`.
3. Backend validates with RevenueCat subscriber API.
4. Backend credits tokens with `increment_tokens` RPC.
5. Backend inserts `token_transactions` row with unique `reference` format: `{provider}:{transactionId}`.
6. RevenueCat webhook also credits idempotently (same reference format) for resilience.

## Endpoint contract: `/api/mobile/purchases/verify`

### Request body

```json
{
  "provider": "app_store",
  "productId": "small",
  "platformTransactionId": "transaction-id"
}
```

### Success response

```json
{
  "success": true,
  "provider": "app_store",
  "productId": "small",
  "creditedTokens": 35
}
```

### Error cases

- `400`: invalid provider, missing fields, failed verification, unknown product mapping
- `401`: missing/invalid auth token
- `501`: RevenueCat verification not configured

## Required environment variables

- `REVENUECAT_SECRET_API_KEY`
- `REVENUECAT_WEBHOOK_AUTH`
- Existing Supabase vars already used by backend

## Product/token mapping

Current mapping in routes:

- `small` => `35`
- `medium` => `120`
- `large` => `250`

If you use App Store/Play SKU names like `tokens_small`, align mapping in both mobile and backend.

## Recommended next hardening

- Move product-to-token mapping to database table
- Add signature verification for RevenueCat webhook source IP/signature policy
- Add observability (`purchase_verified`, `purchase_credit_failed`) events
- Add replay rate-limiting and stricter idempotency key checks
