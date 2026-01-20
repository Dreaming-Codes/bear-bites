import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Plus } from 'lucide-react'
import {
  PageWrapper,
  Container,
  GlassCard,
  GlassButton,
} from '@/components/bear-bites'
import { useSession, signIn } from '@/lib/auth-client'

export const Route = createFileRoute('/meal-plan')({ component: MealPlanPage })

function MealPlanPage() {
  const { data: session, isPending } = useSession()

  return (
    <PageWrapper>
      <Container className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Meal Plan</h1>
          {session?.user && (
            <GlassButton variant="primary" size="sm">
              <Plus size={16} className="mr-1" />
              New Plan
            </GlassButton>
          )}
        </div>

        {isPending ? (
          <GlassCard className="text-center py-12">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse mx-auto" />
          </GlassCard>
        ) : !session?.user ? (
          <GlassCard className="text-center py-12">
            <Calendar
              size={48}
              className="mx-auto mb-4 text-muted-foreground"
            />
            <h2 className="text-lg font-semibold mb-2">Plan your meals</h2>
            <p className="text-muted-foreground mb-4">
              Sign in to create meal plans and track your nutrition goals
            </p>
            <button
              onClick={() => signIn.social({ provider: 'google' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Sign in with Google
            </button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {/* Placeholder for meal plan summary */}
            <GlassCard>
              <h2 className="font-semibold mb-2">Today's Summary</h2>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">0g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">0g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">0g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="text-center py-8">
              <Calendar
                size={32}
                className="mx-auto mb-3 text-muted-foreground"
              />
              <p className="text-muted-foreground">
                No meals planned for today. Browse the menu to add items.
              </p>
            </GlassCard>
          </div>
        )}
      </Container>
    </PageWrapper>
  )
}
