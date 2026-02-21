import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProductDetailActions from '@/components/shop/ProductDetailActions'
import ShopProductCard from '@/components/shop/ShopProductCard'

type Props = {
  params: Promise<{ id: string }>
}

type SellerProfile = {
  id: string
  username: string | null
}

type RelatedProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  category: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ShopProductDetailPage({ params }: Props) {
  const { id } = await params

  const { data: product } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, image_url, status, created_by, category')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!product) {
    notFound()
  }

  let seller: SellerProfile | null = null
  if (product.created_by) {
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', product.created_by)
      .maybeSingle()

    seller = (sellerProfile as SellerProfile | null) ?? null
  }

  const { data: latestProducts } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, image_url, category')
    .eq('status', 'active')
    .neq('id', product.id)
    .order('created_at', { ascending: false })
    .limit(4)

  const latest = (latestProducts ?? []) as RelatedProduct[]
  const displaySku = product.id.slice(0, 8).toUpperCase()

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full max-h-[620px] w-full object-contain"
              />
            ) : (
              <div className="flex h-[520px] items-center justify-center text-sm text-gray-400">
                No image available
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[1, 2, 3].map((thumb) => (
              <div key={thumb} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={`${product.title} thumbnail ${thumb}`}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-gray-400">No image</div>
                )}
              </div>
            ))}
          </div>
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
            <p className="text-4xl font-bold text-gray-900">GHS {Number(product.price).toLocaleString()}</p>
            <p className="text-sm font-medium text-gray-500">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          </div>

          <div className="mt-6">
            <ProductDetailActions
              productId={product.id}
              title={product.title}
              price={Number(product.price)}
              imageUrl={product.image_url}
              stock={Number(product.stock)}
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
                {seller ? (
                  <Link href={`/shop/seller/${seller.id}`} className="underline underline-offset-2">
                    {seller.username || 'Seller shop'}
                  </Link>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>

        </div>
      </section>

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
