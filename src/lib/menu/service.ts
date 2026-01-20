import {
  parseShortMenu,
  parseLabelPage,
  buildMenuUrl,
  formatDateISO,
} from './scraper'
import type { DayMenu, FoodDetail, Location } from './schemas'
import { LOCATIONS } from './schemas'

const CACHE_TTL_SECONDS = 3600 // 1 hour for menu data

function getMenuCacheKey(locationId: string, date: string): string {
  return `menu:${locationId}:${date}`
}

function getFoodDetailCacheKey(itemId: string): string {
  return `food:${itemId}`
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
        expirationTtl: CACHE_TTL_SECONDS,
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
        expirationTtl: CACHE_TTL_SECONDS * 24, // 24 hours
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
}

export function createMenuService(kv: KVNamespace): MenuService {
  return new MenuService(kv)
}
