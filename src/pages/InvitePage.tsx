import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { getInviteGroup } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import { DoorOpen, Trophy, Users } from 'lucide-react'
import type { Group } from '@/types'

type Tab = 'login' | 'register'

export function InvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { appUser, loading: authLoading } = useAuth()

  const groupSlug = searchParams.get('g') ?? localStorage.getItem('mt_group_slug') ?? ''
  const inviteCode = searchParams.get('i') ?? ''

  const [tab, setTab] = useState<Tab>(inviteCode ? 'register' : 'login')
  const [group, setGroup] = useState<Group | null>(null)
  const [groupError, setGroupError] = useState('')
  const [roomPin, setRoomPin] = useState(groupSlug)

  useEffect(() => {
    if (authLoading) return
    if (appUser) {
      navigate('/dashboard', { replace: true })
      return
    }
    if (!groupSlug) {
      setGroup(null)
      setGroupError('')
      return
    }
    if (!inviteCode) {
      setGroup({
        id: '',
        name: /^\d{6}$/.test(groupSlug) ? `Pokój ${groupSlug}` : groupSlug,
        slug: groupSlug,
        invite_code: groupSlug,
        owner_id: '',
        bonus_deadline: '',
        created_at: '',
        settings: {},
      })
      return
    }
    getInviteGroup(groupSlug, inviteCode).then((g) => {
      if (!g) setGroupError('Nie znaleziono grupy albo kod zaproszenia jest nieprawidłowy.')
      else {
        setGroup({
          ...g,
          invite_code: inviteCode,
          owner_id: '',
          created_at: '',
          settings: {},
        })
      }
    })
  }, [groupSlug, inviteCode, authLoading, appUser, navigate])

  if (authLoading) {
    return (
      <div className="min-h-dvh gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh gradient-hero flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      {/* Hero */}
      <div className="flex flex-col items-center gap-5 mb-10 text-center">
        <div className="w-24 h-24 rounded-[32px] bg-gold-300/12 border border-gold-300/30 flex items-center justify-center glow-gold animate-float">
          <Trophy size={42} className="text-gold-200" />
        </div>
        <div>
          <h1 className="premium-heading text-5xl sm:text-6xl font-extrabold gradient-text mb-2">Mundial Typer</h1>
          <p className="text-sm text-white/58 font-semibold">Mistrzostwa Świata 2026</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {!groupSlug ? (
          <div className="glass rounded-[32px] border border-white/10 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-400/12 border border-blue-300/25 flex items-center justify-center">
                  <DoorOpen size={15} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Pokój graczy</p>
                  <p className="text-sm font-bold text-white">Wpisz 6-cyfrowy PIN</p>
                </div>
              </div>
            </div>
            <form
              className="p-6 flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                const normalized = roomPin.replace(/\D/g, '').slice(0, 6)
                if (normalized.length !== 6) {
                  setGroupError('PIN pokoju musi mieć 6 cyfr.')
                  return
                }
                localStorage.setItem('mt_group_slug', normalized)
                navigate(`/?g=${normalized}`)
              }}
            >
              <Input
                label="PIN pokoju"
                value={roomPin}
                onChange={(event) => setRoomPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="np. 123456"
                inputMode="numeric"
                maxLength={6}
              />
              {groupError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {groupError}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full">
                Wejdź do pokoju
              </Button>
            </form>
          </div>
        ) : groupError ? (
          <div className="glass rounded-[28px] border border-red-500/25 p-6 text-center">
            <p className="text-red-400 text-sm">{groupError}</p>
            <p className="text-white/30 text-xs mt-2">
              Upewnij się, że masz poprawny link zaproszenia.
            </p>
          </div>
        ) : group ? (
          <div className="glass rounded-[32px] border border-white/10 overflow-hidden">
            {/* Group header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gold-300/12 border border-gold-300/25 flex items-center justify-center">
                  <Users size={15} className="text-gold-200" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Grupa</p>
                  <p className="text-sm font-bold text-white">{group.name}</p>
                </div>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-white/10">
              {(['login', 'register'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    tab === t
                      ? 'text-gold-200 border-b-2 border-gold-300 bg-gold-300/6'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {t === 'login' ? 'Mam już konto' : 'Dołącz do grupy'}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="p-6">
              {tab === 'login' ? (
                <LoginForm
                  groupSlug={groupSlug}
                  onSuccess={() => navigate('/dashboard')}
                />
              ) : (
                <RegisterForm
                  groupSlug={groupSlug}
                  inviteCode={inviteCode || groupSlug}
                  onSuccess={() => navigate('/dashboard')}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
