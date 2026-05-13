import { demoSignIn, demoSignOut, demoSignUp, getDemoGroup, isDemoMode } from './demoStore'
import { isSupabaseConfigured, supabase } from './supabase'
import type { Profile, Group, GroupMember, MemberRole } from '@/types'

function toSyntheticEmail(groupSlug: string, nickname: string): string {
  const normalized = nickname
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  return `${groupSlug}.${normalized}@mundial-typer.local`
}

export async function signUp(
  groupSlug: string,
  inviteCode: string,
  nickname: string,
  password: string
): Promise<{ error: string | null; pendingApproval?: boolean }> {
  if (isDemoMode()) {
    const result = await demoSignUp(groupSlug, inviteCode, nickname, password)
    window.dispatchEvent(new Event('mt-demo-auth'))
    return result
  }

  const email = toSyntheticEmail(groupSlug, nickname)

  const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      return { error: 'Ten nick jest już zajęty w tej grupie.' }
    }
    return { error: signUpError.message }
  }

  if (!data.user) return { error: 'Błąd rejestracji — spróbuj ponownie.' }

  const { error: joinError } = await joinGroupWithInvite(groupSlug, inviteCode, nickname)
  if (joinError) return { error: joinError }

  return { error: null }
}

export async function signIn(
  groupSlug: string,
  nickname: string,
  password: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    const result = await demoSignIn(groupSlug, nickname, password)
    window.dispatchEvent(new Event('mt-demo-auth'))
    return result
  }

  const email = toSyntheticEmail(groupSlug, nickname)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'Nieprawidłowy nick lub hasło.' }
  }
  return { error: null }
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) {
    await demoSignOut()
    window.dispatchEvent(new Event('mt-demo-auth'))
    return
  }
  await supabase.auth.signOut()
}

export async function joinGroupWithInvite(
  groupSlug: string,
  inviteCode: string,
  nickname: string
): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    return demoSignUp(groupSlug, inviteCode, nickname, 'demo-joined-with-existing-session')
  }

  const { data, error } = await supabase.rpc('join_group_with_invite', {
    p_group_slug: groupSlug,
    p_invite_code: inviteCode,
    p_nickname: nickname,
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error }
  return { error: null }
}

export async function getInviteGroup(
  slug: string,
  inviteCode: string
): Promise<Pick<Group, 'id' | 'name' | 'slug' | 'bonus_deadline'> | null> {
  if (isDemoMode()) {
    const group = getDemoGroup(slug)
    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      bonus_deadline: group.bonus_deadline,
    }
  }

  if (!slug || !inviteCode) return null
  const { data } = await supabase.rpc('get_invite_group', {
    p_group_slug: slug,
    p_invite_code: inviteCode,
  })
  return data?.[0] ?? null
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  if (!isSupabaseConfigured) return getDemoGroup(slug)
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('slug', slug)
    .single()
  return data ?? null
}

export async function getGroupMember(
  groupId: string,
  userId: string
): Promise<GroupMember | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()
  return data ?? null
}

export function isAdmin(role: MemberRole | null): boolean {
  return role === 'admin' || role === 'owner'
}
