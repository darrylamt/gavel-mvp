'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { useTopToast } from '@/components/ui/TopToastProvider'

type Props = {
  productId: string
  title: string
  price: number
  imageUrl: string | null
  stock: number
}

export default function ProductDetailActions({ productId, title, price, imageUrl, stock }: Props) {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const { isStarredProduct, toggleStarredProduct } = useStarredProducts()
  const { notify } = useTopToast()
  const isStarred = isStarredProduct(productId)

  const maxQuantity = Math.max(1, Math.min(stock, 99))

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (Number.isNaN(parsed)) {
              setQuantity(1)
              return
            }

            setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(parsed))))
          }}
          className="h-12 w-16 border border-gray-300 text-center text-sm font-semibold outline-none"
        />

        <button
          onClick={() => {
            let addedAny = false
            for (let i = 0; i < quantity; i += 1) {
              const added = addToCart({
                productId,
                title,
                price,
                imageUrl,
                availableStock: stock,
              })

              if (!added) break
              addedAny = true
            }

            if (!addedAny) {
              notify({ title: 'Stock limit reached', description: 'You cannot add more of this item.', variant: 'warning' })
              return
            }

            notify({ title: 'Added to cart', description: `${title} was added to your cart.`, variant: 'success' })
          }}
          disabled={stock <= 0}
          className="h-12 min-w-44 border border-gray-900 px-6 text-xs font-semibold uppercase tracking-[0.18em] text-gray-900 transition hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add to Cart
        </button>

        <button
          type="button"
          onClick={() => {
            const nextIsStarred = toggleStarredProduct(productId)
            notify({
              title: nextIsStarred ? 'Added to starred' : 'Removed from starred',
              description: nextIsStarred ? `${title} is now in your favorites.` : `${title} was removed from your favorites.`,
              variant: nextIsStarred ? 'success' : 'info',
            })
          }}
          aria-label="Toggle starred"
          className={`flex h-12 w-12 items-center justify-center border transition ${
            isStarred
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Heart className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  )
}
