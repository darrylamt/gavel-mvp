import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type ProductOwnerRow = {
  created_by: string | null
  image_url: string | null
}

type SellerApplicationRow = {
  user_id: string
}

type SellerProfile = {
  id: string
  username: string | null
  avatar_url: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function SellerShopsPage() {
  const [{ data: approvedApplications }, { data: productRows }] = await Promise.all([
    supabase
      .from('seller_applications')
      .select('user_id')
      .eq('status', 'approved'),
    supabase
      .from('shop_products')
      .select('created_by, image_url')
      .eq('status', 'active')
      .not('created_by', 'is', null),
  ])

  const applicationRows = (approvedApplications ?? []) as SellerApplicationRow[]
  const rows = (productRows ?? []) as ProductOwnerRow[]
  const sellerIds = Array.from(new Set(applicationRows.map((row) => row.user_id).filter(Boolean)))

  let sellers: SellerProfile[] = []
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', sellerIds)

    sellers = (profiles ?? []) as SellerProfile[]
  }

  const productCountBySeller = new Map<string, number>()
  const coverImageBySeller = new Map<string, string | null>()

  for (const row of rows) {
    if (!row.created_by) continue
    productCountBySeller.set(row.created_by, (productCountBySeller.get(row.created_by) ?? 0) + 1)
    if (!coverImageBySeller.has(row.created_by)) {
      coverImageBySeller.set(row.created_by, row.image_url ?? null)
    }
  }

  const sortedSellers = sellers
    .map((seller) => ({
      ...seller,
      productCount: productCountBySeller.get(seller.id) ?? 0,
      coverImage: coverImageBySeller.get(seller.id) ?? null,
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

      {sortedSellers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">No shops available yet.</p>
          <p className="mt-2 text-sm text-gray-600">Check back soon for seller storefronts.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSellers.map((seller) => (
            <Link
              key={seller.id}
              href={`/shop/seller/${seller.id}`}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <div className="h-36 bg-gray-100">
                {seller.coverImage ? (
                  <img src={seller.coverImage} alt={seller.username ?? 'Seller shop'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No cover image</div>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-lg font-semibold text-gray-900">{seller.username || 'Seller Shop'}</p>
                <p className="mt-1 text-sm text-gray-600">{seller.productCount} active product(s)</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
