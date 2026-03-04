'use client'

import { useEffect, useState } from 'react'
import PrivateAuctionAccessModal from '@/components/auction/PrivateAuctionAccessModal'

interface PrivateAuctionGuardProps {
  auctionId: string
  auctionTitle: string
  isPrivate: boolean | undefined
  children: React.ReactNode
}

export default function PrivateAuctionGuard({
  auctionId,
  auctionTitle,
  isPrivate = false,
  children,
}: PrivateAuctionGuardProps) {
  const [hasAccess, setHasAccess] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPrivate) {
      setHasAccess(true)
      setLoading(false)
      return
    }

    // Check if user already has access via sessionStorage
    // (set by PrivateAuctionAccessForm when user enters code)
    const accessKey = `private_auction_${auctionId}`
    const storedAccess = sessionStorage.getItem(accessKey)

    if (storedAccess) {
      setHasAccess(true)
      setLoading(false)
    } else {
      // If they navigated directly to a private auction URL, show modal
      setShowModal(true)
      setLoading(false)
    }
  }, [auctionId, isPrivate])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (isPrivate && !hasAccess) {
    return (
      <>
        <PrivateAuctionAccessModal
          auctionId={auctionId}
          auctionTitle={auctionTitle}
          isOpen={showModal}
          onClose={() => {
            // Redirect back to auctions if they close without entering code
            window.location.href = '/auctions'
          }}
          onAccessGranted={() => {
            const accessKey = `private_auction_${auctionId}`
            sessionStorage.setItem(accessKey, 'granted')
            setHasAccess(true)
            setShowModal(false)
          }}
        />
        {/* Show placeholder while waiting for access */}
        <div className="min-h-screen bg-gray-50" />
      </>
    )
  }

  return <>{children}</>
}
