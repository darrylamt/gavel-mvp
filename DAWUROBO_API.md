# Dawurobo Delivery API - Integration Reference

## Environments

| Environment | Base URL |
|-------------|----------|
| Production | `https://delivery.dawurobo.com` |
| Staging | `https://dawurobo-third-party-integration.vercel.app` |

All endpoints share the same base path:
```
{BASE_URL}/api/third-party/apps/{app_id}
```

---

## Authentication

Every request requires these four headers:

| Header | Description |
|--------|-------------|
| `X-API-Key` | App API key secret |
| `X-Signature` | HMAC-SHA256 signature (see below) |
| `X-Timestamp` | Unix timestamp in seconds |
| `X-Nonce` | UUID, unique per request |

Write requests (POST, PATCH, DELETE) also require:

| Header | Description |
|--------|-------------|
| `Idempotency-Key` | Client-generated, unique per operation |

`Authorization: Bearer <api_key_secret>` is accepted as a fallback for `X-API-Key`.

### Signing Algorithm

Build a canonical string then sign it with HMAC-SHA256:

```
METHOD\nPATHNAME\nQUERY\nSHA256_BODY\nTIMESTAMP\nNONCE
```

- `METHOD` - uppercase HTTP method
- `PATHNAME` - exact request path (e.g. `/api/third-party/apps/my-app/orders`)
- `QUERY` - full query string including `?`, or empty string if none
- `SHA256_BODY` - lowercase hex SHA256 of raw request body (empty string if no body)
- `TIMESTAMP` - value from `X-Timestamp` header
- `NONCE` - value from `X-Nonce` header

Requests are rejected if the timestamp is outside a +/- 5 minute window.

```ts
import crypto from "crypto";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function buildSignature({
  method, pathname, query, body, timestamp, nonce, apiKeySecret
}: {
  method: string; pathname: string; query: string; body: string;
  timestamp: string; nonce: string; apiKeySecret: string;
}): string {
  const canonical = [
    method.toUpperCase(),
    pathname,
    query || "",
    sha256Hex(body || ""),
    timestamp,
    nonce,
  ].join("\n");

  return crypto.createHmac("sha256", apiKeySecret).update(canonical, "utf8").digest("hex");
}
```

---

## Idempotency Rules

| Scenario | Behavior |
|----------|----------|
| Same key + same endpoint + same payload | Prior response replayed, no side effects |
| Same key + same endpoint + different payload | HTTP 409 `IDEMPOTENCY_CONFLICT` |
| Missing key on write request | HTTP 400 `MISSING_IDEMPOTENCY_KEY` |

Only reuse an idempotency key when retrying the exact same request.

---

## Rate Limits

| Endpoint class | Limit |
|----------------|-------|
| Read (GET) | 120 req/min per key |
| Write (POST/PATCH/DELETE) | 60 req/min per key |

Exceeding the limit returns HTTP 429 with code `RATE_LIMITED`.

Response headers on every request: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Correlation-Id`.

---

## Endpoints

### POST /orders - Create Order

**Required fields:**

```json
{
  "order_reference": "ORD-2026-001",
  "customer": {
    "name": "John Doe",
    "phone": "0241234567",
    "whatsapp": "0241234567"
  },
  "delivery": {
    "address": "123 Liberation Road, Osu",
    "city": "Accra",
    "region": "Greater Accra",
    "location_id": "accra_osu_001",
    "coordinates": { "lat": 5.555, "lng": -0.196 },
    "notes": "Apartment 4B"
  },
  "item": "2x Wireless Headphones, 1x Phone Case",
  "pickup": {
    "address": "Warehouse, East Legon",
    "location_id": "accra_east_legon_001",
    "coordinates": { "lat": 5.65, "lng": -0.17 },
    "contact_person": "Store Manager",
    "contact_phone": "0302123456"
  },
  "payment": {
    "method": "cash",
    "amount": 325,
    "is_paid": false
  },
  "delivery_date": "2026-03-01T10:00:00Z",
  "special_instructions": "Handle with care",
  "webhook_url": "https://partner.example.com/webhooks/delivery-updates"
}
```

Payment methods: `cash`, `mobile_money`, `card`, `bank_transfer`

Optional fields: `delivery.location_id`, `delivery.coordinates`, `delivery.notes`, `pickup.location_id`, `pickup.coordinates`, `delivery_date`, `special_instructions`, `webhook_url`, `customer.whatsapp`

**Success (201):**
```json
{
  "status": "success",
  "data": {
    "order_details": {
      "order_id": "DO-123456",
      "estimated_delivery": "2026-03-01T10:00:00Z"
    },
    "status": "order_created"
  }
}
```

Store `order_id` (e.g. `DO-123456`) - it is used for all subsequent operations.

---

### GET /orders/status?order_id={order_id}

Returns current status and order info. Uses the `order_id` from the create response.

**Success (200):**
```json
{
  "status": "success",
  "data": {
    "order_reference": "ORD-2026-001",
    "internal_order_id": "DO-123456",
    "status": "in_transit",
    "status_details": {
      "description": "Order is on the way to recipient",
      "timestamp": "2026-03-01T10:45:00.000Z"
    },
    "order_info": {
      "recipient_name": "John Doe",
      "recipient_phone": "0241234567",
      "recipient_address": "123 Liberation Road, Osu",
      "delivery_date": "2026-03-01T10:00:00Z",
      "pickup_date": "2026-03-01T09:00:00Z",
      "amount": 325,
      "payment_status": "mobile_money_unpaid"
    },
    "tracking_url": "https://delivery.dawurobo.com/track?order_id=DO-123456"
  }
}
```

---

### GET /track/{order_id}

Returns the full delivery timeline. Uses the `order_id` from the create response.

**Success (200):**
```json
{
  "status": "success",
  "data": {
    "order_id": "DO-123456",
    "order_reference": "ORD-2026-001",
    "recipient_name": "John Doe",
    "recipient_phone_last4": "4567",
    "current_status": "in_transit",
    "estimated_delivery_time": "2026-03-01T10:00:00Z",
    "timeline": [
      { "status": "placed", "title": "Order Placed", "timestamp": "...", "completed": true },
      { "status": "accepted", "title": "Order Accepted", "timestamp": "...", "completed": true },
      { "status": "pickedUp", "title": "Package Picked Up", "timestamp": "...", "completed": true },
      { "status": "in_transit", "title": "On the Way", "timestamp": "...", "completed": true },
      { "status": "delivered", "title": "Delivered", "timestamp": "...", "completed": false }
    ]
  }
}
```

---

### PATCH /orders/update

Updates mutable order fields.

**Request body:**
```json
{
  "order_id": "DO-123456",
  "user_id": "partner_user_1",
  "updates": {
    "recipient_phone": "0207654321",
    "delivery_date": "2026-03-01T11:00:00Z",
    "special_instructions": "Updated instruction"
  }
}
```

Allowed keys in `updates`: `recipient_name`, `recipient_phone`, `alt_recipient_phone`, `recipient_address`, `delivery_date`, `note`, `special_instructions`, `status`, `status_reason`

**Success (200):**
```json
{
  "status": "success",
  "data": {
    "order_id": "DO-123456",
    "updated_fields": ["recipient_phone", "delivery_date", "note"],
    "updated_at": "2026-03-01T09:12:00.000Z"
  }
}
```

---

### DELETE /orders/{order_reference}

Cancels an order. Use the original `order_reference` you submitted at creation (e.g. `ORD-2026-001`), not the internal `order_id`.

**Success (200):**
```json
{
  "status": "success",
  "data": {
    "order_reference": "ORD-2026-001",
    "internal_order_id": "DO-123456",
    "status": "cancelled",
    "cancelled_at": "2026-03-01T09:30:00.000Z",
    "cancellation_reason": "Cancelled by Partner platform",
    "refund_status": "not_applicable"
  }
}
```

---

### GET /locations

Returns available service locations. All query params are optional.

| Param | Type | Description |
|-------|------|-------------|
| `region` | string | Filter by region |
| `zone` | string | Filter by zone |
| `include_coordinates` | `"true"/"false"` | Include lat/lng in response |

---

### POST /estimates

Calculates delivery price and time estimate.

**Only `delivery_location.coordinates.lat` and `delivery_location.coordinates.lng` are required.** Everything else is optional.

```json
{
  "pickup_location": {
    "address": "Spintex Warehouse, Accra",
    "coordinates": { "lat": 5.65, "lng": -0.17 }
  },
  "delivery_location": {
    "address": "Oxford Street, Osu",
    "coordinates": { "lat": 5.555, "lng": -0.196 }
  },
  "priority": "standard",
  "order_date": "2026-03-01T09:00:00Z"
}
```

Priority options: `standard`, `economy`, `cargo`

**Success (200) - key fields:**
```json
{
  "status": "success",
  "data": {
    "estimated_price": 35,
    "pickup_time": "9AM - 12PM",
    "delivery_time": "1PM - 7PM same day",
    "delivery_window": {
      "earliest": "2026-03-01T13:00:00.000Z",
      "latest": "2026-03-01T19:00:00.000Z"
    },
    "priority_level": "standard",
    "service_type": "standard",
    "available_options": [
      { "priority": "standard", "price": 35, "description": "..." },
      { "priority": "economy", "price": 28, "description": "..." },
      { "priority": "cargo", "price": 70, "description": "..." }
    ],
    "location_coverage": {
      "delivery_available": true,
      "service_area": "Greater Accra"
    }
  }
}
```

**Intercity rule:** Routes over 50km are treated as Intercity automatically. Response will have `service_type: "Intercity"`, `service_area: "Kumasi (Doorstep)"`, flat rate of GHS 50, and only the intercity option in `available_options`.

**Pricing tiers (approximate):**

| Range | Price (GHS) |
|-------|-------------|
| 0-5km | 15 |
| Standard same-day | 35 |
| Economy | 28 |
| Cargo | 70 |
| Intercity (50km+) | 50 flat rate |

---

### GET /health

Returns service status for the authenticated app. Auth required.

---

### GET /metrics

Returns request volume, success rate, p95 latency, auth failures, and replay rejections per API key.

---

### GET /dashboard

Returns order totals, revenue, and success rate for the app.

---

## Webhooks

Dawurobo sends signed POST requests to your configured webhook URL when order state changes.

### Events

`order.created`, `order.accepted`, `order.rejected`, `order.received`, `order.picked_up`, `order.in_transit`, `order.delivered`, `order.cancelled`, `order.rescheduled`, `order.returned`, `order.returned_to_vendor`, `order.refunded`, `order.updated`

### Payload Shape

```json
{
  "event_type": "order.in_transit",
  "timestamp": "2026-03-01T12:10:00.000Z",
  "order_data": {
    "external_order_reference": "ORD-2026-001",
    "order_id": "DO-123456",
    "status": "in_transit",
    "status_reason": "",
    "rider_info": {
      "id": "rider-1",
      "name": "Rider Name",
      "phone": "N/A"
    },
    "delivery_info": {
      "recipient_name": "John Doe",
      "recipient_phone": "0240000000",
      "delivery_address": "East Legon, Accra",
      "delivery_date": "2026-03-01T14:00:00.000Z"
    },
    "timestamps": {
      "created_at": "...",
      "updated_at": "...",
      "assigned_at": "..."
    },
    "tracking_url": "https://delivery.dawurobo.com/track?order_id=DO-123456"
  }
}
```

### Signature Verification

Signature is HMAC-SHA256 over the **raw JSON body string** using your webhook secret. Read from the `X-Webhook-Signature` header (or your configured custom header).

```ts
import crypto from "crypto";

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
}
```

**Always verify against the raw request body, not parsed JSON.**

### Retry Policy

Max 5 attempts with backoff: 1m, 5m, 15m, 30m, 60m, 180m. After all attempts fail, the webhook is marked `dead_letter`. Retries are triggered by 429, 5xx, and network/timeout failures. Return 2xx quickly and process async.

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `MISSING_API_KEY` | 401 | Missing `X-API-Key` header |
| `INVALID_API_KEY` | 401 | Wrong key or app mismatch |
| `MISSING_SIGNATURE_HEADERS` | 401 | Missing one or more signed headers |
| `INVALID_TIMESTAMP` | 401 | Timestamp format invalid |
| `STALE_REQUEST` | 401 | Timestamp outside +/- 5 minute window |
| `INVALID_SIGNATURE` | 401 | Signature mismatch |
| `REPLAY_DETECTED` | 409 | Nonce has been used before |
| `RATE_LIMITED` | 429 | Key exceeded rate limit |
| `KEY_INACTIVE` | 403 | Key is disabled or revoked |
| `STAGING_DISABLED` | 403 | Staging disabled for this app |
| `PRODUCTION_NOT_APPROVED` | 403 | App not approved for production use |
| `MISSING_IDEMPOTENCY_KEY` | 400 | Write request missing idempotency key |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key reused with different payload |
| `INVALID_JSON` | 400 | Malformed request body |
| `MISSING_REQUIRED_FIELD` | 400 | Missing required field on create |
| `MISSING_REQUIRED_FIELDS` | 400 | Missing required fields on update |
| `MISSING_ORDER_ID` | 400 | Missing `order_id` query param |
| `ORDER_NOT_FOUND` | 404 | Order not found or not owned by this app |
| `NO_VALID_UPDATES` | 400 | Update body contains unsupported fields |
| `INVALID_ORDER_STATUS` | 400 | Order cannot be cancelled in its current state |
| `INTERNAL_ORDER_CREATION_FAILED` | 500 | Upstream order creation failure |
| `UPDATE_FAILED` | 500 | Upstream update failure |
| `CANCELLATION_FAILED` | 500 | Upstream cancellation failure |

Error response shape:
```json
{
  "status": "error",
  "message": "Human-readable description",
  "code": "ERROR_CODE"
}
```

---

## Key Gotchas

- **Cancel uses `order_reference`, not `order_id`** - use the reference you sent at creation (e.g. `ORD-2026-001`), not the `DO-XXXXXX` id Dawurobo assigns
- **Nonce must be unique per request** - never reuse, even on retries (generate a new one)
- **Timestamps expire** - build and send requests within the 5-minute window; sync clocks with NTP
- **Sign the exact bytes you send** - canonical string must match the actual request body and query string byte-for-byte
- **Intercity is automatic** - no special flag needed; routes over 50km return intercity pricing automatically
- **Webhook verification requires raw body** - verify before parsing JSON, not after
