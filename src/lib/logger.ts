import 'server-only'
import * as Sentry from '@sentry/nextjs'

type LogContext = Record<string, unknown>

function formatMessage(label: string, context?: LogContext): string {
  if (!context) return label
  try {
    return `${label} ${JSON.stringify(context)}`
  } catch {
    return label
  }
}

export const logger = {
  info(label: string, context?: LogContext) {
    console.log(`[INFO] ${formatMessage(label, context)}`)
  },

  warn(label: string, context?: LogContext) {
    console.warn(`[WARN] ${formatMessage(label, context)}`)
  },

  error(label: string, error?: unknown, context?: LogContext) {
    const msg = formatMessage(label, context)
    console.error(`[ERROR] ${msg}`, error ?? '')

    if (process.env.NODE_ENV === 'production') {
      Sentry.withScope((scope) => {
        if (context) scope.setExtras(context)
        if (error instanceof Error) {
          Sentry.captureException(error, { extra: { label, ...context } })
        } else {
          Sentry.captureMessage(msg, 'error')
        }
      })
    }
  },
}
