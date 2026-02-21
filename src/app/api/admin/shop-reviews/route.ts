import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

type AdminReviewRow = {
  id: string
  product_id: string
  user_id: string | null
  reviewer_name: string | null
  rating: number
  title: string | null
  body: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  shop_products: {
    title: string | null
  } | null
}

function parseIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

async function requireAdmin(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration missing' }, { status: 500 }) }
  }

  const authHeader = req.headers.get('authorization') || ''
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

  return { service, userId: user.id }
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if ('error' in admin) return admin.error

  const url = new URL(req.url)
  const statusFilter = (url.searchParams.get('status') || 'all').trim()

  let query = admin.service
    .from('shop_product_reviews')
    .select('id, product_id, user_id, reviewer_name, rating, title, body, status, rejection_reason, reviewed_at, reviewed_by, created_at, shop_products(title)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query.returns<AdminReviewRow[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reviews: data ?? [] })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req)
  if ('error' in admin) return admin.error

  try {
    const body = await req.json()
    const action = typeof body.action === 'string' ? body.action : ''
    const reviewIds = parseIds(body.reviewIds)
    const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : null

    if (!['approve_selected', 'reject_selected', 'approve_all_pending', 'reject_all_pending'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const status = action.startsWith('approve') ? 'approved' : 'rejected'

    if (action.endsWith('selected') && reviewIds.length === 0) {
      return NextResponse.json({ error: 'No reviews selected' }, { status: 400 })
    }

    const updatePayload = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.userId,
      rejection_reason: status === 'rejected' ? (rejectionReason || 'Rejected by admin') : null,
    }

    let query = admin.service
      .from('shop_product_reviews')
      .update(updatePayload)

    if (action.endsWith('selected')) {
      query = query.in('id', reviewIds)
    } else {
      query = query.eq('status', 'pending')
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update reviews'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
