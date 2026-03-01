import { Resend } from 'resend'
import { emailTemplates, type EmailTemplateKey } from './email-templates'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

type EmailTemplateData<T extends EmailTemplateKey> = Parameters<
  typeof emailTemplates[T]
>[0]

/**
 * Send a transactional notification email using Resend
 * @param to - Recipient email address
 * @param template - Email template key
 * @param data - Template data
 */
export async function sendNotificationEmail<T extends EmailTemplateKey>(
  to: string | string[],
  template: T,
  data: EmailTemplateData<T>
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping email:', template)
    return { success: false, error: 'Resend not configured' }
  }

  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('[Email] No recipient provided, skipping email:', template)
    return { success: false, error: 'No recipient' }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { subject, html } = emailTemplates[template](data as any)

    const result = await resend.emails.send({
      from: 'Gavel Ghana <notifications@gavelghana.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    if (result.error) {
      console.error(`[Email] Failed to send ${template}:`, result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[Email] Sent ${template} to ${Array.isArray(to) ? to.join(', ') : to}`)
    return { success: true }
  } catch (error) {
    console.error(`[Email] Error sending ${template}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send multiple notification emails in parallel
 * Useful for batch notifications (e.g., notifying multiple watchers)
 */
export async function sendBatchNotificationEmails<T extends EmailTemplateKey>(
  recipients: Array<{ email: string; data: EmailTemplateData<T> }>,
  template: T
): Promise<{ sent: number; failed: number }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping batch emails')
    return { sent: 0, failed: recipients.length }
  }

  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendNotificationEmail(recipient.email, template, recipient.data)
    )
  )

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length
  const failed = results.length - sent

  console.log(
    `[Email] Batch ${template}: ${sent} sent, ${failed} failed (total: ${results.length})`
  )

  return { sent, failed }
}

/**
 * Validate email configuration
 */
export function isEmailConfigured(): boolean {
  return resend !== null
}
