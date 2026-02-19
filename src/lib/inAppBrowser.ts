type InAppBrowserMatch = {
  name: string
  pattern: RegExp
}

const IN_APP_BROWSER_PATTERNS: InAppBrowserMatch[] = [
  { name: 'Snapchat', pattern: /snapchat/i },
  { name: 'Instagram', pattern: /instagram/i },
  { name: 'Facebook', pattern: /fban|fbav|fb_iab|fbios/i },
  { name: 'Messenger', pattern: /messenger/i },
  { name: 'TikTok', pattern: /tiktok/i },
  { name: 'X', pattern: /twitter/i },
  { name: 'LINE', pattern: / line\//i },
  { name: 'WhatsApp', pattern: /whatsapp/i },
  { name: 'LinkedIn', pattern: /linkedinapp/i },
]

export type InAppBrowserDetection = {
  isInAppBrowser: boolean
  appName: string | null
}

export function detectInAppBrowser(userAgent: string): InAppBrowserDetection {
  const ua = userAgent || ''

  const matched = IN_APP_BROWSER_PATTERNS.find((item) => item.pattern.test(ua))
  if (matched) {
    return {
      isInAppBrowser: true,
      appName: matched.name,
    }
  }

  const androidWebView = /; wv\)|\bversion\/\d+\.\d+\b.*\bchrome\//i.test(ua)
  if (androidWebView) {
    return {
      isInAppBrowser: true,
      appName: 'In-app browser',
    }
  }

  return {
    isInAppBrowser: false,
    appName: null,
  }
}
