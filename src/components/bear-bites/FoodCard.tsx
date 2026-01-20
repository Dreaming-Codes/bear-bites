import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { MenuItem } from '@/lib/menu/schemas'
import { GlassCard } from './GlassCard'
import { DietaryBadge, AllergenBadge } from './DietaryBadges'
import { cn } from '@/lib/utils'

interface FoodCardProps {
  item: MenuItem
  date: string
  locationId: string
  locationName?: string
  isFavorite?: boolean
  onToggleFavorite?: (item: MenuItem) => void
  showStation?: boolean
  className?: string
}

export function FoodCard({
  item,
  date,
  locationId,
  isFavorite = false,
  onToggleFavorite,
  showStation = true,
  className,
}: FoodCardProps) {
  return (
    <GlassCard className={cn('relative', className)} hoverable>
      <Link
        to="/food/$itemId"
        params={{ itemId: encodeURIComponent(item.id) }}
        search={{
          date,
          locationId,
          labelUrl: item.labelUrl,
          foodName: item.name,
        }}
        className="block"
      >
        <div className="pr-10">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
            {item.name}
          </h3>

          {showStation && (
            <p className="text-sm text-muted-foreground mb-2">{item.station}</p>
          )}

          {/* Dietary tags and allergens in one row */}
          {(item.dietaryTags.length > 0 || item.allergens.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {item.dietaryTags.map((tag) => (
                <DietaryBadge key={tag} tag={tag} />
              ))}
              {item.allergens.map((allergen) => (
                <AllergenBadge key={allergen} allergen={allergen} showLabel />
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Favorite button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleFavorite(item)
          }}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-full transition-all duration-200',
            isFavorite
              ? 'text-red-500 bg-red-100 dark:bg-red-900/30'
              : 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
          )}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </GlassCard>
  )
}

interface FoodGridProps {
  items: MenuItem[]
  date: string
  locationId: string
  locationName?: string
  favorites?: Set<string>
  onToggleFavorite?: (item: MenuItem) => void
  showStation?: boolean
  className?: string
}

export function FoodGrid({
  items,
  date,
  locationId,
  favorites = new Set(),
  onToggleFavorite,
  showStation = true,
  className,
}: FoodGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No items found</p>
      </div>
    )
  }

  // Sort items with favorites at the top
  const sortedItems = [...items].sort((a, b) => {
    const aIsFav = favorites.has(a.id)
    const bIsFav = favorites.has(b.id)
    if (aIsFav && !bIsFav) return -1
    if (!aIsFav && bIsFav) return 1
    return 0
  })

  return (
    <div className={cn('grid gap-3', className)}>
      {sortedItems.map((item) => (
        <FoodCard
          key={item.id}
          item={item}
          date={date}
          locationId={locationId}
          isFavorite={favorites.has(item.id)}
          onToggleFavorite={onToggleFavorite}
          showStation={showStation}
        />
      ))}
    </div>
  )
}

interface StationGroupProps {
  station: string
  items: MenuItem[]
  date: string
  locationId: string
  locationName?: string
  favorites?: Set<string>
  onToggleFavorite?: (item: MenuItem) => void
  showStationInCards?: boolean
}

export function StationGroup({
  station,
  items,
  date,
  locationId,
  favorites,
  onToggleFavorite,
  showStationInCards = false,
}: StationGroupProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
        {station}
      </h3>
      <FoodGrid
        items={items}
        date={date}
        locationId={locationId}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        showStation={showStationInCards}
      />
    </div>
  )
}

export default FoodCard
