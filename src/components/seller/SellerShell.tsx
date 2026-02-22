'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Gavel, LayoutDashboard, Package, Store, Truck, Wallet } from 'lucide-react'

type Props = {
  children: React.ReactNode
}

const tabs = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/auctions', label: 'My Auctions', icon: Gavel },
  { href: '/seller/products', label: 'My Products', icon: Package },
  { href: '/seller/earnings', label: 'Earnings', icon: Wallet },
  { href: '/seller/shop', label: 'Shop Profile', icon: Store },
  { href: '/seller/deliveries', label: 'Deliveries', icon: Truck },
]

export default function SellerShell({ children }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-100 p-4 md:p-6">
      <div className={`mx-auto grid w-full max-w-7xl gap-4 ${collapsed ? 'lg:grid-cols-[84px_1fr]' : 'lg:grid-cols-[240px_1fr]'}`}>
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <div className={`${collapsed ? 'mb-2' : 'mb-4'} flex items-center justify-between`}>
            {!collapsed && <h1 className="text-2xl font-bold">Seller</h1>}
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
        </aside>

        <section className="space-y-4">{children}</section>
      </div>
    </main>
  )
}
