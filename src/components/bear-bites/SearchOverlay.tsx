import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Search, X } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { LOCATIONS, type Meal } from '@/lib/menu/schemas'
import { DietaryBadge, SpicyBadge, AllergenBadge } from './DietaryBadges'
import { cn } from '@/lib/utils'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  date: string
}

interface SearchResult {
  id: string
  name: string
  station: string
  meal: Meal
  locationId: string
  locationName: string
  dietaryTags: string[]
  allergens: string[]
  isSpicy?: boolean | null
}

export function SearchOverlay({ isOpen, onClose, date }: SearchOverlayProps) {
  const trpc = useTRPC()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query.trim(), 250)

  const searchQueries = useQueries({
    queries: LOCATIONS.map((location) =>
      trpc.menu.searchMenuItems.queryOptions(
        {
          locationId: location.id,
          date,
          query: debouncedQuery,
        },
        {
          enabled: debouncedQuery.length > 0,
        },
      ),
    ),
  })

  const isLoading = searchQueries.some(
    (q) => q.isLoading && q.fetchStatus !== 'idle',
  )

  const results: SearchResult[] = searchQueries.flatMap((q, i) => {
    if (!q.data) return []
    const location = LOCATIONS[i]
    return q.data.map((item) => ({
      id: item.id,
      name: item.name,
      station: item.station,
      meal: item.meal,
      locationId: location.id,
      locationName: location.name,
      dietaryTags: item.dietaryTags,
      allergens: item.allergens,
      isSpicy: item.isSpicy,
    }))
  })

  useEffect(() => {
    if (isOpen) {
      // Small delay so the overlay animation starts first
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
    setQuery('')
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleResultClick = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Search header */}
      <div
        className="shrink-0 border-b border-border/50"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container-app flex items-center gap-3 py-3">
          <Search size={20} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food across all locations..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-lg"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="container-app py-4">
          {debouncedQuery.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Start typing to search menus
            </p>
          ) : isLoading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 size={32} className="animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {results.length} result{results.length !== 1 && 's'}
              </p>
              {results.map((item) => (
                <Link
                  key={`${item.locationId}-${item.id}`}
                  to="/food/$itemId"
                  params={{ itemId: encodeURIComponent(item.id) }}
                  search={{ date, locationId: item.locationId }}
                  state={{ foodName: item.name } as any}
                  onClick={handleResultClick}
                  className={cn(
                    'block glass-card backdrop-blur-md p-3',
                    'hover:scale-[1.01] transition-transform duration-150',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.locationName} &middot;{' '}
                        {item.meal.charAt(0).toUpperCase() + item.meal.slice(1)}{' '}
                        &middot; {item.station}
                      </p>
                    </div>
                  </div>
                  {(item.dietaryTags.length > 0 ||
                    item.allergens.length > 0 ||
                    item.isSpicy) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.dietaryTags.map((tag) => (
                        <DietaryBadge key={tag} tag={tag as any} />
                      ))}
                      {item.isSpicy && <SpicyBadge />}
                      {item.allergens.map((allergen) => (
                        <AllergenBadge
                          key={allergen}
                          allergen={allergen as any}
                          showLabel
                        />
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
