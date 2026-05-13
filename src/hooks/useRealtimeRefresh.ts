import { useEffect } from 'react'
import { isDemoMode } from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'

type RealtimeTable =
  | 'matches'
  | 'match_results'
  | 'predictions'
  | 'prediction_scores'
  | 'bonus_predictions'
  | 'bonus_scores'
  | 'team_tournament_stats'
  | 'player_tournament_stats'
  | 'match_events'

interface RealtimeRefreshConfig {
  channelName: string
  tables: RealtimeTable[]
  enabled?: boolean
  onRefresh: () => void | Promise<void>
}

export function useRealtimeRefresh({
  channelName,
  tables,
  enabled = true,
  onRefresh,
}: RealtimeRefreshConfig) {
  const tableKey = tables.join('|')

  useEffect(() => {
    if (!enabled || isDemoMode()) return

    const channel = supabase.channel(channelName)

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          void onRefresh()
        }
      )
    }

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [channelName, enabled, onRefresh, tableKey])
}
