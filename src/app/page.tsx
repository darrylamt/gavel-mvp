const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import AuctionCard from '@/components/auction/AuctionCard'
import { SharedTickProvider } from '@/components/auction/SharedTickProvider'
import { getAuctionEngagementCounts } from '@/lib/serverAuctionEngagement'
import HeroShowcaseCarousel from '@/components/home/HeroShowcaseCarousel'
import ShopProductCard from '@/components/shop/ShopProductCard'
import SearchHero from '@/components/home/SearchHero'
import { getCategoryTheme } from '@/lib/categoryThemes'
import { Flame, Clock, Home, Car, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const heroCategories = [
  {
    name: 'Electronics',
    tagline: 'Phones, gadgets, smart devices',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Home Appliances',
    tagline: 'Kitchen and everyday essentials',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Fashion',
    tagline: 'Clothing, shoes and lifestyle',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Furniture',
    tagline: 'Living room and office pieces',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Collectibles',
    tagline: 'Unique finds and rare items',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Cosmetics',
    tagline: 'Beauty, skincare, and makeup',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Books',
    tagline: 'Textbooks, novels, and learning',
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Sports',
    tagline: 'Fitness gear and accessories',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Kids',
    tagline: 'Toys, essentials, and accessories',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Office Supplies',
    tagline: 'Workstation and stationery picks',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Jewelry',
    tagline: 'Rings, watches, and accessories',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
  },
]

export default async function HomePage() {
  const { data: products } = await supabase
    .from('shop_products')
    .select('id, title, description, price, seller_base_price, commission_rate, stock, category, image_url, image_urls')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  const now = new Date()
  const nowIso = now.toISOString()
  const next24HoursIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url, images')
    .in('status', ['active', 'scheduled'])
    .or('is_private.is.false,is_private.is.null')
    .gt('ends_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: endingSoon } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url, images')
    .eq('status', 'active')
    .or('is_private.is.false,is_private.is.null')
    .gt('ends_at', nowIso)
    .lt('ends_at', next24HoursIso)
    .order('ends_at', { ascending: true })
    .limit(6)

  const { data: startingSoon } = await supabase
    .from('auctions')
    .select('id, title, current_price, ends_at, starts_at, status, image_url, images')
    .or('is_private.is.false,is_private.is.null')
    .gt('starts_at', nowIso)
    .lt('starts_at', next24HoursIso)
    .neq('status', 'ended')
    .order('starts_at', { ascending: true })
    .limit(6)

  const allAuctionIds = Array.from(
    new Set([
      ...(auctions ?? []).map((a) => a.id),
      ...(startingSoon ?? []).map((a) => a.id),
      ...(endingSoon ?? []).map((a) => a.id),
    ])
  )

  const engagementCounts = await getAuctionEngagementCounts(allAuctionIds)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-8 sm:pt-8 sm:pb-12">

      {/* Hero Search */}
      <div className="mb-8 sm:mb-10">
        <SearchHero />
      </div>

      {/* Spotlight Showcase */}
      <div className="mb-10 sm:mb-14">
        <HeroShowcaseCarousel />
      </div>

      {/* Ending Soon — highest urgency, shown first */}
      {endingSoon && endingSoon.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ending Soon</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                <Flame className="h-3 w-3" /> Live
              </span>
            </div>
            <Link href="/auctions" className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2">
              View all
            </Link>
          </div>
          <SharedTickProvider>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {endingSoon.map((a) => {
                const counts = engagementCounts.get(a.id) ?? { bidderCount: 0, watcherCount: 0 }
                return (
                  <AuctionCard
                    key={a.id}
                    id={a.id}
                    title={a.title}
                    currentPrice={a.current_price}
                    endsAt={a.ends_at}
                    startsAt={a.starts_at}
                    status={a.status}
                    imageUrl={a.image_url}
                    images={a.images}
                    bidderCount={counts.bidderCount}
                    watcherCount={counts.watcherCount}
                    compactMobile
                  />
                )
              })}
            </div>
          </SharedTickProvider>
        </section>
      )}

      {/* Featured Auctions */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Featured Auctions</h2>
          <Link href="/auctions" className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2">
            View all
          </Link>
        </div>

        {(!auctions || auctions.length === 0) && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">No auctions available yet — check back soon.</p>
          </div>
        )}

        <SharedTickProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {auctions?.map((a) => {
              const counts = engagementCounts.get(a.id) ?? { bidderCount: 0, watcherCount: 0 }
              return (
                <AuctionCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  currentPrice={a.current_price}
                  endsAt={a.ends_at}
                  startsAt={a.starts_at}
                  status={a.status}
                  imageUrl={a.image_url}
                  images={a.images}
                  bidderCount={counts.bidderCount}
                  watcherCount={counts.watcherCount}
                  compactMobile
                />
              )
            })}
          </div>
        </SharedTickProvider>
      </section>

      {/* Starting Soon */}
      {startingSoon && startingSoon.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Starting Soon</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                <Clock className="h-3 w-3" /> Soon
              </span>
            </div>
            <Link href="/auctions" className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2">
              View all
            </Link>
          </div>
          <SharedTickProvider>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {startingSoon.map((a) => {
                const counts = engagementCounts.get(a.id) ?? { bidderCount: 0, watcherCount: 0 }
                return (
                  <AuctionCard
                    key={a.id}
                    id={a.id}
                    title={a.title}
                    currentPrice={a.current_price}
                    endsAt={a.ends_at}
                    startsAt={a.starts_at}
                    status={a.status}
                    imageUrl={a.image_url}
                    images={a.images}
                    bidderCount={counts.bidderCount}
                    watcherCount={counts.watcherCount}
                    compactMobile
                  />
                )
              })}
            </div>
          </SharedTickProvider>
        </section>
      )}

      {/* Featured Products */}
      {products && products.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Featured Products</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
            {products.map((product) => (
              <ShopProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                sellerBasePrice={product.seller_base_price}
                commissionRate={product.commission_rate}
                imageUrls={product.image_urls}
                imageUrl={product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : product.image_url}
                stock={product.stock}
                categoryLabel={product.category}
                compactMobile
              />
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link href="/shop" className="inline-block rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
              View more products
            </Link>
          </div>
        </section>
      )}

      {/* Verticals Banner */}
      <section className="mb-12">
        <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8">
          <p className="text-white/60 text-sm font-medium mb-1">Explore our specialist platforms</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-5">Looking for property or vehicles?</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/properties"
              className="flex items-center gap-3 rounded-xl bg-[#0F2557] border border-[#C9A84C]/30 px-5 py-4 hover:bg-[#1a3570] transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A84C]/20 flex-shrink-0"><Home className="h-5 w-5 text-[#C9A84C]" /></div>
              <div>
                <p className="font-bold text-white text-sm">Gavel Properties</p>
                <p className="text-white/60 text-xs">Land, homes &amp; commercial</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-[#C9A84C] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </a>
            <a
              href="/autos"
              className="flex items-center gap-3 rounded-xl bg-[#1A1A2E] border border-[#E63946]/30 px-5 py-4 hover:bg-[#252540] transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E63946]/20 flex-shrink-0"><Car className="h-5 w-5 text-[#E63946]" /></div>
              <div>
                <p className="font-bold text-white text-sm">Gavel Autos</p>
                <p className="text-white/60 text-xs">Cars, SUVs, trucks &amp; more</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-[#E63946] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </a>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
          <Link href="/shop" className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2">
            See all
          </Link>
        </div>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {heroCategories.map((category) => {
            const theme = getCategoryTheme(category.name)
            return (
              <Link
                key={category.name}
                href={`/shop?category=${encodeURIComponent(category.name)}`}
                className="group snap-start w-[72%] max-w-[232px] flex-none rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:max-w-none"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  {/* Accent tint overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-200 rounded-lg"
                    style={{ backgroundColor: theme.accentHex }}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{category.name}</p>
                <p className="text-xs text-gray-500">{category.tagline}</p>
              </Link>
            )
          })}
        </div>
      </section>

    </main>
  )
}
