import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function SellerShopsPage() {
  const [{ data: shopsData }, { data: productRows }] = await Promise.all([
    supabase
      .from('active_seller_shops')
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
    .sort((a, b) => b.productCount - a.productCount)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shops</h1>
          <p className="mt-2 text-sm text-gray-600">Browse stores from approved sellers.</p>
        </div>
        <Link href="/shop" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Back to Shop
        </Link>
      </div>

      {sortedShops.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No shops available yet.</p>
          <p className="mt-2 text-sm text-gray-600">Check back soon for seller storefronts.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedShops.map((shop) => (
            <article
              key={shop.id}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-gray-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <div className="relative h-48 overflow-hidden rounded-2xl bg-gray-100">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name || 'Shop logo'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No logo image</div>
                )}

                <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur">
                  Active Shop
                </div>

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  <span className="h-2 w-2 rounded-full bg-white/60" />
                  <span className="h-2 w-2 rounded-full bg-white/60" />
                  <span className="h-2 w-2 rounded-full bg-white/60" />
                </div>
              </div>

              <div className="px-2 pb-2 pt-3">
                <h3 className="truncate text-4xl font-extrabold leading-none text-gray-900">{shop.name || 'Shop'}</h3>
                {shop.topCategories.length > 0 ? (
                  <p className="mt-1.5 text-sm font-medium text-gray-600">{shop.topCategories.join(' • ')}</p>
                ) : (
                  <p className="mt-1.5 text-sm font-medium text-gray-500">Trusted seller storefront</p>
                )}

                <p className="mt-2 line-clamp-2 text-xs font-medium text-gray-500">
                  Browse products from this shop and order instantly from available listings.
                </p>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xl font-black text-gray-900">
                    {shop.productCount}
                  </div>
                  <Link
                    href={`/shop/seller/${shop.id}`}
                    className="inline-flex items-center rounded-full bg-black px-4 py-2 text-base font-semibold text-white hover:bg-gray-800"
                  >
                    View Shop ↗
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
