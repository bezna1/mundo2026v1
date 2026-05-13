import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { getDemoTournamentStats, isDemoMode } from '@/lib/demoStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import type { Team, TeamTournamentStats, PlayerTournamentStats } from '@/types'

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
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [compareTeamId, setCompareTeamId] = useState('')

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

    const teamRows = teamStats.filter((row) => row.matches_played > 0)
    const bestAttack = [...teamRows].sort((a, b) => b.goals_scored - a.goals_scored)[0]
    const bestDefense = [...teamRows].sort(
      (a, b) => a.goals_conceded - b.goals_conceded || b.matches_played - a.matches_played
    )[0]
    const mostPoints = [...teamRows].sort(
      (a, b) => b.wins * 3 + b.draws - (a.wins * 3 + a.draws)
    )[0]

    return {
      finishedCount: finished.length,
      totalGoals,
      averageGoals: finished.length > 0 ? totalGoals / finished.length : 0,
      draws,
      decidedMatches: homeWins + awayWins,
      cleanSheets,
      highestScoring,
      biggestWin,
      bestAttack,
      bestDefense,
      mostPoints,
    }
  }, [matches, teamStats])

  const allTeams = useMemo(() => {
    const map = new Map<number, Team>()
    matches.forEach((match) => {
      if (match.home_team) map.set(match.home_team.id, match.home_team)
      if (match.away_team) map.set(match.away_team.id, match.away_team)
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  }, [matches])

  useEffect(() => {
    if (!selectedTeamId && allTeams[0]) {
      setSelectedTeamId(String(allTeams[0].id))
    }
  }, [allTeams, selectedTeamId])

  useEffect(() => {
    const firstActiveTeam = teamStats.find((row) => row.matches_played > 0)
    const selectedRow = teamStats.find((row) => String(row.team_id) === selectedTeamId)
    if (firstActiveTeam && (!selectedTeamId || !selectedRow || selectedRow.matches_played === 0)) {
      setSelectedTeamId(String(firstActiveTeam.team_id))
      setCompareTeamId('')
    }
  }, [selectedTeamId, teamStats])

  useEffect(() => {
    if (selectedTeamId && compareTeamId === selectedTeamId) {
      const fallback = allTeams.find((team) => String(team.id) !== selectedTeamId)
      setCompareTeamId(String(fallback?.id ?? ''))
      return
    }
    if (!selectedTeamId || compareTeamId) return
    const nextOpponent = matches.find((match) => {
      const hasSelected =
        match.home_team_id === Number(selectedTeamId) || match.away_team_id === Number(selectedTeamId)
      return hasSelected && !match.match_result?.is_confirmed
    })
    const opponentId =
      nextOpponent?.home_team_id === Number(selectedTeamId)
        ? nextOpponent?.away_team_id
        : nextOpponent?.home_team_id
    const fallback = allTeams.find((team) => String(team.id) !== selectedTeamId)
    setCompareTeamId(String(opponentId ?? fallback?.id ?? ''))
  }, [allTeams, compareTeamId, matches, selectedTeamId])

  const getTeamRow = (teamIdValue: string): TeamTournamentStats | null => {
    const teamId = Number(teamIdValue)
    if (!teamId) return null
    const existing = teamStats.find((row) => row.team_id === teamId)
    if (existing) return existing
    const team = allTeams.find((item) => item.id === teamId)
    if (!team) return null
    return {
      id: `empty-${team.id}`,
      group_id: appUser?.group.id ?? '',
      team_id: team.id,
      goals_scored: 0,
      goals_conceded: 0,
      matches_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      updated_at: new Date().toISOString(),
      teams: team,
    }
  }

  const selectedTeam = getTeamRow(selectedTeamId)
  const compareTeam = getTeamRow(compareTeamId)
  const rankedTeamStats = useMemo(() => {
    return [...teamStats].sort((a, b) => {
      const pointsA = a.wins * 3 + a.draws
      const pointsB = b.wins * 3 + b.draws
      return (
        pointsB - pointsA ||
        b.goals_scored - b.goals_conceded - (a.goals_scored - a.goals_conceded) ||
        b.goals_scored - a.goals_scored
      )
    })
  }, [teamStats])

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

          <Card variant="gold">
            <CardHeader>
              <h2 className="premium-heading text-sm font-bold text-gold-200">Drużyny w trakcie turnieju</h2>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TeamSelect
                  label="Drużyna"
                  value={selectedTeamId}
                  onChange={setSelectedTeamId}
                  teams={allTeams}
                />
                <TeamSelect
                  label="Porównaj z"
                  value={compareTeamId}
                  onChange={setCompareTeamId}
                  teams={allTeams.filter((team) => String(team.id) !== selectedTeamId)}
                />
              </div>

              {selectedTeam && compareTeam ? (
                <TeamComparison left={selectedTeam} right={compareTeam} />
              ) : (
                <p className="text-sm text-white/38 text-center py-4">
                  Wybierz dwie drużyny, żeby porównać ich statystyki.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="premium-heading text-sm font-bold text-white">Najważniejsze trendy</h2>
            </CardHeader>
            <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TrendRow label="Mecze rozstrzygnięte" value={tournamentSummary.decidedMatches} />
              <TrendRow label="Remisy" value={tournamentSummary.draws} />
              <TrendRow
                label="Lider tabeli turnieju"
                value={
                  tournamentSummary.mostPoints?.teams
                    ? `${tournamentSummary.mostPoints.teams.flag_emoji} ${tournamentSummary.mostPoints.teams.name} (${tournamentSummary.mostPoints.wins * 3 + tournamentSummary.mostPoints.draws} pkt)`
                    : '-'
                }
              />
              <TrendRow
                label="Najlepszy atak"
                value={
                  tournamentSummary.bestAttack?.teams
                    ? `${tournamentSummary.bestAttack.teams.flag_emoji} ${tournamentSummary.bestAttack.teams.name} (${tournamentSummary.bestAttack.goals_scored} goli)`
                    : '-'
                }
              />
              <TrendRow
                label="Najlepsza defensywa"
                value={
                  tournamentSummary.bestDefense?.teams
                    ? `${tournamentSummary.bestDefense.teams.flag_emoji} ${tournamentSummary.bestDefense.teams.name} (${tournamentSummary.bestDefense.goals_conceded} strac.)`
                    : '-'
                }
              />
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
              {rankedTeamStats.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">
                  Statystyki drużyn pojawią się po zatwierdzeniu pierwszych wyników
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
                      {rankedTeamStats.map((ts) => (
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

function TeamSelect({
  label,
  value,
  onChange,
  teams,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  teams: Team[]
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-white/46">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-2xl border border-white/12 px-4 py-3 text-sm font-semibold focus:outline-none focus:border-blue-300/55 focus:ring-2 focus:ring-blue-400/20"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id} style={{ color: '#102033' }}>
            {team.flag_emoji} {team.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function TeamComparison({
  left,
  right,
}: {
  left: TeamTournamentStats
  right: TeamTournamentStats
}) {
  const rows = [
    { label: 'Punkty', left: left.wins * 3 + left.draws, right: right.wins * 3 + right.draws },
    { label: 'Mecze', left: left.matches_played, right: right.matches_played },
    { label: 'Wygrane', left: left.wins, right: right.wins },
    { label: 'Remisy', left: left.draws, right: right.draws },
    { label: 'Porażki', left: left.losses, right: right.losses, lowerIsBetter: true },
    { label: 'Gole strzelone', left: left.goals_scored, right: right.goals_scored },
    { label: 'Gole stracone', left: left.goals_conceded, right: right.goals_conceded, lowerIsBetter: true },
    {
      label: 'Bilans',
      left: left.goals_scored - left.goals_conceded,
      right: right.goals_scored - right.goals_conceded,
    },
  ]

  const formatDiff = (value: number) => (value > 0 ? `+${value}` : String(value))

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-lg leading-none">{left.teams?.flag_emoji}</p>
          <p className="mt-1 text-sm font-black text-white truncate">{left.teams?.name}</p>
        </div>
        <span className="text-xs font-black text-white/26">vs</span>
        <div className="min-w-0 text-right">
          <p className="text-lg leading-none">{right.teams?.flag_emoji}</p>
          <p className="mt-1 text-sm font-black text-white truncate">{right.teams?.name}</p>
        </div>
      </div>
      <div className="flex flex-col">
        {rows.map((row) => {
          const leftWins = row.lowerIsBetter ? row.left < row.right : row.left > row.right
          const rightWins = row.lowerIsBetter ? row.right < row.left : row.right > row.left
          return (
            <div key={row.label} className="grid grid-cols-[64px_1fr_64px] items-center gap-3 px-4 py-2.5 border-t border-white/5 first:border-t-0">
              <span className={`text-right text-sm font-black ${leftWins ? 'text-gold-200' : 'text-white/62'}`}>
                {row.label === 'Bilans' ? formatDiff(row.left) : row.left}
              </span>
              <span className="text-center text-xs font-semibold text-white/42">{row.label}</span>
              <span className={`text-sm font-black ${rightWins ? 'text-gold-200' : 'text-white/62'}`}>
                {row.label === 'Bilans' ? formatDiff(row.right) : row.right}
              </span>
            </div>
          )
        })}
      </div>
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
