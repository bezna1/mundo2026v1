import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Trophy, Star, BarChart3, ShieldCheck, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  isAdmin?: boolean
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Start' },
  { to: '/matches', icon: CalendarDays, label: 'Mecze' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranking' },
  { to: '/bonuses', icon: Star, label: 'Bonusy' },
  { to: '/rules', icon: BookOpen, label: 'Reguły' },
  { to: '/stats', icon: BarChart3, label: 'Statsy' },
]

export function BottomNav({ isAdmin }: BottomNavProps) {
  const items = isAdmin
    ? [...navItems, { to: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : navItems

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-navy-900/78 backdrop-blur-2xl md:bottom-4 md:left-1/2 md:right-auto md:w-[min(920px,calc(100%-32px))] md:-translate-x-1/2 md:rounded-[28px] md:border md:shadow-premium">
      <div className="container mx-auto max-w-5xl">
        <div
          className="grid px-1"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 py-3 px-1 text-center transition-colors duration-200',
                  isActive
                    ? 'text-gold-300'
                    : 'text-white/35 hover:text-white/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-1 h-0.5 w-8 rounded-full bg-gold-300 shadow-gold" />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
