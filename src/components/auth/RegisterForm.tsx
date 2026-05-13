import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signUp } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import { User, Lock, CheckCircle } from 'lucide-react'

interface RegisterFormProps {
  groupSlug: string
  inviteCode: string
  onSuccess: () => void
}

export function RegisterForm({ groupSlug, inviteCode, onSuccess }: RegisterFormProps) {
  const { refreshUser } = useAuth()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    if (!nickname.trim()) return setError('Podaj nick.')
    if (nickname.trim().length < 2) return setError('Nick musi mieć min. 2 znaki.')
    if (nickname.trim().length > 20) return setError('Nick może mieć max. 20 znaków.')
    if (password.length < 6) return setError('Hasło musi mieć min. 6 znaków.')
    if (password !== confirm) return setError('Hasła nie są identyczne.')

    setLoading(true)
    const result = await signUp(groupSlug, inviteCode, nickname.trim(), password)
    const signUpError = result.error
    if (signUpError) {
      setLoading(false)
      return setError(signUpError)
    }

    setLoading(false)
    if (result.pendingApproval) {
      setNotice('Zgłoszenie wysłane. Admin pokoju musi zatwierdzić konto przed logowaniem.')
      setPassword('')
      setConfirm('')
      return
    }
    await refreshUser()
    onSuccess()
  }

  const passwordsMatch = password.length > 0 && confirm.length > 0 && password === confirm

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nick (widoczny dla innych graczy)"
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="np. Marek"
        maxLength={20}
        icon={<User size={15} />}
        hint="2–20 znaków. Nie możesz go później zmienić."
        disabled={loading}
      />
      <Input
        label="Hasło"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Min. 6 znaków"
        autoComplete="new-password"
        icon={<Lock size={15} />}
        disabled={loading}
      />
      <Input
        label="Powtórz hasło"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Jeszcze raz"
        autoComplete="new-password"
        icon={
          passwordsMatch ? (
            <CheckCircle size={15} className="text-green-400" />
          ) : (
            <Lock size={15} />
          )
        }
        disabled={loading}
      />
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          {notice}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        disabled={!nickname.trim() || password.length < 6 || password !== confirm}
        className="w-full mt-1"
      >
        Dołącz do grupy
      </Button>
      <p className="text-xs text-white/25 text-center">
        Nie używamy e-maila. Logowanie tylko nickiem i hasłem.
      </p>
    </form>
  )
}
