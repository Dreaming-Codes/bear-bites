import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Menu,
  X,
  Home,
  Heart,
  Calendar,
  Settings,
  User,
  ChevronLeft,
} from 'lucide-react'
import { useSession, signIn, signOut } from '@/lib/auth-client'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
}

export function AppHeader({
  title = 'Bear Bites',
  showBack = false,
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const { data: session, isPending } = useSession()

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="glass border-b border-white/10">
          <div className="container-app flex items-center justify-between h-14">
            {/* Left side */}
            <div className="flex items-center gap-2">
              {showBack ? (
                <button
                  onClick={() => router.history.back()}
                  className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft size={24} className="text-foreground" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Open menu"
                >
                  <Menu size={24} className="text-foreground" />
                </button>
              )}

              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl">🐻</span>
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
              </Link>
            </div>

            {/* Right side - User avatar or login */}
            <div>
              {isPending ? (
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              ) : session?.user ? (
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm overflow-hidden"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    session.user.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => signIn.social({ provider: 'google' })}
                  className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out menu */}
      <MobileNav
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        session={session}
      />

      {/* Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  session: any
}

function MobileNav({ isOpen, onClose, session }: MobileNavProps) {
  const navItems = [
    { to: '/', icon: Home, label: 'Menu' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/meal-plan', icon: Calendar, label: 'Meal Plan' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-72 bg-card z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Menu header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐻</span>
          <span className="font-bold text-lg">Bear Bites</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* User section */}
      {session?.user && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium overflow-hidden">
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
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{session.user.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors mb-1"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground mb-1',
            }}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {session?.user ? (
          <button
            onClick={() => {
              signOut()
              onClose()
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-destructive"
          >
            <User size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => {
              signIn.social({ provider: 'google' })
              onClose()
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <User size={20} />
            <span className="font-medium">Sign In with Google</span>
          </button>
        )}
      </div>
    </aside>
  )
}

export default AppHeader
