import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type ShopRow = {
  id: string
  name: string
  cover_image_url: string | null
  status: string
}

type ProductRow = {
  shop_id: string | null
  image_url: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function SellerShopsPage() {
  const [{ data: shopsData }, { data: productRows }] = await Promise.all([
    supabase
      .from('active_seller_shops')
      .select('id, name, cover_image_url, status, owner_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('shop_products')
      .select('shop_id, image_url')
      .eq('status', 'active')
      .not('shop_id', 'is', null),
  ])

  const shops = (shopsData ?? []) as Array<ShopRow & { owner_id: string | null }>
  const rows = (productRows ?? []) as ProductRow[]

  const productCountByShop = new Map<string, number>()
  const coverImageByShop = new Map<string, string | null>()

  for (const row of rows) {
    if (!row.shop_id) continue
    productCountByShop.set(row.shop_id, (productCountByShop.get(row.shop_id) ?? 0) + 1)
    if (!coverImageByShop.has(row.shop_id)) {
      coverImageByShop.set(row.shop_id, row.image_url ?? null)
    }
  }

  const sortedShops = shops
    .map((shop) => ({
      ...shop,
      productCount: productCountByShop.get(shop.id) ?? 0,
      coverImage: coverImageByShop.get(shop.id) ?? shop.cover_image_url,
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedShops.map((shop) => (
            <Link
              key={shop.id}
              href={`/shop/seller/${shop.id}`}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <div className="h-36 bg-gray-100">
                {shop.coverImage ? (
                  <img src={shop.coverImage} alt={shop.name || 'Shop'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No cover image</div>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-lg font-semibold text-gray-900">{shop.name || 'Shop'}</p>
                <p className="mt-1 text-sm text-gray-600">{shop.productCount} active product(s)</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
