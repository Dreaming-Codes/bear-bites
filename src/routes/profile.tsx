import { createFileRoute } from '@tanstack/react-router'
import {
  User,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Download,
  CheckCircle,
} from 'lucide-react'
import { PageWrapper, Container, GlassCard } from '@/components/bear-bites'
import { useSession, signIn, signOut } from '@/lib/auth-client'
import { useTheme } from '@/hooks/useTheme'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/profile')({ component: ProfilePage })

function SettingRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={20} className="text-muted-foreground" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

type ThemeOption = 'light' | 'dark' | 'system'

function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeOption
  onChange: (value: ThemeOption) => void
}) {
  const options: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'Auto' },
  ]

  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title={option.label}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ProfilePage() {
  const { data: session, isPending } = useSession()
  const { theme, setTheme } = useTheme()
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall()

  return (
    <PageWrapper>
      <Container className="pt-4">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>

        {isPending ? (
          <GlassCard className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse mx-auto" />
          </GlassCard>
        ) : !session?.user ? (
          <GlassCard className="text-center py-12">
            <User size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">
              Welcome to Bear Bites
            </h2>
            <p className="text-muted-foreground mb-4">
              Sign in to sync favorites across devices
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
            {/* User Info */}
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold overflow-hidden">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    session.user.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{session.user.name}</h2>
                  <p className="text-muted-foreground">{session.user.email}</p>
                </div>
              </div>
            </GlassCard>

            {/* Settings */}
            <GlassCard>
              <h3 className="font-semibold mb-2">Preferences</h3>
              <SettingRow icon={Moon} label="Theme">
                <ThemeSelector value={theme} onChange={setTheme} />
              </SettingRow>
            </GlassCard>

            {/* Sign Out */}
            <GlassCard>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span className="font-medium">Sign Out</span>
              </button>
            </GlassCard>
          </div>
        )}

        {/* Theme toggle for logged-out users */}
        {!session?.user && !isPending && (
          <GlassCard className="mt-4">
            <SettingRow icon={Moon} label="Theme">
              <ThemeSelector value={theme} onChange={setTheme} />
            </SettingRow>
          </GlassCard>
        )}

        {/* Install App Section */}
        {(isInstallable || isInstalled) && (
          <GlassCard className="mt-4">
            <h3 className="font-semibold mb-3">Install App</h3>
            {isInstalled ? (
              <div className="flex items-center gap-3 text-primary">
                <CheckCircle size={20} />
                <span>Bear Bites is installed!</span>
              </div>
            ) : (
              <button
                onClick={promptInstall}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Download size={18} />
                <span>Install Bear Bites</span>
              </button>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {isInstalled
                ? 'You can access Bear Bites from your home screen.'
                : 'Install for quick access and offline support.'}
            </p>
          </GlassCard>
        )}

        {/* App Info */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          <p>Bear Bites v1.0.0</p>
          <p>UCR Dining Menu</p>
          <p className="mt-2">
            Made with ❤️ by{' '}
            <a
              href="https://dreaming.codes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              DreamingCodes
            </a>
          </p>
        </div>
      </Container>
    </PageWrapper>
  )
}
