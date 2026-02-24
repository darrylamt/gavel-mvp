'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { useTopToast } from '@/components/ui/TopToastProvider'

type VariantOption = {
  id: string
  color: string | null
  size: string | null
  sku?: string | null
  price: number
  stock: number
  imageUrl?: string | null
  isDefault?: boolean
}

type Props = {
  productId: string
  title: string
  price: number
  imageUrl: string | null
  stock: number
  variantId?: string | null
  variantLabel?: string | null
  variants?: VariantOption[]
}

function formatVariantLabel(option: VariantOption) {
  const parts = [option.color, option.size].filter((value): value is string => !!value && value.trim().length > 0)
  return parts.join(' / ') || option.sku || 'Default'
}

export default function ProductDetailActions({ productId, title, price, imageUrl, stock, variantId = null, variantLabel = null, variants = [] }: Props) {
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const { isStarredProduct, toggleStarredProduct } = useStarredProducts()
  const { notify } = useTopToast()
  const isStarred = isStarredProduct(productId)

  const hasVariants = variants.length > 0
  const defaultVariant = hasVariants
    ? variants.find((option) => option.isDefault) ?? variants[0]
    : null
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(defaultVariant?.id ?? variantId)
  const selectedVariant = hasVariants
    ? variants.find((option) => option.id === selectedVariantId) ?? defaultVariant
    : null

  const effectivePrice = selectedVariant ? Number(selectedVariant.price) : Number(price)
  const effectiveStock = selectedVariant ? Number(selectedVariant.stock) : Number(stock)
  const selectedVariantLabel = selectedVariant
    ? formatVariantLabel(selectedVariant)
    : variantLabel

  const maxQuantity = Math.max(1, Math.min(effectiveStock, 99))

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3">
        {hasVariants && (
          <div className="w-full space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Variant</label>
            <select
              value={selectedVariant?.id ?? ''}
              onChange={(event) => {
                const nextVariantId = event.target.value
                setSelectedVariantId(nextVariantId)
                setQuantity(1)

                const nextVariant = variants.find((option) => option.id === nextVariantId) ?? null
                window.dispatchEvent(
                  new CustomEvent('product-variant-image-change', {
                    detail: {
                      productId,
                      imageUrl: nextVariant?.imageUrl ?? imageUrl,
                    },
                  })
                )
              }}
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-gray-500"
            >
              {variants.map((option) => (
                <option key={option.id} value={option.id}>
                  {formatVariantLabel(option)} — GHS {Number(option.price).toLocaleString()} ({option.stock} in stock)
                </option>
              ))}
            </select>
          </div>
        )}

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
                variantId: selectedVariant?.id ?? variantId,
                variantLabel: selectedVariantLabel,
                title,
                price: effectivePrice,
                imageUrl: selectedVariant?.imageUrl ?? imageUrl,
                availableStock: effectiveStock,
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
          disabled={effectiveStock <= 0}
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
