'use client'

import { useState } from 'react'

type Props = {
  auctionId: string
}

export default function ShareAuctionButton({ auctionId }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/auction/${auctionId}`
    : `/share/auction/${auctionId}`

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this auction on Gavel',
          text: 'I found this auction on Gavel',
          url: shareUrl,
        })
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore cancellation or clipboard errors
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? 'Link copied' : 'Share Auction'}
    </button>
  )
}
