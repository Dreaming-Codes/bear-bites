import { useCallback, useEffect, useMemo } from 'react'
import { useSession } from '@/lib/auth-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { favoritesCollection, type Favorite } from '@/db-collections'
import { orpc } from '@/orpc/client'

// Track if we've synced for this session (module-level to persist across hook instances)
let hasInitialSynced = false

export function useFavorites() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const isAuthenticated = !!session?.user

  useEffect(() => {
    if (!isAuthenticated) {
      hasInitialSynced = false
    }
  }, [isAuthenticated])

  // Local favorites from TanStack DB using useLiveQuery
  const { data: localFavorites = [] } = useLiveQuery(
    (q) =>
      q.from({ fav: favoritesCollection }).select(({ fav }) => ({
        ...fav,
      })),
    [],
  )

  const cloudFavoritesQuery = useQuery({
    ...orpc.favorites.getFavorites.queryOptions({ input: {} }),
    enabled: isAuthenticated,
  })

  const syncMutation = useMutation({
    ...orpc.favorites.syncFavorites.mutationOptions(),
    onSuccess: (data) => {
      data.synced.forEach(({ localId, cloudId }) => {
        const local = localFavorites.find((f: Favorite) => f.id === localId)
        if (local) {
          favoritesCollection.update(localId, (draft) => {
            draft.synced = true
            draft.cloudId = cloudId
          })
        }
      })

      data.cloudFavorites.forEach((cloudFav) => {
        const exists = localFavorites.some(
          (f: Favorite) => f.foodId === cloudFav.foodId,
        )
        if (!exists) {
          favoritesCollection.insert({
            id: crypto.randomUUID(),
            foodId: cloudFav.foodId,
            foodName: cloudFav.foodName,
            locationId: cloudFav.locationId,
            locationName: cloudFav.locationName,
            addedAt: cloudFav.addedAt,
            synced: true,
            cloudId: cloudFav.id,
          })
        }
      })

      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: (error) => {
      console.error('Failed to sync favorites:', error)
    },
  })

  const addCloudMutation = useMutation({
    ...orpc.favorites.addFavorite.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const removeCloudMutation = useMutation({
    ...orpc.favorites.removeFavorite.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  useEffect(() => {
    if (!isAuthenticated) return
    if (hasInitialSynced) return

    hasInitialSynced = true

    const unsyncedFavorites = localFavorites.filter((f: Favorite) => !f.synced)

    // Call sync - it will push unsynced AND pull cloud-only favorites
    syncMutation.mutate({
      favorites: unsyncedFavorites.map((f: Favorite) => ({
        localId: f.id,
        foodId: f.foodId,
        foodName: f.foodName,
        locationId: f.locationId,
        locationName: f.locationName,
        addedAt: f.addedAt,
      })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const favoriteIds = useMemo(() => {
    const ids = new Set<string>()
    localFavorites.forEach((f: Favorite) => {
      ids.add(f.foodId)
    })
    return ids
  }, [localFavorites])

  const isFavorite = useCallback(
    (foodId: string) => favoriteIds.has(foodId),
    [favoriteIds],
  )

  const addFavorite = useCallback(
    async (item: {
      foodId: string
      foodName: string
      locationId: string
      locationName: string
      labelUrl?: string
    }) => {
      const localId = crypto.randomUUID()
      const now = new Date().toISOString()

      favoritesCollection.insert({
        id: localId,
        foodId: item.foodId,
        foodName: item.foodName,
        locationId: item.locationId,
        locationName: item.locationName,
        labelUrl: item.labelUrl,
        addedAt: now,
        synced: false,
      })

      if (isAuthenticated) {
        try {
          const result = await addCloudMutation.mutateAsync({
            foodId: item.foodId,
            foodName: item.foodName,
            locationId: item.locationId,
            locationName: item.locationName,
            labelUrl: item.labelUrl,
          })

          favoritesCollection.update(localId, (draft) => {
            draft.synced = true
            draft.cloudId = result.id
          })
        } catch (error) {
          console.error('Failed to sync favorite to cloud:', error)
        }
      }
    },
    [isAuthenticated, addCloudMutation],
  )

  const removeFavorite = useCallback(
    async (foodId: string) => {
      const localFav = localFavorites.find((f: Favorite) => f.foodId === foodId)
      if (localFav) {
        favoritesCollection.delete(localFav.id)
      }

      if (isAuthenticated) {
        try {
          await removeCloudMutation.mutateAsync({ foodId })
        } catch (error) {
          console.error('Failed to remove favorite from cloud:', error)
        }
      }
    },
    [isAuthenticated, localFavorites, removeCloudMutation],
  )

  const toggleFavorite = useCallback(
    (item: {
      foodId: string
      foodName: string
      locationId: string
      locationName: string
      labelUrl?: string
    }) => {
      if (isFavorite(item.foodId)) {
        removeFavorite(item.foodId)
      } else {
        addFavorite(item)
      }
    },
    [isFavorite, addFavorite, removeFavorite],
  )

  const favorites = useMemo(() => {
    return [...localFavorites].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    )
  }, [localFavorites])

  return {
    favorites,
    favoriteIds,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isLoading: cloudFavoritesQuery.isLoading,
    isSyncing: syncMutation.isPending,
  }
}
