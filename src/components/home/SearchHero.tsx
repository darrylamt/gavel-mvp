'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/hooks/useAuthUser'
import { Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import styles from './SearchHero.module.css'

type SearchResult = {
  id: string
  title: string
  type: 'auction' | 'product'
  price?: number | string
  image_url?: string
  category?: string | null
}

const PLACEHOLDER_SUGGESTIONS = [
  'Try: gaming console...',
  'Try: something for the kitchen...',
  'Try: clothes for a wedding...',
  'Try: something for my skin...',
  'Try: cheap electronics...',
]

const QUICK_CATEGORIES = [
  { label: '📱 Electronics', href: '/shop?category=Electronics' },
  { label: '👗 Fashion', href: '/shop?category=Fashion' },
  { label: '✨ Cosmetics', href: '/shop?category=Cosmetics' },
  { label: '🏠 Furniture', href: '/shop?category=Furniture' },
  { label: '🚗 Vehicles', href: '/auctions?category=Vehicles' },
  { label: '💍 Jewelry', href: '/shop?category=Jewelry' },
  { label: '📚 Books', href: '/shop?category=Books' },
]

export default function SearchHero() {
  const router = useRouter()
  const { user } = useAuthUser()
  const [firstName, setFirstName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (user?.user_metadata?.first_name) {
      setFirstName(user.user_metadata.first_name)
    }
  }, [user])

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

        if (!res.ok) throw new Error('Search request failed')

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
    router.push(result.type === 'auction' ? `/auctions/${result.id}` : `/shop/${result.id}`)
    setShowDropdown(false)
    setSearch('')
  }

  return (
    <div className={styles.hero}>
      <div className={styles.inner}>
        {firstName && user && (
          <p className={styles.greeting}>Hey {firstName} 👋</p>
        )}

        <h1 className={styles.heading}>
          Ghana&apos;s Marketplace —&nbsp;
          <span className={styles.highlight}>Bid, Buy &amp; Win.</span>
        </h1>
        <p className={styles.subheading}>
          Live auctions and instant purchases. Just describe what you need — our AI will find it.
        </p>

        <div ref={containerRef} className={styles.searchWrap}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchInput}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search.trim().length > 0 && setShowDropdown(true)}
                onKeyDown={(e) => e.key === 'Escape' && setShowDropdown(false)}
                placeholder={PLACEHOLDER_SUGGESTIONS[currentPlaceholder]}
                className={styles.input}
                autoComplete="off"
              />
              {loading && <div className={styles.loader} />}
              <button type="submit" className={styles.searchBtn} aria-label="Search">
                <span className={styles.searchBtnText}>Search</span>
                <ArrowRight className={styles.searchBtnIcon} />
              </button>
            </div>

            {showDropdown && search.trim().length > 0 && (
              <div className={styles.dropdown}>
                {loading ? (
                  <div className={styles.dropdownLoading}>
                    <div className={styles.loadingDots}>
                      <span /><span /><span />
                    </div>
                    <p>Searching with AI…</p>
                  </div>
                ) : results.length > 0 ? (
                  <>
                    {results.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className={styles.dropdownItem}
                      >
                        <div className={styles.resultImgWrap}>
                          {result.image_url ? (
                            <img src={result.image_url} alt={result.title} className={styles.resultImage} />
                          ) : (
                            <div className={styles.resultImgPlaceholder} />
                          )}
                        </div>
                        <div className={styles.resultContent}>
                          <p className={styles.resultTitle}>{result.title}</p>
                          <div className={styles.resultMeta}>
                            {result.category && (
                              <span className={styles.resultCategory}>{result.category}</span>
                            )}
                            <span className={styles.price}>GH₵ {result.price}</span>
                            <span className={result.type === 'auction' ? styles.badgeAuction : styles.badgeProduct}>
                              {result.type === 'auction' ? '🔨 Auction' : '🛒 Buy Now'}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className={styles.resultArrow} />
                      </button>
                    ))}
                    <Link
                      href={`/search?q=${encodeURIComponent(search)}`}
                      className={styles.viewAll}
                      onClick={() => setShowDropdown(false)}
                    >
                      View all results for &ldquo;{search}&rdquo; →
                    </Link>
                  </>
                ) : (
                  <div className={styles.noResultsWrap}>
                    <p className={styles.noResults}>No results found — try different words</p>
                    <Link href="/auctions" className={styles.noResultsLink} onClick={() => setShowDropdown(false)}>
                      Browse all auctions →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </form>

          <p className={styles.aiHint}>✦ AI-powered — describe what you need in plain English</p>
        </div>

        <div className={styles.quickCategories}>
          {QUICK_CATEGORIES.map((cat) => (
            <Link key={cat.label} href={cat.href} className={styles.quickCat}>
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
