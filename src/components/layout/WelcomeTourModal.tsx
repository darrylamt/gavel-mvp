'use client'

import { useMemo, useState } from 'react'
import { Gavel, Coins, RotateCcw, Clock } from 'lucide-react'

const STORAGE_KEY = 'gavel:welcome-tour-seen'

type Slide = {
  Icon: React.ElementType
  accent: string
  iconBg: string
  title: string
  body: string
}

const slides: Slide[] = [
  {
    Icon: Gavel,
    accent: 'from-orange-400 to-amber-400',
    iconBg: 'bg-orange-50',
    title: 'Welcome to Gavel',
    body: "Ghana's marketplace for live auctions and instant shop purchases. Bid on unique items or buy directly — all secured on-platform.",
  },
  {
    Icon: Coins,
    accent: 'from-yellow-400 to-orange-400',
    iconBg: 'bg-yellow-50',
    title: 'Bid with Tokens',
    body: 'Each bid costs 1 token. Tokens keep auctions fair and prevent spam bidding. Buy token packs from the Tokens page anytime.',
  },
  {
    Icon: RotateCcw,
    accent: 'from-green-400 to-emerald-400',
    iconBg: 'bg-green-50',
    title: 'Automatic Refunds',
    body: 'Lost a bid? Your token is automatically refunded the moment the auction ends. Winning tokens are consumed when you win.',
  },
  {
    Icon: Clock,
    accent: 'from-purple-400 to-violet-400',
    iconBg: 'bg-purple-50',
    title: 'Anti-Snipe Protection',
    body: 'Bids placed in the final 30 seconds extend the auction by 30 seconds — so last-second sniping never steals a win unfairly.',
  },
]

export default function WelcomeTourModal() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.localStorage.getItem(STORAGE_KEY)
  })
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const isLast = useMemo(() => index === slides.length - 1, [index])
  const slide = slides[index]

  const close = () => {
    window.localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const next = () => {
    if (isLast) { close(); return }
    setIndex((prev) => prev + 1)
  }

  const prev = () => setIndex((prev) => Math.max(0, prev - 1))

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return
          const diff = touchStartX - (e.changedTouches[0]?.clientX ?? touchStartX)
          if (diff > 50 && index < slides.length - 1) next()
          if (diff < -50 && index > 0) prev()
          setTouchStartX(null)
        }}
      >
        {/* Gradient accent bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${slide.accent} transition-all duration-300`} />

        <div className="px-7 pb-8 pt-6">
          {/* Header row */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-6 bg-gray-800' : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={close}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Icon */}
          <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${slide.iconBg}`}>
            <slide.Icon className="h-7 w-7 text-gray-700" strokeWidth={1.5} />
          </div>

          {/* Content */}
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
            {slide.title}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-gray-500">
            {slide.body}
          </p>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={index === 0}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-0 transition-all"
            >
              Back
            </button>

            <button
              onClick={next}
              className={`flex-1 rounded-xl bg-gradient-to-r ${slide.accent} px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity`}
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
