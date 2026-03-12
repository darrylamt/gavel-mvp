import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import 'server-only'

const BASELINE_COMMISSION = 10

type CommissionPayload = {
  commission_percent?: number
  apply_to_existing?: boolean
}

async function resolveAdmin(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { service }
}

async function getCurrentCommissionPercent(service: SupabaseClient) {
  const { data } = await service
    .from('platform_settings')
    .select('buy_now_commission_percent')
    .eq('id', 1)
    .maybeSingle<{ buy_now_commission_percent: number | null }>()

  const value = Number(data?.buy_now_commission_percent)
  if (!Number.isFinite(value)) return BASELINE_COMMISSION
  return Number(value.toFixed(2))
}

export async function GET(request: Request) {
  const auth = await resolveAdmin(request)
  if ('error' in auth) return auth.error

  const commissionPercent = await getCurrentCommissionPercent(auth.service)

  return NextResponse.json({
    commission_percent: commissionPercent,
    baseline_percent: BASELINE_COMMISSION,
    discount_percent: Number((BASELINE_COMMISSION - commissionPercent).toFixed(2)),
  })
}

export async function PUT(request: Request) {
  const auth = await resolveAdmin(request)
  if ('error' in auth) return auth.error

  const body = (await request.json()) as CommissionPayload
  const commissionPercent = Number(body.commission_percent)
  const applyToExisting = body.apply_to_existing !== false

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > BASELINE_COMMISSION) {
    return NextResponse.json(
      { error: `Commission must be between 0 and ${BASELINE_COMMISSION}` },
      { status: 400 }
    )
  }

  const normalized = Number(commissionPercent.toFixed(2))

  if (applyToExisting) {
    const { error: rpcError } = await auth.service.rpc('admin_apply_global_buy_now_commission', {
      p_commission: normalized,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }
  } else {
    const { error: updateError } = await auth.service
      .from('platform_settings')
      .upsert(
        {
          id: 1,
          buy_now_commission_percent: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    commission_percent: normalized,
    baseline_percent: BASELINE_COMMISSION,
    discount_percent: Number((BASELINE_COMMISSION - normalized).toFixed(2)),
    applied_to_existing: applyToExisting,
  })
}
