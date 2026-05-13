import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMatch } from '@/hooks/useMatches'
import { usePredictions, useMatchPredictions } from '@/hooks/usePredictions'
import { MatchCard } from '@/components/match/MatchCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatMatchDate, formatMatchTimeOnly, isMatchStarted } from '@/lib/dates'
import { getFlag } from '@/data/fixtures'
import { getOutcomeDisplayLabel, getOutcomeLabel, cn } from '@/lib/utils'
import { ChevronLeft, MapPin, Clock } from 'lucide-react'

export function MatchDetailsPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const { appUser } = useAuth()
  const [predictionSaved, setPredictionSaved] = useState(false)
  const id = parseInt(matchId ?? '0', 10)
  const { match, loading } = useMatch(id)
  const { predictions, scores, savePrediction } = usePredictions(appUser?.group.id)
  const { predictions: othersPreds, loading: predsLoading } = useMatchPredictions(id, appUser?.group.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="text-center py-12 text-white/30">
        <p>Nie znaleziono meczu #{matchId}</p>
        <Link to="/matches" className="text-gold-400 text-sm mt-2 block">← Wróć do meczów</Link>
      </div>
    )
  }

  const myPrediction = predictions.find((p) => p.match_id === id)
  const myScore = scores.find((s) => s.match_id === id)
  const started = isMatchStarted(match.kickoff_at)
  const hasResult = !!match.match_result

  const homeName = match.home_team?.name ?? match.home_team_placeholder
  const awayName = match.away_team?.name ?? match.away_team_placeholder

  const outcomeDistribution = othersPreds.reduce<Record<string, number>>(
    (acc, p) => {
      const o = getOutcomeLabel(p.home_goals, p.away_goals)
      acc[o] = (acc[o] ?? 0) + 1
      return acc
    },
    {}
  )

  const total = othersPreds.length
  const scoreFrequency = othersPreds.reduce<Record<string, number>>((acc, p) => {
    const k = `${p.home_goals}:${p.away_goals}`
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const topScore = Object.entries(scoreFrequency).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <Link
        to="/matches"
        className={cn(
          'flex items-center gap-1.5 text-sm transition-colors',
          predictionSaved
            ? 'text-green-300 hover:text-green-200'
            : 'text-white/40 hover:text-white/70'
        )}
      >
        <ChevronLeft size={16} /> Mecze
      </Link>

      {/* Main match card */}
      <MatchCard
        match={match}
        prediction={myPrediction}
        predictionScore={myScore}
        onSave={
          !started
            ? async (data) => {
                await savePrediction(
                  id,
                  data.homeGoals,
                  data.awayGoals,
                  data.advanceTeamId,
                  data.resolutionPrediction
                )
                setPredictionSaved(true)
              }
            : undefined
        }
        showPoints
      />

      {/* Match info */}
      <Card>
        <CardBody className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Clock size={14} />
            <span>{formatMatchDate(match.kickoff_at)}, {formatMatchTimeOnly(match.kickoff_at)} (Warsaw)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <MapPin size={14} />
            <span>{match.venue}</span>
          </div>
        </CardBody>
      </Card>

      {/* My score breakdown */}
      {myScore && (
        <Card variant="gold">
          <CardHeader>
            <h3 className="text-sm font-bold text-gold-400">Moje punkty</h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black gradient-text">
                {myScore.total_points} pkt
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { key: 'exact', label: 'Dokładny wynik', pts: (myScore.score_breakdown as { points_exact?: number }).points_exact },
                { key: 'outcome', label: 'Poprawny rezultat', pts: (myScore.score_breakdown as { points_outcome?: number }).points_outcome },
                { key: 'advance', label: 'Awansujący', pts: (myScore.score_breakdown as { points_advance?: number }).points_advance },
                { key: 'resolution', label: 'Rozstrzygnięcie', pts: (myScore.score_breakdown as { points_resolution?: number }).points_resolution },
              ]
                .filter((row) => (row.pts ?? 0) > 0)
                .map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{row.label}</span>
                    <span className="font-bold text-green-400">+{row.pts}</span>
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Others' predictions (after kickoff) */}
      {started && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Typy grupy</h3>
              <span className="text-xs text-white/30">{total} typów</span>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {/* Distribution */}
            {total > 0 && (
              <div>
                <div className="flex gap-2 mb-3">
                  {(['1', 'X', '2'] as const).map((o) => {
                    const count = outcomeDistribution[o] ?? 0
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const label = getOutcomeDisplayLabel(o, homeName, awayName)
                    return (
                      <div key={o} className="flex-1">
                        <div
                          className={cn(
                            'text-center py-2 rounded-lg border text-xs font-bold',
                            o === '1' && 'border-blue-500/30 bg-blue-500/10 text-blue-400',
                            o === 'X' && 'border-gold-500/30 bg-gold-500/10 text-gold-400',
                            o === '2' && 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                          )}
                        >
                          <div className="text-[11px] leading-tight">{label}</div>
                          <div className="text-[10px] opacity-70">{pct}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {topScore && (
                  <p className="text-xs text-white/40 text-center">
                    Najczęściej typowany: <span className="font-bold text-white/60">{topScore[0]}</span>{' '}
                    ({topScore[1]}×)
                  </p>
                )}
              </div>
            )}

            {/* Individual predictions */}
            {predsLoading ? (
              <div className="h-16 animate-shimmer rounded-xl" />
            ) : othersPreds.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-2">
                Brak typów do pokazania
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {othersPreds.map((p) => {
                  const o = getOutcomeLabel(p.home_goals, p.away_goals)
                  const isMe = p.user_id === appUser?.auth.id
                  return (
                    <div
                      key={p.prediction_id}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg',
                        isMe ? 'bg-gold-500/5 border border-gold-500/15' : 'bg-white/2'
                      )}
                    >
                      <span className={cn('text-sm font-medium', isMe ? 'text-gold-400' : 'text-white/70')}>
                        {p.nickname} {isMe && '(ty)'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {p.home_goals} : {p.away_goals}
                        </span>
                        <Badge variant="outcome" outcome={o} size="sm">
                          {getOutcomeDisplayLabel(o, homeName, awayName)}
                        </Badge>
                        {hasResult && p.total_points != null && (
                          <span
                            className={cn(
                              'text-xs font-black',
                              p.total_points >= 5 ? 'text-gold-400' : p.total_points >= 2 ? 'text-green-400' : 'text-white/30'
                            )}
                          >
                            {p.total_points}p
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
