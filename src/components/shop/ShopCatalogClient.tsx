'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown, ShoppingBag } from 'lucide-react'
import ShopProductCard from '@/components/shop/ShopProductCard'

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
  image_urls?: string[]
}

type Props = {
  products: ShopProduct[]
  initialCategory?: string
}

type PriceFilter = 'all' | 'under50' | '50to200' | 'above200'
type SortOption = 'featured' | 'priceAsc' | 'priceDesc' | 'name'

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: 'all', label: 'All prices' },
  { value: 'under50', label: 'Under ₵50' },
  { value: '50to200', label: '₵50 – ₵200' },
  { value: 'above200', label: 'Above ₵200' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'priceAsc', label: 'Price: Low → High' },
  { value: 'priceDesc', label: 'Price: High → Low' },
  { value: 'name', label: 'Name: A → Z' },
]

export default function ShopCatalogClient({ products, initialCategory }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory?.trim() || 'All Products')
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const productsWithCategory = useMemo(
    () => products.map((p) => ({ ...p, category: p.category || 'Other' })),
    [products]
  )

  const categories = useMemo(() => {
    const unique = Array.from(new Set(productsWithCategory.map((p) => p.category))).sort()
    const requested = initialCategory?.trim()
    if (requested && requested !== 'All Products' && !unique.includes(requested)) unique.unshift(requested)
    return ['All Products', ...unique]
  }, [initialCategory, productsWithCategory])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    const byFilter = productsWithCategory.filter((item) => {
      if (selectedCategory !== 'All Products' && item.category !== selectedCategory) return false
      if (query && !`${item.title} ${item.description ?? ''}`.toLowerCase().includes(query)) return false
      if (inStockOnly && item.stock <= 0) return false
      if (priceFilter === 'under50' && item.price >= 50) return false
      if (priceFilter === '50to200' && (item.price < 50 || item.price > 200)) return false
      if (priceFilter === 'above200' && item.price <= 200) return false
      return true
    })

    const sorted = [...byFilter]
    if (sortBy === 'priceAsc') sorted.sort((a, b) => a.price - b.price)
    else if (sortBy === 'priceDesc') sorted.sort((a, b) => b.price - a.price)
    else if (sortBy === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [inStockOnly, priceFilter, productsWithCategory, search, selectedCategory, sortBy])

  const hasActiveFilters =
    selectedCategory !== 'All Products' ||
    priceFilter !== 'all' ||
    inStockOnly ||
    sortBy !== 'featured'

  const clearAll = () => {
    setSelectedCategory('All Products')
    setPriceFilter('all')
    setInStockOnly(false)
    setSortBy('featured')
    setSearch('')
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6 mb-5">
        <p className="pointer-events-none absolute right-4 top-1 text-5xl font-extrabold leading-none text-gray-100 sm:text-7xl">
          SHOP
        </p>
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 flex-shrink-0">
            <ShoppingBag className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Give all you need</h1>
            <p className="text-sm text-gray-500">Browse fixed-price products and buy instantly.</p>
          </div>
        </div>
      </div>

      {/* Search + sort row */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="h-10 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:border-orange-400 transition-all"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowMoreFilters((v) => !v)}
          className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-all ${
            showMoreFilters || hasActiveFilters
              ? 'border-orange-400 bg-orange-50 text-orange-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white leading-none">
              !
            </span>
          )}
        </button>
      </div>

      {/* Category pills - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expanded filters panel */}
      {showMoreFilters && (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Filters</p>
            {hasActiveFilters && (
              <button onClick={clearAll} className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                Clear all
              </button>
            )}
          </div>

          {/* Price range */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price range</p>
            <div className="flex flex-wrap gap-2">
              {PRICE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPriceFilter(o.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    priceFilter === o.value
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* In stock toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">In stock only</p>
              <p className="text-xs text-gray-400">Hide sold out products</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={inStockOnly}
              onClick={() => setInStockOnly((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                inStockOnly ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  inStockOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Result count + clear */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{filteredProducts.length}</span> product{filteredProducts.length !== 1 ? 's' : ''}
          {selectedCategory !== 'All Products' && (
            <span className="text-gray-400"> in {selectedCategory}</span>
          )}
        </p>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs font-semibold text-orange-600 hover:text-orange-700">
            Clear filters
          </button>
        )}
      </div>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-700">No products match your filters.</p>
          <p className="mt-1 text-xs text-gray-400">Try a different search or clear your filters.</p>
          <button onClick={clearAll} className="mt-3 text-xs font-bold text-orange-600 hover:text-orange-700">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ShopProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={product.price}
              sellerBasePrice={product.seller_base_price}
              commissionRate={product.commission_rate}
              imageUrls={product.image_urls}
              imageUrl={
                product.image_urls && product.image_urls.length > 0
                  ? product.image_urls[0]
                  : product.image_url
              }
              stock={product.stock}
              categoryLabel={product.category}
            />
          ))}
        </div>
      )}
    </main>
  )
}
