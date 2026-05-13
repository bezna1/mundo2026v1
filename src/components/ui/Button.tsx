import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'

  const variants = {
    primary:
      'bg-accent-blue hover:bg-blue-500 text-white shadow-blue hover:shadow-blue border border-blue-300/20',
    secondary:
      'glass border border-white/12 text-white hover:border-blue-300/40 hover:bg-blue-400/10',
    ghost:
      'text-white/70 hover:text-white hover:bg-white/5',
    danger:
      'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30',
    gold:
      'glass-gold border-gold text-gold-300 hover:bg-gold-300/10 shadow-gold',
  }

  const sizes = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  }

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
