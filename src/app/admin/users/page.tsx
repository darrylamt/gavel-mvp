'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<DashboardPayload['users']>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="mt-1 text-sm text-gray-500">Manage and inspect platform users.</p>
      </div>

      <MiniBarChart title="User Roles" points={roleGraph} colorClass="bg-indigo-500" />

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Loading users…</p>
        ) : users.length === 0 ? (
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
                {users.map((user) => (
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
