import { useState, useEffect, createContext, useContext } from 'react'
import { getDemoCurrentUser, isDemoMode } from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import { getProfile, getGroupBySlug, getGroupMember } from '@/lib/auth'
import type { AppUser, Profile, Group, GroupMember } from '@/types'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  appUser: AppUser | null
  loading: boolean
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  appUser: null,
  loading: true,
  refreshUser: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthProvider(groupSlug: string | null) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveDemoUser = () => {
    setAppUser(getDemoCurrentUser())
    setLoading(false)
  }

  const resolveUser = async (user: User) => {
    const [profile, group] = await Promise.all([
      getProfile(user.id),
      groupSlug ? getGroupBySlug(groupSlug) : Promise.resolve(null),
    ])

    if (!profile || !group) {
      setAppUser(null)
      return
    }

    const member = await getGroupMember(group.id, user.id)
    if (!member) {
      setAppUser(null)
      return
    }

    setAppUser({ auth: user, profile, member, group })
  }

  const refreshUser = async () => {
    if (isDemoMode()) {
      resolveDemoUser()
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await resolveUser(user)
  }

  useEffect(() => {
    let mounted = true

    if (isDemoMode()) {
      resolveDemoUser()
      const onStorage = () => resolveDemoUser()
      window.addEventListener('storage', onStorage)
      window.addEventListener('mt-demo-auth', onStorage)
      return () => {
        mounted = false
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('mt-demo-auth', onStorage)
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        await resolveUser(session.user)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        if (session?.user) {
          await resolveUser(session.user)
        } else {
          setAppUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [groupSlug])

  return { appUser, loading, refreshUser }
}
