import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Menu' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30">
      <div className="glass backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.to ||
              (item.to !== '/' && currentPath.startsWith(item.to))

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon
                  size={22}
                  className={cn(
                    'transition-transform',
                    isActive && 'scale-110',
                  )}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
