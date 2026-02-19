import { z } from 'zod'
import { env } from 'cloudflare:workers'
import { FavoriteSchema } from '@/db-collections'
import { publicProcedure, protectedProcedure, router } from '../init'

const D1FavoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  foodId: z.string(),
  foodName: z.string(),
  locationNum: z.string(),
  locationName: z.string().nullable(),
  addedAt: z.string(),
})

type D1Favorite = z.infer<typeof D1FavoriteSchema>

function getDB() {
  return env.DB
}

function generateId(): string {
  return crypto.randomUUID()
}

export const favoritesRouter = router({
  getFavorites: publicProcedure
    .input(z.object({}))
    .output(
      z.array(
        FavoriteSchema.omit({ synced: true, cloudId: true }).extend({
          cloudId: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const userId = ctx.userId
      if (!userId) {
        return []
      }

      const db = getDB()
      const result = await db
        .prepare(
          'SELECT * FROM favorite WHERE userId = ? ORDER BY addedAt DESC',
        )
        .bind(userId)
        .all<D1Favorite>()

      return (result.results || []).map((row) => ({
        id: row.id,
        cloudId: row.id,
        foodId: row.foodId,
        foodName: row.foodName,
        locationId: row.locationNum,
        locationName: row.locationName || '',
        addedAt: row.addedAt,
      }))
    }),

  addFavorite: protectedProcedure
    .input(
      z.object({
        foodId: z.string(),
        foodName: z.string(),
        locationId: z.string(),
        locationName: z.string(),
        labelUrl: z.string().optional(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDB()
      const id = generateId()
      const now = new Date().toISOString()

      await db
        .prepare(
          `INSERT INTO favorite (id, userId, foodId, foodName, locationNum, locationName, addedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(userId, foodId) DO NOTHING`,
        )
        .bind(
          id,
          ctx.userId,
          input.foodId,
          input.foodName,
          input.locationId,
          input.locationName,
          now,
        )
        .run()

      return { id, success: true }
    }),

  removeFavorite: protectedProcedure
    .input(
      z.object({
        foodId: z.string(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDB()
      await db
        .prepare('DELETE FROM favorite WHERE userId = ? AND foodId = ?')
        .bind(ctx.userId, input.foodId)
        .run()

      return { success: true }
    }),

  syncFavorites: protectedProcedure
    .input(
      z.object({
        favorites: z.array(
          z.object({
            localId: z.string(),
            foodId: z.string(),
            foodName: z.string(),
            locationId: z.string(),
            locationName: z.string(),
            addedAt: z.string(),
          }),
        ),
      }),
    )
    .output(
      z.object({
        synced: z.array(
          z.object({
            localId: z.string(),
            cloudId: z.string(),
          }),
        ),
        cloudFavorites: z.array(
          z.object({
            id: z.string(),
            foodId: z.string(),
            foodName: z.string(),
            locationId: z.string(),
            locationName: z.string(),
            addedAt: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDB()
      const synced: Array<{ localId: string; cloudId: string }> = []

      for (const fav of input.favorites) {
        const id = generateId()

        try {
          await db
            .prepare(
              `INSERT INTO favorite (id, userId, foodId, foodName, locationNum, locationName, addedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(userId, foodId) DO UPDATE SET
                 foodName = excluded.foodName,
                 locationName = excluded.locationName`,
            )
            .bind(
              id,
              ctx.userId,
              fav.foodId,
              fav.foodName,
              fav.locationId,
              fav.locationName,
              fav.addedAt,
            )
            .run()

          synced.push({ localId: fav.localId, cloudId: id })
        } catch (e) {
          const existing = await db
            .prepare('SELECT id FROM favorite WHERE userId = ? AND foodId = ?')
            .bind(ctx.userId, fav.foodId)
            .first<{ id: string }>()

          if (existing) {
            synced.push({ localId: fav.localId, cloudId: existing.id })
          }
        }
      }

      const result = await db
        .prepare(
          'SELECT * FROM favorite WHERE userId = ? ORDER BY addedAt DESC',
        )
        .bind(ctx.userId)
        .all<D1Favorite>()

      const cloudFavorites = (result.results || []).map((row) => ({
        id: row.id,
        foodId: row.foodId,
        foodName: row.foodName,
        locationId: row.locationNum,
        locationName: row.locationName || '',
        addedAt: row.addedAt,
      }))

      return { synced, cloudFavorites }
    }),

  isFavorite: publicProcedure
    .input(z.object({ foodId: z.string() }))
    .output(z.object({ isFavorite: z.boolean() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId
      if (!userId) {
        return { isFavorite: false }
      }

      const db = getDB()
      const result = await db
        .prepare('SELECT id FROM favorite WHERE userId = ? AND foodId = ?')
        .bind(userId, input.foodId)
        .first()

      return { isFavorite: !!result }
    }),
})
