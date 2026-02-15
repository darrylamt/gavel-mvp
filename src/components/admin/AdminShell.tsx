'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gavel, LayoutDashboard, Store, Users } from 'lucide-react'

type Props = {
  children: React.ReactNode
}

const tabs = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/sellers', label: 'Sellers', icon: Store },
]

export default function AdminShell({ children }: Props) {
  const pathname = usePathname()

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-100 p-4 md:p-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="mb-4 text-2xl font-bold">Admin</h1>
          <nav className="space-y-2 text-sm">
            {tabs.map((tab) => {
              const active = pathname === tab.href
              const Icon = tab.icon

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${
                    active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <Link
            href="/admin/new"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            New Auction
          </Link>
        </aside>

        <section className="space-y-4">{children}</section>
      </div>
    </main>
  )
}
