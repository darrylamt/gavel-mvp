import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture all server-side errors
  tracesSampleRate: 0.1,

  enabled: process.env.NODE_ENV === 'production',

  // Log to console in development
  debug: false,
})
