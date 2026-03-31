'use client'

import { useState } from 'react'
import { Heart, ShoppingCart, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { useTopToast } from '@/components/ui/TopToastProvider'
import { formatGhsAmount, getBuyNowDiscountBreakdown } from '@/lib/buyNowPricing'

type VariantOption = {
  id: string
  color: string | null
  size: string | null
  sku?: string | null
  price: number
  sellerBasePrice?: number | null
  commissionRate?: number | null
  stock: number
  imageUrl?: string | null
  isDefault?: boolean
}

type Props = {
  productId: string
  title: string
  price: number
  sellerBasePrice?: number | null
  commissionRate?: number | null
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

export default function ProductDetailActions({
  productId,
  title,
  price,
  sellerBasePrice,
  commissionRate,
  imageUrl,
  stock,
  variantId = null,
  variantLabel = null,
  variants = [],
}: Props) {
  const router = useRouter()
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
  const effectiveSellerBasePrice = selectedVariant ? selectedVariant.sellerBasePrice : sellerBasePrice
  const effectiveCommissionRate = selectedVariant ? selectedVariant.commissionRate : commissionRate
  const priceBreakdown = getBuyNowDiscountBreakdown({
    price: effectivePrice,
    sellerBasePrice: effectiveSellerBasePrice,
    commissionRate: effectiveCommissionRate,
  })
  const selectedVariantLabel = selectedVariant
    ? formatVariantLabel(selectedVariant)
    : variantLabel

  const maxQuantity = Math.max(1, Math.min(effectiveStock, 99))

  const handleAddToCart = () => {
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
  }

  const handleBuyNow = () => {
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

    router.push('/cart')
  }

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {hasVariants && (
        <div className="space-y-1.5">
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
                  detail: { productId, imageUrl: nextVariant?.imageUrl ?? imageUrl },
                })
              )
            }}
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          >
            {variants.map((option) => (
              <option key={option.id} value={option.id}>
                {formatVariantLabel(option)} — GH₵ {formatGhsAmount(Number(option.price))} ({option.stock} in stock)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Discount banner */}
      {priceBreakdown.hasDiscount && priceBreakdown.previousPrice !== null && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
          <p className="text-gray-400 line-through text-xs">GH₵ {formatGhsAmount(priceBreakdown.previousPrice)}</p>
          <p className="text-base font-bold text-gray-900">GH₵ {formatGhsAmount(priceBreakdown.currentPrice)}</p>
          <p className="text-xs font-semibold text-emerald-700 mt-0.5">
            You save GH₵ {formatGhsAmount(priceBreakdown.discountAmount)} ({priceBreakdown.discountPercent}% off)
          </p>
        </div>
      )}

      {/* Quantity + actions row */}
      <div className="flex items-center gap-2">
        {/* Quantity stepper */}
        <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-11 w-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg transition-colors"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-9 text-center text-sm font-semibold text-gray-900">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity}
            className="h-11 w-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:text-gray-300 font-bold text-lg transition-colors"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={effectiveStock <= 0}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-900 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </button>

        {/* Wishlist */}
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
          className={`h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all ${
            isStarred
              ? 'border-red-200 bg-red-50 text-red-500'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Heart className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Buy Now */}
      <button
        onClick={handleBuyNow}
        disabled={effectiveStock <= 0}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm shadow-orange-200"
      >
        <Zap className="h-4 w-4" />
        Buy Now
      </button>
    </div>
  )
}
