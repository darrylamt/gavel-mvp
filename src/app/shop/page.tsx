import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ShopProductCard from '@/components/shop/ShopProductCard'

export const dynamic = 'force-dynamic'

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ShopPage() {
  const { data } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, image_url')
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })

  const products = (data ?? []) as ShopProduct[]

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">Shop Buy Now</h1>
        <p className="mt-3 text-gray-600">
          Prefer direct purchase without bidding? Buy selected products instantly at fixed prices.
        </p>
      </div>

      {products.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ShopProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              description={product.description}
              price={product.price}
              imageUrl={product.image_url}
              stock={product.stock}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        Need help? Reach us from the contact page.
      </p>
    </main>
  )
}
