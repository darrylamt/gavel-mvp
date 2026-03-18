'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type NotificationType = 'auction_won' | 'bid_received' | 'application_approved' | 'payment_required' | 'delivery_update' | 'seller_onboarding' | 'product_review' | 'promotion' | 'system'

type Notification = {
  id: string
  title: string
  message: string
  type: NotificationType
  created_at: string
  read: boolean
  link?: string
  icon?: string
}

const notificationTypeConfig: Record<NotificationType, { label: string; color: string; bgColor: string }> = {
  auction_won: { label: 'Auction Won', color: 'text-green-600', bgColor: 'bg-green-50' },
  bid_received: { label: 'Bid Received', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  application_approved: { label: 'Application Approved', color: 'text-green-600', bgColor: 'bg-green-50' },
  payment_required: { label: 'Payment Required', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  delivery_update: { label: 'Delivery Update', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  seller_onboarding: { label: 'Seller Onboarding', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  product_review: { label: 'Product Review', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  promotion: { label: 'Promotion', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  system: { label: 'System', color: 'text-gray-600', bgColor: 'bg-gray-50' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      // Fetch notifications from database
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, created_at, read, link')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Failed to fetch notifications:', error)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (showOnlyUnread && notif.read) return false
    if (filter !== 'all' && notif.type !== filter) return false
    return true
  })

  async function markAsRead(id: string) {
    setNotifications(notifications.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  async function deleteNotification(id: string) {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  async function markAllAsRead() {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-semibold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(notificationTypeConfig).map(([type, config]) => (
              <button
                key={type}
                onClick={() => setFilter(type as NotificationType)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === type
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlyUnread
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showOnlyUnread ? (
              <>
                <EyeOff className="h-4 w-4" /> Unread Only
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> All
              </>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map(notification => {
              const config = notificationTypeConfig[notification.type]
              return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all ${
                    notification.read
                      ? 'border-gray-200 bg-white hover:border-gray-300'
                      : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                        {!notification.read && (
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          View
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                          title="Mark as read"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">No notifications</p>
          </div>
        )}
      </div>
    </div>
  )
}
