'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import type { Location } from '@/lib/ghanaLocations'

interface LocationDropdownProps {
  locations: Location[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function LocationDropdown({
  locations,
  value,
  onChange,
  placeholder = 'Select location...',
  disabled = false,
}: LocationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLocation = useMemo(
    () => locations.find(loc => loc.value === value),
    [locations, value]
  )

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations
    const query = searchQuery.toLowerCase()
    return locations.filter(
      loc =>
        loc.location.toLowerCase().includes(query) ||
        loc.region.toLowerCase().includes(query)
    )
  }, [locations, searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (location: Location) => {
    onChange(location.value)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange('')
    setSearchQuery('')
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedLocation ? 'text-gray-900' : 'text-gray-500'}>
            {selectedLocation ? selectedLocation.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {selectedLocation && !disabled && (
              <X
                className="w-4 h-4 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto">
            {filteredLocations.length > 0 ? (
              <ul className="py-1">
                {filteredLocations.map((location) => (
                  <li key={location.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(location)}
                      className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                        location.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="text-sm">{location.label}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                No locations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
