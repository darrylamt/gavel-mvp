import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import AddToCartButton from '@/components/shop/AddToCartButton'

type Props = {
  params: Promise<{ id: string }>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function ShopProductDetailPage({ params }: Props) {
  const { id } = await params

  const { data: product } = await supabase
    .from('shop_products')
    .select('id, title, description, price, stock, image_url, status')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!product) {
    notFound()
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link href="/shop" className="text-sm font-medium underline underline-offset-2">
        Back to shop
      </Link>

      <section className="mt-4 grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-gray-50">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-gray-400">
              No image available
            </div>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border bg-white p-5">
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
          <p className="text-2xl font-bold">GHS {Number(product.price).toLocaleString()}</p>

          <p className="text-sm text-gray-600">
            {product.stock > 0 ? `${product.stock} item(s) available` : 'Out of stock'}
          </p>

          <AddToCartButton
            productId={product.id}
            title={product.title}
            price={Number(product.price)}
            imageUrl={product.image_url}
            stock={Number(product.stock)}
          />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Product Description</h2>
        <p className="mt-3 whitespace-pre-line text-gray-700 leading-relaxed">
          {product.description || 'No additional description provided.'}
        </p>
      </section>
    </main>
  )
}
