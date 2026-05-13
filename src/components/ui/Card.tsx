import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gold' | 'elevated'
  children: ReactNode
  hover?: boolean
}

export function Card({ variant = 'default', children, hover, className, ...props }: CardProps) {
  const base = 'rounded-[24px] overflow-hidden premium-panel'

  const variants = {
    default: 'glass border border-white/10',
    gold: 'glass-gold border border-gold-300/25',
    elevated: 'glass-surface border border-white/12 shadow-premium',
  }

  return (
    <div
      className={cn(
        base,
        variants[variant],
        hover && 'hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative px-5 py-4 border-b border-white/10', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}
