import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter } from 'lucide-react'
import navLogo from '@/assets/branding/nav-logo.png'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">

      {/* Top CTA strip */}
      <div className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-lg">Ready to start bidding?</p>
            <p className="text-sm text-gray-400 mt-0.5">Join thousands of buyers and sellers across Ghana.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/auctions"
              className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Browse Auctions
            </Link>
            <Link
              href="/seller/apply"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-white/40 transition-colors"
            >
              Sell on Gavel
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 lg:grid-cols-5">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
              <Image src={navLogo} alt="Gavel" className="h-9 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-gray-400 max-w-xs">
              Ghana&apos;s modern auction and marketplace platform — powered by live bidding, tokens, and seamless payments.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a
                href="https://x.com/gavelgh"
                aria-label="Twitter"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://www.facebook.com/share/1XVgK95jJh/"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://www.instagram.com/gavel.gh/"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Company</p>
            <ul className="mt-5 space-y-3">
              {[
                { href: '/', label: 'About' },
                { href: '/auctions', label: 'Auctions' },
                { href: '/shop', label: 'Shop' },
                { href: '/tokens', label: 'Tokens' },
                { href: '/referrals', label: 'Referrals' },
                { href: '/leaderboard', label: 'Leaderboard' },
                { href: '/seller/apply', label: 'Become a Seller' },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Help</p>
            <ul className="mt-5 space-y-3">
              {[
                { href: '/faq', label: 'FAQs' },
                { href: '/contact', label: 'Contact Support' },
                { href: '/terms', label: 'Terms & Conditions' },
                { href: '/privacy', label: 'Privacy Policy' },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Newsletter</p>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              Get notified about hot new auctions.
            </p>
            <form className="mt-4 flex flex-col gap-2" action="#" method="POST">
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition-colors w-full"
              />
              <button
                type="submit"
                className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.08]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Gavel Ghana Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {[
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <Link key={label} href={href} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  )
}
