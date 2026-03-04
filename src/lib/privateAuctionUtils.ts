/**
 * Utility functions for managing private auction access codes
 */

/**
 * Generates a secure, human-readable access code
 * Format: XXXX-XXXX-XXXX (12 characters total, 3 groups of 4)
 * Uses uppercase letters and numbers, excluding confusing characters (0, O, I, L)
 */
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // Excluded 0, O, I, L to avoid confusion
  let code = ''
  
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-'
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return code
}

/**
 * Validates that an access code matches the expected format
 */
export function isValidAccessCode(code: string): boolean {
  // Format: XXXX-XXXX-XXXX
  const pattern = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/
  return pattern.test(code)
}

/**
 * Normalizes an access code for comparison (removes dashes, converts to uppercase)
 */
export function normalizeAccessCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase()
}

/**
 * Compares two access codes securely using timing-safe comparison
 * This prevents timing attacks
 */
export function compareAccessCodes(provided: string, stored: string): boolean {
  const normalizedProvided = normalizeAccessCode(provided)
  const normalizedStored = normalizeAccessCode(stored)
  
  // Constant-time comparison
  if (normalizedProvided.length !== normalizedStored.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < normalizedProvided.length; i++) {
    result |= normalizedProvided.charCodeAt(i) ^ normalizedStored.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Gets the viewer key for tracking anonymous access
 * Tries to use auth user ID, falls back to localStorage key
 */
export async function getViewerKey(): Promise<{ userId?: string; viewerKey: string }> {
  try {
    // Try to get from Supabase auth first
    const { data: { session } } = await (await import('@/lib/supabaseClient')).supabase.auth.getSession()
    
    if (session?.user) {
      return {
        userId: session.user.id,
        viewerKey: session.user.id,
      }
    }
  } catch (e) {
    console.error('Error getting session:', e)
  }
  
  // Fallback to browser storage for anonymous viewers
  if (typeof window !== 'undefined') {
    let viewerKey = localStorage.getItem('gavel_viewer_key')
    if (!viewerKey) {
      viewerKey = `viewer_${Date.now()}_${Math.random().toString(36).substring(7)}`
      localStorage.setItem('gavel_viewer_key', viewerKey)
    }
    return { viewerKey }
  }
  
  // Server-side fallback
  return {
    viewerKey: `server_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  }
}
