import { nowInLA, toJSDate } from '../timezone'
import {
  buildLabelUrl,
  buildMenuUrl,
  formatDateISO,
  parseLabelPage,
  parseShortMenu,
} from './scraper'
import { LOCATIONS } from './schemas'
import type { DayMenu, FoodDetail, Location, MenuItem } from './schemas'
import { classifySpicy, flattenIngredients, getCachedSpicy } from './spicy'

const MENU_CACHE_TTL_SECONDS = 60 * 60 * 24 // 1 day for menu data
const FOOD_LABEL_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7 // 1 week for food labels

function getMenuCacheKey(locationId: string, date: string): string {
  return `menu:${locationId}:${date}`
}

function getFoodDetailCacheKey(itemId: string): string {
  return `food:${itemId}`
}

function getDateBoundsCacheKey(locationId: string): string {
  return `datebounds:${locationId}`
}

export class MenuService {
  private kv: KVNamespace
  private ai: Ai

  constructor(kv: KVNamespace, ai: Ai) {
    this.kv = kv
    this.ai = ai
  }

  getLocations(): Array<Location> {
    return LOCATIONS
  }

  getLocation(locationId: string): Location | undefined {
    return LOCATIONS.find((loc) => loc.id === locationId)
  }

  async getMenu(locationId: string, date: Date): Promise<DayMenu | null> {
    const location = this.getLocation(locationId)
    if (!location) {
      return null
    }

    const dateStr = formatDateISO(date)
    const cacheKey = getMenuCacheKey(locationId, dateStr)

    const cached = await this.kv.get<DayMenu>(cacheKey, 'json')
    if (cached) {
      return cached
    }

    try {
      const url = buildMenuUrl(locationId, location.name, date)
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`Failed to fetch menu: ${response.status}`)
        return null
      }

      const html = await response.text()
      const menu = parseShortMenu(html, locationId, location.name, dateStr)

      await this.kv.put(cacheKey, JSON.stringify(menu), {
        expirationTtl: MENU_CACHE_TTL_SECONDS,
      })

      return menu
    } catch (error) {
      console.error('Error fetching menu:', error)
      return null
    }
  }

  async getFoodDetail(
    itemId: string,
    labelUrl: string,
  ): Promise<FoodDetail | null> {
    const cacheKey = getFoodDetailCacheKey(itemId)

    const cached = await this.kv.get<FoodDetail>(cacheKey, 'json')
    if (cached) {
      return cached
    }

    try {
      const response = await fetch(labelUrl)

      if (!response.ok) {
        console.error(`Failed to fetch food detail: ${response.status}`)
        return null
      }

      const html = await response.text()
      const detail = parseLabelPage(html, itemId)

      await this.kv.put(cacheKey, JSON.stringify(detail), {
        expirationTtl: FOOD_LABEL_CACHE_TTL_SECONDS,
      })

      return detail
    } catch (error) {
      console.error('Error fetching food detail:', error)
      return null
    }
  }

  async getMenusForDateRange(
    locationId: string,
    startDate: Date,
    days: number,
  ): Promise<Array<DayMenu | null>> {
    const promises: Array<Promise<DayMenu | null>> = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      promises.push(this.getMenu(locationId, date))
    }

    return Promise.all(promises)
  }

  private menuHasItems(menu: DayMenu | null): boolean {
    if (!menu?.meals) return false
    return Object.values(menu.meals).some((items) => items && items.length > 0)
  }

  /**
   * Collect all menu items from a DayMenu across all meals.
   */
  private getAllMenuItems(menu: DayMenu): Array<MenuItem> {
    const items: Array<MenuItem> = []
    for (const mealItems of Object.values(menu.meals)) {
      if (mealItems) {
        items.push(...mealItems)
      }
    }
    return items
  }

  /**
   * Check if any item in the menu still needs spicy classification.
   */
  private menuNeedsSpicyEnrichment(menu: DayMenu): boolean {
    const items = this.getAllMenuItems(menu)
    return items.some(
      (item) => item.isSpicy === null || item.isSpicy === undefined,
    )
  }

  /**
   * Enrich a menu with AI-powered spicy classification.
   * Runs in the background via ctx.waitUntil().
   *
   * For each item missing spicy data:
   * 1. Check the permanent spicy KV cache (spicy:{itemId})
   * 2. If not cached, fetch the label page to get ingredients (reuses food detail KV cache)
   * 3. Call Workers AI to classify spiciness
   * 4. Update the menu cache with enriched data
   */
  async enrichMenuWithSpiciness(menu: DayMenu): Promise<void> {
    if (!this.menuNeedsSpicyEnrichment(menu)) return

    const location = this.getLocation(menu.locationId)
    if (!location) return

    const items = this.getAllMenuItems(menu)
    let enriched = false

    // First pass: check the permanent spicy cache for all items
    // This is cheap (just KV reads) and can resolve many items without AI
    const spicyCacheResults = await Promise.all(
      items
        .filter((item) => item.isSpicy === null || item.isSpicy === undefined)
        .map(async (item) => {
          const cached = await getCachedSpicy(item.id, this.kv)
          if (cached !== null) {
            item.isSpicy = cached
            enriched = true
          }
          return { item, needsAI: cached === null }
        }),
    )

    // Second pass: for items not in cache, fetch ingredients + classify
    const needsAI = spicyCacheResults.filter((r) => r.needsAI)

    if (needsAI.length > 0) {
      // Process in batches of 5 to avoid overwhelming FoodPro and AI
      const BATCH_SIZE = 5
      for (let i = 0; i < needsAI.length; i += BATCH_SIZE) {
        const batch = needsAI.slice(i, i + BATCH_SIZE)

        await Promise.all(
          batch.map(async ({ item }) => {
            try {
              // Build the label URL using the date from the menu
              const date = new Date(menu.date + 'T12:00:00')
              const labelUrl = buildLabelUrl(
                item.id,
                menu.locationId,
                location.name,
                date,
              )

              // Fetch food detail (reuses KV cache)
              const detail = await this.getFoodDetail(item.id, labelUrl)
              if (!detail || detail.ingredients.length === 0) {
                // No ingredients available — can't classify, default to not spicy
                item.isSpicy = false
                enriched = true
                return
              }

              const ingredientsText = flattenIngredients(detail.ingredients)
              const isSpicy = await classifySpicy(
                item.id,
                item.name,
                ingredientsText,
                this.kv,
                this.ai,
              )

              item.isSpicy = isSpicy
              enriched = true
            } catch (error) {
              console.error(
                `Failed to enrich spiciness for ${item.name}:`,
                error,
              )
              // Leave as null — will be retried on next request
            }
          }),
        )
      }
    }

    // If any items were enriched, update the menu cache
    if (enriched) {
      const cacheKey = getMenuCacheKey(menu.locationId, menu.date)
      await this.kv.put(cacheKey, JSON.stringify(menu), {
        expirationTtl: MENU_CACHE_TTL_SECONDS,
      })
    }
  }

  async getDateBounds(
    locationId: string,
  ): Promise<{ minDate: string; maxDate: string }> {
    const cacheKey = getDateBoundsCacheKey(locationId)

    const cached = await this.kv.get<{ minDate: string; maxDate: string }>(
      cacheKey,
      'json',
    )
    if (cached) {
      return cached
    }

    const todayDT = nowInLA()
    const today = toJSDate(todayDT)
    const maxEmptyDays = 3
    const maxSearchDays = 30 // Safety limit

    const forwardDates: Array<Date> = []
    const backwardDates: Array<Date> = []

    for (let i = 1; i <= maxSearchDays; i++) {
      forwardDates.push(toJSDate(todayDT.plus({ days: i })))
      backwardDates.push(toJSDate(todayDT.minus({ days: i })))
    }

    const [forwardMenus, backwardMenus] = await Promise.all([
      Promise.all(forwardDates.map((d) => this.getMenu(locationId, d))),
      Promise.all(backwardDates.map((d) => this.getMenu(locationId, d))),
    ])

    let maxDate = today
    let emptyStreak = 0
    for (
      let i = 0;
      i < forwardMenus.length && emptyStreak < maxEmptyDays;
      i++
    ) {
      if (this.menuHasItems(forwardMenus[i])) {
        maxDate = forwardDates[i]
        emptyStreak = 0
      } else {
        emptyStreak++
      }
    }

    let minDate = today
    emptyStreak = 0
    for (
      let i = 0;
      i < backwardMenus.length && emptyStreak < maxEmptyDays;
      i++
    ) {
      if (this.menuHasItems(backwardMenus[i])) {
        minDate = backwardDates[i]
        emptyStreak = 0
      } else {
        emptyStreak++
      }
    }

    const result = {
      minDate: formatDateISO(minDate),
      maxDate: formatDateISO(maxDate),
    }

    await this.kv.put(cacheKey, JSON.stringify(result), {
      expirationTtl: MENU_CACHE_TTL_SECONDS,
    })

    return result
  }
}

export function createMenuService(kv: KVNamespace, ai: Ai): MenuService {
  return new MenuService(kv, ai)
}
