import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { getDemoTournamentStats, isDemoMode } from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import type { TeamTournamentStats, PlayerTournamentStats } from '@/types'

const STATS_TABLES = [
  'team_tournament_stats',
  'player_tournament_stats',
  'match_events',
] as const

export function StatsPage() {
  const { appUser } = useAuth()
  const { matches } = useMatches()
  const [teamStats, setTeamStats] = useState<TeamTournamentStats[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerTournamentStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!appUser?.group.id) return
    if (isDemoMode()) {
      const demoStats = getDemoTournamentStats(appUser.group.id)
      setTeamStats(demoStats.teamStats)
      setPlayerStats(demoStats.playerStats)
      setLoading(false)
      return
    }

    const [t, p] = await Promise.all([
      supabase
        .from('team_tournament_stats')
        .select('*, teams (*)')
        .eq('group_id', appUser.group.id)
        .order('goals_scored', { ascending: false })
        .limit(20),
      supabase
        .from('player_tournament_stats')
        .select('*, players_catalog (*, teams (*))')
        .eq('group_id', appUser.group.id)
        .order('goals', { ascending: false })
        .limit(20),
    ])

    setTeamStats((t.data ?? []) as TeamTournamentStats[])
    setPlayerStats((p.data ?? []) as PlayerTournamentStats[])
    setLoading(false)
  }, [appUser?.group.id])

  useEffect(() => { fetchStats() }, [fetchStats])
  useRealtimeRefresh({
    channelName: appUser?.group.id ? `stats-${appUser.group.id}` : 'stats',
    tables: [...STATS_TABLES],
    enabled: Boolean(appUser?.group.id),
    onRefresh: fetchStats,
  })

  const tournamentSummary = useMemo(() => {
    const finished = matches.filter((match) => match.match_result?.is_confirmed)
    const totalGoals = finished.reduce(
      (sum, match) =>
        sum +
        (match.match_result?.home_goals_90 ?? 0) +
        (match.match_result?.away_goals_90 ?? 0),
      0
    )
    const draws = finished.filter((match) => match.match_result?.outcome === 'X').length
    const homeWins = finished.filter((match) => match.match_result?.outcome === '1').length
    const awayWins = finished.filter((match) => match.match_result?.outcome === '2').length
    const cleanSheets = finished.reduce((sum, match) => {
      const result = match.match_result
      if (!result) return sum
      return sum + (result.away_goals_90 === 0 ? 1 : 0) + (result.home_goals_90 === 0 ? 1 : 0)
    }, 0)
    const highestScoring = [...finished].sort((a, b) => {
      const aGoals = (a.match_result?.home_goals_90 ?? 0) + (a.match_result?.away_goals_90 ?? 0)
      const bGoals = (b.match_result?.home_goals_90 ?? 0) + (b.match_result?.away_goals_90 ?? 0)
      return bGoals - aGoals
    })[0]
    const biggestWin = [...finished].sort((a, b) => {
      const aDiff = Math.abs((a.match_result?.home_goals_90 ?? 0) - (a.match_result?.away_goals_90 ?? 0))
      const bDiff = Math.abs((b.match_result?.home_goals_90 ?? 0) - (b.match_result?.away_goals_90 ?? 0))
      return bDiff - aDiff
    })[0]

    return {
      finishedCount: finished.length,
      totalGoals,
      averageGoals: finished.length > 0 ? totalGoals / finished.length : 0,
      draws,
      homeWins,
      awayWins,
      cleanSheets,
      highestScoring,
      biggestWin,
    }
  }, [matches])

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <h1 className="premium-heading text-2xl font-extrabold text-white">Statystyki</h1>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-white/5 animate-shimmer" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Rozegrane mecze" value={tournamentSummary.finishedCount} />
            <StatTile label="Gole łącznie" value={tournamentSummary.totalGoals} accent="gold" />
            <StatTile label="Śr. goli/mecz" value={tournamentSummary.averageGoals.toFixed(2)} accent="blue" />
            <StatTile label="Czyste konta" value={tournamentSummary.cleanSheets} accent="green" />
          </div>

          <Card>
            <CardHeader>
              <h2 className="premium-heading text-sm font-bold text-white">Najważniejsze trendy</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TrendRow label="Wygrane gospodarzy" value={tournamentSummary.homeWins} />
              <TrendRow label="Remisy" value={tournamentSummary.draws} />
              <TrendRow label="Wygrane gości" value={tournamentSummary.awayWins} />
              <TrendRow
                label="Najwięcej goli w meczu"
                value={
                  tournamentSummary.highestScoring
                    ? `${tournamentSummary.highestScoring.home_team?.name ?? tournamentSummary.highestScoring.home_team_placeholder} ${tournamentSummary.highestScoring.match_result?.home_goals_90}:${tournamentSummary.highestScoring.match_result?.away_goals_90} ${tournamentSummary.highestScoring.away_team?.name ?? tournamentSummary.highestScoring.away_team_placeholder}`
                    : '-'
                }
              />
              <TrendRow
                label="Największe zwycięstwo"
                value={
                  tournamentSummary.biggestWin
                    ? `${tournamentSummary.biggestWin.home_team?.name ?? tournamentSummary.biggestWin.home_team_placeholder} ${tournamentSummary.biggestWin.match_result?.home_goals_90}:${tournamentSummary.biggestWin.match_result?.away_goals_90} ${tournamentSummary.biggestWin.away_team?.name ?? tournamentSummary.biggestWin.away_team_placeholder}`
                    : '-'
                }
              />
            </CardBody>
          </Card>

          {/* Top scorers */}
          <Card>
            <CardHeader>
              <h2 className="premium-heading text-sm font-bold text-white">Klasyfikacja strzelców</h2>
            </CardHeader>
            <CardBody>
              {playerStats.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">
                  Admin jeszcze nie wpisał statystyk zawodników
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {playerStats.slice(0, 10).map((ps, i) => (
                    <div key={ps.id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white/30 w-5 text-center">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {ps.players_catalog?.name ?? 'Nieznany'}
                        </p>
                        <p className="text-xs text-white/40">
                          {ps.players_catalog?.teams?.flag_emoji}{' '}
                          {ps.players_catalog?.teams?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="premium-heading text-base font-extrabold text-gold-200">{ps.goals}</span>
                        <span className="text-xs text-white/30 ml-1">goli</span>
                        <div className="text-[10px] text-white/28">{ps.assists} asyst</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Team stats */}
          <Card>
            <CardHeader>
              <h2 className="premium-heading text-sm font-bold text-white">Statystyki drużyn</h2>
            </CardHeader>
            <CardBody>
              {teamStats.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">
                  Admin jeszcze nie wpisał statystyk drużyn
                </p>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-white/30">
                        <th className="text-left pb-2">Drużyna</th>
                        <th className="text-right pb-2">M</th>
                        <th className="text-right pb-2">W</th>
                        <th className="text-right pb-2">R</th>
                        <th className="text-right pb-2">P</th>
                        <th className="text-right pb-2">G+</th>
                        <th className="text-right pb-2">G-</th>
                        <th className="text-right pb-2">Bilans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamStats.map((ts) => (
                        <tr key={ts.id} className="border-t border-white/5">
                          <td className="py-2 font-medium text-white">
                            {ts.teams?.flag_emoji} {ts.teams?.name}
                          </td>
                          <td className="py-2 text-right text-white/50">{ts.matches_played}</td>
                          <td className="py-2 text-right text-green-400">{ts.wins}</td>
                          <td className="py-2 text-right text-white/50">{ts.draws}</td>
                          <td className="py-2 text-right text-red-400">{ts.losses}</td>
                          <td className="py-2 text-right text-white/70">{ts.goals_scored}</td>
                          <td className="py-2 text-right text-white/40">{ts.goals_conceded}</td>
                          <td className="py-2 text-right text-gold-200">
                            {ts.goals_scored - ts.goals_conceded > 0 ? '+' : ''}
                            {ts.goals_scored - ts.goals_conceded}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  accent = 'white',
}: {
  label: string
  value: string | number
  accent?: 'white' | 'gold' | 'blue' | 'green'
}) {
  const colors = {
    white: 'text-white',
    gold: 'text-gold-200',
    blue: 'text-blue-300',
    green: 'text-green-300',
  }

  return (
    <Card className="p-4">
      <div className="text-xs text-white/42">{label}</div>
      <div className={`premium-heading text-3xl font-extrabold mt-1 ${colors[accent]}`}>
        {value}
      </div>
    </Card>
  )
}

function TrendRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-white/38">{label}</div>
      <div className="text-sm font-bold text-white/78 mt-1">{value}</div>
    </div>
  )
}
