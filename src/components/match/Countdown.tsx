import { useState, useEffect } from 'react'
import { getCountdownSeconds, formatCountdown, getCountdownUrgency } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface CountdownProps {
  kickoffUtc: string
  className?: string
}

export function Countdown({ kickoffUtc, className }: CountdownProps) {
  const [seconds, setSeconds] = useState(() => getCountdownSeconds(kickoffUtc))

  useEffect(() => {
    const update = () => setSeconds(getCountdownSeconds(kickoffUtc))
    const id = setInterval(() => {
      update()
    }, 1000)
    window.addEventListener('mt-demo-clock', update)
    update()
    return () => {
      clearInterval(id)
      window.removeEventListener('mt-demo-clock', update)
    }
  }, [kickoffUtc])

  if (seconds <= 0) {
    return (
      <span className={cn('text-xs font-semibold text-accent-red', className)}>
        TRWA
      </span>
    )
  }

  const urgency = getCountdownUrgency(seconds)

  return (
    <span
      className={cn(
        'text-xs font-mono font-semibold tabular-nums',
        urgency === 'normal' && 'text-white/50',
        urgency === 'warning' && 'text-yellow-400',
        urgency === 'critical' && 'text-accent-red animate-pulse',
        className
      )}
    >
      {formatCountdown(seconds)}
    </span>
  )
}
