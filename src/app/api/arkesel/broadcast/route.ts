'use server'

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/serverSupabase'

function authorized(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.ARKESEL_DISPATCH_SECRET || process.env.CRON_SECRET || ''
  return !!expected && bearer === expected
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userIds, message, category = 'marketing' } = (await request.json()) as {
      userIds: string[]
      message: string
      category?: 'transactional' | 'security' | 'marketing'
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds must be a non-empty array' }, { status: 400 })
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    // Get phone numbers for all users
    const { data: profiles, error: profileError } = await service
      .from('profiles')
      .select('id, phone')
      .in('id', userIds)
      .not('phone', 'is', null)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const validProfiles = (profiles ?? []).filter((p) => p.phone)

    if (validProfiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid phone numbers found for provided users' },
        { status: 400 }
      )
    }

    // Insert broadcast messages into queue
    const broadcastRows = validProfiles.map((profile) => ({
      user_id: profile.id,
      phone: profile.phone,
      message,
      category,
      status: 'pending',
      send_after: new Date().toISOString(),
      dedupe_key: `broadcast:${Date.now()}:${profile.id}`,
    }))

    const { data, error } = await service.from('sms_notifications').insert(broadcastRows)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      queued: validProfiles.length,
      message: `Broadcast SMS queued for ${validProfiles.length} users`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
