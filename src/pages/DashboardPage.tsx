import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useMatchPredictions, usePredictions } from '@/hooks/usePredictions'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { MatchCard } from '@/components/match/MatchCard'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatMatchDate, formatMatchTimeOnly, isMatchStarted } from '@/lib/dates'
import { getAppNow } from '@/lib/clock'
import { getOutcomeDisplayLabel, getOutcomeLabel, cn } from '@/lib/utils'
import { ChevronRight, Target, Trophy, AlertCircle, Zap, Sparkles, Eye } from 'lucide-react'
import type { Match } from '@/types'

const ARCHIVE_SLIDE_INTERVAL_MS = 20_000

const ARCHIVE_SLIDES = [
  {
    src: `${import.meta.env.BASE_URL}archive/archive-01.jpg`,
    caption: 'Polska - Argentyna, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-02.jpg`,
    caption: 'Grzegorz Lato, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-03.jpg`,
    caption: 'Polska - Argentyna, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-04.jpg`,
    caption: 'Haiti - Polska, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-05.jpg`,
    caption: 'Polska - Włochy, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-06.jpg`,
    caption: 'Andrzej Szarmach, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-07.jpg`,
    caption: 'Polska - Włochy, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-08.jpg`,
    caption: 'Szwecja - Polska, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-09.jpg`,
    caption: 'Kazimierz Deyna, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-10.jpg`,
    caption: 'Polska - Brazylia, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-11.jpg`,
    caption: 'Polska - Brazylia, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-12.jpg`,
    caption: 'Adam Musiał, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-13.jpg`,
    caption: 'Polska - Brazylia, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-14.jpg`,
    caption: 'Jacek Gmoch, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-15.jpg`,
    caption: 'Jacek Gmoch, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-16.jpg`,
    caption: 'Kadr archiwalny, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-17.jpg`,
    caption: 'Kadr archiwalny, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-18.jpg`,
    caption: 'Kadr archiwalny, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-19.jpg`,
    caption: 'Kadr archiwalny, MŚ 1974',
  },
  {
    src: `${import.meta.env.BASE_URL}archive/archive-20.jpg`,
    caption: 'Kadr archiwalny, MŚ 1974',
  },
]

type DashboardTab = 'start' | 'revealed'

export function DashboardPage() {
  const { appUser } = useAuth()
  const { matches, loading: matchesLoading } = useMatches()
  const { predictions, scores, savePrediction } = usePredictions(appUser?.group.id)
  const { entries } = useLeaderboard(appUser?.group.id)
  const [tab, setTab] = useState<DashboardTab>('start')
  const [activeArchiveIndex, setActiveArchiveIndex] = useState(0)
  const [clockNow, setClockNow] = useState(() => getAppNow())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveArchiveIndex((index) => (index + 1) % ARCHIVE_SLIDES.length)
    }, ARCHIVE_SLIDE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const tick = () => setClockNow(getAppNow())
    const timer = window.setInterval(tick, 1_000)
    window.addEventListener('mt-demo-clock', tick)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('mt-demo-clock', tick)
    }
  }, [])

  const nextMatches = useMemo(() => {
    return matches
      .filter((m) => !isMatchStarted(m.kickoff_at) && m.status === 'scheduled')
      .slice(0, 6)
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
  const clockTime = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(clockNow)
  const clockDate = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(clockNow)

  const startedMatches = useMemo(() => {
    return matches
      .filter((m) => isMatchStarted(m.kickoff_at))
      .sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime())
  }, [matches])

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Welcome */}
      <div className="archive-hero premium-panel rounded-[32px] border border-gold-300/25 px-5 py-7 md:px-8 md:py-9 overflow-hidden">
        <div className="absolute inset-0">
          {ARCHIVE_SLIDES.map((slide, index) => (
            <img
              key={`${slide.src}-${index}`}
              src={slide.src}
              alt={slide.caption}
              className={cn(
                'archive-hero-image absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out',
                index === activeArchiveIndex ? 'opacity-100' : 'opacity-0'
              )}
              loading={index < 2 ? 'eager' : 'lazy'}
              aria-hidden={index !== activeArchiveIndex}
            />
          ))}
        </div>
        <div className="archive-hero-overlay absolute inset-0" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6 items-end min-h-[300px] md:min-h-[320px]">
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
          <div className="flex flex-col gap-3">
            <div className="rounded-3xl border border-white/18 bg-navy-900/52 px-4 py-3 backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold-200">
                Czas aplikacji
              </p>
              <p className="premium-heading mt-1 text-3xl font-extrabold text-white tabular-nums leading-none">
                {clockTime}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/58">
                {clockDate}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/5 p-1">
        {[
          { id: 'start' as const, label: 'Menu' },
          { id: 'revealed' as const, label: 'Typy po gwizdku' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-[18px] px-3 py-2.5 text-sm font-bold transition-all',
              tab === item.id
                ? 'bg-gold-300 text-navy-900 shadow-gold'
                : 'text-white/48 hover:text-white/76'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'revealed' && (
        <RevealedPredictionsPanel
          groupId={appUser?.group.id}
          matches={startedMatches}
          currentUserId={appUser?.auth.id}
        />
      )}

      {/* Stats row */}
      {tab === 'start' && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>}

      {/* Next match */}
      {tab === 'start' && nextMatches.length > 0 && (
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
      {tab === 'start' && <div className="flex flex-col gap-2">
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
      </div>}
    </div>
  )
}

function RevealedPredictionsPanel({
  groupId,
  matches,
  currentUserId,
}: {
  groupId?: string
  matches: Match[]
  currentUserId?: string
}) {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(matches[0]?.id ?? null)
  const selectedMatch =
    selectedMatchId == null ? null : matches.find((match) => match.id === selectedMatchId) ?? null

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedMatchId(null)
      return
    }
    if (selectedMatchId != null && !matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id)
    }
  }, [matches, selectedMatchId])

  if (matches.length === 0) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <Eye size={28} className="mx-auto text-white/18 mb-3" />
          <p className="text-sm font-semibold text-white/62">Typy graczy pojawią się po pierwszym gwizdku.</p>
          <p className="mt-1 text-xs text-white/34">Do tego czasu każdy widzi tylko własne obstawienia.</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((match) => (
        <RevealedMatchBlock
          key={match.id}
          groupId={groupId}
          match={match}
          currentUserId={currentUserId}
          expanded={selectedMatch?.id === match.id}
          onToggle={() => setSelectedMatchId(selectedMatch?.id === match.id ? null : match.id)}
        />
      ))}
    </div>
  )
}

function RevealedMatchBlock({
  groupId,
  match,
  currentUserId,
  expanded,
  onToggle,
}: {
  groupId?: string
  match: Match
  currentUserId?: string
  expanded: boolean
  onToggle: () => void
}) {
  const homeName = match.home_team?.name ?? match.home_team_placeholder
  const awayName = match.away_team?.name ?? match.away_team_placeholder

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/36">
              {formatMatchDate(match.kickoff_at)}, {formatMatchTimeOnly(match.kickoff_at)}
            </p>
            <h3 className="premium-heading text-base font-extrabold text-white">
              {homeName} - {awayName}
            </h3>
            <p className="text-xs text-white/38">
              {expanded ? 'Kliknij, aby zwinąć typy' : 'Kliknij, aby zobaczyć ujawnione typy'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="blue" size="sm">Po gwizdku</Badge>
            <span className={cn('text-lg leading-none text-white/34 transition-transform', expanded && 'rotate-180')}>
              ˅
            </span>
          </div>
        </button>

        {expanded && (
          <RevealedMatchPredictionsList
            groupId={groupId}
            match={match}
            currentUserId={currentUserId}
          />
        )}
      </CardBody>
    </Card>
  )
}

function RevealedMatchPredictionsList({
  groupId,
  match,
  currentUserId,
}: {
  groupId?: string
  match: Match
  currentUserId?: string
}) {
  const { predictions, loading } = useMatchPredictions(match.id, groupId)
  const homeName = match.home_team?.name ?? match.home_team_placeholder
  const awayName = match.away_team?.name ?? match.away_team_placeholder

  return (
    <div className="border-t border-white/8 pt-4">

        {loading ? (
          <div className="h-20 rounded-2xl animate-shimmer" />
        ) : predictions.length === 0 ? (
          <p className="text-sm text-white/34 text-center py-5">
            Brak typów dla tego meczu.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {predictions.map((prediction) => {
              const outcome = getOutcomeLabel(prediction.home_goals, prediction.away_goals)
              const isMe = prediction.user_id === currentUserId
              return (
                <div
                  key={prediction.prediction_id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5',
                    isMe ? 'border-gold-300/25 bg-gold-300/8' : 'border-white/8 bg-white/4'
                  )}
                >
                  <span className={cn('text-sm font-bold', isMe ? 'text-gold-300' : 'text-white/74')}>
                    {prediction.nickname}{isMe ? ' (ty)' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="premium-heading text-lg font-extrabold text-white">
                      {prediction.home_goals} : {prediction.away_goals}
                    </span>
                    <Badge variant="outcome" outcome={outcome} size="sm">
                      {getOutcomeDisplayLabel(outcome, homeName, awayName)}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
