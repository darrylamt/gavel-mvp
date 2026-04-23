import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { ShoppingBag, Tag, Layers, Store } from 'lucide-react'
import ProductDetailActions from '@/components/shop/ProductDetailActions'
import ShopProductCard from '@/components/shop/ShopProductCard'
import ProductReviewsSection from '@/components/shop/ProductReviewsSection'
import ProductImageGallery from '@/components/shop/ProductImageGallery'
import ProductShareButton from '@/components/shop/ProductShareButton'
import { formatGhsAmount, getBuyNowDiscountBreakdown } from '@/lib/buyNowPricing'

type Props = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-static'
export const revalidate = 3600 // revalidate hourly

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type ShopInfo = {
  id: string
  name: string
  owner_id: string
}

type RelatedProduct = {
  id: string
  title: string
  description: string | null
  price: number
  seller_base_price: number | null
  commission_rate: number | null
  stock: number
  image_url: string | null
  image_urls?: string[]
  category: string
}

type ProductVariant = {
  id: string
  color: string | null
  size: string | null
  sku: string | null
  price: number
  seller_base_price: number | null
  commission_rate: number | null
  stock: number
  image_url: string | null
  is_default: boolean
  is_active: boolean
}

type ProductReview = {
  rating: number
  title: string | null
  body: string | null
  created_at: string
  reviewer_name: string | null
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey || supabaseAnonKey!
)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const response = await fetch(`${siteUrl}/api/shop-products/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  })
  const payload = response.ok
    ? ((await response.json()) as {
        product?: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          image_urls?: string[] | null
          category?: string | null
        }
      })
    : null
  const product = payload?.product ?? null

  if (!product) {
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    }
  }

  const description = (product.description || `Buy ${product.title} on Gavel Ghana.`)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
  const imageUrl = Array.isArray(product.image_urls) && product.image_urls[0]
    ? product.image_urls[0]
    : product.image_url
  const productUrl = `${siteUrl}/shop/${product.id}`
  const category = product.category || 'Products'

  return {
    title: `${product.title} - Buy on Gavel Ghana`,
    description,
    keywords: [product.title, category, 'Gavel Ghana', 'online shopping', 'buy now'],
    authors: [{ name: 'Gavel Ghana' }],
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: `${siteUrl}/shop/${product.id}`,
    },
    openGraph: {
      type: 'website',
      url: productUrl,
      title: `${product.title} - Buy on Gavel Ghana`,
      description: description,
      siteName: 'Gavel Ghana',
      images: imageUrl ? [{ url: imageUrl, width: 800, height: 800, alt: product.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} - Buy on Gavel Ghana`,
      description: description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default async function ShopProductDetailPage({ params }: Props) {
  const { id } = await params

  const { data: product } = await supabase
    .from('shop_products')
    .select('id, title, description, price, seller_base_price, commission_rate, stock, image_url, image_urls, status, created_by, category, shop_id')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!product) {
    notFound()
  }

  let shop: ShopInfo | null = null
  if (product.shop_id) {
    const { data: shopData } = await supabase
      .from('shops')
      .select('id, name, owner_id')
      .eq('id', product.shop_id)
      .maybeSingle()

    shop = (shopData as ShopInfo | null) ?? null
  }

  const { data: latestProducts } = await supabase
    .from('shop_products')
    .select('id, title, description, price, seller_base_price, commission_rate, stock, image_url, category')
    .eq('status', 'active')
    .neq('id', product.id)
    .order('created_at', { ascending: false })
    .limit(4)

  const { data: reviewsData } = await supabase
    .from('shop_product_reviews')
    .select('rating, title, body, created_at, reviewer_name')
    .eq('product_id', product.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: variantRows } = await supabase
    .from('shop_product_variants')
    .select('id, color, size, sku, price, seller_base_price, commission_rate, stock, image_url, is_default, is_active')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  const latest = (latestProducts ?? []) as RelatedProduct[]
  const reviews = (reviewsData ?? []) as ProductReview[]
  const variants = (variantRows ?? []) as ProductVariant[]
  const galleryImages = Array.from(
    new Set(
      [
        ...(Array.isArray(product.image_urls) ? product.image_urls : []),
        product.image_url,
        ...variants
          .map((variant) => variant.image_url)
          .filter((value): value is string => Boolean(value && value.trim())),
      ].filter((value): value is string => Boolean(value && value.trim()))
    )
  )
  const mainImage = galleryImages[0] ?? null
  const hasVariants = variants.length > 0
  const lowestPricedVariant = hasVariants
    ? variants.reduce((lowest, current) => (Number(current.price ?? 0) < Number(lowest.price ?? 0) ? current : lowest), variants[0])
    : null
  const headlinePricing = hasVariants
    ? getBuyNowDiscountBreakdown({
        price: Number(lowestPricedVariant?.price ?? 0),
        sellerBasePrice: lowestPricedVariant?.seller_base_price,
        commissionRate: lowestPricedVariant?.commission_rate,
      })
    : getBuyNowDiscountBreakdown({
        price: Number(product.price),
        sellerBasePrice: product.seller_base_price,
        commissionRate: product.commission_rate,
      })
  const totalVariantStock = hasVariants ? variants.reduce((sum, variant) => sum + Number(variant.stock ?? 0), 0) : Number(product.stock)
  const displaySku = product.id.slice(0, 8).toUpperCase()
  const productUrl = `${siteUrl}/shop/${product.id}`
  const priceValidUntil = '2099-12-31'
  const averageRating =
    reviews.length > 0
      ? Number((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1))
      : null
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || undefined,
    sku: displaySku,
    image: galleryImages.length > 0 ? galleryImages : undefined,
    category: product.category || undefined,
    brand: {
      '@type': 'Brand',
      name: 'Gavel',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'GHS',
      price: Number(product.price).toFixed(2),
      priceValidUntil,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'GH',
        },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'GHS',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'GH',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      seller: {
        '@type': 'Organization',
        name: shop?.name || 'Gavel Seller',
      },
    },
    aggregateRating:
      averageRating !== null
        ? {
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            reviewCount: reviews.length,
          }
        : undefined,
    review:
      reviews.length > 0
        ? reviews.slice(0, 3).map((review) => ({
            '@type': 'Review',
            author: {
              '@type': 'Person',
              name: review.reviewer_name || 'Verified buyer',
            },
            datePublished: review.created_at,
            reviewBody: review.body || review.title || 'Great product.',
            reviewRating: {
              '@type': 'Rating',
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
          }))
        : undefined,
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-gray-600 transition-colors">Products</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium line-clamp-1">{product.title}</span>
      </nav>

      {/* Main product section */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Image gallery */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
          <ProductImageGallery
            productId={product.id}
            title={product.title}
            baseImageUrl={mainImage}
            variantImages={galleryImages}
          />
        </div>

        {/* Product details */}
        <div className="flex flex-col gap-4">
          {/* Title + stock */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{product.title}</h1>
              {totalVariantStock > 0 ? (
                <span className="flex-shrink-0 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  In Stock
                </span>
              ) : (
                <span className="flex-shrink-0 inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 flex-wrap">
              <p className="text-3xl font-bold text-gray-900">
                {hasVariants ? 'From ' : ''}GHS {formatGhsAmount(headlinePricing.currentPrice)}
              </p>
              {headlinePricing.hasDiscount && headlinePricing.previousPrice !== null && (
                <>
                  <p className="text-base text-gray-400 line-through mb-0.5">
                    GHS {formatGhsAmount(headlinePricing.previousPrice)}
                  </p>
                  <span className="mb-0.5 inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                    {headlinePricing.discountPercent}% off
                  </span>
                </>
              )}
            </div>
            {headlinePricing.hasDiscount && headlinePricing.discountAmount > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-600">
                You save GHS {formatGhsAmount(headlinePricing.discountAmount)}
              </p>
            )}

            {/* Share */}
            <div className="mt-3">
              <ProductShareButton
                title={product.title}
                price={`GHS ${formatGhsAmount(headlinePricing.currentPrice)}`}
                imageUrl={mainImage}
                url={productUrl}
                shopName={shop?.name ?? null}
              />
            </div>

            {/* Actions (add to cart, buy now, variants) */}
            <div className="mt-5">
              <ProductDetailActions
                productId={product.id}
                title={product.title}
                price={Number(product.price)}
                sellerBasePrice={product.seller_base_price}
                commissionRate={product.commission_rate}
                imageUrl={product.image_url}
                stock={Number(product.stock)}
                variants={variants.map((variant) => ({
                  id: variant.id,
                  color: variant.color,
                  size: variant.size,
                  sku: variant.sku,
                  price: Number(variant.price ?? 0),
                  sellerBasePrice: variant.seller_base_price,
                  commissionRate: variant.commission_rate,
                  stock: Number(variant.stock ?? 0),
                  imageUrl: variant.image_url,
                  isDefault: !!variant.is_default,
                }))}
              />
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Description</h2>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Meta info */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Product Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <Tag className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">SKU</p>
                  <p className="text-xs font-semibold text-gray-700">{displaySku}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <Layers className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Category</p>
                  <p className="text-xs font-semibold text-gray-700">{product.category || 'Other'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                  <ShoppingBag className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stock</p>
                  <p className="text-xs font-semibold text-gray-700">{totalVariantStock} units</p>
                </div>
              </div>
              {shop && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Shop</p>
                    <Link
                      href={`/shop/seller/${shop.id}`}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      {shop.name || 'View Shop'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <div className="mt-6">
        <ProductReviewsSection productId={product.id} reviews={reviews} />
      </div>

      {/* Latest Products */}
      {latest.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-0.5">New Arrivals</p>
              <h2 className="text-xl font-bold text-gray-900">Latest Products</h2>
            </div>
            <Link
              href="/shop"
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 rounded-xl px-3 py-2"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
            {latest.map((latestProduct) => (
              <ShopProductCard
                key={latestProduct.id}
                id={latestProduct.id}
                title={latestProduct.title}
                price={latestProduct.price}
                sellerBasePrice={latestProduct.seller_base_price}
                commissionRate={latestProduct.commission_rate}
                imageUrl={latestProduct.image_url}
                stock={latestProduct.stock}
                categoryLabel={latestProduct.category}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
