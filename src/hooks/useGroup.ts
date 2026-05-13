import { useState, useEffect, useCallback } from 'react'
import {
  getDemoBonuses,
  getDemoCurrentUser,
  getDemoLeaderboard,
  isDemoMode,
  saveDemoBonus,
} from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import type { BonusPrediction, BonusType, BonusValue, GroupMember } from '@/types'

export function useGroupMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    if (isDemoMode()) {
      const members = getDemoLeaderboard(groupId).map<GroupMember>((entry) => ({
        id: `${groupId}-${entry.user_id}`,
        group_id: groupId,
        user_id: entry.user_id,
        role: entry.nickname === 'Admin' ? 'owner' : 'player',
        joined_at: '2026-01-01T00:00:00Z',
        profiles: {
          id: entry.user_id,
          nickname: entry.nickname,
          created_at: '2026-01-01T00:00:00Z',
        },
      }))
      setMembers(members)
      setLoading(false)
      return
    }

    supabase
      .from('group_members')
      .select('*, profiles (*)')
      .eq('group_id', groupId)
      .then(({ data }) => {
        setMembers((data ?? []) as GroupMember[])
        setLoading(false)
      })
  }, [groupId])

  return { members, loading }
}

export function useBonusPredictions(groupId: string | undefined) {
  const [bonuses, setBonuses] = useState<BonusPrediction[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!groupId) return
    setLoading(true)

    if (isDemoMode()) {
      const currentUser = getDemoCurrentUser()
      setBonuses(currentUser ? getDemoBonuses(groupId, currentUser.auth.id) : [])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('bonus_predictions')
      .select('*, bonus_scores (*)')
      .eq('group_id', groupId)
    setBonuses((data ?? []) as BonusPrediction[])
    setLoading(false)
  }, [groupId])

  useEffect(() => { fetch() }, [fetch])

  const saveBonusPrediction = async (
    bonusType: string,
    value: unknown
  ): Promise<string | null> => {
    if (!groupId) return 'Brak grupy.'
    if (isDemoMode()) {
      const currentUser = getDemoCurrentUser()
      if (!currentUser) return 'Nie jesteś zalogowany.'
      const error = await saveDemoBonus({
        groupId,
        userId: currentUser.auth.id,
        bonusType: bonusType as BonusType,
        value: value as BonusValue,
      })
      await fetch()
      return error
    }

    const { data, error } = await supabase.rpc('save_bonus_prediction', {
      p_group_id: groupId,
      p_bonus_type: bonusType,
      p_value: value,
    })
    if (error) return error.message
    if (data?.error) return data.error
    await fetch()
    return null
  }

  return { bonuses, loading, saveBonusPrediction, refetch: fetch }
}
