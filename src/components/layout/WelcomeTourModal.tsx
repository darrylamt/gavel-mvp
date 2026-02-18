'use client'

import { useMemo, useState } from 'react'

const STORAGE_KEY = 'gavel:welcome-tour-seen'

type Slide = {
  title: string
  body: string
}

const slides: Slide[] = [
  {
    title: 'Welcome to Gavel',
    body: 'Buy and sell through transparent auctions powered by tokens.',
  },
  {
    title: 'How Bidding Works',
    body: 'Each bid uses tokens. If you win, you can complete payment securely on-platform.',
  },
  {
    title: 'Token Refund Policy',
    body: 'Bid tokens are consumed when used to place bids and are not refunded after auction settlement.',
  },
  {
    title: 'Smart Auction Rules',
    body: 'To prevent sniping, bids placed in the final 30 seconds can extend the auction by +30 seconds.',
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

  const close = () => {
    window.localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const next = () => {
    if (isLast) {
      close()
      return
    }
    setIndex((prev) => prev + 1)
  }

  const prev = () => {
    setIndex((prev) => Math.max(0, prev - 1))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX == null) return
          const endX = event.changedTouches[0]?.clientX ?? touchStartX
          const diff = touchStartX - endX

          if (diff > 50 && index < slides.length - 1) next()
          if (diff < -50 && index > 0) prev()

          setTouchStartX(null)
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">{index + 1} / {slides.length}</p>
          <button onClick={close} className="text-sm text-gray-500 hover:text-gray-700">
            Skip
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">{slides[index].title}</h2>
        <p className="mt-3 text-gray-600">{slides[index].body}</p>

        <div className="mt-6 flex items-center gap-2">
          {slides.map((_, dotIndex) => (
            <div
              key={dotIndex}
              className={`h-2 w-2 rounded-full ${dotIndex === index ? 'bg-black' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={index === 0}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
          >
            Back
          </button>

          <button
            onClick={next}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
