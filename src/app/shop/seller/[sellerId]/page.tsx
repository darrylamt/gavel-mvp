import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ShopProductCard from '@/components/shop/ShopProductCard'

type Props = {
  params: Promise<{ sellerId: string }>
}

type ShopProfile = {
  id: string
  name: string
  description: string | null
  cover_image_url: string | null
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

export default async function SellerShopPage({ params }: Props) {
  const { sellerId } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

  const [{ data: shop }, { data: products }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, name, description, cover_image_url')
      .eq('id', sellerId)
      .maybeSingle(),
    supabase
      .from('shop_products')
      .select('id, title, description, price, stock, category, image_url')
      .eq('shop_id', sellerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  if (!shop) {
    notFound()
  }

  const shopProfile = shop as ShopProfile
  const sellerProducts = (products ?? []) as ShopProduct[]
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shopProfile.name,
    description: shopProfile.description || undefined,
    image: shopProfile.cover_image_url || undefined,
    url: `${siteUrl}/shop/seller/${shopProfile.id}`,
    makesOffer: sellerProducts.slice(0, 24).map((product) => ({
      '@type': 'Offer',
      url: `${siteUrl}/shop/${product.id}`,
      itemOffered: {
        '@type': 'Product',
        name: product.title,
        image: product.image_url || undefined,
        category: product.category || undefined,
      },
      priceCurrency: 'GHS',
      price: Number(product.price).toFixed(2),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    })),
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{shopProfile.name || 'Shop'}</h1>
          {shopProfile.description && (
            <p className="mt-2 text-sm text-gray-600">{shopProfile.description}</p>
          )}
          <p className="mt-2 text-sm text-gray-600">{sellerProducts.length} active product(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/shop/sellers" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            All Shops
          </Link>
          <Link href="/shop" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Main Shop
          </Link>
        </div>
      </div>

      {sellerProducts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No active products in this seller shop.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {sellerProducts.map((product) => (
            <ShopProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              description={product.description}
              price={product.price}
              imageUrl={product.image_url}
              stock={product.stock}
              categoryLabel={product.category}
            />
          ))}
        </div>
      )}
    </main>
  )
}
