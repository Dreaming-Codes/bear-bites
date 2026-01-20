import { Leaf, Wheat, AlertTriangle } from 'lucide-react'
import type { DietaryTag, Allergen } from '@/lib/menu/schemas'
import { cn } from '@/lib/utils'

interface DietaryBadgeProps {
  tag: DietaryTag
  size?: 'sm' | 'md'
}

const dietaryConfig: Record<
  DietaryTag,
  { label: string; icon: typeof Leaf; className: string }
> = {
  vegan: {
    label: 'Vegan',
    icon: Leaf,
    className: 'badge-vegan',
  },
  vegetarian: {
    label: 'Vegetarian',
    icon: Leaf,
    className: 'badge-vegetarian',
  },
  'gluten-free': {
    label: 'GF',
    icon: Wheat,
    className: 'badge-gluten-free',
  },
}

export function DietaryBadge({ tag, size = 'sm' }: DietaryBadgeProps) {
  const config = dietaryConfig[tag]
  const Icon = config.icon

  return (
    <span
      className={cn(config.className, size === 'md' && 'px-2.5 py-1 text-sm')}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{config.label}</span>
    </span>
  )
}

interface AllergenBadgeProps {
  allergen: Allergen
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const allergenLabels: Record<Allergen, string> = {
  milk: 'Milk',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  'tree-nuts': 'Tree Nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soybeans: 'Soy',
  sesame: 'Sesame',
}

export function AllergenBadge({
  allergen,
  size = 'sm',
  showLabel = true,
}: AllergenBadgeProps) {
  return (
    <span
      className={cn('badge-allergen', size === 'md' && 'px-2.5 py-1 text-sm')}
    >
      <AlertTriangle size={size === 'sm' ? 12 : 14} />
      {showLabel && <span>{allergenLabels[allergen]}</span>}
    </span>
  )
}

interface DietaryTagsProps {
  tags: DietaryTag[]
  size?: 'sm' | 'md'
  className?: string
}

export function DietaryTags({
  tags,
  size = 'sm',
  className,
}: DietaryTagsProps) {
  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <DietaryBadge key={tag} tag={tag} size={size} />
      ))}
    </div>
  )
}

interface AllergenListProps {
  allergens: Allergen[]
  size?: 'sm' | 'md'
  showLabels?: boolean
  className?: string
  maxVisible?: number
}

export function AllergenList({
  allergens,
  size = 'sm',
  showLabels = true,
  className,
  maxVisible,
}: AllergenListProps) {
  if (allergens.length === 0) return null

  const visibleAllergens = maxVisible
    ? allergens.slice(0, maxVisible)
    : allergens
  const hiddenCount = maxVisible
    ? Math.max(0, allergens.length - maxVisible)
    : 0

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleAllergens.map((allergen) => (
        <AllergenBadge
          key={allergen}
          allergen={allergen}
          size={size}
          showLabel={showLabels}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="badge-allergen">+{hiddenCount}</span>
      )}
    </div>
  )
}

export default DietaryBadge
