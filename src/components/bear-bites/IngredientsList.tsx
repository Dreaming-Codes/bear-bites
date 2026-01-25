import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { GlassCard } from './GlassCard'
import type { Ingredient } from '@/lib/menu/schemas'
import { cn } from '@/lib/utils'

interface IngredientsListProps {
  ingredients: Array<Ingredient>
}

/**
 * Check if an ingredient should start collapsed
 * Matches variations like:
 * - "Contains 2% Or Less Of The Following"
 * - "2% or less of:"
 * - "Contains 2% or less of"
 */
function shouldStartCollapsed(name: string): boolean {
  const lowerName = name.toLowerCase()
  return lowerName.includes('2%') && lowerName.includes('less')
}

function IngredientItem({ ingredient }: { ingredient: Ingredient }) {
  const hasChildren = ingredient.children && ingredient.children.length > 0
  const [isOpen, setIsOpen] = useState(
    hasChildren ? !shouldStartCollapsed(ingredient.name) : true,
  )

  if (!hasChildren) {
    return (
      <li className={cn('py-0.5', ingredient.isNote && 'italic')}>
        {ingredient.name}
      </li>
    )
  }

  return (
    <li className="py-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:text-foreground transition-colors w-full text-left"
      >
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150',
            isOpen && 'rotate-90',
          )}
        />
        <span>{ingredient.name}</span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-150',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ul className="pl-5 mt-1 border-l border-muted-foreground/20 ml-1.5">
          {ingredient.children!.map((child, index) => (
            <IngredientItem key={index} ingredient={child} />
          ))}
        </ul>
      </div>
    </li>
  )
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  if (ingredients.length === 0) {
    return null
  }

  return (
    <GlassCard>
      <h2 className="font-semibold mb-3">Ingredients</h2>
      <ul className="text-sm text-muted-foreground">
        {ingredients.map((ingredient, index) => (
          <IngredientItem key={index} ingredient={ingredient} />
        ))}
      </ul>
    </GlassCard>
  )
}
