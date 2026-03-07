import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/serverAdminAuth'

type ContactPayload = {
  email: string
  firstName?: string
  lastName?: string
  unsubscribed?: boolean
}

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const email = url.searchParams.get('email')
  const limit = Number(url.searchParams.get('limit') || '20')

  if (id) {
    const result = await resend.contacts.get(id)
    return NextResponse.json(result)
  }

  if (email) {
    const result = await resend.contacts.get({ email })
    return NextResponse.json(result)
  }

  const result = await resend.contacts.list({ limit })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const body = (await request.json()) as ContactPayload
  if (!body?.email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const result = await resend.contacts.create({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    unsubscribed: body.unsubscribed ?? false,
  })

  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const body = (await request.json()) as {
    id?: string
    email?: string
    firstName?: string
    lastName?: string
    unsubscribed?: boolean
  }

  if (!body.id && !body.email) {
    return NextResponse.json({ error: 'id or email is required' }, { status: 400 })
  }

  const result = body.id
    ? await resend.contacts.update({
        id: body.id,
        firstName: body.firstName,
        lastName: body.lastName,
        unsubscribed: body.unsubscribed,
      })
    : await resend.contacts.update({
        email: body.email as string,
        firstName: body.firstName,
        lastName: body.lastName,
        unsubscribed: body.unsubscribed,
      })

  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const email = url.searchParams.get('email')

  if (!id && !email) {
    return NextResponse.json({ error: 'id or email is required' }, { status: 400 })
  }

  const result = id
    ? await resend.contacts.remove(id)
    : await resend.contacts.remove({ email: email as string })

  return NextResponse.json(result)
}
