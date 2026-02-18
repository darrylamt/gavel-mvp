'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/hooks/useCart'

type Props = {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string | null
  stock: number
}

export default function ShopProductCard({ id, title, description, price, imageUrl, stock }: Props) {
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
    <article className="overflow-hidden rounded-xl border bg-white relative">
      <div className="relative h-32 bg-gray-100 sm:h-40">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
        )}
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{title}</p>
        {description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{description}</p>}
        <p className="mt-2 text-base font-bold text-black">GHS {Number(price).toLocaleString()}</p>

        <button
          onClick={() => {
            const added = addToCart({
              productId: id,
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
          className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
        >
          {stock <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>

      {showAdded && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
          Added to cart
        </div>
      )}

      {showLimit && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow">
          Stock limit reached
        </div>
      )}
    </article>
  )
}
