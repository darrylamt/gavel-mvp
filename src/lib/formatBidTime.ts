/**
 * Format bid timestamp with intelligent spacing
 * - Today: just time (14:30)
 * - Yesterday: "Yesterday 14:30"
 * - 2+ days ago: full date (3 Mar 14:30)
 */
export function formatBidTime(dateString: string): string {
  const bidDate = new Date(dateString)
  const now = new Date()

  // Get today's date at midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const bidDateAtMidnight = new Date(
    bidDate.getFullYear(),
    bidDate.getMonth(),
    bidDate.getDate()
  )

  // Calculate days difference
  const diffMs = today.getTime() - bidDateAtMidnight.getTime()
  const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const timeStr = bidDate.toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (daysDiff === 0) {
    // Today - just show time
    return timeStr
  } else if (daysDiff === 1) {
    // Yesterday
    return `Yesterday ${timeStr}`
  } else {
    // 2+ days ago - show full date and time
    const dateStr = bidDate.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
    return `${dateStr} ${timeStr}`
  }
}
