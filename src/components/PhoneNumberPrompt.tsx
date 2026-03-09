'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PhoneNumberPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkPhoneNumber = async () => {
      try {
        // Don't show prompt during onboarding (user just signed up)
        const isOnboarding = searchParams?.get('onboarding') === '1'
        if (isOnboarding) {
          setLoading(false)
          return
        }

        // Check if user dismissed this prompt before
        const hasDismissed = localStorage.getItem('phoneNumberPromptDismissed')
        if (hasDismissed) {
          setLoading(false)
          return
        }

        // Get current user (force refresh to avoid stale cache)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        // Check if user has a phone number (with cache-busting query)
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle()

        const hasPhone = profile?.phone && profile.phone.trim() !== ''

        if (!hasPhone) {
          // Wait a moment before showing the prompt
          setTimeout(() => {
            setShowPrompt(true)
            setLoading(false)
          }, 2000)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error checking phone number:', error)
        setLoading(false)
      }
    }

    checkPhoneNumber()
  }, [searchParams])

  const handleDismiss = () => {
    localStorage.setItem('phoneNumberPromptDismissed', 'true')
    setShowPrompt(false)
  }

  if (loading || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border-l-4 border-blue-500 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Add your phone number
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Get instant SMS alerts about bids, auctions, payments, and deliveries.
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                onClick={handleDismiss}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Add Now
              </Link>
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

