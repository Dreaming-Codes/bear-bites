import { router } from '../init'
import { menuRouter } from './menu'
import { favoritesRouter } from './favorites'

export const appRouter = router({
  menu: menuRouter,
  favorites: favoritesRouter,
})

export type AppRouter = typeof appRouter
