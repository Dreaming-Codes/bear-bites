import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function GlassCard({
  children,
  className,
  onClick,
  hoverable = false,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card',
        hoverable &&
          'cursor-pointer hover:scale-[1.02] transition-transform duration-200',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface GlassButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function GlassButton({
  children,
  className,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  type = 'button',
}: GlassButtonProps) {
  const variants = {
    default: 'glass-button',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    ghost: 'hover:bg-muted',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg font-medium transition-all duration-200',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'vegan' | 'vegetarian' | 'gluten-free' | 'allergen'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    vegan: 'badge-vegan',
    vegetarian: 'badge-vegetarian',
    'gluten-free': 'badge-gluten-free',
    allergen: 'badge-allergen',
  }

  return <span className={cn(variants[variant], className)}>{children}</span>
}

interface ContainerProps {
  children: ReactNode
  className?: string
}

export function Container({ children, className }: ContainerProps) {
  return <div className={cn('container-app', className)}>{children}</div>
}

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main
      className={cn('min-h-screen bg-background', className)}
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </main>
  )
}

export default GlassCard
