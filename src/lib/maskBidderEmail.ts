export function maskBidderEmail(email?: string | null) {
  if (!email) return null

  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.indexOf('@')
  if (atIndex <= 0 || atIndex === normalized.length - 1) return null

  const localPart = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)
  if (!domain) return null

  const visibleLocal = localPart.slice(0, 2).padEnd(2, '*')
  return `${visibleLocal}*******@${domain}`
}
