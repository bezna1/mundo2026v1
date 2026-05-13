import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { pl } from 'date-fns/locale'
import { getAppNow } from '@/lib/clock'

export function isPast(dateString: string): boolean {
  return getAppNow() >= new Date(dateString)
}

const WARSAW = 'Europe/Warsaw'

export function formatMatchTime(utcString: string): string {
  return formatInTimeZone(utcString, WARSAW, 'dd.MM HH:mm', { locale: pl })
}

export function formatMatchDate(utcString: string): string {
  return formatInTimeZone(utcString, WARSAW, 'EEEE, d MMMM', { locale: pl })
}

export function formatMatchTimeOnly(utcString: string): string {
  return formatInTimeZone(utcString, WARSAW, 'HH:mm', { locale: pl })
}

export function formatMatchDateShort(utcString: string): string {
  return formatInTimeZone(utcString, WARSAW, 'dd.MM', { locale: pl })
}

export function isMatchStarted(kickoffUtc: string): boolean {
  return getAppNow() >= new Date(kickoffUtc)
}

export function getCountdownSeconds(kickoffUtc: string): number {
  return Math.max(0, differenceInSeconds(new Date(kickoffUtc), getAppNow()))
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Trwa'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

export function getCountdownUrgency(seconds: number): 'normal' | 'warning' | 'critical' {
  if (seconds <= 3600) return 'critical'
  if (seconds <= 21600) return 'warning'
  return 'normal'
}

export function isToday(utcString: string): boolean {
  const wartime = toZonedTime(utcString, WARSAW)
  const today = toZonedTime(getAppNow(), WARSAW)
  return format(wartime, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
}

export function isTomorrow(utcString: string): boolean {
  const wartime = toZonedTime(utcString, WARSAW)
  const tomorrow = getAppNow()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowWar = toZonedTime(tomorrow, WARSAW)
  return format(wartime, 'yyyy-MM-dd') === format(tomorrowWar, 'yyyy-MM-dd')
}

export function formatRelativeTime(utcString: string): string {
  return formatDistanceToNow(new Date(utcString), { locale: pl, addSuffix: true })
}

export function formatDeadline(utcString: string): string {
  return formatInTimeZone(utcString, WARSAW, "d MMMM yyyy 'o' HH:mm", { locale: pl })
}
