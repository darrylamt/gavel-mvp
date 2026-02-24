import { WHATSAPP_TEMPLATE_MAP, type WhatsAppTemplateKey } from './templates'

export type WhatsAppSendResult = {
  success: boolean
  providerMessageId?: string
  error?: string
}

export function normalizePhoneNumber(raw: string): string | null {
  const digits = String(raw || '').replace(/[^\d+]/g, '')
  if (!digits) return null

  if (digits.startsWith('+')) {
    const clean = digits.replace(/[^\d+]/g, '')
    return /^\+[1-9]\d{7,14}$/.test(clean) ? clean : null
  }

  const trimmed = digits.replace(/^0+/, '')
  if (!trimmed) return null

  const defaultCountryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '233').replace(/\D/g, '')
  const e164 = `+${defaultCountryCode}${trimmed}`
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null
}

export async function sendWhatsAppTemplateMessage(input: {
  toPhone: string
  templateKey: WhatsAppTemplateKey
  params?: Record<string, string | number | boolean | null>
}): Promise<WhatsAppSendResult> {
  const enabled = process.env.WHATSAPP_ENABLED === 'true'
  if (!enabled) {
    return { success: false, error: 'WhatsApp is disabled (WHATSAPP_ENABLED != true)' }
  }

  const normalizedTo = normalizePhoneNumber(input.toPhone)
  if (!normalizedTo) {
    return { success: false, error: 'Invalid destination phone number' }
  }

  const definition = WHATSAPP_TEMPLATE_MAP[input.templateKey]
  if (!definition) {
    return { success: false, error: `Template key not configured: ${input.templateKey}` }
  }

  const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase()
  if (provider !== 'meta') {
    return { success: false, error: `Unsupported WhatsApp provider: ${provider}` }
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'Missing WhatsApp provider credentials' }
  }

  const valueList = Object.values(input.params ?? {})
    .filter((value): value is string | number | boolean => value !== null && value !== undefined)
    .map((value) => ({ type: 'text', text: String(value) }))

  const body = {
    messaging_product: 'whatsapp',
    to: normalizedTo.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: definition.templateName,
      language: { code: definition.languageCode },
      components: valueList.length > 0 ? [{ type: 'body', parameters: valueList }] : [],
    },
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = String(payload?.error?.message || payload?.message || 'Failed to send WhatsApp message')
    return { success: false, error: message }
  }

  const providerMessageId = payload?.messages?.[0]?.id ? String(payload.messages[0].id) : undefined
  return { success: true, providerMessageId }
}
