import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { GlassButton, GlassCard } from './GlassCard'
import type { Allergen, DietaryTag } from '@/lib/menu/schemas'
import { cn } from '@/lib/utils'

const DIETARY_TAGS: Array<{ id: DietaryTag; label: string; emoji: string }> = [
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { id: 'gluten-free', label: 'Gluten-Free', emoji: '🌾' },
]

const ALLERGENS: Array<{ id: Allergen; label: string; emoji: string }> = [
  { id: 'milk', label: 'Milk', emoji: '🥛' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'fish', label: 'Fish', emoji: '🐟' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'tree-nuts', label: 'Tree Nuts', emoji: '🌰' },
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'wheat', label: 'Wheat', emoji: '🌾' },
  { id: 'soybeans', label: 'Soybeans', emoji: '🫘' },
  { id: 'sesame', label: 'Sesame', emoji: '🫓' },
]

export interface DietaryFilters {
  vegan: boolean
  vegetarian: boolean
  glutenFree: boolean
  excludeAllergens: Array<Allergen>
}

export const DEFAULT_FILTERS: DietaryFilters = {
  vegan: false,
  vegetarian: false,
  glutenFree: false,
  excludeAllergens: [],
}

interface FilterChipProps {
  label: string
  emoji?: string
  selected: boolean
  onToggle: () => void
  variant?: 'include' | 'exclude'
}

function FilterChip({
  label,
  emoji,
  selected,
  onToggle,
  variant = 'include',
}: FilterChipProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
        selected
          ? variant === 'include'
            ? 'bg-primary text-primary-foreground'
            : 'bg-destructive text-destructive-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
      {selected && (
        <span className="ml-1">
          {variant === 'include' ? <Check size={14} /> : <X size={14} />}
        </span>
      )}
    </button>
  )
}

interface DietaryFilterPanelProps {
  filters: DietaryFilters
  onChange: (filters: DietaryFilters) => void
  onClose?: () => void
}

export function DietaryFilterPanel({
  filters,
  onChange,
  onClose,
}: DietaryFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  const toggleDietaryTag = (tag: DietaryTag) => {
    const newFilters = { ...localFilters }
    if (tag === 'vegan') {
      newFilters.vegan = !newFilters.vegan
      // Vegan implies vegetarian
      if (newFilters.vegan) newFilters.vegetarian = true
    } else if (tag === 'vegetarian') {
      newFilters.vegetarian = !newFilters.vegetarian
      // Disabling vegetarian also disables vegan
      if (!newFilters.vegetarian) newFilters.vegan = false
    } else if (tag === 'gluten-free') {
      newFilters.glutenFree = !newFilters.glutenFree
    }
    setLocalFilters(newFilters)
  }

  const toggleAllergen = (allergen: Allergen) => {
    const newFilters = { ...localFilters }
    const idx = newFilters.excludeAllergens.indexOf(allergen)
    if (idx >= 0) {
      newFilters.excludeAllergens = newFilters.excludeAllergens.filter(
        (a) => a !== allergen,
      )
    } else {
      newFilters.excludeAllergens = [...newFilters.excludeAllergens, allergen]
    }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onChange(localFilters)
    onClose?.()
  }

  const clearFilters = () => {
    setLocalFilters(DEFAULT_FILTERS)
  }

  const hasActiveFilters =
    localFilters.vegan ||
    localFilters.vegetarian ||
    localFilters.glutenFree ||
    localFilters.excludeAllergens.length > 0

  return (
    <div className="space-y-4">
      {/* Dietary Preferences */}
      <div>
        <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">
          Dietary Preferences
        </h3>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.label}
              emoji={tag.emoji}
              selected={
                tag.id === 'vegan'
                  ? localFilters.vegan
                  : tag.id === 'vegetarian'
                    ? localFilters.vegetarian
                    : localFilters.glutenFree
              }
              onToggle={() => toggleDietaryTag(tag.id)}
              variant="include"
            />
          ))}
        </div>
      </div>

      {/* Allergen Exclusions */}
      <div>
        <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">
          Exclude Allergens
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((allergen) => (
            <FilterChip
              key={allergen.id}
              label={allergen.label}
              emoji={allergen.emoji}
              selected={localFilters.excludeAllergens.includes(allergen.id)}
              onToggle={() => toggleAllergen(allergen.id)}
              variant="exclude"
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <GlassButton
          variant="ghost"
          className="flex-1"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Clear All
        </GlassButton>
        <GlassButton
          variant="primary"
          className="flex-1"
          onClick={applyFilters}
        >
          Apply Filters
        </GlassButton>
      </div>
    </div>
  )
}

interface FilterModalProps {
  isOpen: boolean
  filters: DietaryFilters
  onChange: (filters: DietaryFilters) => void
  onClose: () => void
}

export function FilterModal({
  isOpen,
  filters,
  onChange,
  onClose,
}: FilterModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 top-auto z-50 max-w-lg mx-auto">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Filter Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>

          <DietaryFilterPanel
            filters={filters}
            onChange={onChange}
            onClose={onClose}
          />
        </GlassCard>
      </div>
    </>
  )
}

interface QuickFilterBarProps {
  filters: DietaryFilters
  onChange: (filters: DietaryFilters) => void
}

export function QuickFilterBar({ filters, onChange }: QuickFilterBarProps) {
  const toggleDietaryTag = (tag: DietaryTag) => {
    const newFilters = { ...filters }
    if (tag === 'vegan') {
      newFilters.vegan = !newFilters.vegan
      if (newFilters.vegan) newFilters.vegetarian = true
    } else if (tag === 'vegetarian') {
      newFilters.vegetarian = !newFilters.vegetarian
      if (!newFilters.vegetarian) newFilters.vegan = false
    } else if (tag === 'gluten-free') {
      newFilters.glutenFree = !newFilters.glutenFree
    }
    onChange(newFilters)
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {DIETARY_TAGS.map((tag) => (
        <FilterChip
          key={tag.id}
          label={tag.label}
          emoji={tag.emoji}
          selected={
            tag.id === 'vegan'
              ? filters.vegan
              : tag.id === 'vegetarian'
                ? filters.vegetarian
                : filters.glutenFree
          }
          onToggle={() => toggleDietaryTag(tag.id)}
          variant="include"
        />
      ))}
    </div>
  )
}

export default DietaryFilterPanel
