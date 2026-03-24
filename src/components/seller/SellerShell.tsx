'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Gavel,
  LayoutDashboard,
  Package,
  Store,
  Wallet,
  CreditCard,
  ShoppingBag,
  MoreHorizontal,
  X,
} from 'lucide-react'

type Props = {
  children: React.ReactNode
}

const tabs = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/auctions', label: 'My Auctions', icon: Gavel },
  { href: '/seller/products', label: 'My Products', icon: Package },
  { href: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/seller/earnings', label: 'Earnings', icon: Wallet },
  { href: '/seller/shop', label: 'Edit Shop', icon: Store },
  { href: '/seller/settings/payouts', label: 'Payout Settings', icon: CreditCard },
]

// First 4 tabs visible in bottom bar, rest in "More"
const bottomBarTabs = tabs.slice(0, 4)
const moreTabs = tabs.slice(4)

export default function SellerShell({ children }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      {/* Desktop layout */}
      <main className="hidden min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:block md:p-6">
        <div
          className={`mx-auto grid w-full max-w-7xl gap-4 ${
            collapsed ? 'lg:grid-cols-[72px_1fr]' : 'lg:grid-cols-[240px_1fr]'
          }`}
        >
          {/* Sidebar */}
          <aside className="self-start rounded-2xl bg-white p-3 shadow-sm border border-gray-100 sticky top-20">
            <div className={`${collapsed ? 'mb-2' : 'mb-4'} flex items-center justify-between`}>
              {!collapsed && (
                <span className="pl-1 text-base font-bold tracking-tight text-gray-900">Seller Hub</span>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition ${
                  collapsed ? 'mx-auto' : 'ml-auto'
                }`}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <nav className="space-y-0.5 text-sm">
              {tabs.map((tab) => {
                const active = pathname === tab.href
                const Icon = tab.icon

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    title={tab.label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all ${
                      collapsed ? 'justify-center px-0' : ''
                    } ${
                      active
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-orange-500' : ''}`} />
                    {!collapsed && (
                      <span className="truncate">{tab.label}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Content */}
          <section className="min-w-0 space-y-4">{children}</section>
        </div>
      </main>

      {/* Mobile layout */}
      <main className="block min-h-[calc(100vh-64px)] bg-gray-50 pb-20 md:hidden">
        <div className="px-4 py-4 space-y-4">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white md:hidden">
        <div className="flex items-center justify-around px-1 py-2">
          {bottomBarTabs.map((tab) => {
            const active = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.label}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                  active ? 'bg-orange-50' : 'hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-orange-500' : 'text-gray-400'}`} />
              </Link>
            )
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            title="More"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              moreTabs.some((t) => t.href === pathname) ? 'bg-orange-50' : 'hover:bg-gray-50'
            }`}
          >
            <MoreHorizontal
              className={`h-5 w-5 ${
                moreTabs.some((t) => t.href === pathname) ? 'text-orange-500' : 'text-gray-400'
              }`}
            />
          </button>
        </div>
      </nav>

      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pb-8 pt-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-gray-900">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {moreTabs.map((tab) => {
                const active = pathname === tab.href
                const Icon = tab.icon

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-orange-500' : 'text-gray-400'}`} />
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
