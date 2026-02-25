import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ShopCatalogClient from '@/components/shop/ShopCatalogClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export const metadata: Metadata = {
  title: 'Buy Now',
  description: 'Shop fixed-price products on Gavel Ghana. Buy now from trusted sellers alongside live auctions.',
  alternates: { canonical: '/shop' },
  openGraph: {
    url: `${siteUrl}/shop`,
    title: 'Buy Now | Gavel Ghana',
    description: 'Shop fixed-price products on Gavel Ghana. Buy now from trusted sellers alongside live auctions.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy Now | Gavel Ghana',
    description: 'Shop fixed-price products on Gavel Ghana.',
  },
}

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  category: string
  image_url: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialCategory = (resolvedSearchParams?.category || '').trim()

  const { data } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, category, image_url, image_urls')
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })

  const products = (data ?? []) as ShopProduct[]
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Buy Now Products | Gavel',
    url: `${siteUrl}/shop`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 24).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}/shop/${product.id}`,
        item: {
          '@type': 'Product',
          name: product.title,
          image: product.image_url || undefined,
          category: product.category || undefined,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'GHS',
            price: Number(product.price).toFixed(2),
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${siteUrl}/shop/${product.id}`,
          },
        },
      })),
    },
  }

  return (
    products.length === 0 ? (
      <main className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="mx-auto max-w-xl rounded-xl border bg-gray-50 px-6 py-10 text-center">
          <p className="text-base font-medium text-gray-900">No buy-now products available right now.</p>
          <p className="mt-2 text-sm text-gray-600">Check back soon or browse our live auctions.</p>
          <Link
            href="/auctions"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Browse Auctions
          </Link>
        </div>
      </main>
    ) : (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <ShopCatalogClient products={products} initialCategory={initialCategory} />
      </>
    )
  )
}
