import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { usePredictions } from '@/hooks/usePredictions'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { MatchCard } from '@/components/match/MatchCard'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatMatchDate, isMatchStarted } from '@/lib/dates'
import { ChevronRight, Target, Trophy, AlertCircle, Zap, Sparkles } from 'lucide-react'

export function DashboardPage() {
  const { appUser } = useAuth()
  const { matches, loading: matchesLoading } = useMatches()
  const { predictions, scores, savePrediction } = usePredictions(appUser?.group.id)
  const { entries } = useLeaderboard(appUser?.group.id)

  const nextMatches = useMemo(() => {
    return matches
      .filter((m) => !isMatchStarted(m.kickoff_at) && m.status === 'scheduled')
      .slice(0, 4)
  }, [matches])

  const myEntry = entries.find((e) => e.user_id === appUser?.auth.id)
  const myRank = entries.findIndex((e) => e.user_id === appUser?.auth.id) + 1

  const unpredicted = useMemo(() => {
    return matches.filter(
      (m) => !isMatchStarted(m.kickoff_at) && !predictions.some((p) => p.match_id === m.id)
    ).length
  }, [matches, predictions])

  const exactCount = scores.reduce(
    (sum, s) => sum + ((s.score_breakdown as { exact?: boolean })?.exact ? 1 : 0),
    0
  )

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Welcome */}
      <div className="premium-panel premium-animated glass-gold rounded-[32px] border border-gold-300/25 px-5 py-7 md:px-8 md:py-9 overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-300/25 bg-gold-300/10 px-3 py-1.5 text-xs font-bold text-gold-200 mb-4">
              <Sparkles size={13} />
              Mundial 2026
            </div>
            <h2 className="premium-heading text-4xl md:text-6xl font-extrabold text-white leading-[1.02]">
              Cześć, <span className="gradient-text">{appUser?.profile.nickname}</span>
            </h2>
            <p className="text-sm md:text-base text-white/62 mt-3">
              {appUser?.group.name} · typuj przed pierwszym gwizdkiem i pilnuj pozycji w rankingu.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
            <div className="rounded-3xl border border-white/12 bg-white/7 px-4 py-3">
              <div className="text-xs text-white/48">Pozycja</div>
              <div className="premium-heading text-3xl font-extrabold text-gold-200">
                {myRank > 0 ? `#${myRank}` : '-'}
              </div>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/7 px-4 py-3">
              <div className="text-xs text-white/48">Punkty</div>
              <div className="premium-heading text-3xl font-extrabold text-white">
                {myEntry?.total_points ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card variant="gold" className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={14} className="text-gold-400" />
            <span className="text-xs text-white/50">Moje miejsce</span>
          </div>
          <div className="premium-heading text-3xl font-extrabold gradient-text">
            {myRank > 0 ? `#${myRank}` : '–'}
          </div>
          <div className="text-xs text-white/30 mt-0.5">
            {myEntry ? `${myEntry.total_points} pkt` : 'brak danych'}
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-blue-400" />
            <span className="text-xs text-white/50">Dokładne wyniki</span>
          </div>
          <div className="premium-heading text-3xl font-extrabold text-white">{exactCount}</div>
          <div className="text-xs text-white/30 mt-0.5">trafień</div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-green-400" />
            <span className="text-xs text-white/50">Pkt meczowe</span>
          </div>
          <div className="premium-heading text-3xl font-extrabold text-white">
            {myEntry?.match_points ?? 0}
          </div>
          <div className="text-xs text-white/30 mt-0.5">z meczów</div>
        </Card>

        <Card className={unpredicted > 0 ? 'p-4 md:p-5 border-orange-500/25' : 'p-4 md:p-5'}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle
              size={14}
              className={unpredicted > 0 ? 'text-orange-400' : 'text-white/30'}
            />
            <span className="text-xs text-white/50">Do obstawienia</span>
          </div>
          <div
            className={`premium-heading text-3xl font-extrabold ${unpredicted > 0 ? 'text-orange-400' : 'text-white/40'}`}
          >
            {unpredicted}
          </div>
          <div className="text-xs text-white/30 mt-0.5">meczów</div>
        </Card>
      </div>

      {/* Next match */}
      {nextMatches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="premium-heading text-sm font-bold text-white/72">
              Najbliższe mecze
            </h3>
            <span className="text-xs text-white/30">{formatMatchDate(nextMatches[0].kickoff_at)}</span>
          </div>
          {matchesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 glass rounded-[24px] border border-white/10 animate-shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nextMatches.map((match) => (
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
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-col gap-2">
        {[
          { to: '/matches', label: 'Wszystkie mecze', sub: `${matches.length} meczów` },
          { to: '/leaderboard', label: 'Ranking grupy', sub: `${entries.length} graczy` },
          { to: '/bonuses', label: 'Bonusy turniejowe', sub: 'Typ przed startem' },
        ].map(({ to, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between glass rounded-[22px] border border-white/10 px-4 py-4 hover:border-blue-300/35 hover:bg-blue-400/10 transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-white/35">{sub}</p>
            </div>
            <ChevronRight size={16} className="text-white/25" />
          </Link>
        ))}
      </div>
    </div>
  )
}
