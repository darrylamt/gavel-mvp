import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/serverAdminAuth'

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const { id } = await params
  const result = await resend.broadcasts.get(id)
  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const { id } = await params
  const body = (await request.json()) as {
    from?: string
    subject?: string
    html?: string
  }

  const result = await resend.broadcasts.update(id, {
    from: body.from,
    subject: body.subject,
    html: body.html,
  })

  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const { id } = await params
  const result = await resend.broadcasts.remove(id)
  return NextResponse.json(result)
}
