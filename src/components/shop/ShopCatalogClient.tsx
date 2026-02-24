'use client'
import { useEffect, useMemo, useState } from 'react'
import ShopProductCard from '@/components/shop/ShopProductCard'

type ShopProduct = {
  id: string
  title: string
  description: string | null
  price: number
  stock: number
  category: string
  image_url: string | null
  image_urls?: string[]
}

type Props = {
  products: ShopProduct[]
  initialCategory?: string
}

type PriceFilter = 'all' | 'under50' | '50to200' | 'above200'
type SortOption = 'featured' | 'priceAsc' | 'priceDesc' | 'name'

export default function ShopCatalogClient({ products, initialCategory }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory?.trim() || 'All Products')
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('featured')

  const productsWithCategory = useMemo(
    () => products.map((product) => ({ ...product, category: product.category || 'Other' })),
    [products]
  )

  const categories = useMemo(() => {
    const unique = Array.from(new Set(productsWithCategory.map((item) => item.category))).sort()
    const requested = initialCategory?.trim()

    if (requested && requested !== 'All Products' && !unique.includes(requested)) {
      unique.unshift(requested)
    }

    return ['All Products', ...unique]
  }, [initialCategory, productsWithCategory])

  useEffect(() => {
    const requested = initialCategory?.trim()

    if (!requested || requested === 'All Products') {
      setSelectedCategory('All Products')
      return
    }

    setSelectedCategory(requested)
  }, [initialCategory])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    const byFilter = productsWithCategory.filter((item) => {
      if (selectedCategory !== 'All Products' && item.category !== selectedCategory) {
        return false
      }

      if (query) {
        const searchable = `${item.title} ${item.description ?? ''}`.toLowerCase()
        if (!searchable.includes(query)) {
          return false
        }
      }

      if (inStockOnly && item.stock <= 0) {
        return false
      }

      if (priceFilter === 'under50' && item.price >= 50) {
        return false
      }

      if (priceFilter === '50to200' && (item.price < 50 || item.price > 200)) {
        return false
      }

      if (priceFilter === 'above200' && item.price <= 200) {
        return false
      }

      return true
    })

    const sorted = [...byFilter]

    if (sortBy === 'priceAsc') {
      sorted.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'priceDesc') {
      sorted.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    }

    return sorted
  }, [inStockOnly, priceFilter, productsWithCategory, search, selectedCategory, sortBy])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 md:p-8">
        <p className="pointer-events-none absolute right-4 top-1 text-6xl font-extrabold leading-none text-gray-100 md:right-8 md:text-8xl">
          SHOP
        </p>
        <h1 className="relative text-2xl font-bold text-gray-900 md:text-3xl">Give all you need</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
          Browse fixed-price products and buy instantly.
        </p>

        <div className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="h-10 w-full rounded-full border border-gray-300 px-4 text-sm outline-none focus:border-gray-500"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="h-10 rounded-full border border-gray-300 bg-white px-4 text-sm outline-none focus:border-gray-500"
          >
            <option value="featured">Sort: Featured</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-gray-900">Category</h2>
          <nav className="mt-3 space-y-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{category}</span>
                {selectedCategory === category && <span className="text-xs">✓</span>}
              </button>
            ))}
          </nav>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              In stock only
            </label>

            <div className="mt-3 space-y-2 text-sm">
              <button
                onClick={() => setPriceFilter('all')}
                className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                  priceFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All prices
              </button>
              <button
                onClick={() => setPriceFilter('under50')}
                className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                  priceFilter === 'under50' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Under GHS 50
              </button>
              <button
                onClick={() => setPriceFilter('50to200')}
                className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                  priceFilter === '50to200' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                GHS 50 - 200
              </button>
              <button
                onClick={() => setPriceFilter('above200')}
                className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                  priceFilter === 'above200' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Above GHS 200
              </button>
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> product(s)
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center shadow-sm">
              <p className="text-base font-semibold text-gray-900">No products match your filters.</p>
              <p className="mt-2 text-sm text-gray-600">Try another search term or clear filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ShopProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  description={product.description}
                  price={product.price}
                  imageUrl={product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : product.image_url}
                  stock={product.stock}
                  categoryLabel={product.category}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
