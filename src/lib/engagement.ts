'use client'

const VIEWER_KEY_STORAGE = 'gavel:viewer-key'

function generateViewerKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getOrCreateViewerKey() {
  if (typeof window === 'undefined') return null

  const existing = window.localStorage.getItem(VIEWER_KEY_STORAGE)
  if (existing) return existing

  const next = generateViewerKey()
  window.localStorage.setItem(VIEWER_KEY_STORAGE, next)
  return next
}
