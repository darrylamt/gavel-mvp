'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminShell from '@/components/admin/AdminShell'
import MiniBarChart from '@/components/admin/MiniBarChart'
import { DashboardPayload } from '@/components/admin/AdminTypes'
import PieChartCard from '@/components/base/PieChartCard'
import { Users, Gavel, TrendingUp, Store, X, Search, SlidersHorizontal, GitBranch } from 'lucide-react'

type ReferralSummary = {
  monthly_paid: number
  total_pending: number
  active_referrers: number
  top_referrer_this_month: string
}

type ReferralCommission = {
  id: string
  referrer_masked: string
  referred_masked: string
  gross_amount: number
  commission_amount: number
  status: string
  triggered_at: string
  order_id: string | null
}

type ReferralPayoutBatch = {
  id: string
  referrer_id: string
  amount: number
  period: string
  status: string
  created_at: string
}

type AdminReferralData = {
  summary: ReferralSummary
  commissions: ReferralCommission[]
  payout_batches: ReferralPayoutBatch[]
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardPayload>({ users: [], auctions: [], sellers: [], purchases: [] })
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [sellerSearch, setSellerSearch] = useState('')
  const [auctionSearch, setAuctionSearch] = useState('')
  const [auctionStatusFilter, setAuctionStatusFilter] = useState('all')
  const [referralData, setReferralData] = useState<AdminReferralData | null>(null)
  const [referralCommissionFilter, setReferralCommissionFilter] = useState('all')
  const [referralLoading, setReferralLoading] = useState(false)
  const [referralLoaded, setReferralLoaded] = useState(false)

  // Modal state
  const [selectedUser, setSelectedUser] = useState<DashboardPayload['users'][0] | null>(null)
  const [selectedSeller, setSelectedSeller] = useState<DashboardPayload['sellers'][0] | null>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<DashboardPayload['purchases'][0] | null>(null)
  const [selectedAuction, setSelectedAuction] = useState<DashboardPayload['auctions'][0] | null>(null)

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

  async function loadReferralData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    setReferralLoading(true)
    const res = await fetch(`/api/admin/referrals?status=${referralCommissionFilter}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) setReferralData(await res.json())
    setReferralLoading(false)
    setReferralLoaded(true)
  }

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

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    return data.users.filter((user) => {
      const role = user.role || 'user'
      const roleMatch = userRoleFilter === 'all' || role === userRoleFilter
      const textMatch =
        !query ||
        `${user.username || ''} ${user.phone || ''} ${role}`.toLowerCase().includes(query)
      return roleMatch && textMatch
    })
  }, [data.users, userRoleFilter, userSearch])

  const filteredSellers = useMemo(() => {
    const query = sellerSearch.trim().toLowerCase()
    if (!query) return data.sellers
    return data.sellers.filter((seller) => `${seller.name} ${seller.phone}`.toLowerCase().includes(query))
  }, [data.sellers, sellerSearch])

  const filteredAuctions = useMemo(() => {
    const query = auctionSearch.trim().toLowerCase()
    return data.auctions.filter((auction) => {
      const status = auction.status || 'unknown'
      const statusMatch = auctionStatusFilter === 'all' || status === auctionStatusFilter
      const textMatch =
        !query ||
        `${auction.title || ''} ${auction.seller_name || ''} ${status}`.toLowerCase().includes(query)
      return statusMatch && textMatch
    })
  }, [auctionSearch, auctionStatusFilter, data.auctions])

  if (loading) {
    return (
      <AdminShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Loading admin dashboard…</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Users" value={String(data.users.length)} icon={<Users className="h-5 w-5" />} color="orange" />
        <StatCard label="Total Auctions" value={String(data.auctions.length)} icon={<Gavel className="h-5 w-5" />} color="blue" />
        <StatCard label="Active Auctions" value={String(activeAuctions)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
        <StatCard label="Sellers" value={String(data.sellers.length)} icon={<Store className="h-5 w-5" />} color="violet" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <MiniBarChart title="Auctions by Status" points={statusGraph} colorClass="bg-blue-500" />
        <MiniBarChart title="Users by Role" points={roleGraph} colorClass="bg-violet-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PieChartCard title="Auction Status Split" points={statusGraph} emptyLabel="No auction status data" />
        <PieChartCard title="User Role Split" points={roleGraph} emptyLabel="No user role data" />
      </div>

      {/* Users & Sellers */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Users Card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Users</h2>
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search users"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(event) => setUserRoleFilter(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="user">User</option>
              </select>
              <span className="text-xs text-gray-400">{filteredUsers.length} shown</span>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No users found.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {filteredUsers.slice(0, 30).map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.username || '—'}</p>
                        <p className="text-xs text-gray-500">{user.phone || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={user.role || 'user'} />
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden max-h-72 overflow-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                        <th className="pb-2 pt-1">Username</th>
                        <th className="pb-2 pt-1">Phone</th>
                        <th className="pb-2 pt-1">Role</th>
                        <th className="pb-2 pt-1"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.slice(0, 30).map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-900">{user.username || '—'}</td>
                          <td className="py-2.5 text-gray-600">{user.phone || '—'}</td>
                          <td className="py-2.5"><RoleBadge role={user.role || 'user'} /></td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sellers Card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Sellers</h2>
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={sellerSearch}
                  onChange={(event) => setSellerSearch(event.target.value)}
                  placeholder="Search sellers"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <span className="text-xs text-gray-400">{filteredSellers.length} shown</span>
            </div>

            {filteredSellers.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No external sellers yet.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {filteredSellers.slice(0, 30).map((seller) => (
                    <div key={seller.userId} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{seller.name}</p>
                        <p className="text-xs text-gray-500">{seller.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{seller.totalProducts} products</span>
                        <button
                          onClick={() => setSelectedSeller(seller)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden max-h-72 overflow-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                        <th className="pb-2 pt-1">Name</th>
                        <th className="pb-2 pt-1">Phone</th>
                        <th className="pb-2 pt-1">Products</th>
                        <th className="pb-2 pt-1"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredSellers.slice(0, 30).map((seller) => (
                        <tr key={seller.userId} className="hover:bg-gray-50">
                          <td className="py-2.5 font-medium text-gray-900">{seller.name}</td>
                          <td className="py-2.5 text-gray-600">{seller.phone}</td>
                          <td className="py-2.5 text-gray-600">{seller.totalProducts}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setSelectedSeller(seller)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Purchases</h2>
        </div>
        <div className="p-5">
          {data.purchases.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No purchases yet.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {data.purchases.slice(0, 20).map((purchase) => (
                  <div key={`${purchase.orderId}-${purchase.productTitle}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{purchase.productTitle}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{purchase.sellerName || 'Seller'} · {purchase.sellerShopName || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">GHS {Number(purchase.orderTotalAmount).toLocaleString()}</p>
                        <button
                          onClick={() => setSelectedPurchase(purchase)}
                          className="mt-1 rounded-lg border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-white"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="pb-2 pt-1">Date</th>
                      <th className="pb-2 pt-1">Product</th>
                      <th className="pb-2 pt-1">Seller</th>
                      <th className="pb-2 pt-1 text-right">Amount</th>
                      <th className="pb-2 pt-1"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.purchases.slice(0, 20).map((purchase) => (
                      <tr key={`${purchase.orderId}-${purchase.productTitle}`} className="align-top hover:bg-gray-50">
                        <td className="whitespace-nowrap py-2.5 text-xs text-gray-500">
                          {purchase.orderCreatedAt ? new Date(purchase.orderCreatedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5">
                          <p className="font-medium text-gray-900">{purchase.productTitle}</p>
                          <p className="text-xs text-gray-400">Qty: {purchase.quantity}</p>
                        </td>
                        <td className="py-2.5">
                          <p className="text-gray-900">{purchase.sellerName || 'Seller'}</p>
                          <p className="text-xs text-gray-400">{purchase.sellerShopName || '—'}</p>
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-right font-semibold text-gray-900">
                          GHS {Number(purchase.orderTotalAmount).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedPurchase(purchase)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auctions */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Auctions</h2>
        </div>
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={auctionSearch}
                onChange={(event) => setAuctionSearch(event.target.value)}
                placeholder="Search auctions"
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <select
              value={auctionStatusFilter}
              onChange={(event) => setAuctionStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
              <option value="delivered">Delivered</option>
            </select>
            <span className="text-xs text-gray-400">{filteredAuctions.length} shown</span>
          </div>

          {filteredAuctions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No auctions found.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {filteredAuctions.slice(0, 60).map((auction) => (
                  <div key={auction.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{auction.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">GHS {(auction.current_price ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={auction.status || 'unknown'} />
                        <button
                          onClick={() => setSelectedAuction(auction)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden max-h-80 overflow-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="pb-2 pt-1">Title</th>
                      <th className="pb-2 pt-1">Status</th>
                      <th className="pb-2 pt-1">Current</th>
                      <th className="pb-2 pt-1"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAuctions.slice(0, 60).map((auction) => (
                      <tr key={auction.id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">{auction.title}</td>
                        <td className="py-2.5"><StatusBadge status={auction.status || 'unknown'} /></td>
                        <td className="py-2.5 text-gray-600">GHS {(auction.current_price ?? 0).toLocaleString()}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedAuction(auction)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <Modal title={selectedUser.username || 'User'} onClose={() => setSelectedUser(null)}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Username" value={selectedUser.username || '—'} />
            <DetailItem label="Phone" value={selectedUser.phone || '—'} />
            <DetailItem label="Token Balance" value={String(selectedUser.token_balance ?? 0)} />
            <DetailItem label="Role" value={selectedUser.role || 'user'} />
          </div>
        </Modal>
      )}

      {/* ─── Referrals Section ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Referral Programme</h2>
          </div>
          {!referralLoaded && (
            <button
              onClick={loadReferralData}
              disabled={referralLoading}
              className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {referralLoading ? 'Loading…' : 'Load Data'}
            </button>
          )}
        </div>

        {!referralLoaded ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Click &quot;Load Data&quot; to view referral stats.</p>
        ) : referralLoading ? (
          <div className="flex justify-center py-8"><div className="h-7 w-7 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" /></div>
        ) : referralData ? (
          <div className="p-5 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Paid This Month" value={`GHS ${Number(referralData.summary.monthly_paid).toFixed(2)}`} icon={<GitBranch className="h-5 w-5" />} color="green" />
              <StatCard label="Total Pending" value={`GHS ${Number(referralData.summary.total_pending).toFixed(2)}`} icon={<GitBranch className="h-5 w-5" />} color="blue" />
              <StatCard label="Active Referrers" value={String(referralData.summary.active_referrers)} icon={<Users className="h-5 w-5" />} color="violet" />
              <StatCard label="Top Referrer" value={referralData.summary.top_referrer_this_month} icon={<TrendingUp className="h-5 w-5" />} color="orange" />
            </div>

            {/* Commission filter + table */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-700">Commissions</h3>
                <div className="flex gap-1.5">
                  {(['all', 'pending', 'approved', 'paid', 'cancelled'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setReferralCommissionFilter(f); setReferralLoaded(false) }}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${referralCommissionFilter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {referralData.commissions.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No commissions found.</p>
              ) : (
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                        <th className="pb-2">Referrer</th>
                        <th className="pb-2">Referred User</th>
                        <th className="pb-2 text-right">Order</th>
                        <th className="pb-2 text-right">Commission</th>
                        <th className="pb-2 text-right">Status</th>
                        <th className="pb-2 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {referralData.commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono text-xs text-gray-700">{c.referrer_masked}</td>
                          <td className="py-2 font-mono text-xs text-gray-700">{c.referred_masked}</td>
                          <td className="py-2 text-right text-xs text-gray-600">GHS {Number(c.gross_amount).toFixed(2)}</td>
                          <td className="py-2 text-right text-xs font-medium text-orange-600">GHS {Number(c.commission_amount).toFixed(2)}</td>
                          <td className="py-2 text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              c.status === 'paid' ? 'bg-emerald-50 text-emerald-700'
                              : c.status === 'approved' ? 'bg-blue-50 text-blue-700'
                              : c.status === 'cancelled' ? 'bg-red-50 text-red-600'
                              : 'bg-yellow-50 text-yellow-700'
                            }`}>{c.status}</span>
                          </td>
                          <td className="py-2 text-right text-xs text-gray-400">
                            {new Date(c.triggered_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout batches */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Payout Batches</h3>
              {referralData.payout_batches.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No payout batches yet.</p>
              ) : (
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                        <th className="pb-2">Period</th>
                        <th className="pb-2 text-right">Amount</th>
                        <th className="pb-2 text-right">Status</th>
                        <th className="pb-2 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {referralData.payout_batches.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-800">{p.period}</td>
                          <td className="py-2 text-right text-gray-700">GHS {Number(p.amount).toFixed(2)}</td>
                          <td className="py-2 text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              p.status === 'paid' ? 'bg-emerald-50 text-emerald-700'
                              : p.status === 'failed' ? 'bg-red-50 text-red-600'
                              : 'bg-blue-50 text-blue-700'
                            }`}>{p.status}</span>
                          </td>
                          <td className="py-2 text-right text-xs text-gray-400">
                            {new Date(p.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Seller Detail Modal */}
      {selectedSeller && (
        <Modal title={selectedSeller.name} onClose={() => setSelectedSeller(null)}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Name" value={selectedSeller.name} />
            <DetailItem label="Phone" value={selectedSeller.phone} />
            <DetailItem label="Total Products" value={String(selectedSeller.totalProducts)} />
          </div>
        </Modal>
      )}

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <Modal title={selectedPurchase.productTitle} onClose={() => setSelectedPurchase(null)}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Product" value={selectedPurchase.productTitle} />
            <DetailItem label="Quantity" value={String(selectedPurchase.quantity)} />
            <DetailItem label="Order ID" value={selectedPurchase.orderId} />
            <DetailItem label="Date" value={selectedPurchase.orderCreatedAt ? new Date(selectedPurchase.orderCreatedAt).toLocaleString() : '—'} />
            <DetailItem label="Total Amount" value={`GHS ${Number(selectedPurchase.orderTotalAmount).toLocaleString()}`} />
            <DetailItem label="Seller" value={selectedPurchase.sellerName || '—'} />
            <DetailItem label="Shop Name" value={selectedPurchase.sellerShopName || '—'} />
            <DetailItem label="Payout Provider" value={selectedPurchase.sellerPayoutProvider || '—'} />
            <DetailItem label="Account Name" value={selectedPurchase.sellerPayoutAccountName || '—'} />
            <DetailItem label="Account Number" value={selectedPurchase.sellerPayoutAccountNumber || '—'} />
          </div>
        </Modal>
      )}

      {/* Auction Detail Modal */}
      {selectedAuction && (
        <Modal title={selectedAuction.title} onClose={() => setSelectedAuction(null)}>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Title" value={selectedAuction.title} />
            <DetailItem label="Status" value={selectedAuction.status || '—'} />
            <DetailItem label="Current Price" value={`GHS ${(selectedAuction.current_price ?? 0).toLocaleString()}`} />
            <DetailItem label="Reserve Price" value={selectedAuction.reserve_price != null ? `GHS ${selectedAuction.reserve_price.toLocaleString()}` : '—'} />
            <DetailItem label="Source" value={selectedAuction.sale_source === 'seller' ? 'External Seller' : 'Gavel Products'} />
            <DetailItem label="Seller" value={selectedAuction.seller_name || '—'} />
          </div>
        </Modal>
      )}
    </AdminShell>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: 'orange' | 'blue' | 'green' | 'violet'
}) {
  const colorMap = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <span className={`rounded-xl p-2 ${colorMap[color]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: 'bg-red-50 text-red-700',
    seller: 'bg-orange-50 text-orange-700',
    user: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    scheduled: 'bg-blue-50 text-blue-700',
    ended: 'bg-gray-100 text-gray-600',
    delivered: 'bg-orange-50 text-orange-700',
    unknown: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
