import { useState, useEffect, useCallback } from 'react'
import {
  getDemoCurrentUser,
  getDemoPredictionsWithScores,
  getDemoVisiblePredictions,
  isDemoMode,
  saveDemoPrediction,
} from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import type { Prediction, PredictionScore, Resolution } from '@/types'

const PREDICTION_TABLES = ['predictions', 'prediction_scores', 'match_results'] as const

export function usePredictions(groupId: string | undefined) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [scores, setScores] = useState<PredictionScore[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!groupId) return
    setLoading(true)

    if (isDemoMode()) {
      const demo = getDemoPredictionsWithScores(groupId)
      const currentUser = getDemoCurrentUser()
      setPredictions(
        currentUser
          ? demo.predictions.filter((prediction) => prediction.user_id === currentUser.auth.id)
          : []
      )
      setScores(
        currentUser
          ? demo.scores.filter((score) => score.user_id === currentUser.auth.id)
          : []
      )
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPredictions([])
      setScores([])
      setLoading(false)
      return
    }

    const [predsRes, scoresRes] = await Promise.all([
      supabase
        .from('predictions')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id),
      supabase
        .from('prediction_scores')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id),
    ])

    setPredictions((predsRes.data ?? []) as Prediction[])
    setScores((scoresRes.data ?? []) as PredictionScore[])
    setLoading(false)
  }, [groupId])

  useEffect(() => { fetch() }, [fetch])
  useRealtimeRefresh({
    channelName: groupId ? `predictions-${groupId}` : 'predictions',
    tables: [...PREDICTION_TABLES],
    enabled: Boolean(groupId),
    onRefresh: fetch,
  })

  const getPrediction = (matchId: number) =>
    predictions.find((p) => p.match_id === matchId) ?? null

  const getScore = (matchId: number) =>
    scores.find((s) => s.match_id === matchId) ?? null

  const savePrediction = async (
    matchId: number,
    homeGoals: number,
    awayGoals: number,
    advanceTeamId: number | null = null,
    resolutionPrediction: Resolution | null = null
  ): Promise<string | null> => {
    if (!groupId) return 'Brak grupy.'
    if (isDemoMode()) {
      const currentUser = getDemoCurrentUser()
      if (!currentUser) return 'Nie jesteś zalogowany.'
      const error = await saveDemoPrediction({
        groupId,
        userId: currentUser.auth.id,
        matchId,
        homeGoals,
        awayGoals,
        advanceTeamId,
        resolutionPrediction,
      })
      await fetch()
      return error
    }

    const { data, error } = await supabase.rpc('save_prediction', {
      p_group_id: groupId,
      p_match_id: matchId,
      p_home_goals: homeGoals,
      p_away_goals: awayGoals,
      p_advance_team_id: advanceTeamId,
      p_resolution_prediction: resolutionPrediction,
    })
    if (error) return error.message
    if (data?.error) return data.error
    await fetch()
    return null
  }

  return { predictions, scores, loading, getPrediction, getScore, savePrediction, refetch: fetch }
}

export function useMatchPredictions(matchId: number, groupId: string | undefined) {
  const [predictions, setPredictions] = useState<Array<{
    prediction_id: string
    user_id: string
    nickname: string
    home_goals: number
    away_goals: number
    total_points: number | null
  }>>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(() => {
    if (!groupId) return
    if (isDemoMode()) {
      setPredictions(getDemoVisiblePredictions(matchId, groupId))
      setLoading(false)
      return
    }

    supabase
      .rpc('get_visible_predictions', {
        p_match_id: matchId,
        p_group_id: groupId,
      })
      .then(({ data }) => {
        setPredictions(data ?? [])
        setLoading(false)
      })
  }, [matchId, groupId])

  useEffect(() => { fetch() }, [fetch])
  useRealtimeRefresh({
    channelName: groupId ? `match-predictions-${groupId}-${matchId}` : 'match-predictions',
    tables: [...PREDICTION_TABLES],
    enabled: Boolean(groupId && matchId),
    onRefresh: fetch,
  })

  return { predictions, loading }
}
