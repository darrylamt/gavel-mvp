'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Notification = {
  id: string
  title: string
  message: string
  created_at: string
  read: boolean
  type: 'info' | 'warning' | 'success'
  link?: string
}

function relativeTime(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const typeColor: Record<string, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return
        const { data } = await supabase
          .from('notifications')
          .select('id, title, message, type, created_at, read, link')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setNotifications(data || [])
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-[1.1rem] w-[1.1rem]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white px-1 leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/10 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[360px] overflow-y-auto overscroll-contain divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 border-2 border-gray-100 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(n => (
                <button
                  key={n.id}
                  type="button"
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${!n.read ? 'bg-orange-50/60' : ''}`}
                  onClick={() => {
                    if (n.link) window.location.href = n.link
                    setIsOpen(false)
                  }}
                >
                  <div className={`mt-2 h-2 w-2 rounded-full flex-shrink-0 ${typeColor[n.type] ?? 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                    {relativeTime(n.created_at)}
                  </span>
                </button>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No notifications yet.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
            <Link
              href="/profile/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors py-0.5"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
