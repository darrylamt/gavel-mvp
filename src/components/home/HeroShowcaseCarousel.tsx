'use client'

import Link from 'next/link'

const spotlight = [
  {
    name: 'Electronics',
    href: '/shop?category=Electronics',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Vehicles',
    href: '/shop?category=Vehicles',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
  },
]

export default function HeroShowcaseCarousel() {
  return (
    <section className="mb-12 grid gap-4 md:grid-cols-[1.35fr_1fr]">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Online auctions & buy-now deals</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">Find quality products from trusted sellers.</h1>
        <p className="mt-4 max-w-2xl text-sm text-gray-600 md:text-base">
          Bid on live auctions, explore fixed-price products, and discover fresh listings across electronics, home, fashion, and more.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/auctions" className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Explore auctions
          </Link>
          <Link href="/shop" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            Shop products
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-lg font-bold text-gray-900">24/7</p>
            <p className="text-xs text-gray-600">Active market</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-lg font-bold text-gray-900">Secure</p>
            <p className="text-xs text-gray-600">Checkout flow</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-lg font-bold text-gray-900">Fast</p>
            <p className="text-xs text-gray-600">Seller delivery</p>
          </div>
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-4">
        {spotlight.map((item) => (
          <Link key={item.name} href={item.href} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="h-40 md:h-[188px]">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/80">Spotlight</p>
              <p className="mt-1 text-xl font-semibold">{item.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
