import { os } from '@orpc/server'
import { z } from 'zod'
import { env } from 'cloudflare:workers'
import {
  createMenuService,
  LocationSchema,
  MenuItemSchema,
  DayMenuSchema,
  FoodDetailSchema,
  MealSchema,
} from '@/lib/menu'

function getMenuService() {
  return createMenuService((env as Cloudflare.Env).MENU_CACHE)
}

export const getLocations = os
  .input(z.object({}))
  .output(z.array(LocationSchema))
  .handler(() => {
    return getMenuService().getLocations()
  })

export const getMenu = os
  .input(
    z.object({
      locationId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    }),
  )
  .output(DayMenuSchema.nullable())
  .handler(async ({ input }) => {
    const date = new Date(input.date + 'T00:00:00')
    return getMenuService().getMenu(input.locationId, date)
  })

export const getMenusForWeek = os
  .input(
    z.object({
      locationId: z.string(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      days: z.number().min(1).max(14).default(7),
    }),
  )
  .output(z.array(DayMenuSchema.nullable()))
  .handler(async ({ input }) => {
    const startDate = new Date(input.startDate + 'T00:00:00')
    return getMenuService().getMenusForDateRange(
      input.locationId,
      startDate,
      input.days,
    )
  })

export const getFoodDetail = os
  .input(
    z.object({
      itemId: z.string(),
      labelUrl: z.string().url(),
    }),
  )
  .output(FoodDetailSchema.nullable())
  .handler(async ({ input }) => {
    return getMenuService().getFoodDetail(input.itemId, input.labelUrl)
  })

export const searchMenuItems = os
  .input(
    z.object({
      locationId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      query: z.string().min(1),
    }),
  )
  .output(
    z.array(
      MenuItemSchema.extend({
        meal: MealSchema,
      }),
    ),
  )
  .handler(async ({ input }) => {
    const date = new Date(input.date + 'T00:00:00')
    const menu = await getMenuService().getMenu(input.locationId, date)

    if (!menu) {
      return []
    }

    const query = input.query.toLowerCase()
    const results: (z.infer<typeof MenuItemSchema> & {
      meal: z.infer<typeof MealSchema>
    })[] = []

    for (const [mealName, items] of Object.entries(menu.meals)) {
      for (const item of items) {
        if (item.name.toLowerCase().includes(query)) {
          results.push({
            ...item,
            meal: mealName as z.infer<typeof MealSchema>,
          })
        }
      }
    }

    return results
  })

export const getFilteredMenu = os
  .input(
    z.object({
      locationId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      filters: z.object({
        vegan: z.boolean().optional(),
        vegetarian: z.boolean().optional(),
        glutenFree: z.boolean().optional(),
        excludeAllergens: z.array(z.string()).optional(),
      }),
    }),
  )
  .output(DayMenuSchema.nullable())
  .handler(async ({ input }) => {
    const date = new Date(input.date + 'T00:00:00')
    const menu = await getMenuService().getMenu(input.locationId, date)

    if (!menu) {
      return null
    }

    const { filters } = input
    const filteredMeals: typeof menu.meals = {} as typeof menu.meals

    for (const [mealName, items] of Object.entries(menu.meals)) {
      const filteredItems = items.filter((item) => {
        if (filters.vegan && !item.dietaryTags.includes('vegan')) {
          return false
        }
        if (filters.vegetarian && !item.dietaryTags.includes('vegetarian')) {
          return false
        }
        if (filters.glutenFree && !item.dietaryTags.includes('gluten-free')) {
          return false
        }

        if (filters.excludeAllergens && filters.excludeAllergens.length > 0) {
          for (const allergen of filters.excludeAllergens) {
            if (item.allergens.includes(allergen as any)) {
              return false
            }
          }
        }

        return true
      })

      if (filteredItems.length > 0) {
        ;(filteredMeals as any)[mealName] = filteredItems
      }
    }

    return {
      ...menu,
      meals: filteredMeals,
    }
  })
