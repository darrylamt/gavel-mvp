import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ShopProductCard from '@/components/shop/ShopProductCard'

type Props = {
  params: Promise<{ sellerId: string }>
}

type SellerProfile = {
  id: string
  username: string | null
  avatar_url: string | null
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

  const [{ data: profile }, { data: products }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', sellerId)
      .maybeSingle(),
    supabase
      .from('shop_products')
      .select('id, title, description, price, stock, category, image_url')
      .eq('created_by', sellerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  if (!profile) {
    notFound()
  }

  const sellerProfile = profile as SellerProfile
  const sellerProducts = (products ?? []) as ShopProduct[]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{sellerProfile.username || 'Seller Shop'}</h1>
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
