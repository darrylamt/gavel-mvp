'use client'

import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { useTopToast } from '@/components/ui/TopToastProvider'

type Props = {
  id: string
  title: string
  description: string | null
  price: number
  imageUrl: string | null
  stock: number
  categoryLabel?: string
  compactMobile?: boolean
}

export default function ShopProductCard({ id, title, description, price, imageUrl, stock, categoryLabel, compactMobile = false }: Props) {
  const router = useRouter()
  const { addToCart } = useCart()
  const { isStarredProduct, toggleStarredProduct } = useStarredProducts()
  const { notify } = useTopToast()
  const isStarred = isStarredProduct(id)

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const added = addToCart({
      productId: id,
      variantId: null,
      variantLabel: null,
      title,
      price,
      imageUrl,
      availableStock: stock,
    })
    if (added) {
      notify({ title: 'Added to cart', description: `${title} was added to your cart.`, variant: 'success' })
    } else {
      notify({ title: 'Stock limit reached', description: 'You cannot add more of this item.', variant: 'warning' })
    }
  }

  return (
    <article
      className={`group block overflow-hidden border bg-white transition hover:shadow-lg ${
        compactMobile ? 'rounded-xl sm:rounded-2xl' : 'rounded-2xl'
      }`}
    >
      {/* IMAGE */}
      <div
        className={`bg-gray-100 overflow-hidden relative cursor-pointer ${
          compactMobile ? 'h-28 sm:h-48' : 'h-48'
        }`}
        onClick={() => router.push(`/shop/${id}`)}
      >
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const nextIsStarred = toggleStarredProduct(id)
            notify({
              title: nextIsStarred ? 'Added to starred' : 'Removed from starred',
              description: nextIsStarred ? `${title} is now in your favorites.` : `${title} was removed from your favorites.`,
              variant: nextIsStarred ? 'success' : 'info',
            })
          }}
          aria-label={isStarred ? 'Remove from starred products' : 'Add to starred products'}
          className="absolute left-2 top-2 z-10 rounded-full p-2 shadow-sm transition bg-white/90 text-gray-700 hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${isStarred ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>

        {categoryLabel && (
          <div className="absolute right-2 top-2 bg-black text-white text-xs px-2 py-1 rounded">{categoryLabel}</div>
        )}

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
        )}

        {stock <= 0 && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold">
            Out of Stock
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className={compactMobile ? 'p-2.5 sm:p-4' : 'p-4'}>
        <h3
          className={`font-semibold leading-tight mb-1.5 cursor-pointer group-hover:underline ${
            compactMobile ? 'text-xs sm:text-lg' : 'text-lg'
          }`}
          onClick={() => router.push(`/shop/${id}`)}
        >
          {title}
        </h3>

        <p className={`text-gray-500 mb-1 ${compactMobile ? 'hidden sm:block sm:text-sm' : 'text-sm'}`}>Price</p>

        <p className={`font-bold mb-3 ${compactMobile ? 'text-sm sm:text-2xl' : 'text-2xl'}`}>
          GHS {Number(price).toLocaleString()}
        </p>

        <button
          onClick={handleAddToCart}
          disabled={stock <= 0}
          className={`w-full rounded-lg font-semibold transition ${
            stock <= 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          } ${compactMobile ? 'py-1.5 text-xs sm:py-2 sm:text-sm' : 'py-2 text-sm'}`}
        >
          {stock <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>

        {stock > 0 && stock <= 5 && (
          <div className="mt-2 text-xs text-orange-600 font-medium">Only {stock} left in stock</div>
        )}
      </div>
    </article>
  )
}
