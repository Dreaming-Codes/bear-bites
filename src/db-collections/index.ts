import {
  createCollection,
  localStorageCollectionOptions,
} from '@tanstack/react-db'
import { z } from 'zod'

// ============================================
// ============================================

export const FavoriteSchema = z.object({
  id: z.string(), // local UUID, will be replaced on sync
  foodId: z.string(), // RecNumAndPort from FoodPro
  foodName: z.string(),
  locationId: z.string(), // locationNum
  locationName: z.string(),
  labelUrl: z.string().optional(), // for fetching nutrition later
  addedAt: z.string(), // ISO timestamp
  synced: z.boolean().default(false), // whether it's synced to cloud
  cloudId: z.string().optional(), // ID from D1 after sync
})

export type Favorite = z.infer<typeof FavoriteSchema>

export const favoritesCollection = createCollection(
  localStorageCollectionOptions({
    storageKey: 'bear-bites-favorites',
    getKey: (favorite) => favorite.id,
    schema: FavoriteSchema,
  }),
)
