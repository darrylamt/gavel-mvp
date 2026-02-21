'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type HeroSlide = {
  id: string
  eyebrow: string
  title: string
  subtitle: string
  priceHint: string
  ctaLabel: string
  ctaHref: string
  image: string
}

const slides: HeroSlide[] = [
  {
    id: 'skincare',
    eyebrow: 'Flat 15% Discount',
    title: 'Proven To Tackle Wrinkles & Acne',
    subtitle: 'We all make us different. We treat you personally — and honestly.',
    priceHint: 'From GHS 49',
    ctaLabel: 'Shop now',
    ctaHref: '/shop?category=Fashion',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'electronics',
    eyebrow: 'New arrivals',
    title: 'Upgrade Your Everyday Tech',
    subtitle: 'Smart devices, audio essentials, and accessories from trusted sellers.',
    priceHint: 'Starting from GHS 120',
    ctaLabel: 'Browse electronics',
    ctaHref: '/shop?category=Electronics',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1800&q=80',
  },
  {
    id: 'home',
    eyebrow: 'Popular picks',
    title: 'Refresh Your Home Setup',
    subtitle: 'Home appliances and furniture selected for comfort and style.',
    priceHint: 'Great deals this week',
    ctaLabel: 'View home products',
    ctaHref: '/shop?category=Home%20Appliances',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1800&q=80',
  },
]

export default function HeroShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  const activeSlide = useMemo(() => slides[activeIndex], [activeIndex])

  return (
    <section className="relative mb-20 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="relative min-h-[360px] md:min-h-[430px]">
        <img src={activeSlide.image} alt={activeSlide.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-white/35" />

        <div className="relative flex h-full max-w-2xl flex-col justify-center px-6 py-10 md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">{activeSlide.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
            {activeSlide.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-700 md:text-lg">{activeSlide.subtitle}</p>
          <p className="mt-4 text-sm font-semibold text-gray-900">{activeSlide.priceHint}</p>

          <div className="mt-6">
            <Link
              href={activeSlide.ctaHref}
              className="inline-flex items-center rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {activeSlide.ctaLabel}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === activeIndex ? 'bg-gray-900' : 'bg-white/80 ring-1 ring-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
