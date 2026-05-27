import { NextResponse } from 'next/server'
import 'server-only'

/**
 * TEMPORARY TEST ROUTE — delete after sharing response with Hubtel.
 *
 * Calls the public Hubtel transaction status endpoint with a dummy
 * clientReference and returns the raw response JSON.
 *
 * Usage: GET /api/hubtel-status-test
 * (Admin-only — protected by ADMIN_TEST_KEY query param)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  // Simple access guard so it's not public
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-8)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const posId = process.env.HUBTEL_POS_SALES_ID
  const basicAuth = process.env.HUBTEL_BASIC_AUTH

  if (!posId || !basicAuth) {
    return NextResponse.json({ error: 'HUBTEL_POS_SALES_ID or HUBTEL_BASIC_AUTH not set' }, { status: 500 })
  }

  const auth = basicAuth.startsWith('Basic ') ? basicAuth : `Basic ${basicAuth}`

  // Use a dummy reference — we expect a "not found" response, which still
  // proves the endpoint is reachable and shows the response shape.
  const testRef = 'gavel-test-probe-001'
  const url = `https://rmsc.hubtel.com/v1/merchantaccount/merchants/${encodeURIComponent(posId)}/transactions/status?clientReference=${encodeURIComponent(testRef)}`

  let rawText = ''
  let httpStatus = 0

  try {
    const res = await fetch(url, {
      headers: { Authorization: auth },
    })
    httpStatus = res.status
    rawText = await res.text()
  } catch (err) {
    return NextResponse.json({
      error: 'fetch failed',
      detail: err instanceof Error ? err.message : String(err),
      endpoint: url,
    }, { status: 502 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    parsed = rawText
  }

  return NextResponse.json({
    endpoint: url,
    httpStatus,
    response: parsed,
  })
}
