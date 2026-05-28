import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

/**
 * GET /api/admin/payouts/export
 *
 * Downloads a CSV pre-formatted for Hubtel's "Pay Suppliers" bulk upload.
 *
 * Query params:
 *   ids        — comma-separated payout UUIDs to export (required unless eligible=true)
 *   eligible   — if "true", exports ALL pending payouts whose scheduled_release_at <= now
 *   mark       — if "true" (default), marks exported payouts as "processing"
 *
 * CSV columns (match Hubtel Pay Suppliers template):
 *   Mobile Number | Channel | Account Number | Account Name | Amount (GHS) | Description
 */
export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
  }

  // Auth check
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const { data: { user }, error: userError } = await anon.auth.getUser(token)
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await service
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && !profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids')
  const eligible = searchParams.get('eligible') === 'true'
  const markProcessing = searchParams.get('mark') !== 'false' // default true

  // ── Fetch payouts ───────────────────────────────────────────────────────────
  let query = service
    .from('payouts')
    .select(`
      id,
      payout_amount,
      commission_amount,
      gross_amount,
      seller_id,
      order_id,
      auction_id,
      scheduled_release_at,
      status,
      auction:auction_id(title),
      seller:seller_id(username)
    `)

  if (eligible) {
    // All pending payouts where escrow period has passed (or no hold period set)
    query = query
      .eq('status', 'pending')
      .or(`scheduled_release_at.is.null,scheduled_release_at.lte.${new Date().toISOString()}`)
  } else if (idsParam) {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }
    query = query.in('id', ids)
  } else {
    return NextResponse.json({ error: 'Provide ids= or eligible=true' }, { status: 400 })
  }

  const { data: payouts, error: payoutsError } = await query
  if (payoutsError) {
    console.error('[export] payouts fetch error:', payoutsError)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }

  if (!payouts || payouts.length === 0) {
    return NextResponse.json({ error: 'No eligible payouts found' }, { status: 404 })
  }

  // ── Fetch seller payout accounts ────────────────────────────────────────────
  const sellerIds = [...new Set(payouts.map((p) => p.seller_id))]

  const { data: accounts, error: accountsError } = await service
    .from('seller_payout_accounts')
    .select('seller_id, account_name, account_number, network_code, account_type, is_default')
    .in('seller_id', sellerIds)

  if (accountsError) {
    console.error('[export] accounts fetch error:', accountsError)
    return NextResponse.json({ error: 'Failed to fetch seller accounts' }, { status: 500 })
  }

  // Build a map: seller_id → preferred account (default first, else first momo, else first)
  const accountMap = new Map<string, typeof accounts[0]>()
  for (const acc of accounts ?? []) {
    const existing = accountMap.get(acc.seller_id)
    if (!existing) {
      accountMap.set(acc.seller_id, acc)
    } else if (acc.is_default && !existing.is_default) {
      accountMap.set(acc.seller_id, acc)
    } else if (acc.account_type === 'momo' && existing.account_type !== 'momo' && !existing.is_default) {
      accountMap.set(acc.seller_id, acc)
    }
  }

  // ── Normalise Hubtel channel names ──────────────────────────────────────────
  function toHubtelChannel(networkCode: string | null): string {
    const code = (networkCode ?? '').toUpperCase()
    if (code.includes('MTN')) return 'MTN'
    if (code.includes('TELECEL') || code.includes('VODAFONE') || code.includes('VODA')) return 'TELECEL'
    if (code.includes('AIRTELTIGO') || code.includes('AIRTEL') || code.includes('TIGO')) return 'AIRTELTIGO'
    return code || 'MTN' // fallback
  }

  // ── Build CSV rows ──────────────────────────────────────────────────────────
  type CsvRow = {
    payoutId: string
    mobileNumber: string
    channel: string
    accountName: string
    amount: string
    description: string
    sellerUsername: string
    skipped: boolean
    skipReason?: string
  }

  const rows: CsvRow[] = []
  const skipped: CsvRow[] = []

  for (const payout of payouts) {
    const account = accountMap.get(payout.seller_id)
    const seller = payout.seller as { username?: string } | null
    const auction = payout.auction as { title?: string } | null

    const description = auction?.title
      ? `Gavel payout - ${auction.title.slice(0, 40)}`
      : payout.order_id
        ? `Gavel shop payout - ${String(payout.order_id).slice(0, 8)}`
        : `Gavel payout - ${String(payout.id).slice(0, 8)}`

    if (!account) {
      skipped.push({
        payoutId: payout.id,
        mobileNumber: '',
        channel: '',
        accountName: seller?.username ?? 'Unknown',
        amount: Number(payout.payout_amount).toFixed(2),
        description,
        sellerUsername: seller?.username ?? 'Unknown',
        skipped: true,
        skipReason: 'No payout account found',
      })
      continue
    }

    rows.push({
      payoutId: payout.id,
      mobileNumber: account.account_number,
      channel: toHubtelChannel(account.network_code),
      accountName: account.account_name,
      amount: Number(payout.payout_amount).toFixed(2),
      description,
      sellerUsername: seller?.username ?? 'Unknown',
      skipped: false,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({
      error: 'No payouts could be exported — sellers have no payout accounts configured',
      skipped: skipped.map((s) => ({ id: s.payoutId, seller: s.sellerUsername, reason: s.skipReason })),
    }, { status: 422 })
  }

  // ── Mark as processing ──────────────────────────────────────────────────────
  if (markProcessing) {
    const idsToMark = rows.map((r) => r.payoutId)
    const { error: updateError } = await service
      .from('payouts')
      .update({ status: 'processing', payout_trigger: 'admin_released' })
      .in('id', idsToMark)

    if (updateError) {
      console.error('[export] failed to mark payouts as processing:', updateError)
      // Don't fail the export — just log it
    }
  }

  // ── Build CSV ───────────────────────────────────────────────────────────────
  const csvHeader = 'Mobile Number,Channel,Account Number,Account Name,Amount (GHS),Description'
  const csvLines = rows.map((r) => {
    const cols = [
      r.mobileNumber,
      r.channel,
      r.mobileNumber, // Account Number = same as Mobile Number for MoMo
      `"${r.accountName.replace(/"/g, '""')}"`,
      r.amount,
      `"${r.description.replace(/"/g, '""')}"`,
    ]
    return cols.join(',')
  })

  const csv = [csvHeader, ...csvLines].join('\r\n')
  const date = new Date().toISOString().slice(0, 10)
  const filename = `gavel-payouts-${date}.csv`

  // Include a warning comment about skipped payouts in the response headers
  const headers: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Exported-Count': String(rows.length),
    'X-Skipped-Count': String(skipped.length),
  }

  return new Response(csv, { status: 200, headers })
}
