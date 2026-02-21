'use client'

import { useEffect, useMemo, useState } from 'react'
import AuctionsGridClient from '@/components/auction/AuctionsGridClient'
import ShopProductCard from '@/components/shop/ShopProductCard'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { useStarredProducts } from '@/hooks/useStarredProducts'

type Auction = {
  id: string
  title: string
  description?: string | null
  starting_price?: number | null
  current_price: number
  ends_at: string
  starts_at?: string | null
  status?: string | null
  image_url?: string | null
  images?: string[] | null
  reserve_price?: number | null
  min_increment?: number | null
  max_increment?: number | null
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

type Props = {
  auctions: Auction[]
  products: ShopProduct[]
  engagementCounts: Record<string, { bidderCount: number; watcherCount: number }>
}

type Filter = 'all' | 'auctions' | 'buy-now'

export default function StarredContentClient({ auctions, products, engagementCounts }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const { starredSet: starredAuctionSet, pruneStarred } = useStarredAuctions()
  const { starredProductSet, pruneStarredProducts } = useStarredProducts()

  useEffect(() => {
    pruneStarred(auctions.map((auction) => auction.id))
  }, [auctions, pruneStarred])

  useEffect(() => {
    pruneStarredProducts(products.map((product) => product.id))
  }, [products, pruneStarredProducts])

  const starredProducts = useMemo(
    () => products.filter((product) => starredProductSet.has(product.id)),
    [products, starredProductSet]
  )

  const totalCount = starredAuctionSet.size + starredProductSet.size

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-extrabold">Favorites</h1>
        <p className="text-gray-600">All your starred auctions and buy-now products in one place.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filter === 'all' ? 'bg-black text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('auctions')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filter === 'auctions' ? 'bg-black text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Auctions ({starredAuctionSet.size})
        </button>
        <button
          type="button"
          onClick={() => setFilter('buy-now')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            filter === 'buy-now' ? 'bg-black text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Buy Now ({starredProductSet.size})
        </button>
      </div>

      {(filter === 'all' || filter === 'auctions') && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Starred Auctions</h2>
          <AuctionsGridClient auctions={auctions} starredOnly engagementCounts={engagementCounts} />
        </section>
      )}

      {(filter === 'all' || filter === 'buy-now') && (
        <section className={filter === 'all' ? 'mt-10' : ''}>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Starred Buy Now Products</h2>

          {starredProducts.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center text-gray-500">
              No starred products yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {starredProducts.map((product) => (
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
        </section>
      )}
    </main>
  )
}
