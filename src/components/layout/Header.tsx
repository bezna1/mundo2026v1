import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { nicknameToInitials } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LogOut, Trophy } from 'lucide-react'

export function Header() {
  const { appUser } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/72 backdrop-blur-2xl">
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gold-300/12 border border-gold-300/30 flex items-center justify-center shadow-gold">
            <Trophy size={18} className="text-gold-300" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="premium-heading text-sm font-extrabold text-gold-300">
              Mundial Typer
            </span>
            {appUser?.group && (
              <span className="text-[11px] text-white/45 mt-1">
                {appUser.group.name}
              </span>
            )}
          </div>
        </Link>

        {appUser && (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 glass rounded-2xl px-3 py-2 border border-white/10 shadow-none">
              <div className="w-7 h-7 rounded-full bg-gold-300/16 border border-gold-300/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-gold-200">
                  {nicknameToInitials(appUser.profile.nickname)}
                </span>
              </div>
              <span className="text-sm font-medium text-white/80 max-w-[100px] truncate">
                {appUser.profile.nickname}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 rounded-2xl glass border border-white/10 flex items-center justify-center text-white/45 hover:text-white/80 hover:border-white/20 transition-colors shadow-none"
              title="Wyloguj"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
