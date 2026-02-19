'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/hooks/useCart'

type Props = {
  productId: string
  title: string
  price: number
  imageUrl: string | null
  stock: number
}

export default function AddToCartButton({ productId, title, price, imageUrl, stock }: Props) {
  const { addToCart } = useCart()
  const [showAdded, setShowAdded] = useState(false)
  const [showLimit, setShowLimit] = useState(false)

  useEffect(() => {
    if (!showAdded) return
    const timer = setTimeout(() => setShowAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [showAdded])

  useEffect(() => {
    if (!showLimit) return
    const timer = setTimeout(() => setShowLimit(false), 1600)
    return () => clearTimeout(timer)
  }, [showLimit])

  return (
    <div className="relative">
      <button
        onClick={() => {
          const added = addToCart({
            productId,
            title,
            price,
            imageUrl,
            availableStock: stock,
          })
          if (added) {
            setShowAdded(true)
          } else {
            setShowLimit(true)
          }
        }}
        disabled={stock <= 0}
        className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {stock <= 0 ? 'Out of stock' : 'Add to cart'}
      </button>

      {showAdded && (
        <div className="pointer-events-none absolute left-1/2 top-[-2.25rem] -translate-x-1/2 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
          Added to cart
        </div>
      )}

      {showLimit && (
        <div className="pointer-events-none absolute left-1/2 top-[-2.25rem] -translate-x-1/2 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow">
          Stock limit reached
        </div>
      )}
    </div>
  )
}
