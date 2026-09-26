/**
 * Parses Hubtel's public Transaction Status Check response:
 *   GET https://rmsc.hubtel.com/v1/merchantaccount/merchants/{POS_SALES_ID}/transactions/status?clientReference=…
 *
 * The real response (confirmed against a live payment, 2026-05-28) returns
 * `Data` as an ARRAY of transaction records, each with `TransactionStatus`,
 * `InvoiceStatus` and `TransactionAmount`:
 *
 *   { "ResponseCode": "0000",
 *     "Data": [{ "TransactionStatus": "Success", "InvoiceStatus": "Success",
 *                "TransactionAmount": 10.1, "AmountAfterFees": 10,
 *                "ClientReference": "gvl_…", … }] }
 *
 * The previous parser read `Data` as a single object with `Status: "Paid"` and
 * `Amount`, so it found neither and reported every real payment as unpaid.
 *
 * A reference with no records returns ResponseCode "4720" (HTTP 400).
 */

export type HubtelStatusResult = {
  success: boolean
  /** What the customer paid, including any fee passed on to them. */
  amountGHS: number
  clientReference: string | null
}

const PAID_STATUSES = new Set(['success', 'successful', 'paid'])

export class HubtelStatusError extends Error {
  constructor(message: string, readonly responseCode: string | null) {
    super(message)
    this.name = 'HubtelStatusError'
  }
}

type Row = Record<string, unknown>

function statusOf(row: Row): string {
  return String(row.TransactionStatus ?? row.transactionStatus ?? row.InvoiceStatus ?? row.invoiceStatus ?? row.Status ?? row.status ?? '')
    .trim()
    .toLowerCase()
}

export function parseHubtelStatus(json: unknown): HubtelStatusResult {
  const body = (json ?? {}) as Row
  const responseCode = (body.ResponseCode ?? body.responseCode ?? null) as string | null

  if (responseCode !== '0000') {
    throw new HubtelStatusError(
      String(body.Message ?? body.message ?? `Hubtel status check failed (code: ${responseCode ?? 'unknown'})`),
      responseCode
    )
  }

  const rawData = body.Data ?? body.data
  const rows: Row[] = Array.isArray(rawData)
    ? (rawData as Row[])
    : rawData && typeof rawData === 'object'
      ? [rawData as Row]
      : []

  // A reference can carry several attempts (e.g. a failed try, then a success).
  const paidRow = rows.find((row) => PAID_STATUSES.has(statusOf(row)))
  const row = paidRow ?? rows[0]

  return {
    success: Boolean(paidRow),
    amountGHS: row ? Number(row.TransactionAmount ?? row.transactionAmount ?? row.Amount ?? row.amount ?? 0) || 0 : 0,
    clientReference: row ? ((row.ClientReference ?? row.clientReference ?? null) as string | null) : null,
  }
}
