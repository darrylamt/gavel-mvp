'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BadgePercent, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Gavel, LayoutDashboard, Mail, MessageSquare, Package, Store, Truck, Users, Wallet } from 'lucide-react'

type Props = {
  children: React.ReactNode
}

const tabs = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/deliveries', label: 'Deliveries', icon: Truck },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/revenue', label: 'Revenue', icon: Wallet },
  { href: '/admin/payouts', label: 'Seller Payouts', icon: Wallet },
  { href: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
  { href: '/admin/broadcast', label: 'Broadcast Email', icon: Mail },
  { href: '/admin/sellers', label: 'Sellers', icon: Store },
]

export default function AdminShell({ children }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-100 p-4 md:p-6">
      <div className={`mx-auto grid w-full max-w-7xl gap-4 ${collapsed ? 'lg:grid-cols-[84px_1fr]' : 'lg:grid-cols-[240px_1fr]'}`}>
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <div className={`${collapsed ? 'mb-2' : 'mb-4'} flex items-center justify-between`}>
            {!collapsed && <h1 className="text-2xl font-bold">Admin</h1>}
            <button
              type="button"
              onClick={() => setCollapsed((previous) => !previous)}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="inline-flex lg:hidden">
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </span>
              <span className="hidden lg:inline-flex">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </span>
            </button>
          </div>

          <nav className={`${collapsed ? 'flex flex-wrap items-center gap-2 lg:block lg:space-y-2' : 'space-y-2'} text-sm`}>
            {tabs.map((tab) => {
              const active = pathname === tab.href
              const Icon = tab.icon

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  title={tab.label}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${collapsed ? 'justify-center px-2' : ''} ${
                    active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {!collapsed && tab.label}
                </Link>
              )
            })}
          </nav>

          <Link
            href="/admin/new"
            title="New Auction"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            {collapsed ? 'New' : 'New Auction'}
          </Link>
        </aside>

        <section className="space-y-4">{children}</section>
      </div>
    </main>
  )
}
