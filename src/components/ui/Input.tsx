import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export function Input({
  label,
  error,
  hint,
  icon,
  suffix,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-white/70"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'app-input w-full bg-white border border-slate-200 rounded-2xl',
            'text-slate-950 placeholder:text-slate-500 caret-slate-950',
            'px-4 py-3.5 text-base sm:text-sm',
            'transition-all duration-200',
            'focus:outline-none focus:border-blue-300/55 focus:ring-2 focus:ring-blue-400/20',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
            icon && 'pl-10',
            suffix && 'pr-10',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  )
}
