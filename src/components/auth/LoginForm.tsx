import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signIn } from '@/lib/auth'
import { User, Lock } from 'lucide-react'

interface LoginFormProps {
  groupSlug: string
  onSuccess: () => void
}

export function LoginForm({ groupSlug, onSuccess }: LoginFormProps) {
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || !password) return
    setLoading(true)
    setError('')
    const { error } = await signIn(groupSlug, nickname.trim(), password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nick"
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Twój nick w grupie"
        autoComplete="username"
        icon={<User size={15} />}
        disabled={loading}
      />
      <Input
        label="Hasło"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        icon={<Lock size={15} />}
        disabled={loading}
      />
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        disabled={!nickname.trim() || !password}
        className="w-full mt-1"
      >
        Zaloguj się
      </Button>
    </form>
  )
}
