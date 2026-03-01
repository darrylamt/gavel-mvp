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
  logo_url: string | null
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SellerShopPage({ params }: Props) {
  const { sellerId } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

  const [{ data: shop }, { data: products }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, name, description, logo_url, cover_image_url')
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
      <section className="mb-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="relative h-48 md:h-56">
          {shopProfile.cover_image_url ? (
            <img src={shopProfile.cover_image_url} alt={shopProfile.name || 'Shop cover'} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-gray-100 to-gray-200" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
            Seller Storefront
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <img
              src={shopProfile.logo_url || '/shop-placeholder.svg'}
              alt={shopProfile.name || 'Shop logo'}
              className="h-16 w-16 rounded-2xl border border-gray-200 object-cover"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{shopProfile.name || 'Shop'}</h1>
              {shopProfile.description && <p className="mt-1 text-sm text-gray-600">{shopProfile.description}</p>}
              <p className="mt-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {sellerProducts.length} active product(s)
              </p>
            </div>
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
      </section>

      {sellerProducts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No active products in this seller shop.</p>
        </div>
      ) : (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Products</h2>
            <p className="text-sm text-gray-500">Ready to buy now</p>
          </div>
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
        </section>
      )}
    </main>
  )
}
