import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'orange' | 'outcome'
  size?: 'sm' | 'md'
  children: ReactNode
  outcome?: '1' | 'X' | '2'
}

export function Badge({
  variant = 'default',
  size = 'md',
  outcome,
  children,
  className,
  ...props
}: BadgeProps) {
  const base = 'inline-flex items-center font-semibold rounded-lg border'

  const variants = {
    default: 'bg-white/5 border-white/10 text-white/70',
    gold: 'bg-gold-500/15 border-gold-500/25 text-gold-400',
    green: 'bg-accent-green/15 border-accent-green/25 text-emerald-400',
    red: 'bg-accent-red/15 border-accent-red/25 text-red-400',
    blue: 'bg-accent-blue/15 border-accent-blue/25 text-blue-400',
    orange: 'bg-accent-orange/15 border-accent-orange/25 text-orange-400',
    outcome: outcome
      ? outcome === '1'
        ? 'outcome-1'
        : outcome === 'X'
        ? 'outcome-X'
        : 'outcome-2'
      : 'bg-white/5 border-white/10 text-white/70',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  )
}
