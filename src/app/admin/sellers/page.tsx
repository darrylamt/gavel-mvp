'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<DashboardPayload['sellers']>([])
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
        setSellers(data.sellers)
      }
      setLoading(false)
    }

    load()
  }, [])

  const topSellers = useMemo(
    () => [...sellers].sort((a, b) => b.totalAuctions - a.totalAuctions).slice(0, 8),
    [sellers]
  )

  return (
    <AdminShell>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Sellers</h2>
        <p className="mt-1 text-sm text-gray-500">External sellers and activity overview.</p>
      </div>

      <MiniBarChart
        title="Top Sellers by Auctions"
        points={topSellers.map((seller) => ({ label: seller.name, value: seller.totalAuctions }))}
        colorClass="bg-emerald-500"
      />

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Loading sellers…</p>
        ) : sellers.length === 0 ? (
          <p className="text-sm text-gray-500">No sellers found.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Total Auctions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
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
      </div>
    </AdminShell>
  )
}
