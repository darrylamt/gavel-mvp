'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
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
}

export default function ShopProductCard({ id, title, description, price, imageUrl, stock, categoryLabel }: Props) {
  const { addToCart } = useCart()
  const { isStarredProduct, toggleStarredProduct } = useStarredProducts()
  const { notify } = useTopToast()
  const isStarred = isStarredProduct(id)

  return (
    <article className="overflow-hidden rounded-xl border bg-white relative">
      <div className="relative h-32 bg-gray-100 sm:h-40">
        <button
          type="button"
          onClick={() => {
            const nextIsStarred = toggleStarredProduct(id)
            notify({
              title: nextIsStarred ? 'Added to starred' : 'Removed from starred',
              description: nextIsStarred ? `${title} is now in your favorites.` : `${title} was removed from your favorites.`,
              variant: nextIsStarred ? 'success' : 'info',
            })
          }}
          aria-label={isStarred ? 'Remove from starred products' : 'Add to starred products'}
          className={`absolute left-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
            isStarred
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 bg-white/95 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Heart className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
        </button>

        {categoryLabel && (
          <span className="absolute right-2 top-2 z-10 rounded-full border border-gray-200 bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
            {categoryLabel}
          </span>
        )}
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

        <Link
          href={`/shop/${id}`}
          className="mt-2 inline-flex text-xs font-semibold underline underline-offset-2"
        >
          View details
        </Link>

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
              notify({ title: 'Added to cart', description: `${title} was added to your cart.`, variant: 'success' })
            } else {
              notify({ title: 'Stock limit reached', description: 'You cannot add more of this item.', variant: 'warning' })
            }
          }}
          disabled={stock <= 0}
          className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
        >
          {stock <= 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}
