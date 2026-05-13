import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function nicknameToInitials(nickname: string): string {
  return nickname
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '…'
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `${n} ${one}`
  if (n % 100 >= 11 && n % 100 <= 19) return `${n} ${many}`
  const mod = n % 10
  if (mod >= 2 && mod <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function sortBy<T>(items: T[], key: (item: T) => number | string, dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => {
    const ak = key(a)
    const bk = key(b)
    const cmp = ak < bk ? -1 : ak > bk ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

export function parseIntSafe(value: string): number | null {
  const n = parseInt(value, 10)
  return isNaN(n) ? null : n
}

export function formatPoints(n: number): string {
  return `${n} pkt`
}

export function getOutcomeLabel(home: number, away: number): '1' | 'X' | '2' {
  if (home > away) return '1'
  if (home < away) return '2'
  return 'X'
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
