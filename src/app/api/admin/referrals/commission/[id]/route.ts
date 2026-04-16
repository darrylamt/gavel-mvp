import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function assertAdmin(token: string) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle<{ role: string }>()
  return profile?.role === 'admin' ? data.user : null
}

/**
 * PATCH /api/admin/referrals/commission/[id]
 * Approve or cancel an individual commission.
 * Body: { action: 'approve' | 'cancel' }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    const admin = await assertAdmin(token)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const { action } = (await req.json()) as { action?: 'approve' | 'cancel' }

    if (action !== 'approve' && action !== 'cancel') {
      return NextResponse.json({ error: 'action must be approve or cancel' }, { status: 400 })
    }

    const { data: commission } = await supabase
      .from('referral_commissions')
      .select('id, referrer_id, commission_amount, status')
      .eq('id', id)
      .maybeSingle<{
        id: string
        referrer_id: string
        commission_amount: number
        status: string
      }>()

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    if (commission.status === 'paid') {
      return NextResponse.json({ error: 'Cannot modify a paid commission' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'cancelled'

    await supabase
      .from('referral_commissions')
      .update({ status: newStatus })
      .eq('id', id)

    // When approving a pending commission: add to earnings
    if (action === 'approve' && commission.status === 'pending') {
      await supabase.rpc('increment_referral_pending_earnings', {
        p_referrer_id: commission.referrer_id,
        p_amount: Number(commission.commission_amount),
      })
    }

    // When cancelling an approved commission: subtract from pending earnings
    if (action === 'cancel' && commission.status === 'approved') {
      await supabase.rpc('increment_referral_pending_earnings', {
        p_referrer_id: commission.referrer_id,
        p_amount: -Number(commission.commission_amount), // negative = deduct
      })
    }

    return NextResponse.json({ updated: true, status: newStatus })
  } catch (err) {
    console.error('[admin/referrals/commission]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
