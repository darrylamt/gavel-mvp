'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'

type User = {
  id: string
  email: string
  username: string | null
  full_name: string | null
  role: string | null
  banned_at: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showBannedOnly, setShowBannedOnly] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      } else {
        setError(data.error || 'Failed to load users')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const banUser = async (userId: string, email: string) => {
    const confirmed = confirm(`Ban user ${email}? Their account will be suspended.`)
    if (!confirmed) return

    console.log('[BAN-FRONTEND] Banning user:', { userId, email })
    setBusyId(userId)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      console.error('[BAN-FRONTEND] No token found')
      setError('Unauthorized')
      setBusyId(null)
      return
    }

    try {
      console.log('[BAN-FRONTEND] Making request to /api/admin/users/' + userId + '/ban')
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log('[BAN-FRONTEND] Response status:', res.status)
      const data = await res.json()
      console.log('[BAN-FRONTEND] Response data:', data)
      
      if (!res.ok) {
        console.error('[BAN-FRONTEND] Ban failed:', data.error)
        setError(data.error || 'Failed to ban user')
      } else {
        console.log('[BAN-FRONTEND] Ban successful, reloading users')
        await loadUsers()
        setError(null)
      }
    } catch (err) {
      console.error('[BAN-FRONTEND] Exception:', err)
      setError(err instanceof Error ? err.message : 'Failed to ban user')
    } finally {
      setBusyId(null)
    }
  }

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase()
    const isBanned = !!user.banned_at
    const matchesSearch =
      !query ||
      user.email.toLowerCase().includes(query) ||
      (user.username?.toLowerCase().includes(query) ?? false) ||
      (user.full_name?.toLowerCase().includes(query) ?? false)

    if (showBannedOnly) {
      return isBanned && matchesSearch
    }

    return matchesSearch
  })

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-gray-600">Manage and ban users</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search by email, username, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-2"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showBannedOnly}
                onChange={(e) => setShowBannedOnly(e.target.checked)}
              />
              <span className="text-sm">Show banned only</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center">Loading...</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{user.username || '-'}</td>
                    <td className="px-4 py-3 text-sm">{user.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm capitalize">{user.role || 'user'}</td>
                    <td className="px-4 py-3 text-sm">
                      {user.banned_at ? (
                        <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-red-700">
                          Banned
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {!user.banned_at && user.role !== 'admin' && (
                        <button
                          onClick={() => banUser(user.id, user.email)}
                          disabled={busyId === user.id}
                          className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:bg-gray-400"
                        >
                          {busyId === user.id ? 'Banning...' : 'Ban'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
