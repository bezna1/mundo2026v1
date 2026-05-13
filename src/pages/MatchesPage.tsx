import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { usePredictions } from '@/hooks/usePredictions'
import { MatchCard } from '@/components/match/MatchCard'
import { isMatchStarted, isToday, isTomorrow } from '@/lib/dates'
import { PHASE_ORDER } from '@/data/scoringRules'
import { cn } from '@/lib/utils'
import type { Match } from '@/types'

type Filter =
  | 'all'
  | 'open'
  | 'today'
  | 'tomorrow'
  | 'group'
  | 'knockout'
  | 'finished'
  | 'unpredicted'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'open', label: 'Otwarte' },
  { id: 'today', label: 'Dziś' },
  { id: 'tomorrow', label: 'Jutro' },
  { id: 'group', label: 'Faza grupowa' },
  { id: 'knockout', label: 'Pucharowa' },
  { id: 'finished', label: 'Zakończone' },
  { id: 'unpredicted', label: 'Nieobstawione' },
]

export function MatchesPage() {
  const { appUser } = useAuth()
  const { matches, loading } = useMatches()
  const { predictions, scores, savePrediction } = usePredictions(appUser?.group.id)
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    return matches.filter((m): boolean => {
      const started = isMatchStarted(m.kickoff_at)
      switch (filter) {
        case 'open': return !started
        case 'today': return isToday(m.kickoff_at)
        case 'tomorrow': return isTomorrow(m.kickoff_at)
        case 'group': return m.phase === 'Grupa'
        case 'knockout': return m.phase !== 'Grupa'
        case 'finished': return m.status === 'finished'
        case 'unpredicted':
          return !started && !predictions.some((p) => p.match_id === m.id)
        default: return true
      }
    })
  }, [matches, filter, predictions])

  // Group by stage
  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of filtered) {
      const key = m.stage
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ao = PHASE_ORDER[filtered.find((m) => m.stage === a)?.phase ?? ''] ?? 99
      const bo = PHASE_ORDER[filtered.find((m) => m.stage === b)?.phase ?? ''] ?? 99
      if (ao !== bo) return ao - bo
      return a.localeCompare(b)
    })
  }, [filtered])

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <h1 className="text-xl font-black text-white">Mecze</h1>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-4 px-4">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
              filter === id
                ? 'bg-gold-500 text-navy-900 border-gold-500'
                : 'glass border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-white/5 animate-shimmer"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
          Brak meczów dla tego filtra
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([stage, stageMatches]) => (
            <div key={stage}>
              <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 px-1">
                {stage}
              </h3>
              <div className="flex flex-col gap-2">
                {stageMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predictions.find((p) => p.match_id === match.id)}
                    predictionScore={scores.find((s) => s.match_id === match.id)}
                    onSave={
                      !isMatchStarted(match.kickoff_at)
                        ? async (data) => {
                            await savePrediction(
                              match.id,
                              data.homeGoals,
                              data.awayGoals,
                              data.advanceTeamId,
                              data.resolutionPrediction
                            )
                          }
                        : undefined
                    }
                    showPoints
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
