'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<DashboardPayload['users']>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = (await res.json()) as DashboardPayload
        setUsers(data.users)
      }
      setLoading(false)
    }

    load()
  }, [])

  const roleGraph = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const user of users) {
      const role = user.role || 'user'
      grouped.set(role, (grouped.get(role) ?? 0) + 1)
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }))
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return users.filter((user) => {
      const role = user.role || 'user'
      const roleMatch = roleFilter === 'all' || role === roleFilter
      const textMatch = !query || `${user.username || ''} ${user.phone || ''} ${role}`.toLowerCase().includes(query)
      return roleMatch && textMatch
    })
  }, [roleFilter, searchQuery, users])

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="mt-1 text-sm text-gray-500">Manage and inspect platform users.</p>
      </div>

      <MiniBarChart title="User Roles" points={roleGraph} colorClass="bg-indigo-500" />

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search users"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
          />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="seller">Seller</option>
            <option value="user">User</option>
          </select>
          <span className="text-xs text-gray-500">{filteredUsers.length} shown</span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading users…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No users found.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Username</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Tokens</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="py-2">{user.username || '-'}</td>
                    <td className="py-2">{user.phone || '-'}</td>
                    <td className="py-2">{user.token_balance ?? 0}</td>
                    <td className="py-2">{user.role || 'user'}</td>
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
