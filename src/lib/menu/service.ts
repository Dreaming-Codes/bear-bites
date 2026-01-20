import {
  parseShortMenu,
  parseLabelPage,
  buildMenuUrl,
  formatDateISO,
} from './scraper'
import type { DayMenu, FoodDetail, Location } from './schemas'
import { LOCATIONS } from './schemas'

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

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

    getLocations(): Location[] {
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
  ): Promise<(DayMenu | null)[]> {
    const promises: Promise<DayMenu | null>[] = []

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

    const today = new Date()
    const maxEmptyDays = 3
    const maxSearchDays = 30 // Safety limit

    const forwardDates: Date[] = []
    const backwardDates: Date[] = []

    for (let i = 1; i <= maxSearchDays; i++) {
      const forwardDate = new Date(today)
      forwardDate.setDate(forwardDate.getDate() + i)
      forwardDates.push(forwardDate)

      const backwardDate = new Date(today)
      backwardDate.setDate(backwardDate.getDate() - i)
      backwardDates.push(backwardDate)
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

export function createMenuService(kv: KVNamespace): MenuService {
  return new MenuService(kv)
}
