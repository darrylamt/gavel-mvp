import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ShopRow = {
  id: string
  name: string
  logo_url: string | null
  cover_image_url: string | null
  status: string
}

type ProductRow = {
  shop_id: string | null
  image_url: string | null
  category: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SellerShopsPage() {
  const [{ data: shopsData }, { data: productRows }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, name, logo_url, cover_image_url, status, owner_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('shop_products')
      .select('shop_id, image_url, category')
      .eq('status', 'active')
      .not('shop_id', 'is', null),
  ])

  const shops = (shopsData ?? []) as Array<ShopRow & { owner_id: string | null }>
  const rows = (productRows ?? []) as ProductRow[]

  const productCountByShop = new Map<string, number>()
  const coverImageByShop = new Map<string, string | null>()
  const categoriesByShop = new Map<string, Set<string>>()

  for (const row of rows) {
    if (!row.shop_id) continue
    productCountByShop.set(row.shop_id, (productCountByShop.get(row.shop_id) ?? 0) + 1)
    if (!coverImageByShop.has(row.shop_id)) {
      coverImageByShop.set(row.shop_id, row.image_url ?? null)
    }
    if (row.category && row.category.trim()) {
      const existing = categoriesByShop.get(row.shop_id) ?? new Set<string>()
      existing.add(row.category.trim())
      categoriesByShop.set(row.shop_id, existing)
    }
  }

  const sortedShops = shops
    .map((shop) => ({
      ...shop,
      productCount: productCountByShop.get(shop.id) ?? 0,
      coverImage: coverImageByShop.get(shop.id) ?? shop.cover_image_url,
      topCategories: Array.from(categoriesByShop.get(shop.id) ?? []).slice(0, 3),
    }))
    .filter((shop) => shop.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shops</h1>
          <p className="mt-1 text-sm text-gray-500">Browse storefronts from approved Gavel sellers.</p>
        </div>
        <Link
          href="/shop"
          className="self-start rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back to Shop
        </Link>
      </div>

      {sortedShops.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Store className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-base font-semibold text-gray-700">No shops available yet</p>
          <p className="mt-1 text-sm text-gray-400">Seller storefronts will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedShops.map((shop) => (
            <article
              key={shop.id}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Cover / logo image */}
              <div className="relative h-32 sm:h-40 bg-gray-100 overflow-hidden">
                {shop.logo_url || shop.coverImage ? (
                  <img
                    src={shop.logo_url || shop.coverImage || ''}
                    alt={shop.name}
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Store className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                {/* Product count badge */}
                <span className="absolute top-2 right-2 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-xs font-bold text-gray-800">
                  {shop.productCount} items
                </span>
              </div>

              <div className="p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">{shop.name || 'Shop'}</h3>

                {/* Category pills */}
                {shop.topCategories.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {shop.topCategories.map((cat) => (
                      <span key={cat} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-400">Trusted seller storefront</p>
                )}

                <Link
                  href={`/shop/seller/${shop.id}`}
                  className="mt-3 flex items-center justify-center w-full rounded-xl bg-gray-900 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-black transition-colors"
                >
                  Visit Shop
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
