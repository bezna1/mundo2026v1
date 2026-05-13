import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ScoreInput } from './ScoreInput'
import { Countdown } from './Countdown'
import { formatMatchTime, formatMatchDate, formatMatchTimeOnly, isMatchStarted } from '@/lib/dates'
import { getFlag } from '@/data/fixtures'
import { isKnockoutPhase } from '@/data/scoringRules'
import { getOutcomeDisplayLabel, getOutcomeLabel, cn } from '@/lib/utils'
import type { Match, Prediction, PredictionScore, Resolution } from '@/types'

interface MatchCardProps {
  match: Match
  prediction?: Prediction | null
  predictionScore?: PredictionScore | null
  onSave?: (data: {
    homeGoals: number
    awayGoals: number
    advanceTeamId: number | null
    resolutionPrediction: Resolution | null
  }) => Promise<void>
  showPoints?: boolean
  compact?: boolean
}

export function MatchCard({
  match,
  prediction,
  predictionScore,
  onSave,
  showPoints,
  compact,
}: MatchCardProps) {
  const started = isMatchStarted(match.kickoff_at)
  const hasResult = !!match.match_result
  const isKnockout = isKnockoutPhase(match.phase)

  const [homeGoals, setHomeGoals] = useState(
    prediction != null ? String(prediction.home_goals) : ''
  )
  const [awayGoals, setAwayGoals] = useState(
    prediction != null ? String(prediction.away_goals) : ''
  )
  const [advanceTeamId, setAdvanceTeamId] = useState<number | null>(
    prediction?.advance_team_id ?? null
  )
  const [resolutionPrediction, setResolutionPrediction] = useState<Resolution | null>(
    prediction?.resolution_prediction ?? null
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const homeName = match.home_team?.name ?? match.home_team_placeholder
  const awayName = match.away_team?.name ?? match.away_team_placeholder
  const homeFlag = getFlag(homeName)
  const awayFlag = getFlag(awayName)

  const canPredict = !started && onSave != null

  const handleSave = async () => {
    if (!onSave) return
    const h = homeGoals === '' ? 0 : parseInt(homeGoals, 10)
    const a = awayGoals === '' ? 0 : parseInt(awayGoals, 10)
    if (isNaN(h) || isNaN(a)) return
    setSaving(true)
    try {
      await onSave({
        homeGoals: h,
        awayGoals: a,
        advanceTeamId,
        resolutionPrediction,
      })
      setSaved(true)
      setExpanded(false)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const resultHome = match.match_result?.home_goals_90
  const resultAway = match.match_result?.away_goals_90
  const resultOutcome =
    resultHome != null && resultAway != null
      ? getOutcomeLabel(resultHome, resultAway)
      : null

  const predOutcome =
    prediction != null
      ? getOutcomeLabel(prediction.home_goals, prediction.away_goals)
      : null

  const points = predictionScore?.total_points

  return (
    <Card
      className={cn(
        'animate-fade-in transition-all duration-200',
        compact ? '' : 'hover:border-white/12'
      )}
    >
      {/* Stage + time header */}
      <div className="relative flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-0">
        <div className="min-w-0">
          <span className="block text-[11px] font-bold text-white/42 uppercase tracking-wider">
            {match.stage}
          </span>
          <span className="block mt-1 text-[11px] font-semibold text-white/34 truncate">
            {formatMatchDate(match.kickoff_at)}, {formatMatchTimeOnly(match.kickoff_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!started && <Countdown kickoffUtc={match.kickoff_at} />}
          {match.status === 'live' && (
            <Badge variant="red" size="sm" className="animate-pulse">LIVE</Badge>
          )}
          {match.status === 'finished' && hasResult && (
            <Badge variant="green" size="sm">Zakończony</Badge>
          )}
        </div>
      </div>

      {/* Main score row */}
      <Link to={`/matches/${match.id}`} className="relative block px-4 sm:px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Home */}
          <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
            <span className="text-2xl leading-none">{homeFlag}</span>
            <span className="text-sm md:text-base font-bold text-white truncate w-full">{homeName}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[92px]">
            {hasResult ? (
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/7 px-3 py-2">
                <span className="premium-heading text-2xl font-extrabold text-white tabular-nums">{resultHome}</span>
                <span className="text-white/32 font-light text-xl">:</span>
                <span className="premium-heading text-2xl font-extrabold text-white tabular-nums">{resultAway}</span>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white/48">
                {formatMatchTime(match.kickoff_at)}
              </div>
            )}
            {resultOutcome && (
              <Badge variant="outcome" outcome={resultOutcome} size="sm">
                {getOutcomeDisplayLabel(resultOutcome, homeName, awayName)}
              </Badge>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
            <span className="text-2xl leading-none">{awayFlag}</span>
            <span className="text-sm md:text-base font-bold text-white truncate w-full text-right">{awayName}</span>
          </div>
        </div>
      </Link>

      {/* Prediction row */}
      {!compact && (
        <div className="relative px-4 sm:px-5 pb-4 border-t border-white/8 pt-4">
          {canPredict ? (
            <div className="flex flex-col gap-3">
              {!expanded ? (
                <button
                  onClick={() => setExpanded(true)}
                  className={cn(
                    'w-full py-3 text-sm font-bold rounded-2xl border transition-all',
                    prediction != null
                      ? 'my-result-selected text-green-200 border-green-300/38 bg-green-400/12 hover:border-green-300/58'
                      : 'text-blue-200 border-blue-400/24 bg-blue-400/8 hover:border-blue-300/42 hover:text-white'
                  )}
                >
                  {prediction != null
                    ? `Mój wynik: ${prediction.home_goals} : ${prediction.away_goals} — edytuj`
                    : '+ Dodaj wynik'}
                </button>
              ) : (
                <>
                  <ScoreInput
                    homeGoals={homeGoals}
                    awayGoals={awayGoals}
                    onHomeChange={setHomeGoals}
                    onAwayChange={setAwayGoals}
                    homeName={homeName}
                    awayName={awayName}
                    isKnockout={isKnockout}
                    advanceTeamId={advanceTeamId}
                    resolutionPrediction={resolutionPrediction}
                    homeTeamId={match.home_team_id}
                    awayTeamId={match.away_team_id}
                    onAdvanceChange={setAdvanceTeamId}
                    onResolutionChange={setResolutionPrediction}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(false)}
                      className="flex-1"
                    >
                      Powrót
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={saving}
                      onClick={handleSave}
                      className="flex-1"
                    >
                      {saved ? '✓ Zapisano' : 'Zapisz wynik'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prediction != null ? (
                  <>
                  <span className="text-xs text-white/40">Mój wynik:</span>
                    <span className="text-sm font-bold text-green-300">
                      {prediction.home_goals} : {prediction.away_goals}
                    </span>
                    {predOutcome && (
                      <Badge variant="outcome" outcome={predOutcome} size="sm">
                        {getOutcomeDisplayLabel(predOutcome, homeName, awayName)}
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className={cn('text-xs', started ? 'text-orange-300' : 'text-white/25')}>
                    {started ? 'Typowanie zablokowane' : 'Brak typu'}
                  </span>
                )}
              </div>
              {showPoints && points != null && (
                <span
                  className={cn(
                    'text-sm font-black',
                    points >= 5 ? 'text-gold-400' : points >= 2 ? 'text-green-400' : 'text-white/30'
                  )}
                >
                  {points} pkt
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
