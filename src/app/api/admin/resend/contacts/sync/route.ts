import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/serverAdminAuth'

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.error

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 })
  }

  const service = auth.service

  const { data: usersResponse, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const users = usersResponse.users ?? []
  const withEmail = users.filter((u: { email?: string | null }) => !!u.email)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const user of withEmail) {
    const email = user.email as string
    const metadata = user.user_metadata || {}

    const firstName = typeof metadata.first_name === 'string' ? metadata.first_name : undefined
    const lastName = typeof metadata.last_name === 'string' ? metadata.last_name : undefined

    const existing = await resend.contacts.get({ email })

    if (existing?.data?.id) {
      await resend.contacts.update({
        email,
        firstName,
        lastName,
      })
      updated += 1
    } else {
      const createdResult = await resend.contacts.create({
        email,
        firstName,
        lastName,
        unsubscribed: false,
      })

      if (createdResult.error) {
        skipped += 1
      } else {
        created += 1
      }
    }
  }

  return NextResponse.json({
    success: true,
    totalUsersWithEmail: withEmail.length,
    created,
    updated,
    skipped,
  })
}
