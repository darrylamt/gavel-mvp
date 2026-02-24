import { createServiceRoleClient } from '@/lib/serverSupabase'
import {
  WHATSAPP_TEMPLATE_MAP,
  type WhatsAppCategory,
  type WhatsAppTemplateKey,
} from './templates'
import { normalizePhoneNumber } from './provider'

type ProfileRow = {
  id: string
  phone: string | null
  whatsapp_phone: string | null
  whatsapp_opt_in: boolean | null
  whatsapp_marketing_opt_in: boolean | null
}

export async function queueWhatsAppNotification(input: {
  userId: string
  templateKey: WhatsAppTemplateKey
  params?: Record<string, string | number | boolean | null>
  sendAfter?: string
  dedupeKey?: string
  phoneOverride?: string | null
  categoryOverride?: WhatsAppCategory
}) {
  const service = createServiceRoleClient()
  const definition = WHATSAPP_TEMPLATE_MAP[input.templateKey]
  const category = input.categoryOverride ?? definition.category

  const { data: existingDedupe } = input.dedupeKey
    ? await service
        .from('whatsapp_notifications')
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
    .select('id, phone, whatsapp_phone, whatsapp_opt_in, whatsapp_marketing_opt_in')
    .eq('id', input.userId)
    .maybeSingle<ProfileRow>()

  if (!profile) {
    return { queued: false, skipped: true, reason: 'profile_not_found' as const }
  }

  const hasOptIn = Boolean(profile.whatsapp_opt_in)
  const marketingAllowed = Boolean(profile.whatsapp_marketing_opt_in)

  if (!hasOptIn) {
    await service.from('whatsapp_notifications').insert({
      user_id: input.userId,
      phone: input.phoneOverride || profile.whatsapp_phone || profile.phone || '',
      template_key: input.templateKey,
      template_params: input.params ?? {},
      category,
      status: 'skipped',
      reason: 'whatsapp_opt_in_required',
      dedupe_key: input.dedupeKey ?? null,
      send_after: input.sendAfter ?? new Date().toISOString(),
    })

    return { queued: false, skipped: true, reason: 'whatsapp_opt_in_required' as const }
  }

  if (category === 'marketing' && !marketingAllowed) {
    await service.from('whatsapp_notifications').insert({
      user_id: input.userId,
      phone: input.phoneOverride || profile.whatsapp_phone || profile.phone || '',
      template_key: input.templateKey,
      template_params: input.params ?? {},
      category,
      status: 'skipped',
      reason: 'whatsapp_marketing_opt_in_required',
      dedupe_key: input.dedupeKey ?? null,
      send_after: input.sendAfter ?? new Date().toISOString(),
    })

    return { queued: false, skipped: true, reason: 'whatsapp_marketing_opt_in_required' as const }
  }

  const normalizedPhone = normalizePhoneNumber(input.phoneOverride || profile.whatsapp_phone || profile.phone || '')
  if (!normalizedPhone) {
    await service.from('whatsapp_notifications').insert({
      user_id: input.userId,
      phone: input.phoneOverride || profile.whatsapp_phone || profile.phone || '',
      template_key: input.templateKey,
      template_params: input.params ?? {},
      category,
      status: 'skipped',
      reason: 'invalid_phone',
      dedupe_key: input.dedupeKey ?? null,
      send_after: input.sendAfter ?? new Date().toISOString(),
    })

    return { queued: false, skipped: true, reason: 'invalid_phone' as const }
  }

  const { error } = await service.from('whatsapp_notifications').insert({
    user_id: input.userId,
    phone: normalizedPhone,
    template_key: input.templateKey,
    template_params: input.params ?? {},
    category,
    status: 'queued',
    dedupe_key: input.dedupeKey ?? null,
    send_after: input.sendAfter ?? new Date().toISOString(),
  })

  if (error) {
    return { queued: false, skipped: false, reason: error.message }
  }

  return { queued: true, skipped: false, reason: null }
}
