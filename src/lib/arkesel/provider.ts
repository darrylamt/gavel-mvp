export type ArkeselSendResult = {
  success: boolean
  messageId?: string
  error?: string
}

// Format phone to 233XXXXXXXXX (no + or 0 prefix) for Arkesel API v2
export function normalizePhoneNumber(raw: string): string | null {
  const digits = String(raw || '').replace(/[^\d]/g, '')
  if (!digits) return null

  // Already in 233XXXXXXXXX format
  if (digits.startsWith('233') && digits.length === 12) {
    return digits
  }

  // Remove leading 0 and add 233
  if (digits.startsWith('0') && digits.length === 10) {
    return '233' + digits.slice(1)
  }

  // If it has + prefix, remove it
  const cleaned = digits.replace(/^\+/, '')
  if (cleaned.startsWith('233') && cleaned.length === 12) {
    return cleaned
  }

  // Try with default country code
  const defaultCountryCode = (process.env.ARKESEL_DEFAULT_COUNTRY_CODE || '233').replace(/\D/g, '')
  const withCode = `${defaultCountryCode}${digits}`
  if (withCode.startsWith('233') && withCode.length === 12) {
    return withCode
  }

  return null
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

  // API v2 requires JSON body with recipients array
  const body = {
    sender: sender,
    message: input.message,
    recipients: [normalizedTo],
  }

  try {
    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey, // v2 uses api-key in header, not URL param
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()
    let payload: any = null

    // Try to parse as JSON
    try {
      payload = JSON.parse(responseText)
    } catch {
      payload = { success: response.ok, message: responseText }
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || responseText || 'Failed to send SMS'
      return { success: false, error: String(message) }
    }

    // Check for success in response
    const success = payload?.code === '1000' || payload?.status === 'success' || response.ok
    if (!success) {
      return { success: false, error: payload?.message || 'SMS delivery failed' }
    }

    const messageId = payload?.data?.message_id || payload?.message_id || payload?.id
    return { success: true, messageId: messageId ? String(messageId) : undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to send SMS: ${message}` }
  }
}
