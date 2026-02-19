import { useCallback } from 'react'
import { Store } from '@tanstack/store'
import { useStore } from '@tanstack/react-store'
import type { DietaryFilters } from '@/components/bear-bites'
import type { Allergen } from '@/lib/menu/schemas'

const STORAGE_KEY = 'bear-bites-filters'

const DEFAULT_FILTERS: DietaryFilters = {
  vegan: false,
  vegetarian: false,
  glutenFree: false,
  excludeAllergens: [],
  excludeSpicy: false,
}

function loadFromStorage(): DietaryFilters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        vegan: parsed.vegan ?? false,
        vegetarian: parsed.vegetarian ?? false,
        glutenFree: parsed.glutenFree ?? false,
        excludeAllergens: (parsed.excludeAllergens ?? []) as Array<Allergen>,
        excludeSpicy: parsed.excludeSpicy ?? false,
      }
    }
  } catch (e) {
    console.error('Failed to load filters from storage:', e)
  }
  return DEFAULT_FILTERS
}

export const filtersStore = new Store<DietaryFilters>(loadFromStorage())

filtersStore.subscribe(() => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtersStore.state))
  } catch (e) {
    console.error('Failed to save filters to storage:', e)
  }
})

export function usePersistedFilters() {
  const filters = useStore(filtersStore)

  const setFilters = useCallback((newFilters: DietaryFilters) => {
    filtersStore.setState(() => newFilters)
  }, [])

  return {
    filters,
    setFilters,
    loaded: true,
  }
}
