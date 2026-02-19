'use client'

import { useEffect, useMemo, useState } from 'react'
import { detectInAppBrowser } from '@/lib/inAppBrowser'

const DISMISS_KEY = 'gavel:in-app-browser-security-banner-dismissed'

export default function InAppBrowserBanner() {
  const [visible, setVisible] = useState(false)
  const [appName, setAppName] = useState<string | null>(null)

  useEffect(() => {
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === 'true'
    if (dismissed) {
      return
    }

    const result = detectInAppBrowser(window.navigator.userAgent)
    if (result.isInAppBrowser) {
      setAppName(result.appName)
      setVisible(true)
    }
  }, [])

  const message = useMemo(() => {
    if (!appName) {
      return 'Some secure features, including Google sign-in, may not work correctly in this browser. Please open this page in Safari or Chrome for the safest experience.'
    }

    return `You’re using ${appName}'s in-app browser. Some secure features, including Google sign-in, may not work correctly here. For the safest experience, open this page in Safari or Chrome.`
  }, [appName])

  if (!visible) {
    return null
  }

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-3">
        <p className="text-xs font-medium text-amber-900 sm:text-sm">{message}</p>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, 'true')
            setVisible(false)
          }}
          className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
