import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Filter,
  Loader2,
  Calendar,
} from 'lucide-react'
import { orpc } from '@/orpc/client'
import { LOCATIONS, type Meal, type MenuItem } from '@/lib/menu/schemas'
import {
  PageWrapper,
  Container,
  GlassCard,
  GlassButton,
  FilterModal,
  QuickFilterBar,
  DEFAULT_FILTERS,
} from '@/components/bear-bites'
import { FoodGrid, StationGroup } from '@/components/bear-bites/FoodCard'
import { cn } from '@/lib/utils'
import { useFavorites } from '@/hooks/useFavorites'
import { usePersistedFilters } from '@/hooks/usePersistedFilters'
import { useState, useEffect } from 'react'

const searchSchema = z.object({
  date: z.string().optional(),
  location: z.string().optional(),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'brunch']).optional(),
  view: z.enum(['station', 'all']).optional(),
})

export const Route = createFileRoute('/')({
  component: HomePage,
  validateSearch: searchSchema,
})

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr + 'T12:00:00')
  return isNaN(date.getTime()) ? new Date() : date
}

function formatDisplayDate(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateStr = formatDate(date)
  if (dateStr === formatDate(today)) return 'Today'
  if (dateStr === formatDate(tomorrow)) return 'Tomorrow'
  if (dateStr === formatDate(yesterday)) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getCurrentMeal(): Meal {
  // Return a stable default for SSR, will be corrected on client
  if (typeof window === 'undefined') return 'breakfast'
  const hour = new Date().getHours()
  if (hour < 10) return 'breakfast'
  if (hour < 14) return 'lunch'
  return 'dinner'
}

const MEALS: { id: Meal; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
]

function HomePage() {
  const navigate = useNavigate()
  const search = Route.useSearch()

    const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const selectedDate = search.date ? parseDate(search.date) : new Date()
  const selectedLocation =
    LOCATIONS.find((l) => l.id === search.location) || LOCATIONS[1]
  const selectedMeal: Meal =
    search.meal || (isHydrated ? getCurrentMeal() : 'breakfast')
  const groupByStation = search.view !== 'all'

  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const { filters, setFilters } = usePersistedFilters()

  const { favoriteIds, toggleFavorite } = useFavorites()

    const updateSearch = useCallback(
    (updates: {
      date?: string
      location?: string
      meal?: Meal
      view?: 'station' | 'all'
    }) => {
      navigate({
        to: '/',
        search: (prev) => ({
          ...prev,
          ...updates,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const setSelectedDate = useCallback(
    (date: Date) => {
      updateSearch({ date: formatDate(date) })
    },
    [updateSearch],
  )

  const setSelectedLocation = useCallback(
    (location: (typeof LOCATIONS)[0]) => {
      updateSearch({ location: location.id })
    },
    [updateSearch],
  )

  const setSelectedMeal = useCallback(
    (meal: Meal) => {
      updateSearch({ meal })
    },
    [updateSearch],
  )

  const handleToggleFavorite = useCallback(
    (item: MenuItem) => {
      toggleFavorite({
        foodId: item.id,
        foodName: item.name,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        labelUrl: item.labelUrl,
      })
    },
    [toggleFavorite, selectedLocation],
  )

  const hasActiveFilters =
    filters.vegan ||
    filters.vegetarian ||
    filters.glutenFree ||
    filters.excludeAllergens.length > 0

  const menuQuery = useQuery(
    orpc.menu.getMenu.queryOptions({
      input: {
        locationId: selectedLocation.id,
        date: formatDate(selectedDate),
      },
    }),
  )

  const mealItems = useMemo(() => {
    if (!menuQuery.data?.meals) return []
    let items = menuQuery.data.meals[selectedMeal] || []

      if (hasActiveFilters) {
      items = items.filter((item) => {
        // Check dietary tags
        if (filters.vegan && !item.dietaryTags.includes('vegan')) {
          return false
        }
        if (filters.vegetarian && !item.dietaryTags.includes('vegetarian')) {
          return false
        }
        if (filters.glutenFree && !item.dietaryTags.includes('gluten-free')) {
          return false
        }

        for (const allergen of filters.excludeAllergens) {
          if (item.allergens.includes(allergen)) {
            return false
          }
        }

        return true
      })
    }

    return items
  }, [menuQuery.data, selectedMeal, filters, hasActiveFilters])

  const favoritedMealItems = useMemo(() => {
    return mealItems.filter((item) => favoriteIds.has(item.id))
  }, [mealItems, favoriteIds])

  const stationGroups = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {}
    for (const item of mealItems) {
      if (!groups[item.station]) {
        groups[item.station] = []
      }
      groups[item.station].push(item)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [mealItems])

  const availableMeals = useMemo(() => {
    const meals = menuQuery.data?.meals
    if (!meals) return new Set<Meal>()
    return new Set(
      Object.keys(meals).filter(
        (meal) => (meals[meal as Meal]?.length || 0) > 0,
      ) as Meal[],
    )
  }, [menuQuery.data])

  const dateBoundsQuery = useQuery(
    orpc.menu.getDateBounds.queryOptions({
      input: { locationId: selectedLocation.id },
    }),
  )

  const minDate = dateBoundsQuery.data?.minDate
    ? new Date(dateBoundsQuery.data.minDate + 'T12:00:00')
    : null
  const maxDate = dateBoundsQuery.data?.maxDate
    ? new Date(dateBoundsQuery.data.maxDate + 'T12:00:00')
    : null

  const canGoBack = minDate ? selectedDate > minDate : true
  const canGoForward = maxDate ? selectedDate < maxDate : true

  const goToPreviousDay = () => {
    if (!canGoBack) return
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    if (!canGoForward) return
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    navigate({
      to: '/',
      search: {
        date: formatDate(new Date()),
        location: selectedLocation.id,
        meal: getCurrentMeal(),
      },
      replace: true,
    })
  }

  const isToday = formatDate(selectedDate) === formatDate(new Date())

  const activeFilterCount =
    (filters.vegan ? 1 : 0) +
    (filters.vegetarian ? 1 : 0) +
    (filters.glutenFree ? 1 : 0) +
    filters.excludeAllergens.length

  return (
    <PageWrapper>
      <Container className="pt-4">
        {/* Location Selector */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-primary shrink-0" />
          <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-hide">
            {LOCATIONS.map((location) => (
              <GlassButton
                key={location.id}
                variant={
                  selectedLocation.id === location.id ? 'primary' : 'ghost'
                }
                size="sm"
                onClick={() => setSelectedLocation(location)}
                className="whitespace-nowrap"
              >
                {location.name}
              </GlassButton>
            ))}
          </div>
        </div>

        {/* Date Picker */}
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              disabled={!canGoBack}
              className={cn(
                'p-2 rounded-lg transition-colors',
                canGoBack ? 'hover:bg-muted' : 'opacity-30 cursor-not-allowed',
              )}
              aria-label="Previous day"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={goToToday}
              className="text-center group"
              title="Jump to today"
            >
              <p className="font-semibold text-lg group-hover:text-primary transition-colors">
                {formatDisplayDate(selectedDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                {isToday ? (
                  selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                ) : (
                  <span className="flex items-center justify-center gap-1 text-primary">
                    <Calendar size={12} />
                    Tap for today
                  </span>
                )}
              </p>
            </button>

            <button
              onClick={goToNextDay}
              disabled={!canGoForward}
              className={cn(
                'p-2 rounded-lg transition-colors',
                canGoForward
                  ? 'hover:bg-muted'
                  : 'opacity-30 cursor-not-allowed',
              )}
              aria-label="Next day"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </GlassCard>

        {/* Meal Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          {MEALS.map((meal) => {
            const isAvailable = availableMeals.has(meal.id)
            const isSelected = selectedMeal === meal.id

            return (
              <button
                key={meal.id}
                onClick={() => setSelectedMeal(meal.id)}
                disabled={!isAvailable && !menuQuery.isLoading}
                className={cn(
                  'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground',
                  !isAvailable &&
                    !menuQuery.isLoading &&
                    'opacity-40 cursor-not-allowed',
                )}
              >
                {meal.label}
              </button>
            )
          })}
        </div>

        {/* Quick Dietary Filters */}
        <div className="mb-4">
          <QuickFilterBar filters={filters} onChange={setFilters} />
        </div>

        {/* View Toggle & Filter */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <GlassButton
              variant={groupByStation ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => updateSearch({ view: 'station' })}
            >
              By Station
            </GlassButton>
            <GlassButton
              variant={!groupByStation ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => updateSearch({ view: 'all' })}
            >
              All Items
            </GlassButton>
          </div>

          <GlassButton
            variant={hasActiveFilters ? 'primary' : 'ghost'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter size={16} />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-background text-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </GlassButton>
        </div>

        {/* Content */}
        {menuQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading menu...</p>
          </div>
        ) : menuQuery.isError ? (
          <GlassCard className="text-center py-12">
            <p className="text-destructive mb-2">Failed to load menu</p>
            <p className="text-sm text-muted-foreground mb-4">
              {menuQuery.error?.message || 'Please try again later'}
            </p>
            <GlassButton variant="primary" onClick={() => menuQuery.refetch()}>
              Retry
            </GlassButton>
          </GlassCard>
        ) : mealItems.length === 0 ? (
          <GlassCard className="text-center py-12">
            <p className="text-lg font-medium mb-2">No menu available</p>
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? 'No items match your filters. Try adjusting them.'
                : availableMeals.size === 0
                  ? 'No menu data for this date'
                  : `Try selecting a different meal`}
            </p>
            {hasActiveFilters && (
              <GlassButton
                variant="ghost"
                className="mt-4"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear Filters
              </GlassButton>
            )}
          </GlassCard>
        ) : groupByStation ? (
          <div className="space-y-6">
            {/* Favorites group at the top */}
            {favoritedMealItems.length > 0 && (
              <StationGroup
                station="⭐ Favorites"
                items={favoritedMealItems}
                date={formatDate(selectedDate)}
                locationId={selectedLocation.id}
                favorites={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                showStationInCards={true}
              />
            )}
            {/* Regular station groups */}
            {stationGroups.map(([station, items]) => (
              <StationGroup
                key={station}
                station={station}
                items={items}
                date={formatDate(selectedDate)}
                locationId={selectedLocation.id}
                favorites={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <FoodGrid
            items={mealItems}
            date={formatDate(selectedDate)}
            locationId={selectedLocation.id}
            favorites={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </Container>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </PageWrapper>
  )
}
