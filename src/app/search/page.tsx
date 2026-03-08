'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import SemanticSearch from '@/components/search/SemanticSearch'

type SearchResult = {
  id: string
  title: string
  description: string | null
  category: string | null
  price: number
  image_url: string | null
  type: 'auction' | 'product'
  similarity: number
}

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'auctions' | 'products'>('all')

  useEffect(() => {
    async function performSearch() {
      if (!query.trim()) {
        setResults([])
        setNoResults(false)
        return
      }

      setLoading(true)

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        })

        const data = await res.json()

        if (data.results) {
          setResults(data.results)
          setNoResults(data.noResults || false)
        } else {
          setResults([])
          setNoResults(true)
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        setNoResults(true)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [query])

  const filteredResults = results.filter((result) => {
    if (activeTab === 'all') return true
    if (activeTab === 'auctions') return result.type === 'auction'
    if (activeTab === 'products') return result.type === 'product'
    return true
  })

  const auctionCount = results.filter((r) => r.type === 'auction').length
  const productCount = results.filter((r) => r.type === 'product').length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="mb-8">
          <SemanticSearch fullWidth />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <span className="ml-3 text-gray-600">Searching...</span>
          </div>
        )}

        {/* No query */}
        {!loading && !query.trim() && (
          <div className="text-center py-12">
            <Search className="mx-auto text-gray-300 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Search for anything</h2>
            <p className="text-gray-600">Try "gaming console", "kitchen items", or "clothes for a wedding"</p>
          </div>
        )}

        {/* Results */}
        {!loading && query.trim() && (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
              </h1>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                    activeTab === 'all'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setActiveTab('auctions')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                    activeTab === 'auctions'
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Auctions ({auctionCount})
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                    activeTab === 'products'
                      ? 'border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Buy Now ({productCount})
                </button>
              </div>
            </div>

            {/* No results */}
            {noResults || filteredResults.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Search className="mx-auto text-gray-300 mb-4" size={48} />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No results found</h2>
                <p className="text-gray-600 mb-6">Try different words or browse popular categories below</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/auctions"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    Browse Auctions
                  </Link>
                  <Link
                    href="/shop"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    Browse Shop
                  </Link>
                </div>
              </div>
            ) : (
              /* Results grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredResults.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.type === 'auction' ? `/auctions/${result.id}` : `/shop/${result.id}`}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition group"
                  >
                    {/* Image */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {result.image_url ? (
                        <img
                          src={result.image_url}
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Search size={48} />
                        </div>
                      )}
                      <span
                        className={`absolute top-2 right-2 text-xs px-2 py-1 rounded font-medium ${
                          result.type === 'auction'
                            ? 'bg-orange-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {result.type === 'auction' ? 'Auction' : 'Buy Now'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition">
                        {result.title}
                      </h3>
                      {result.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{result.description}</p>
                      )}
                      {result.category && (
                        <p className="text-xs text-gray-400 mb-2">{result.category}</p>
                      )}
                      <p className="text-lg font-bold text-gray-900">
                        GHS {result.price.toLocaleString()}
                        {result.type === 'auction' && (
                          <span className="text-xs text-gray-500 font-normal ml-1">(current bid)</span>
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}
