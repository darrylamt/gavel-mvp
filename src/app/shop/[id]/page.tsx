import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProductDetailActions from '@/components/shop/ProductDetailActions'
import ShopProductCard from '@/components/shop/ShopProductCard'
import ProductReviewsSection from '@/components/shop/ProductReviewsSection'
import ProductImageGallery from '@/components/shop/ProductImageGallery'

type Props = {
  params: Promise<{ id: string }>
}

type ShopInfo = {
  id: string
  name: string
}

type RelatedProduct = {
  id: string
  title: string
  description: string | null
  price: number
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
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ShopProductDetailPage({ params }: Props) {
  const { id } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

  const { data: product } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, image_url, image_urls, status, created_by, category, shop_id')
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
      .select('id, name')
      .eq('id', product.shop_id)
      .maybeSingle()

    shop = (shopData as ShopInfo | null) ?? null
  }

  const { data: latestProducts } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, image_url, category')
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
    .select('id, color, size, sku, price, stock, image_url, is_default, is_active')
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
  const minVariantPrice = hasVariants ? Math.min(...variants.map((variant) => Number(variant.price ?? 0))) : Number(product.price)
  const totalVariantStock = hasVariants ? variants.reduce((sum, variant) => sum + Number(variant.stock ?? 0), 0) : Number(product.stock)
  const displaySku = product.id.slice(0, 8).toUpperCase()
  const productUrl = `${siteUrl}/shop/${product.id}`
  const priceValidUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0]
  const reviewCount = reviews.length
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
    <main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <ProductImageGallery
            productId={product.id}
            title={product.title}
            baseImageUrl={product.image_url}
            variantImages={variants.map((variant) => variant.image_url)}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-7">
          <div className="mb-5 text-xs font-semibold text-gray-400">
            <Link href="/" className="hover:text-gray-600">Home</Link>
            <span className="px-2">/</span>
            <Link href="/shop" className="hover:text-gray-600">Products</Link>
            <span className="px-2">/</span>
            <span className="text-gray-500">{product.title}</span>
          </div>

          <h1 className="text-3xl font-semibold uppercase tracking-[0.08em] text-gray-900">{product.title}</h1>
          <div className="mt-4 border-t border-gray-200" />

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-4xl font-bold text-gray-900">
              {hasVariants ? 'From ' : ''}GHS {Number(minVariantPrice).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-gray-500">{totalVariantStock > 0 ? `${totalVariantStock} in stock` : 'Out of stock'}</p>
          </div>

          <div className="mt-6">
            <ProductDetailActions
              productId={product.id}
              title={product.title}
              price={Number(product.price)}
              imageUrl={product.image_url}
              stock={Number(product.stock)}
              variants={variants.map((variant) => ({
                id: variant.id,
                color: variant.color,
                size: variant.size,
                sku: variant.sku,
                price: Number(variant.price ?? 0),
                stock: Number(variant.stock ?? 0),
                imageUrl: variant.image_url,
                isDefault: !!variant.is_default,
              }))}
            />
          </div>

          <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-gray-700">
            {product.description || 'No additional description provided.'}
          </p>

          <div className="mt-5 border-t border-gray-200 pt-4 text-sm text-gray-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="font-semibold text-gray-900">SKU:</span> {displaySku}</p>
              <p><span className="font-semibold text-gray-900">Category:</span> {product.category || 'Other'}</p>
              <p><span className="font-semibold text-gray-900">Stock:</span> {product.stock}</p>
              <p>
                <span className="font-semibold text-gray-900">Shop:</span>{' '}
                {shop ? (
                  <Link href={`/shop/seller/${shop.id}`} className="underline underline-offset-2">
                    {shop.name || 'Shop'}
                  </Link>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>

        </div>
      </section>

      <ProductReviewsSection productId={product.id} reviews={reviews} />

      {latest.length > 0 && (
        <section className="mt-10">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">New</p>
            <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.12em] text-gray-900">Latest Product</h2>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {latest.map((latestProduct) => (
              <ShopProductCard
                key={latestProduct.id}
                id={latestProduct.id}
                title={latestProduct.title}
                description={latestProduct.description}
                price={latestProduct.price}
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
