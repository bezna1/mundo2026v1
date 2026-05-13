import { useState, useEffect, useCallback } from 'react'
import { getDemoGroup, getDemoMatchesWithResults, isDemoMode, runDemoSimulationStep } from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import type { Match } from '@/types'

const MATCH_TABLES = ['matches', 'match_results'] as const

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (isDemoMode()) {
      runDemoSimulationStep(getDemoGroup().id)
      setMatches(getDemoMatchesWithResults())
      setError(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey (*),
        away_team:teams!matches_away_team_id_fkey (*),
        match_result:match_results (*)
      `)
      .order('kickoff_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setMatches((data ?? []) as Match[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    window.addEventListener('mt-demo-clock', fetch)
    return () => window.removeEventListener('mt-demo-clock', fetch)
  }, [fetch])
  useRealtimeRefresh({
    channelName: 'matches-list',
    tables: [...MATCH_TABLES],
    onRefresh: fetch,
  })

  return { matches, loading, error, refetch: fetch }
}

export function useMatch(matchId: number) {
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (isDemoMode()) {
      runDemoSimulationStep(getDemoGroup().id)
      setMatch(getDemoMatchesWithResults().find((item) => item.id === matchId) ?? null)
      setLoading(false)
      return
    }

    supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey (*),
        away_team:teams!matches_away_team_id_fkey (*),
        match_result:match_results (*)
      `)
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        setMatch(data as Match | null)
        setLoading(false)
      })
  }, [matchId])

  useEffect(() => {
    fetch()
    window.addEventListener('mt-demo-clock', fetch)
    return () => window.removeEventListener('mt-demo-clock', fetch)
  }, [fetch])
  useRealtimeRefresh({
    channelName: `match-${matchId}`,
    tables: [...MATCH_TABLES],
    enabled: matchId > 0,
    onRefresh: fetch,
  })

  return { match, loading }
}
