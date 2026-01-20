import { z } from 'zod'

export const DietaryTagSchema = z.enum(['vegan', 'vegetarian', 'gluten-free'])

export const AllergenSchema = z.enum([
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree-nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
])

export const LocationSchema = z.object({
  id: z.string(), // locationNum from FoodPro
  name: z.string(), // locationName from FoodPro
})

export const LOCATIONS: z.infer<typeof LocationSchema>[] = [
  { id: '02', name: 'Lothian' },
  { id: '03', name: 'Glasgow' },
]

export const MealSchema = z.enum(['breakfast', 'lunch', 'dinner', 'brunch'])

export const MenuItemSchema = z.object({
  id: z.string(), // RecNumAndPort from label URL
  name: z.string(),
  station: z.string(), // e.g., "Salad, Deli and More", "Wok Kitchen"
  dietaryTags: z.array(DietaryTagSchema),
  allergens: z.array(AllergenSchema),
  labelUrl: z.string().url(),
})

export const NutritionSchema = z.object({
  servingSize: z.string(),
  calories: z.number(),
  totalFat: z.object({
    grams: z.number(),
    dailyValue: z.number(),
  }),
  saturatedFat: z.object({
    grams: z.number(),
    dailyValue: z.number(),
  }),
  transFat: z.number(),
  cholesterol: z.object({
    mg: z.number(),
    dailyValue: z.number(),
  }),
  sodium: z.object({
    mg: z.number(),
    dailyValue: z.number(),
  }),
  totalCarbs: z.object({
    grams: z.number(),
    dailyValue: z.number(),
  }),
  fiber: z.object({
    grams: z.number(),
    dailyValue: z.number(),
  }),
  totalSugars: z.number(),
  addedSugars: z.object({
    grams: z.number(),
    dailyValue: z.number(),
  }),
  protein: z.number(),
  vitaminD: z.object({
    mcg: z.number(),
    dailyValue: z.number(),
  }),
  calcium: z.object({
    mg: z.number(),
    dailyValue: z.number(),
  }),
  iron: z.object({
    mg: z.number(),
    dailyValue: z.number(),
  }),
  potassium: z.object({
    mg: z.number(),
    dailyValue: z.number(),
  }),
})

export const FoodDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  dietaryTags: z.array(DietaryTagSchema),
  allergens: z.array(AllergenSchema),
  nutrition: NutritionSchema,
  ingredients: z.string(), // Raw ingredients text
})

export const DayMenuSchema = z.object({
  locationId: z.string(),
  locationName: z.string(),
  date: z.string(), // ISO date string YYYY-MM-DD
  meals: z.object({
    breakfast: z.array(MenuItemSchema).optional(),
    lunch: z.array(MenuItemSchema).optional(),
    dinner: z.array(MenuItemSchema).optional(),
    brunch: z.array(MenuItemSchema).optional(),
  }),
})

export type DietaryTag = z.infer<typeof DietaryTagSchema>
export type Allergen = z.infer<typeof AllergenSchema>
export type Location = z.infer<typeof LocationSchema>
export type Meal = z.infer<typeof MealSchema>
export type MenuItem = z.infer<typeof MenuItemSchema>
export type Nutrition = z.infer<typeof NutritionSchema>
export type FoodDetail = z.infer<typeof FoodDetailSchema>
export type DayMenu = z.infer<typeof DayMenuSchema>
