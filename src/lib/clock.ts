const DEMO_CLOCK_KEY = 'mt_demo_clock_iso'

export function getAppNow(): Date {
  const demoClock = localStorage.getItem(DEMO_CLOCK_KEY)
  return demoClock ? new Date(demoClock) : new Date()
}

export function getDemoClockIso(): string {
  return getAppNow().toISOString()
}

export function setDemoClockIso(iso: string): void {
  localStorage.setItem(DEMO_CLOCK_KEY, iso)
  window.dispatchEvent(new Event('mt-demo-clock'))
}

export function clearDemoClock(): void {
  localStorage.removeItem(DEMO_CLOCK_KEY)
  window.dispatchEvent(new Event('mt-demo-clock'))
}
