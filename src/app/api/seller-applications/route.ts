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
  rejection_reason: string | null
}

function parseBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
}

async function getAuthenticatedUser(req: Request) {
  const token = parseBearerToken(req)
  if (!token) return { error: 'Unauthorized', status: 401 as const }

  const anon = createClient(supabaseUrl, supabaseAnonKey)
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token)

  if (error || !user) return { error: 'Unauthorized', status: 401 as const }

  return { user, token }
}

export async function GET(req: Request) {
  const auth = await getAuthenticatedUser(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const service = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await service
    .from('seller_applications')
    .select('id, user_id, business_name, business_type, phone, address, national_id_number, id_document_url, selfie_with_card_url, status, created_at, reviewed_at, rejection_reason')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SellerApplicationRow>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ application: data ?? null })
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedUser(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const service = createClient(supabaseUrl, serviceRoleKey)

  try {
    const formData = await req.formData()

    const businessName = String(formData.get('business_name') || '').trim()
    const businessType = String(formData.get('business_type') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const address = String(formData.get('address') || '').trim()
    const nationalIdNumber = String(formData.get('national_id_number') || '').trim()
    const idDocument = formData.get('id_document')
    const selfieWithCard = formData.get('selfie_with_card')

    if (
      !businessName ||
      !businessType ||
      !phone ||
      !address ||
      !nationalIdNumber ||
      !(idDocument instanceof File) ||
      !(selfieWithCard instanceof File)
    ) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (idDocument.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'ID document is too large (max 10MB)' }, { status: 400 })
    }

    if (selfieWithCard.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Selfie with card is too large (max 10MB)' }, { status: 400 })
    }

    const extension = idDocument.name.includes('.')
      ? idDocument.name.split('.').pop()?.toLowerCase()
      : 'bin'

    const safeExtension = extension || 'bin'
    const baseKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const idPath = `seller-applications/${auth.user.id}/${baseKey}-ghana-card.${safeExtension}`

    const selfieExtension = selfieWithCard.name.includes('.')
      ? selfieWithCard.name.split('.').pop()?.toLowerCase() || 'bin'
      : 'bin'
    const selfiePath = `seller-applications/${auth.user.id}/${baseKey}-selfie.${selfieExtension}`

    const buffer = Buffer.from(await idDocument.arrayBuffer())
    const selfieBuffer = Buffer.from(await selfieWithCard.arrayBuffer())

    const uploadId = await service.storage
      .from('seller-documents')
      .upload(idPath, buffer, {
        upsert: false,
        contentType: idDocument.type || 'application/octet-stream',
      })

    if (uploadId.error) {
      return NextResponse.json({ error: uploadId.error.message }, { status: 500 })
    }

    const uploadSelfie = await service.storage
      .from('seller-documents')
      .upload(selfiePath, selfieBuffer, {
        upsert: false,
        contentType: selfieWithCard.type || 'application/octet-stream',
      })

    if (uploadSelfie.error) {
      return NextResponse.json({ error: uploadSelfie.error.message }, { status: 500 })
    }

    const { data, error } = await service
      .from('seller_applications')
      .insert({
        user_id: auth.user.id,
        business_name: businessName,
        business_type: businessType,
        phone,
        address,
        national_id_number: nationalIdNumber,
        id_document_url: idPath,
        selfie_with_card_url: selfiePath,
        status: 'pending',
      })
      .select('id, user_id, business_name, business_type, phone, address, national_id_number, id_document_url, selfie_with_card_url, status, created_at, reviewed_at, rejection_reason')
      .single<SellerApplicationRow>()

    if (error) {
      const message = error.code === '23505'
        ? 'You already have an application under review.'
        : error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ application: data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit application'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
