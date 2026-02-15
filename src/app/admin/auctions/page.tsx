'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<DashboardPayload['auctions']>([])
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
        setAuctions(data.auctions)
      }

      setLoading(false)
    }

    load()
  }, [])

  const statusGraph = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const auction of auctions) {
      const status = auction.status || 'unknown'
      grouped.set(status, (grouped.get(status) ?? 0) + 1)
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }))
  }, [auctions])

  return (
    <AdminShell>
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Auctions</h2>
          <p className="mt-1 text-sm text-gray-500">All auction records and current status.</p>
        </div>
        <Link href="/admin/new" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
          + Create Auction
        </Link>
      </div>

      <MiniBarChart title="Auction Status" points={statusGraph} colorClass="bg-sky-500" />

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Loading auctions…</p>
        ) : auctions.length === 0 ? (
          <p className="text-sm text-gray-500">No auctions found.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
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
                {auctions.map((auction) => (
                  <tr key={auction.id} className="border-t">
                    <td className="py-2">{auction.title}</td>
                    <td className="py-2">{auction.status || '-'}</td>
                    <td className="py-2">GHS {(auction.current_price ?? 0).toLocaleString()}</td>
                    <td className="py-2">{auction.reserve_price != null ? `GHS ${auction.reserve_price.toLocaleString()}` : '-'}</td>
                    <td className="py-2">{auction.sale_source === 'seller' ? 'Seller' : 'Gavel'}</td>
                    <td className="py-2">{auction.seller_name || '-'}</td>
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
