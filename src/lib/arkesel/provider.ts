export type ArkeselSendResult = {
  success: boolean
  messageId?: string
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

  const defaultCountryCode = (process.env.ARKESEL_DEFAULT_COUNTRY_CODE || '233').replace(/\D/g, '')
  const e164 = `+${defaultCountryCode}${trimmed}`
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null
}

export async function sendArkeselSMS(input: {
  toPhone: string
  message: string
}): Promise<ArkeselSendResult> {
  const enabled = process.env.ARKESEL_ENABLED === 'true'
  if (!enabled) {
    return { success: false, error: 'Arkesel SMS is disabled (ARKESEL_ENABLED != true)' }
  }

  const normalizedTo = normalizePhoneNumber(input.toPhone)
  if (!normalizedTo) {
    return { success: false, error: 'Invalid destination phone number' }
  }

  const apiKey = process.env.ARKESEL_API_KEY
  if (!apiKey) {
    return { success: false, error: 'Missing Arkesel API key' }
  }

  const sender = process.env.ARKESEL_SENDER_ID || 'Gavel'

  const params = new URLSearchParams({
    api_key: apiKey,
    to: normalizedTo,
    sms: input.message,
    sender_id: sender,
  })

  try {
    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const responseText = await response.text()
    let payload: any = null

    // Try to parse as JSON, otherwise treat as plain text
    try {
      payload = JSON.parse(responseText)
    } catch {
      // Arkesel sometimes returns plain text responses
      payload = { success: response.ok, message: responseText }
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || responseText || 'Failed to send SMS'
      return { success: false, error: String(message) }
    }

    // Arkesel returns success if status is ok or status code 200
    const success = payload?.status === 'ok' || payload?.success === true || response.ok
    if (!success) {
      return { success: false, error: payload?.message || 'SMS delivery failed' }
    }

    const messageId = payload?.message_id || payload?.id
    return { success: true, messageId: messageId ? String(messageId) : undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to send SMS: ${message}` }
  }
}
