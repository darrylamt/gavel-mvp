'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'

export default function AdminPage() {
  const [data, setData] = useState<DashboardPayload>({ users: [], auctions: [], sellers: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const payload = (await res.json()) as DashboardPayload
        setData(payload)
      }

      setLoading(false)
    }

    loadDashboard()
  }, [])

  const activeAuctions = useMemo(
    () => data.auctions.filter((auction) => auction.status === 'active').length,
    [data.auctions]
  )

  const statusGraph = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const auction of data.auctions) {
      const key = auction.status || 'unknown'
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }))
  }, [data.auctions])

  const roleGraph = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const user of data.users) {
      const key = user.role || 'user'
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }))
  }, [data.users])

  if (loading) {
    return <p className="p-6">Loading admin dashboard…</p>
  }

  return (
    <AdminShell>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Users" value={String(data.users.length)} />
        <StatCard label="Auctions" value={String(data.auctions.length)} />
        <StatCard label="Active" value={String(activeAuctions)} />
        <StatCard label="Sellers" value={String(data.sellers.length)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MiniBarChart title="Auctions by Status" points={statusGraph} colorClass="bg-blue-500" />
        <MiniBarChart title="Users by Role" points={roleGraph} colorClass="bg-violet-500" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Users">
          {data.users.length === 0 ? (
            <p className="text-sm text-gray-500">No users found.</p>
          ) : (
            <div className="max-h-72 overflow-auto">
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
                  {data.users.slice(0, 30).map((user) => (
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
        </Card>

        <Card title="Sellers">
          {data.sellers.length === 0 ? (
            <p className="text-sm text-gray-500">No external sellers yet.</p>
          ) : (
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Phone</th>
                    <th className="py-2">Auctions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellers.slice(0, 30).map((seller) => (
                    <tr key={`${seller.name}-${seller.phone}`} className="border-t">
                      <td className="py-2">{seller.name}</td>
                      <td className="py-2">{seller.phone}</td>
                      <td className="py-2">{seller.totalAuctions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Auctions">
        {data.auctions.length === 0 ? (
          <p className="text-sm text-gray-500">No auctions found.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Current</th>
                  <th className="py-2">Reserve</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Seller</th>
                </tr>
              </thead>
              <tbody>
                {data.auctions.slice(0, 60).map((auction) => (
                  <tr key={auction.id} className="border-t">
                    <td className="py-2">{auction.title}</td>
                    <td className="py-2">{auction.status || '-'}</td>
                    <td className="py-2">GHS {(auction.current_price ?? 0).toLocaleString()}</td>
                    <td className="py-2">{auction.reserve_price != null ? `GHS ${auction.reserve_price.toLocaleString()}` : '-'}</td>
                    <td className="py-2">{auction.sale_source === 'seller' ? 'External Seller' : 'Gavel Products'}</td>
                    <td className="py-2">{auction.seller_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}
