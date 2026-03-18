'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/hooks/useAuthUser'
import { Search } from 'lucide-react'
import styles from './SearchHero.module.css'

type SearchResult = {
  id: string
  title: string
  type: 'auction' | 'product'
  price?: number | string
  image_url?: string
}

const PLACEHOLDER_SUGGESTIONS = [
  'Try: gaming console...',
  'Try: something for the kitchen...',
  'Try: clothes for a wedding...',
  'Try: cheap electronics...',
  'Try: body scrub...',
]

export default function SearchHero() {
  const router = useRouter()
  const { user }  = useAuthUser()
  const [firstName, setFirstName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)

  // Cycle through placeholders every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Get first name from Supabase when user is available
  useEffect(() => {
    if (user?.user_metadata?.first_name) {
      setFirstName(user.user_metadata.first_name)
    }
  }, [user])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length < 2) {
        setResults([])
        setShowDropdown(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search }),
        })

        if (!res.ok) {
          throw new Error('Search request failed')
        }

        const data = await res.json()
        setResults((data.results || []).slice(0, 6))
        setShowDropdown(true)
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search)}`)
      setShowDropdown(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'auction') {
      router.push(`/auctions/${result.id}`)
    } else {
      router.push(`/shop/${result.id}`)
    }
    setShowDropdown(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.searchSection}>
          {firstName && user && (
            <p className={styles.greeting}>
              Hi {firstName} 👋
            </p>
          )}
          <h1 className={styles.heading}>
            {user ? 'Online Auctions in Ghana — Find Your Next Win on Gavel' : 'Online Auctions in Ghana — Find Your Next Win on Gavel'}
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchInput}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search.trim().length > 0 && setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDER_SUGGESTIONS[currentPlaceholder]}
                className={styles.input}
              />
              {loading && <div className={styles.loader} />}
            </div>

            {/* Dropdown Results */}
            {showDropdown && search.trim().length > 0 && (
              <div className={styles.dropdown}>
                {loading ? (
                  <div className={styles.dropdownItem}>
                    <p className={styles.loadingText}>Searching…</p>
                  </div>
                ) : results.length > 0 ? (
                  results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className={styles.dropdownItem}
                    >
                      {result.image_url && (
                        <img src={result.image_url} alt={result.title} className={styles.resultImage} />
                      )}
                      <div className={styles.resultContent}>
                        <p className={styles.resultTitle}>{result.title}</p>
                        <div className={styles.resultMeta}>
                          <span className={styles.price}>
                            {result.type === 'auction' ? 'Bid: ' : ''}GH₵ {result.price}
                          </span>
                          <span className={styles.badge}>
                            {result.type === 'auction' ? 'Auction' : 'Buy Now'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : search.trim().length > 0 ? (
                  <div className={styles.dropdownItem}>
                    <p className={styles.noResults}>No results found — try different words</p>
                  </div>
                ) : null}
              </div>
            )}
          </form>

          {/* Trust Bar */}
          <div className={styles.trustBar}>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>●</span>
              <span>24/7 Active market</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>●</span>
              <span>Secure</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>●</span>
              <span>Fast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
