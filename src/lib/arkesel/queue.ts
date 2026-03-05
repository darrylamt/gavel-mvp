import { createServiceRoleClient } from '@/lib/serverSupabase'
import { normalizePhoneNumber } from './provider'

type ProfileRow = {
  id: string
  phone: string | null
  sms_opt_in: boolean | null
  sms_marketing_opt_in: boolean | null
}

export type SMSNotificationCategory = 'transactional' | 'security' | 'marketing'

export async function queueArkeselNotification(input: {
  userId: string
  message: string
  category: SMSNotificationCategory
  sendAfter?: string
  dedupeKey?: string
  phoneOverride?: string | null
}) {
  const service = createServiceRoleClient()

  const { data: existingDedupe } = input.dedupeKey
    ? await service
        .from('sms_notifications')
        .select('id')
        .eq('dedupe_key', input.dedupeKey)
        .limit(1)
        .maybeSingle()
    : { data: null }

  if (existingDedupe?.id) {
    return { queued: false, skipped: true, reason: 'duplicate_dedupe_key' as const }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('id, phone, sms_opt_in, sms_marketing_opt_in')
    .eq('id', input.userId)
    .maybeSingle<ProfileRow>()

  if (!profile) {
    return { queued: false, skipped: true, reason: 'profile_not_found' as const }
  }

  const hasOptIn = input.category === 'transactional' || input.category === 'security' || Boolean(profile.sms_opt_in)
  const marketingAllowed = Boolean(profile.sms_marketing_opt_in)

  if (!hasOptIn) {
    await service.from('sms_notifications').insert({
      user_id: input.userId,
      phone: input.phoneOverride || profile.phone || '',
      message: input.message,
      category: input.category,
      status: 'skipped',
      reason: 'sms_opt_in_required',
      dedupe_key: input.dedupeKey ?? null,
      send_after: input.sendAfter ?? new Date().toISOString(),
    })

    return { queued: false, skipped: true, reason: 'sms_opt_in_required' as const }
  }

  if (input.category === 'marketing' && !marketingAllowed) {
    await service.from('sms_notifications').insert({
      user_id: input.userId,
      phone: input.phoneOverride || profile.phone || '',
      message: input.message,
      category: input.category,
      status: 'skipped',
      reason: 'sms_marketing_opt_in_required',
      dedupe_key: input.dedupeKey ?? null,
      send_after: input.sendAfter ?? new Date().toISOString(),
    })

    return { queued: false, skipped: true, reason: 'sms_marketing_opt_in_required' as const }
  }

  const normalizedPhone = normalizePhoneNumber(input.phoneOverride || profile.phone || '')
  if (!normalizedPhone) {
    await service.from('sms_notifications').insert({
      user_id: input.userId,
      phone: input.phoneOverride || profile.phone || '',
      message: input.message,
      category: input.category,
      status: 'skipped',
      reason: 'invalid_phone',
      dedupe_key: input.dedupeKey ?? null,
      send_after: input.sendAfter ?? new Date().toISOString(),
    })

    return { queued: false, skipped: true, reason: 'invalid_phone' as const }
  }

  const { data, error } = await service.from('sms_notifications').insert({
    user_id: input.userId,
    phone: normalizedPhone,
    message: input.message,
    category: input.category,
    status: 'pending',
    dedupe_key: input.dedupeKey ?? null,
    send_after: input.sendAfter ?? new Date().toISOString(),
  })

  if (error) {
    return { queued: false, skipped: true, reason: 'queue_failed' as const }
  }

  return { queued: true }
}
