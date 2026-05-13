import { useState, useEffect, useCallback } from 'react'
import { getDemoLeaderboard, isDemoMode } from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import type { LeaderboardEntry } from '@/types'

const LEADERBOARD_TABLES = [
  'predictions',
  'prediction_scores',
  'bonus_predictions',
  'bonus_scores',
  'match_results',
] as const

export function useLeaderboard(groupId: string | undefined) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!groupId) return
    setLoading(true)

    if (isDemoMode()) {
      setEntries(getDemoLeaderboard(groupId))
      setError(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_group_id: groupId,
    })
    if (error) {
      setError(error.message)
    } else {
      const mapped: LeaderboardEntry[] = (data ?? []).map((row: {
        user_id: string
        nickname: string
        match_points: number
        bonus_points: number
        total_points: number
        exact_scores: number
        correct_outcomes: number
        correct_advances: number
        matches_predicted: number
      }) => ({
        ...row,
        effectiveness:
          row.matches_predicted > 0
            ? (row.exact_scores / row.matches_predicted) * 100
            : 0,
        last_5: [] as Array<'W' | 'H' | 'M' | '-'>,
      }))
      setEntries(mapped)
    }
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    void fetch()
    if (!isDemoMode()) return

    const handleDemoClock = () => {
      void fetch()
    }
    window.addEventListener('mt-demo-clock', handleDemoClock)
    const timer = window.setInterval(handleDemoClock, 1_000)

    return () => {
      window.removeEventListener('mt-demo-clock', handleDemoClock)
      window.clearInterval(timer)
    }
  }, [fetch])
  useRealtimeRefresh({
    channelName: groupId ? `leaderboard-${groupId}` : 'leaderboard',
    tables: [...LEADERBOARD_TABLES],
    enabled: Boolean(groupId),
    onRefresh: fetch,
  })

  return { entries, loading, error, refetch: fetch }
}
