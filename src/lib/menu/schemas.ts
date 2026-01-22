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

// Meal hours by location and day type
export type MealHours = {
  start: string // e.g., "7:30 AM"
  end: string // e.g., "10:30 AM"
} | null // null means closed

export type DayType = 'weekday' | 'weekend'

// Get day of week in LA timezone from a date string (YYYY-MM-DD) or Date object
function getDayOfWeekLA(date: Date | string): number {
  if (typeof date === 'string') {
    // Parse as LA timezone by creating a date at noon LA time
    const laDate = new Date(
      new Date(date + 'T12:00:00').toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
      }),
    )
    return laDate.getDay()
  }
  // For Date objects, get the day in LA timezone
  const laDateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'America/Los_Angeles',
  })
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return dayMap[laDateStr] ?? date.getDay()
}

function getDayType(date: Date | string): DayType {
  const dayOfWeek = getDayOfWeekLA(date)
  return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday'
}

export const MEAL_HOURS: Record<
  string, // locationId
  Record<DayType, Record<Meal, MealHours>>
> = {
  // Glasgow (id: '03')
  '03': {
    weekday: {
      breakfast: { start: '7:30 AM', end: '10:30 AM' },
      lunch: { start: '10:30 AM', end: '2:30 PM' },
      dinner: { start: '5:00 PM', end: '9:00 PM' },
      brunch: null,
    },
    weekend: {
      breakfast: null,
      lunch: null,
      dinner: { start: '5:00 PM', end: '9:00 PM' },
      brunch: { start: '10:00 AM', end: '2:30 PM' },
    },
  },
  // Lothian (id: '02')
  '02': {
    weekday: {
      breakfast: null,
      lunch: { start: '11:00 AM', end: '2:30 PM' },
      dinner: { start: '5:00 PM', end: '10:00 PM' },
      brunch: null,
    },
    weekend: {
      breakfast: null,
      lunch: null,
      dinner: null,
      brunch: null,
    },
  },
}

export function getMealHours(
  locationId: string,
  meal: Meal,
  date: Date | string,
): MealHours {
  const dayType = getDayType(date)
  return MEAL_HOURS[locationId]?.[dayType]?.[meal] ?? null
}

export function formatMealHours(hours: MealHours): string {
  if (!hours) return 'Closed'
  return `${hours.start} - ${hours.end}`
}

// Parse time string like "7:30 AM" to minutes since midnight
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return 0
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

// Order of meals throughout the day
const MEAL_ORDER: Meal[] = ['breakfast', 'brunch', 'lunch', 'dinner']

export type MealStatus = 'open' | 'upcoming' | 'closed'

// Get current time as minutes since midnight in LA timezone
function getCurrentMinutesLA(): number {
  const now = new Date()
  const laTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
  const [hours, minutes] = laTimeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export function getMealStatus(
  locationId: string,
  meal: Meal,
  date: Date | string,
): MealStatus {
  const hours = getMealHours(locationId, meal, date)
  if (!hours) return 'closed'

  const currentMinutes = getCurrentMinutesLA()
  const startMinutes = parseTimeToMinutes(hours.start)
  const endMinutes = parseTimeToMinutes(hours.end)

  if (currentMinutes < startMinutes) return 'upcoming'
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes)
    return 'open'
  return 'closed'
}

export function getCurrentOrNextMeal(
  locationId: string,
  date: Date | string,
): Meal {
  // First, check if any meal is currently open
  for (const meal of MEAL_ORDER) {
    const status = getMealStatus(locationId, meal, date)
    if (status === 'open') return meal
  }

  // If no meal is open, find the next upcoming meal
  for (const meal of MEAL_ORDER) {
    const status = getMealStatus(locationId, meal, date)
    if (status === 'upcoming') return meal
  }

  // If all meals are closed (past dinner), return the last available meal
  // or fall back to dinner
  for (let i = MEAL_ORDER.length - 1; i >= 0; i--) {
    const meal = MEAL_ORDER[i]
    const hours = getMealHours(locationId, meal, date)
    if (hours) return meal
  }

  return 'dinner'
}

export function getAvailableMeals(locationId: string, date: Date): Meal[] {
  return MEAL_ORDER.filter(
    (meal) => getMealHours(locationId, meal, date) !== null,
  )
}

// Check if a location is completely closed for the day
export function isLocationClosedForDay(
  locationId: string,
  date: Date,
): boolean {
  return getAvailableMeals(locationId, date).length === 0
}

// Map display meal to API meal key
// On weekends, "brunch" in the UI maps to "lunch" data from the API
export function getApiMealKey(meal: Meal, date: Date | string): Meal {
  const dayType = getDayType(date)
  const isWeekend = dayType === 'weekend'

  if (meal === 'brunch' && isWeekend) {
    return 'lunch' // API returns lunch data for weekend brunch
  }
  return meal
}

// Check if a display meal has data available (considering brunch/lunch mapping)
export function hasMealData(
  meal: Meal,
  meals: Record<string, unknown[] | undefined>,
  date: Date,
): boolean {
  const apiKey = getApiMealKey(meal, date)
  return (meals[apiKey]?.length || 0) > 0
}

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

// Recursive ingredient structure for nested lists
export interface Ingredient {
  name: string
  isNote?: boolean // For items like "*Organic"
  children?: Ingredient[]
}

export const IngredientSchema: z.ZodType<Ingredient> = z.lazy(() =>
  z.object({
    name: z.string(),
    isNote: z.boolean().optional(),
    children: z.array(IngredientSchema).optional(),
  }),
)

export const FoodDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  dietaryTags: z.array(DietaryTagSchema),
  allergens: z.array(AllergenSchema),
  nutrition: NutritionSchema,
  ingredients: z.array(IngredientSchema), // Structured ingredients list
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
