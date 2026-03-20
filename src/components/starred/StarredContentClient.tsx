'use client'

import { useEffect, useMemo, useState } from 'react'
import AuctionsGridClient from '@/components/auction/AuctionsGridClient'
import ShopProductCard from '@/components/shop/ShopProductCard'
import { useStarredAuctions } from '@/hooks/useStarredAuctions'
import { useStarredProducts } from '@/hooks/useStarredProducts'
import { Heart } from 'lucide-react'
import Link from 'next/link'

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
  seller_base_price: number | null
  commission_rate: number | null
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

  useEffect(() => { pruneStarred(auctions.map(a => a.id)) }, [auctions, pruneStarred])
  useEffect(() => { pruneStarredProducts(products.map(p => p.id)) }, [products, pruneStarredProducts])

  const starredProducts = useMemo(
    () => products.filter(p => starredProductSet.has(p.id)),
    [products, starredProductSet]
  )

  const totalCount = starredAuctionSet.size + starredProductSet.size

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'auctions', label: 'Auctions', count: starredAuctionSet.size },
    { id: 'buy-now', label: 'Buy Now', count: starredProductSet.size },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
            <Heart className="h-4.5 w-4.5 text-red-500 fill-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        </div>
        <p className="text-sm text-gray-500">All your starred auctions and products in one place.</p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              filter === tab.id
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Heart className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-base font-semibold text-gray-700">Nothing starred yet</p>
          <p className="mt-1 text-sm text-gray-400">Star auctions and products you&apos;re interested in.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/auctions" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition-colors">
              Browse Auctions
            </Link>
            <Link href="/shop" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Browse Shop
            </Link>
          </div>
        </div>
      ) : (
        <>
          {(filter === 'all' || filter === 'auctions') && (
            <section className="mb-10">
              {filter === 'all' && (
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Starred Auctions
                  <span className="ml-2 text-sm font-normal text-gray-400">({starredAuctionSet.size})</span>
                </h2>
              )}
              {starredAuctionSet.size === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-100 py-10 text-center">
                  <p className="text-sm text-gray-400">No starred auctions yet.</p>
                  <Link href="/auctions" className="mt-2 inline-block text-xs font-semibold text-orange-600 hover:text-orange-700">
                    Browse Auctions →
                  </Link>
                </div>
              ) : (
                <AuctionsGridClient auctions={auctions} starredOnly engagementCounts={engagementCounts} />
              )}
            </section>
          )}

          {(filter === 'all' || filter === 'buy-now') && (
            <section>
              {filter === 'all' && (
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Starred Products
                  <span className="ml-2 text-sm font-normal text-gray-400">({starredProductSet.size})</span>
                </h2>
              )}
              {starredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-100 py-10 text-center">
                  <p className="text-sm text-gray-400">No starred products yet.</p>
                  <Link href="/shop" className="mt-2 inline-block text-xs font-semibold text-orange-600 hover:text-orange-700">
                    Browse Shop →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {starredProducts.map(product => (
                    <ShopProductCard
                      key={product.id}
                      id={product.id}
                      title={product.title}
                      price={product.price}
                      sellerBasePrice={product.seller_base_price}
                      commissionRate={product.commission_rate}
                      imageUrl={product.image_url}
                      stock={product.stock}
                      categoryLabel={product.category}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
