import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ArrowLeft, Heart, Loader2 } from 'lucide-react'
import type { Nutrition } from '@/lib/menu/schemas'
import { orpc } from '@/orpc/client'
import {
  Container,
  GlassButton,
  GlassCard,
  IngredientsList,
  PageWrapper,
} from '@/components/bear-bites'
import {
  AllergenList,
  DietaryTags,
} from '@/components/bear-bites/DietaryBadges'
import { cn } from '@/lib/utils'
import { useFavorites } from '@/hooks/useFavorites'
import { LOCATIONS } from '@/lib/menu/schemas'

const searchSchema = z.object({
  date: z.string(),
  locationId: z.string(),
})

export const Route = createFileRoute('/food/$itemId')({
  component: FoodDetailPage,
  validateSearch: searchSchema,
  head: ({ params }) => {
    const itemName = decodeURIComponent(params.itemId).replace(/-/g, ' ')
    return {
      meta: [
        {
          title: `${itemName} - Nutrition Info | Bear Bites UCR Dining Menu`,
        },
        {
          name: 'description',
          content: `View nutrition facts, calories, allergens, and ingredients for ${itemName} at UC Riverside dining halls. Part of the Bear Bites UCR dining menu app.`,
        },
        {
          property: 'og:title',
          content: `${itemName} - Nutrition Info | Bear Bites UCR Dining Menu`,
        },
        {
          property: 'og:description',
          content: `View nutrition facts, calories, allergens, and ingredients for ${itemName} at UC Riverside dining halls.`,
        },
      ],
    }
  },
})

function NutritionRow({
  label,
  value,
  unit,
  dailyValue,
  indent = false,
  bold = false,
}: {
  label: string
  value: number | string
  unit?: string
  dailyValue?: number
  indent?: boolean
  bold?: boolean
}) {
  return (
    <div
      className={cn(
        'flex justify-between py-1 border-b border-border/50',
        indent && 'pl-4',
        bold && 'font-semibold',
      )}
    >
      <span>
        {label} {value}
        {unit}
      </span>
      {dailyValue !== undefined && (
        <span className="font-semibold">{dailyValue}%</span>
      )}
    </div>
  )
}

function NutritionLabel({ nutrition }: { nutrition: Nutrition }) {
  return (
    <div className="nutrition-label bg-background border-2 border-foreground p-4 rounded-lg">
      <h3 className="text-2xl font-black border-b-8 border-foreground pb-1 mb-1">
        Nutrition Facts
      </h3>
      <p className="text-sm border-b border-foreground pb-2 mb-2">
        Serving size {nutrition.servingSize}
      </p>

      {/* Calories */}
      <div className="flex justify-between items-baseline border-b-4 border-foreground pb-1 mb-2">
        <span className="font-bold text-lg">Calories</span>
        <span className="text-3xl font-black">{nutrition.calories}</span>
      </div>

      {/* Daily Value header */}
      <div className="text-right text-sm font-semibold border-b border-foreground pb-1 mb-1">
        % Daily Value*
      </div>

      {/* Nutrients */}
      <NutritionRow
        label="Total Fat"
        value={nutrition.totalFat.grams}
        unit="g"
        dailyValue={nutrition.totalFat.dailyValue}
        bold
      />
      <NutritionRow
        label="Saturated Fat"
        value={nutrition.saturatedFat.grams}
        unit="g"
        dailyValue={nutrition.saturatedFat.dailyValue}
        indent
      />
      <NutritionRow
        label="Trans Fat"
        value={nutrition.transFat}
        unit="g"
        indent
      />
      <NutritionRow
        label="Cholesterol"
        value={nutrition.cholesterol.mg}
        unit="mg"
        dailyValue={nutrition.cholesterol.dailyValue}
        bold
      />
      <NutritionRow
        label="Sodium"
        value={nutrition.sodium.mg}
        unit="mg"
        dailyValue={nutrition.sodium.dailyValue}
        bold
      />
      <NutritionRow
        label="Total Carbohydrate"
        value={nutrition.totalCarbs.grams}
        unit="g"
        dailyValue={nutrition.totalCarbs.dailyValue}
        bold
      />
      <NutritionRow
        label="Dietary Fiber"
        value={nutrition.fiber.grams}
        unit="g"
        dailyValue={nutrition.fiber.dailyValue}
        indent
      />
      <NutritionRow
        label="Total Sugars"
        value={nutrition.totalSugars}
        unit="g"
        indent
      />
      <NutritionRow
        label="Includes Added Sugars"
        value={nutrition.addedSugars.grams}
        unit="g"
        dailyValue={nutrition.addedSugars.dailyValue}
        indent
      />
      <NutritionRow label="Protein" value={nutrition.protein} unit="g" bold />

      {/* Vitamins & Minerals divider */}
      <div className="border-t-8 border-foreground my-2" />

      <NutritionRow
        label="Vitamin D"
        value={nutrition.vitaminD.mcg}
        unit="mcg"
        dailyValue={nutrition.vitaminD.dailyValue}
      />
      <NutritionRow
        label="Calcium"
        value={nutrition.calcium.mg}
        unit="mg"
        dailyValue={nutrition.calcium.dailyValue}
      />
      <NutritionRow
        label="Iron"
        value={nutrition.iron.mg}
        unit="mg"
        dailyValue={nutrition.iron.dailyValue}
      />
      <NutritionRow
        label="Potassium"
        value={nutrition.potassium.mg}
        unit="mg"
        dailyValue={nutrition.potassium.dailyValue}
      />

      {/* Footer */}
      <p className="text-xs mt-3 text-muted-foreground">
        *The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for
        general nutrition advice.
      </p>
    </div>
  )
}

function FoodDetailPage() {
  const { itemId } = Route.useParams()
  const { date, locationId } = Route.useSearch()
  const router = useRouter()
  const { isFavorite, toggleFavorite } = useFavorites()

  const state = router.state.location.state as { foodName?: string } | undefined
  const foodName = state?.foodName

  const decodedItemId = decodeURIComponent(itemId)

  const location = LOCATIONS.find((l) => l.id === locationId) || LOCATIONS[1]

  const foodQuery = useQuery(
    orpc.menu.getFoodDetail.queryOptions({
      input: {
        itemId: decodedItemId,
        locationId,
        date,
      },
    }),
  )

  const food = foodQuery.data
  const displayName = foodName || food?.name || 'Unknown'
  const isItemFavorite = food ? isFavorite(food.id) : false

  const handleToggleFavorite = () => {
    if (!food) return
    toggleFavorite({
      foodId: food.id,
      foodName: displayName,
      locationId: location.id,
      locationName: location.name,
    })
  }

  const handleGoBack = () => {
    router.history.back()
  }

  return (
    <PageWrapper>
      {/* Header with back button */}
      <div className="sticky top-0 z-30 glass border-b border-white/10 safe-top">
        <Container className="py-2 flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          {food && (
            <button
              onClick={handleToggleFavorite}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                isItemFavorite
                  ? 'text-red-500 bg-red-100 dark:bg-red-900/30'
                  : 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
              )}
              aria-label={
                isItemFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <Heart
                size={22}
                fill={isItemFavorite ? 'currentColor' : 'none'}
              />
            </button>
          )}
        </Container>
      </div>

      <Container className="pt-4">
        {foodQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading nutrition info...</p>
          </div>
        ) : foodQuery.isError ? (
          <GlassCard className="text-center py-12">
            <p className="text-destructive mb-2">Failed to load food details</p>
            <p className="text-sm text-muted-foreground mb-4">
              {foodQuery.error?.message || 'Please try again later'}
            </p>
            <GlassButton variant="primary" onClick={() => foodQuery.refetch()}>
              Retry
            </GlassButton>
          </GlassCard>
        ) : !food ? (
          <GlassCard className="text-center py-12">
            <p className="text-lg font-medium mb-2">Food not found</p>
            <p className="text-muted-foreground mb-4">
              This item may no longer be available
            </p>
            <GlassButton variant="primary" onClick={handleGoBack}>
              Go Back
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* Food Name & Tags */}
            <div>
              <h1 className="text-2xl font-bold mb-3">{displayName}</h1>
              <DietaryTags tags={food.dietaryTags} className="mb-2" />
              {food.allergens.length > 0 && (
                <AllergenList allergens={food.allergens} />
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
              <GlassCard className="text-center p-3">
                <p className="text-2xl font-bold text-primary">
                  {food.nutrition.calories}
                </p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </GlassCard>
              <GlassCard className="text-center p-3">
                <p className="text-2xl font-bold text-primary">
                  {food.nutrition.protein}g
                </p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </GlassCard>
              <GlassCard className="text-center p-3">
                <p className="text-2xl font-bold text-primary">
                  {food.nutrition.totalCarbs.grams}g
                </p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </GlassCard>
              <GlassCard className="text-center p-3">
                <p className="text-2xl font-bold text-primary">
                  {food.nutrition.totalFat.grams}g
                </p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </GlassCard>
            </div>

            {/* Full Nutrition Label */}
            <GlassCard>
              <NutritionLabel nutrition={food.nutrition} />
            </GlassCard>

            {/* Ingredients */}
            <IngredientsList ingredients={food.ingredients} />
          </div>
        )}
      </Container>
    </PageWrapper>
  )
}
