'use client'

import Link from 'next/link'
import { Heart, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { useTopToast } from '@/components/ui/TopToastProvider'
import { formatGhsAmount, getBuyNowDiscountBreakdown } from '@/lib/buyNowPricing'
import styles from './ShopProductCard.module.css'

type Props = {
  id: string
  title: string
  description: string | null
  price: number
  sellerBasePrice?: number | null
  commissionRate?: number | null
  imageUrl: string | null
  imageUrls?: string[] | null
  stock: number
  categoryLabel?: string
  compactMobile?: boolean
}

export default function ShopProductCard({
  id,
  title,
  description,
  price,
  sellerBasePrice,
  commissionRate,
  imageUrl,
  imageUrls,
  stock,
  categoryLabel,
  compactMobile = false,
}: Props) {
  const { addToCart } = useCart()
  const { toggleStarredProduct, isStarredProduct } = useStarredProducts()
  const { notify } = useTopToast()
  const href = `/shop/${id}`

  const images = useMemo(() => {
    const candidates = [...(imageUrls ?? []), imageUrl]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())

    return Array.from(new Set(candidates))
  }, [imageUrl, imageUrls])

  const [activeImageSrc, setActiveImageSrc] = useState(images[0] ?? '')
  const isStarred = isStarredProduct(id)
  const priceBreakdown = getBuyNowDiscountBreakdown({
    price,
    sellerBasePrice,
    commissionRate,
  })

  useEffect(() => {
    setActiveImageSrc(images[0] ?? '')
  }, [images, id])

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

  const handleToggleWishlist = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const nextIsStarred = toggleStarredProduct(id)
    notify({
      title: nextIsStarred ? 'Added to starred' : 'Removed from starred',
      description: nextIsStarred ? `${title} is now in your favorites.` : `${title} was removed from your favorites.`,
      variant: nextIsStarred ? 'success' : 'info',
    })
  }

  return (
    <article className={`${styles.card} ${compactMobile ? styles.cardCompact : ''}`}>
      <div className={styles.imgWrapper}>
        <div className={styles.labelBlock}>
          {categoryLabel && <span className={styles.labelCategory}>{categoryLabel}</span>}
          {stock <= 0 && <span className={styles.labelSale}>Out of stock</span>}
        </div>

        <Link href={href} className={styles.front}>
          {activeImageSrc ? (
            <img
              src={activeImageSrc}
              alt={title}
              loading="lazy"
              decoding="async"
              className={styles.image}
            />
          ) : (
            <div className={styles.imageFallback}>No image</div>
          )}
        </Link>

        {images.length > 1 && (
          <ul className={styles.thumbList}>
            {images.map((src, index) => (
              <li
                key={`${src}-${index}`}
                className={`${styles.thumbItem} ${activeImageSrc === src ? styles.thumbActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.thumbButton}
                  onClick={() => setActiveImageSrc(src)}
                  aria-label={`Show image ${index + 1}`}
                >
                  <img src={src} alt={`${title} ${index + 1}`} className={styles.thumbImage} loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.cartInfo}>
          <button
            type="button"
            title="Add to cart"
            className={styles.iconButton}
            onClick={handleAddToCart}
            disabled={stock <= 0}
          >
            <ShoppingCart className={styles.actionIcon} />
          </button>

          <button
            type="button"
            title="Wishlist"
            className={styles.iconButton}
            onClick={handleToggleWishlist}
            aria-label={isStarred ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isStarred}
          >
            <Heart className={styles.actionIcon} fill={isStarred ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className={styles.detail}>
        <Link href={href} className={styles.titleLink}>
          <h3 className={styles.title}>{title}</h3>
        </Link>

        {description && <p className={styles.desc}>{description}</p>}

        {priceBreakdown.hasDiscount && priceBreakdown.previousPrice !== null ? (
          <>
            <p className={styles.priceRow}>
              <span className={styles.oldPrice}>GHS {formatGhsAmount(priceBreakdown.previousPrice)}</span>
              <span className={styles.price}>GHS {formatGhsAmount(priceBreakdown.currentPrice)}</span>
            </p>
            <p className={styles.discountText}>
              Save GHS {formatGhsAmount(priceBreakdown.discountAmount)} ({priceBreakdown.discountPercent}% off)
            </p>
          </>
        ) : (
          <p className={styles.price}>GHS {formatGhsAmount(priceBreakdown.currentPrice)}</p>
        )}

        {stock > 0 && stock <= 5 && <p className={styles.lowStock}>Only {stock} left in stock</p>}
      </div>
    </article>
  )
}
