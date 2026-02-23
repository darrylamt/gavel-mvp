import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import 'server-only'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type SellerApplicationRow = {
  id: string
  user_id: string
  business_name: string
  business_type: string
  phone: string
  address: string
  national_id_number: string
  id_document_url: string
  selfie_with_card_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

type SellerApplicationResponse = SellerApplicationRow & {
  id_document_signed_url: string | null
  selfie_with_card_signed_url: string | null
  shop_name: string | null
}

async function requireAdmin(request: Request) {
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

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const statusParam = (url.searchParams.get('status') || 'pending').toLowerCase()
  const status = ['pending', 'approved', 'rejected'].includes(statusParam) ? statusParam : 'pending'

  const { data, error } = await auth.service
    .from('seller_applications')
    .select('id, user_id, business_name, business_type, phone, address, national_id_number, id_document_url, selfie_with_card_url, status, created_at, reviewed_at, reviewed_by, rejection_reason')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .returns<SellerApplicationRow[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sourceApplications = status === 'approved'
    ? Array.from(
        new Map((data ?? []).map((application) => [application.user_id, application])).values()
      )
    : (data ?? [])

  let shopNameByOwner = new Map<string, string>()
  if (status === 'approved') {
    const userIds = Array.from(new Set(sourceApplications.map((application) => application.user_id).filter(Boolean)))
    if (userIds.length > 0) {
      const { data: shops } = await auth.service
        .from('shops')
        .select('owner_id, name, status, created_at')
        .in('owner_id', userIds)
        .order('created_at', { ascending: false })

      for (const shop of shops ?? []) {
        if (!shop.owner_id || !shop.name) continue
        if (!shopNameByOwner.has(shop.owner_id)) {
          shopNameByOwner.set(shop.owner_id, shop.name)
        }
      }
    }
  }

  const applications: SellerApplicationResponse[] = []

  for (const application of sourceApplications) {
    const { data: idSigned } = await auth.service.storage
      .from('seller-documents')
      .createSignedUrl(application.id_document_url, 60 * 10)

    const { data: selfieSigned } = application.selfie_with_card_url
      ? await auth.service.storage
          .from('seller-documents')
          .createSignedUrl(application.selfie_with_card_url, 60 * 10)
      : { data: null }

    applications.push({
      ...application,
      id_document_signed_url: idSigned?.signedUrl ?? null,
      selfie_with_card_signed_url: selfieSigned?.signedUrl ?? null,
      shop_name: shopNameByOwner.get(application.user_id) ?? null,
    })
  }

  return NextResponse.json({ applications })
}
