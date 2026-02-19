/**
 * Custom worker entry point that wraps TanStack Start's server entry
 * and adds a scheduled (cron) handler for pre-warming menu + spicy caches.
 */
import { createServerEntry } from '@tanstack/react-start/server-entry'
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { createMenuService } from '@/lib/menu/service'
import { LOCATIONS } from '@/lib/menu/schemas'
import { nowInLA, toJSDate } from '@/lib/timezone'
import { formatDateISO } from '@/lib/menu/scraper'

// Re-create the TanStack Start fetch handler
const fetch = createStartHandler(defaultStreamHandler)
const server = createServerEntry({ fetch })

export default {
  fetch: server.fetch,

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log('[cron] Pre-warming menu caches...')

    const service = createMenuService(env.MENU_CACHE, env.AI)
    const today = toJSDate(nowInLA())

    // Fetch menus for all locations for today
    // This populates the menu KV cache and triggers spicy enrichment
    const promises = LOCATIONS.map(async (location) => {
      try {
        const menu = await service.getMenu(location.id, today)
        if (menu) {
          // Trigger spicy enrichment in the background
          ctx.waitUntil(service.enrichMenuWithSpiciness(menu))
          const dateStr = formatDateISO(today)
          console.log(`[cron] Cached menu for ${location.name} on ${dateStr}`)
        }
      } catch (error) {
        console.error(
          `[cron] Failed to cache menu for ${location.name}:`,
          error,
        )
      }
    })

    await Promise.all(promises)
    console.log('[cron] Menu cache pre-warming complete')
  },
}
