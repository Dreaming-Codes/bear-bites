import { Link, createFileRoute } from '@tanstack/react-router'
import { Heart, Loader2, MapPin, Trash2 } from 'lucide-react'
import {
  Container,
  GlassButton,
  GlassCard,
  PageWrapper,
} from '@/components/bear-bites'
import { signIn, useSession } from '@/lib/auth-client'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/utils'
import { LOCATIONS } from '@/lib/menu/schemas'

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
  head: () => ({
    meta: [
      {
        title: 'My Favorite Foods - Bear Bites | UCR Dining Menu',
      },
      {
        name: 'description',
        content:
          'Save and track your favorite UCR dining hall foods. Quick access to your preferred meals at Glasgow, Lothian, and all UC Riverside dining locations.',
      },
      {
        property: 'og:title',
        content: 'My Favorite Foods - Bear Bites | UCR Dining Menu',
      },
      {
        property: 'og:description',
        content:
          'Save and track your favorite UCR dining hall foods. Quick access to your preferred meals at Glasgow, Lothian, and all UC Riverside dining locations.',
      },
      {
        property: 'og:url',
        content: 'https://bearbites.dreaming.codes/favorites',
      },
    ],
  }),
})

function FavoritesPage() {
  const { data: session, isPending: sessionPending } = useSession()
  const {
    favorites,
    removeFavorite,
    isLoading: favoritesLoading,
    isSyncing,
  } = useFavorites()

  const isLoading = sessionPending || favoritesLoading

  const favoritesByLocation = favorites.reduce(
    (acc, fav) => {
      const locationId = fav.locationId
      if (!acc[locationId]) {
        acc[locationId] = []
      }
      acc[locationId].push(fav)
      return acc
    },
    {} as Record<string, typeof favorites>,
  )

  const getLocationName = (locationId: string) => {
    const location = LOCATIONS.find((l) => l.id === locationId)
    return location?.name || 'Unknown Location'
  }

  return (
    <PageWrapper>
      <Container className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Favorites</h1>
          {isSyncing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Syncing...
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Heart size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-4">
              Tap the heart icon on any menu item to add it to your favorites
            </p>
            <Link to="/">
              <GlassButton variant="primary">Browse Menu</GlassButton>
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* Sync prompt for logged out users with local favorites */}
            {!session?.user && favorites.length > 0 && (
              <GlassCard className="bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <Heart
                    size={20}
                    className="text-primary mt-0.5 shrink-0"
                    fill="currentColor"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">
                      Sync your favorites across devices
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign in to save your {favorites.length} favorite
                      {favorites.length !== 1 ? 's' : ''} to the cloud
                    </p>
                    <button
                      onClick={() => signIn.social({ provider: 'google' })}
                      className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Sign in with Google
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Favorites grouped by location */}
            {Object.entries(favoritesByLocation).map(([locationId, items]) => (
              <div key={locationId}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <MapPin size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {getLocationName(locationId)}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({items.length})
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((fav) => (
                    <FavoriteCard
                      key={fav.id}
                      favorite={fav}
                      onRemove={() => removeFavorite(fav.foodId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </PageWrapper>
  )
}

interface FavoriteCardProps {
  favorite: {
    id: string
    foodId: string
    foodName: string
    locationId: string
    locationName?: string
    labelUrl?: string
    addedAt: string
  }
  onRemove: () => void
}

function FavoriteCard({ favorite, onRemove }: FavoriteCardProps) {
  const addedDate = new Date(favorite.addedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <GlassCard className="relative">
      <div className="pr-12">
        <h3 className="font-semibold text-foreground line-clamp-2">
          {favorite.foodName}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Added {addedDate}</p>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className={cn(
          'absolute top-4 right-4 p-2 rounded-full transition-all duration-200',
          'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
        )}
        aria-label="Remove from favorites"
      >
        <Trash2 size={18} />
      </button>
    </GlassCard>
  )
}
