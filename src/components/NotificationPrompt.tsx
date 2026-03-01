'use client'

import { useEffect, useState } from 'react'
import { requestNotificationPermission, registerServiceWorker, getNotificationPermission } from '@/lib/notifications'
import { X, Bell } from 'lucide-react'

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already prompted or denied
    const hasAskedForNotifications = localStorage.getItem('notificationPromptShown')
    const permission = getNotificationPermission()

    if (!hasAskedForNotifications && permission === 'default') {
      // Wait a moment before showing the prompt
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleEnableNotifications = async () => {
    setLoading(true)
    localStorage.setItem('notificationPromptShown', 'true')

    try {
      // Register service worker
      await registerServiceWorker()

      // Request permission
      const granted = await requestNotificationPermission()

      if (granted) {
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('notificationPromptShown', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Stay Updated</h3>
            <p className="text-sm text-gray-600 mt-1">
              Get notifications when auctions end, you win bids, or receive messages.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnableNotifications}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-3 py-2 rounded transition-colors"
              >
                {loading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-gray-700 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
