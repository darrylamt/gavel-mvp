import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/serverAdminAuth'

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { scheduledAt?: string }

  const result = await resend.broadcasts.send(id, {
    scheduledAt: body.scheduledAt,
  })

  return NextResponse.json(result)
}
