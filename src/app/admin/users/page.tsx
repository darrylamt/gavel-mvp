'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import { Search, Users, X, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react'

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

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
        setSelectedUser(null)
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

  const bannedCount = users.filter((u) => !!u.banned_at).length

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500">Manage and ban users</p>
            </div>
          </div>

          {/* Summary badges */}
          {!loading && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                <Users className="h-3 w-3" />
                {users.length} total
              </span>
              {bannedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                  <ShieldAlert className="h-3 w-3" />
                  {bannedCount} banned
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, username, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showBannedOnly}
                onChange={(e) => setShowBannedOnly(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span className="font-medium text-gray-700">Banned only</span>
              {bannedCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">{bannedCount}</span>
              )}
            </label>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
              <p className="text-sm text-gray-400">Loading users…</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">No users found</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 sm:hidden">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.email}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{user.full_name || user.username || '—'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={user.role || 'user'} />
                        <StatusBadge banned={!!user.banned_at} />
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="shrink-0 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Email</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Username</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Role</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-gray-900">{user.email}</p>
                          {user.full_name && <p className="text-xs text-gray-400">{user.full_name}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{user.username || '—'}</td>
                      <td className="px-5 py-3.5"><RoleBadge role={user.role || 'user'} /></td>
                      <td className="px-5 py-3.5"><StatusBadge banned={!!user.banned_at} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
                          >
                            View
                          </button>
                          {!user.banned_at && user.role !== 'admin' && (
                            <button
                              onClick={() => banUser(user.id, user.email)}
                              disabled={busyId === user.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {busyId === user.id ? 'Banning…' : 'Ban'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedUser(null)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedUser.email}</h3>
                <p className="text-xs text-gray-400">
                  Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5">
              <InfoItem label="Email" value={selectedUser.email} />
              <InfoItem label="Username" value={selectedUser.username || '—'} />
              <InfoItem label="Full Name" value={selectedUser.full_name || '—'} />
              <InfoItem label="Role" value={selectedUser.role || 'user'} />
              <InfoItem label="Status" value={selectedUser.banned_at ? 'Banned' : 'Active'} />
              <InfoItem label="Joined" value={new Date(selectedUser.created_at).toLocaleString()} />
              {selectedUser.banned_at && (
                <InfoItem label="Banned At" value={new Date(selectedUser.banned_at).toLocaleString()} />
              )}
            </div>

            {!selectedUser.banned_at && selectedUser.role !== 'admin' && (
              <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                <button
                  onClick={() => banUser(selectedUser.id, selectedUser.email)}
                  disabled={busyId === selectedUser.id}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {busyId === selectedUser.id ? 'Banning…' : 'Ban This User'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: 'bg-red-50 text-red-700 border-red-100',
    seller: 'bg-orange-50 text-orange-700 border-orange-100',
    user: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {role}
    </span>
  )
}

function StatusBadge({ banned }: { banned: boolean }) {
  if (banned) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <ShieldAlert className="h-3 w-3" />
        Banned
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </span>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
