'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'

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

type SemanticSearchProps = {
  placeholder?: string
  className?: string
  fullWidth?: boolean
}

export default function SemanticSearch({
  placeholder = 'Search for anything... (e.g., "gaming console", "kitchen items")',
  className = '',
  fullWidth = false,
}: SemanticSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const debouncedQuery = useDebounce(query, 400)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search when debounced query changes
  useEffect(() => {
    async function performSearch() {
      const trimmedQuery = debouncedQuery.trim()
      
      if (!trimmedQuery) {
        setResults([])
        setShowDropdown(false)
        setNoResults(false)
        return
      }

      setLoading(true)
      setShowDropdown(true)

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmedQuery }),
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
  }, [debouncedQuery])

  const handleResultClick = (result: SearchResult) => {
    setShowDropdown(false)
    setQuery('')
    
    if (result.type === 'auction') {
      router.push(`/auctions/${result.id}`)
    } else {
      router.push(`/shop/${result.id}`)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowDropdown(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={18} />
        )}
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : noResults ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found — try different words
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-gray-50 text-left flex items-start gap-3 transition"
                >
                  {result.image_url && (
                    <img
                      src={result.image_url}
                      alt={result.title}
                      className="w-16 h-16 object-cover rounded border border-gray-200 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate">{result.title}</h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          result.type === 'auction'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {result.type === 'auction' ? 'Auction' : 'Buy Now'}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1">{result.description}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900">
                      GHS {result.price.toLocaleString()}
                      {result.type === 'auction' && <span className="text-xs text-gray-500 font-normal ml-1">(current bid)</span>}
                    </p>
                  </div>
                </button>
              ))}
              {query.trim() && (
                <button
                  onClick={handleSearchSubmit}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium border-t border-gray-100"
                >
                  View all results for "{query.trim()}"
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
