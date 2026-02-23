'use client'

const VIEWER_KEY_STORAGE = 'gavel:viewer-key'
let inMemoryViewerKey: string | null = null

function generateViewerKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getOrCreateViewerKey() {
  if (typeof window === 'undefined') return null

  try {
    const existing = window.localStorage.getItem(VIEWER_KEY_STORAGE)
    if (existing) {
      inMemoryViewerKey = existing
      return existing
    }
  } catch {
    if (inMemoryViewerKey) return inMemoryViewerKey
  }

  const next = generateViewerKey()
  inMemoryViewerKey = next

  try {
    window.localStorage.setItem(VIEWER_KEY_STORAGE, next)
  } catch {
    // localStorage may be unavailable in strict privacy contexts
  }

  return next
}
