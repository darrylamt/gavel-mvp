import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = {
  title: { default: 'Gavel Properties', template: '%s | Gavel Properties' },
  description: "Ghana's most trusted property marketplace. Buy, sell and auction land, homes and commercial property.",
}

function PropertiesNavbar() {
  return (
    <header className="bg-[#0F2557] border-b border-white/10 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex h-14 md:h-16 items-center gap-6">
          {/* Logo */}
          <Link href="/properties" className="flex-shrink-0 flex items-center gap-0.5 hover:opacity-90 transition-opacity">
            <span className="text-lg font-black text-white tracking-tight">Gavel</span>
            <span className="text-lg font-black text-[#C9A84C] tracking-tight">Properties</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {[
              { href: '/properties/browse?type=sale', label: 'Buy' },
              { href: '/properties/browse?type=auction', label: 'Auctions' },
              { href: '/properties/sell', label: 'Sell' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="px-3.5 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" className="hidden md:block text-xs text-white/50 hover:text-white/80 transition-colors">
              ← Gavel
            </Link>
            <Link href="/properties/sell" className="rounded-lg bg-[#C9A84C] text-[#0F2557] px-4 py-2 text-sm font-bold hover:bg-[#d4b55c] transition-colors whitespace-nowrap">
              List Property
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

function PropertiesFooter() {
  return (
    <footer className="bg-[#0F2557] text-white mt-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-0.5 mb-3">
              <span className="text-xl font-black text-white">Gavel</span>
              <span className="text-xl font-black text-[#C9A84C]">Properties</span>
            </div>
            <p className="text-white/60 text-sm">Ghana&apos;s most trusted property marketplace. Buy, sell and auction land, homes and commercial property.</p>
          </div>
          <div>
            <p className="font-semibold text-white/80 text-sm uppercase tracking-wide mb-3">Browse</p>
            <div className="space-y-2">
              {[
                { href: '/properties/browse?type=sale', label: 'Buy Property' },
                { href: '/properties/browse?type=auction', label: 'Auction Property' },
                { href: '/properties/sell', label: 'List Property' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="block text-sm text-white/60 hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white/80 text-sm uppercase tracking-wide mb-3">Company</p>
            <div className="space-y-2">
              {[
                { href: '/contact', label: 'Contact' },
                { href: '/faq', label: 'FAQ' },
                { href: '/terms', label: 'Terms' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="block text-sm text-white/60 hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} Gavel Properties. All rights reserved.</p>
          <Link href="/" className="text-white/40 hover:text-white/70 text-xs transition-colors">A Gavel Ghana Product →</Link>
        </div>
      </div>
    </footer>
  )
}

export default function PropertiesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <PropertiesNavbar />
      <main className="flex-1">{children}</main>
      <PropertiesFooter />
    </div>
  )
}
