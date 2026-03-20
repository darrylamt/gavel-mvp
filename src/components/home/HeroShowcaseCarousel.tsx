'use client'

import Link from 'next/link'

const spotlight = [
  {
    name: 'Electronics',
    tagline: 'Phones, gadgets & smart tech',
    href: '/shop?category=Electronics',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80',
    badge: '🔥 Hot',
  },
  {
    name: 'Vehicles',
    tagline: 'Cars, bikes & accessories',
    href: '/auctions?category=Vehicles',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
    badge: '🔴 Live',
  },
  {
    name: 'Fashion',
    tagline: 'Clothes, shoes & lifestyle',
    href: '/shop?category=Fashion',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80',
    badge: '✨ New',
  },
]

export default function HeroShowcaseCarousel() {
  return (
    <section className="grid grid-cols-3 gap-3 sm:gap-4">
      {spotlight.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="group relative overflow-hidden rounded-2xl bg-gray-900 aspect-[3/4] sm:aspect-[4/5] block"
        >
          <img
            src={item.image}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

          <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-0.5 text-xs font-semibold text-white">
            {item.badge}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <p className="text-sm sm:text-base font-bold text-white leading-tight">{item.name}</p>
            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">{item.tagline}</p>
          </div>
        </Link>
      ))}
    </section>
  )
}
