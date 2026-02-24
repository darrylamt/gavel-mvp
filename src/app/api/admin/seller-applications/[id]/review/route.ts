import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'
import { queueSellerApplicationReviewedNotification } from '@/lib/whatsapp/events'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function toSlug(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'shop'
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const service = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const action = body?.action === 'approved' || body?.action === 'rejected' ? body.action : null
  const rejectionReason = typeof body?.rejection_reason === 'string' ? body.rejection_reason.trim() : null

  if (!action) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { id } = await context.params

  const actor = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const { error } = await actor.rpc('admin_review_seller_application', {
    p_application_id: id,
    p_action: action,
    p_rejection_reason: action === 'rejected' ? rejectionReason : null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { data: reviewedApplication } = await service
    .from('seller_applications')
    .select('user_id')
    .eq('id', id)
    .maybeSingle<{ user_id: string }>()

  if (reviewedApplication?.user_id) {
    await queueSellerApplicationReviewedNotification({
      userId: reviewedApplication.user_id,
      status: action,
      reason: action === 'rejected' ? rejectionReason : null,
    })
  }

  if (action === 'approved') {
    const { data: application } = await service
      .from('seller_applications')
      .select('user_id, business_name')
      .eq('id', id)
      .maybeSingle<{ user_id: string; business_name: string | null }>()

    const sellerId = application?.user_id || null
    if (sellerId) {
      const { data: existingShop } = await service
        .from('shops')
        .select('id, name')
        .eq('owner_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; name: string | null }>()

      if (!existingShop) {
        const preferredName = (application?.business_name || '').trim() || 'Seller Shop'
        const baseSlug = `${toSlug(preferredName)}-${sellerId.slice(0, 6)}`

        for (let index = 0; index < 5; index += 1) {
          const slug = index === 0 ? baseSlug : `${baseSlug}-${index}`
          const { error: createShopError } = await service
            .from('shops')
            .insert({
              owner_id: sellerId,
              name: preferredName,
              slug,
              status: 'active',
            })

          if (!createShopError) break

          if (!String(createShopError.message || '').toLowerCase().includes('duplicate')) {
            break
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
