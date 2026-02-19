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

  const applications: SellerApplicationResponse[] = []

  for (const application of data ?? []) {
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
    })
  }

  return NextResponse.json({ applications })
}
