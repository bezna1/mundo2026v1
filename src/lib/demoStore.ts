import { WC_MATCHES, TEAM_FLAGS } from '@/data/fixtures'
import { isKnockoutPhase } from '@/data/scoringRules'
import { getAppNow } from '@/lib/clock'
import { calculateMatchScore } from '@/lib/scoring'
import type {
  AppUser,
  BonusPrediction,
  BonusType,
  BonusValue,
  Group,
  GroupMember,
  LeaderboardEntry,
  Match,
  Prediction,
  PredictionScore,
  PlayerTournamentStats,
  Profile,
  Resolution,
  Team,
  TeamTournamentStats,
} from '@/types'

const DEMO_PREFIX = 'mt_demo_'
const DEMO_GROUP_ID = 'demo-group-mundial2026'
const DEMO_INVITE_CODE = 'demo'
const DEMO_OWNER_ID = 'demo-owner'

interface DemoAccount {
  id: string
  groupSlug: string
  nickname: string
  password: string
  role: 'player' | 'admin' | 'owner'
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${DEMO_PREFIX}${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(`${DEMO_PREFIX}${key}`, JSON.stringify(value))
}

function normalizedNickname(value: string): string {
  return value.trim().toLowerCase()
}

function getAccounts(): DemoAccount[] {
  const accounts = readJson<DemoAccount[]>('accounts', [])
  if (accounts.length > 0) return accounts

  const seeded: DemoAccount[] = [
    {
      id: DEMO_OWNER_ID,
      groupSlug: getDefaultGroupSlug(),
      nickname: 'Admin',
      password: 'admin123',
      role: 'owner',
    },
    {
      id: 'demo-player-ola',
      groupSlug: getDefaultGroupSlug(),
      nickname: 'Ola',
      password: 'demo123',
      role: 'player',
    },
    {
      id: 'demo-player-kuba',
      groupSlug: getDefaultGroupSlug(),
      nickname: 'Kuba',
      password: 'demo123',
      role: 'player',
    },
  ]
  writeJson('accounts', seeded)
  return seeded
}

function saveAccounts(accounts: DemoAccount[]): void {
  writeJson('accounts', accounts)
}

export function getDefaultGroupSlug(): string {
  return import.meta.env.VITE_DEFAULT_GROUP_SLUG ?? 'mundial2026'
}

export function getDemoInviteCode(): string {
  return DEMO_INVITE_CODE
}

export function isDemoMode(): boolean {
  return !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
}

export function getDemoGroup(slug = getDefaultGroupSlug()): Group {
  return {
    id: DEMO_GROUP_ID,
    name: slug === 'mundial2026' ? 'Mundial 2026 Demo' : slug,
    slug,
    invite_code: DEMO_INVITE_CODE,
    owner_id: DEMO_OWNER_ID,
    bonus_deadline: '2026-06-11T17:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    settings: {},
  }
}

function accountToAppUser(account: DemoAccount): AppUser {
  const group = getDemoGroup(account.groupSlug)
  const profile: Profile = {
    id: account.id,
    nickname: account.nickname,
    created_at: '2026-01-01T00:00:00Z',
  }
  const member: GroupMember = {
    id: `${group.id}-${account.id}`,
    group_id: group.id,
    user_id: account.id,
    role: account.role,
    joined_at: '2026-01-01T00:00:00Z',
    profiles: profile,
  }
  return {
    auth: {
      id: account.id,
      email: `${group.slug}.${normalizedNickname(account.nickname)}@mundial-typer.local`,
    },
    profile,
    member,
    group,
  }
}

export function getDemoCurrentUser(): AppUser | null {
  const id = localStorage.getItem(`${DEMO_PREFIX}current_user_id`)
  if (!id) return null
  const account = getAccounts().find((item) => item.id === id)
  return account ? accountToAppUser(account) : null
}

export async function demoSignUp(
  groupSlug: string,
  inviteCode: string,
  nickname: string,
  password: string
): Promise<{ error: string | null }> {
  const expectedInvite = DEMO_INVITE_CODE
  if (inviteCode && inviteCode !== expectedInvite) {
    return { error: 'Nieprawidłowy kod zaproszenia w trybie demo. Użyj kodu demo.' }
  }

  const accounts = getAccounts()
  const taken = accounts.some(
    (account) =>
      account.groupSlug === groupSlug &&
      normalizedNickname(account.nickname) === normalizedNickname(nickname)
  )
  if (taken) return { error: 'Ten nick jest już zajęty w tej grupie.' }

  const account: DemoAccount = {
    id: `demo-${Date.now()}`,
    groupSlug,
    nickname: nickname.trim(),
    password,
    role: 'player',
  }
  saveAccounts([...accounts, account])
  localStorage.setItem(`${DEMO_PREFIX}current_user_id`, account.id)
  return { error: null }
}

export async function demoSignIn(
  groupSlug: string,
  nickname: string,
  password: string
): Promise<{ error: string | null }> {
  const account = getAccounts().find(
    (item) =>
      item.groupSlug === groupSlug &&
      normalizedNickname(item.nickname) === normalizedNickname(nickname) &&
      item.password === password
  )
  if (!account) return { error: 'Nieprawidłowy nick lub hasło.' }
  localStorage.setItem(`${DEMO_PREFIX}current_user_id`, account.id)
  return { error: null }
}

export async function demoSignOut(): Promise<void> {
  localStorage.removeItem(`${DEMO_PREFIX}current_user_id`)
}

function teamFromName(name: string, id: number): Team {
  return {
    id,
    name,
    flag_emoji: TEAM_FLAGS[name] ?? '🏳️',
    group_code: null,
    federation: null,
  }
}

export function getDemoMatches(): Match[] {
  const teams = new Map<string, Team>()
  let nextTeamId = 1

  return WC_MATCHES.map((fixture) => {
    const homeKnown = TEAM_FLAGS[fixture.home] != null
    const awayKnown = TEAM_FLAGS[fixture.away] != null
    let homeTeam: Team | undefined
    let awayTeam: Team | undefined

    if (homeKnown) {
      homeTeam = teams.get(fixture.home)
      if (!homeTeam) {
        homeTeam = teamFromName(fixture.home, nextTeamId++)
        teams.set(fixture.home, homeTeam)
      }
    }

    if (awayKnown) {
      awayTeam = teams.get(fixture.away)
      if (!awayTeam) {
        awayTeam = teamFromName(fixture.away, nextTeamId++)
        teams.set(fixture.away, awayTeam)
      }
    }

    return {
      id: fixture.id,
      stage: fixture.stage,
      phase: fixture.phase,
      group_code: fixture.group,
      home_team_placeholder: fixture.home,
      away_team_placeholder: fixture.away,
      home_team_id: homeTeam?.id ?? null,
      away_team_id: awayTeam?.id ?? null,
      home_team: homeTeam,
      away_team: awayTeam,
      venue: fixture.venue,
      kickoff_at: fixture.kickoffUtc,
      status: 'scheduled',
      round_number: null,
      match_result: null,
    }
  })
}

function predictionKey(groupId: string): string {
  return `predictions_${groupId}`
}

function resultKey(): string {
  return 'results'
}

function simulationKey(): string {
  return 'simulation_enabled'
}

function bonusKey(groupId: string): string {
  return `bonus_predictions_${groupId}`
}

function getDemoPredictions(groupId: string): Prediction[] {
  return readJson<Prediction[]>(predictionKey(groupId), [])
}

function saveDemoPredictions(groupId: string, predictions: Prediction[]): void {
  writeJson(predictionKey(groupId), predictions)
}

export function getDemoMatchResults(): Record<number, Match['match_result']> {
  return readJson<Record<number, Match['match_result']>>(resultKey(), {})
}

export function isDemoSimulationEnabled(): boolean {
  return readJson<boolean>(simulationKey(), false)
}

export function setDemoSimulationEnabled(enabled: boolean): void {
  writeJson(simulationKey(), enabled)
}

export function getDemoMatchesWithResults(): Match[] {
  const results = getDemoMatchResults()
  return getDemoMatches().map((match) => ({
    ...match,
    status: results[match.id]?.is_confirmed ? 'finished' : match.status,
    match_result: results[match.id] ?? null,
  }))
}

export function getDemoPredictionsWithScores(groupId: string): {
  predictions: Prediction[]
  scores: PredictionScore[]
} {
  const predictions = getDemoPredictions(groupId)
  const matches = getDemoMatchesWithResults()
  const scores: PredictionScore[] = []

  for (const prediction of predictions) {
    const match = matches.find((item) => item.id === prediction.match_id)
    if (!match?.match_result?.is_confirmed) continue
    const score = calculateMatchScore(prediction, match.match_result, match.phase)
    scores.push({
      id: `score-${prediction.id}`,
      prediction_id: prediction.id,
      group_id: prediction.group_id,
      user_id: prediction.user_id,
      match_id: prediction.match_id,
      score_breakdown: score.breakdown,
      total_points: score.total,
      calculated_at: new Date().toISOString(),
    })
  }

  return { predictions, scores }
}

export async function saveDemoPrediction(params: {
  groupId: string
  userId: string
  matchId: number
  homeGoals: number
  awayGoals: number
  advanceTeamId?: number | null
  resolutionPrediction?: Resolution | null
}): Promise<string | null> {
  const match = getDemoMatches().find((item) => item.id === params.matchId)
  if (!match) return 'Nie znaleziono meczu.'
  if (getAppNow() >= new Date(match.kickoff_at)) {
    return 'Mecz już się rozpoczął — typowanie zablokowane.'
  }
  if (params.homeGoals < 0 || params.awayGoals < 0) {
    return 'Wynik nie może być ujemny.'
  }

  const predictions = getDemoPredictions(params.groupId)
  const now = new Date().toISOString()
  const existing = predictions.find(
    (item) => item.user_id === params.userId && item.match_id === params.matchId
  )

  if (existing) {
    existing.home_goals = params.homeGoals
    existing.away_goals = params.awayGoals
    existing.advance_team_id = params.advanceTeamId ?? null
    existing.resolution_prediction = params.resolutionPrediction ?? null
    existing.updated_at = now
  } else {
    predictions.push({
      id: `pred-${params.userId}-${params.matchId}`,
      group_id: params.groupId,
      user_id: params.userId,
      match_id: params.matchId,
      home_goals: params.homeGoals,
      away_goals: params.awayGoals,
      advance_team_id: params.advanceTeamId ?? null,
      resolution_prediction: params.resolutionPrediction ?? null,
      created_at: now,
      updated_at: now,
    })
  }

  saveDemoPredictions(params.groupId, predictions)
  return null
}

export function getDemoVisiblePredictions(matchId: number, groupId: string): Array<{
  prediction_id: string
  user_id: string
  nickname: string
  home_goals: number
  away_goals: number
  total_points: number | null
}> {
  const match = getDemoMatchesWithResults().find((item) => item.id === matchId)
  if (!match || getAppNow() < new Date(match.kickoff_at)) return []

  const accounts = getAccounts()
  const { predictions, scores } = getDemoPredictionsWithScores(groupId)
  return predictions
    .filter((prediction) => prediction.match_id === matchId)
    .map((prediction) => ({
      prediction_id: prediction.id,
      user_id: prediction.user_id,
      nickname:
        accounts.find((account) => account.id === prediction.user_id)?.nickname ?? 'Gracz',
      home_goals: prediction.home_goals,
      away_goals: prediction.away_goals,
      total_points:
        scores.find((score) => score.prediction_id === prediction.id)?.total_points ?? null,
    }))
}

export function getDemoLeaderboard(groupId: string): LeaderboardEntry[] {
  const accounts = getAccounts()
  const { predictions, scores } = getDemoPredictionsWithScores(groupId)
  const totalMatches = getDemoMatches().length

  return accounts
    .filter((account) => account.groupSlug === getDefaultGroupSlug())
    .map((account) => {
      const userScores = scores.filter((score) => score.user_id === account.id)
      const exactScores = userScores.filter(
        (score) => score.score_breakdown.exact
      ).length
      const correctOutcomes = userScores.filter(
        (score) => score.score_breakdown.outcome
      ).length
      const correctAdvances = userScores.filter(
        (score) => score.score_breakdown.advance
      ).length
      const matchPoints = userScores.reduce((sum, score) => sum + score.total_points, 0)
      const predicted = predictions.filter((prediction) => prediction.user_id === account.id)

      return {
        user_id: account.id,
        nickname: account.nickname,
        match_points: matchPoints,
        bonus_points: 0,
        total_points: matchPoints,
        exact_scores: exactScores,
        correct_outcomes: correctOutcomes,
        correct_advances: correctAdvances,
        matches_predicted: predicted.length,
        matches_total: totalMatches,
        effectiveness: predicted.length > 0 ? (exactScores / predicted.length) * 100 : 0,
        last_5: userScores.slice(-5).map((score) => {
          if (score.total_points >= 5) return 'W'
          if (score.total_points >= 2) return 'H'
          return 'M'
        }),
      }
    })
    .sort((a, b) => b.total_points - a.total_points || b.exact_scores - a.exact_scores)
}

export function getDemoBonuses(groupId: string, userId: string): BonusPrediction[] {
  return readJson<BonusPrediction[]>(bonusKey(groupId), []).filter(
    (bonus) => bonus.user_id === userId
  )
}

export async function saveDemoBonus(params: {
  groupId: string
  userId: string
  bonusType: BonusType
  value: BonusValue
}): Promise<string | null> {
  const group = getDemoGroup()
  if (getAppNow() >= new Date(group.bonus_deadline)) {
    return 'Deadline bonusów minął.'
  }

  const bonuses = readJson<BonusPrediction[]>(bonusKey(params.groupId), [])
  const now = new Date().toISOString()
  const existing = bonuses.find(
    (bonus) => bonus.user_id === params.userId && bonus.bonus_type === params.bonusType
  )

  if (existing) {
    existing.value = params.value
    existing.updated_at = now
  } else {
    bonuses.push({
      id: `bonus-${params.userId}-${params.bonusType}`,
      group_id: params.groupId,
      user_id: params.userId,
      bonus_type: params.bonusType,
      value: params.value,
      created_at: now,
      updated_at: now,
    })
  }

  writeJson(bonusKey(params.groupId), bonuses)
  return null
}

export function saveDemoResult(params: {
  matchId: number
  homeGoals90: number
  awayGoals90: number
  winnerTeamId?: number | null
  resolution?: Resolution | null
  enteredBy: string
  confirmed: boolean
}): void {
  const results = getDemoMatchResults()
  const now = new Date().toISOString()
  results[params.matchId] = {
    id: `result-${params.matchId}`,
    match_id: params.matchId,
    home_goals_90: params.homeGoals90,
    away_goals_90: params.awayGoals90,
    home_goals_aet: null,
    away_goals_aet: null,
    home_goals_pen: null,
    away_goals_pen: null,
    outcome:
      params.homeGoals90 > params.awayGoals90
        ? '1'
        : params.homeGoals90 < params.awayGoals90
        ? '2'
        : 'X',
    winner_team_id: params.winnerTeamId ?? null,
    resolution: isKnockoutPhase(
      getDemoMatches().find((match) => match.id === params.matchId)?.phase ?? 'Grupa'
    )
      ? params.resolution ?? null
      : null,
    is_confirmed: params.confirmed,
    entered_by: params.enteredBy,
    created_at: now,
    updated_at: now,
  }
  writeJson(resultKey(), results)
}

function seededGoals(seed: number): [number, number] {
  const home = (seed * 7 + 1) % 4
  const away = (seed * 5 + 2) % 4
  return [home, away]
}

function ensureDemoPredictionsForMatch(groupId: string, match: Match): void {
  const predictions = getDemoPredictions(groupId)
  const accounts = getAccounts().filter((account) => account.groupSlug === getDefaultGroupSlug())
  let changed = false

  accounts.forEach((account, index) => {
    const exists = predictions.some(
      (prediction) => prediction.user_id === account.id && prediction.match_id === match.id
    )
    if (exists) return

    const [homeGoals, awayGoals] = seededGoals(match.id + index)
    predictions.push({
      id: `pred-${account.id}-${match.id}`,
      group_id: groupId,
      user_id: account.id,
      match_id: match.id,
      home_goals: homeGoals,
      away_goals: awayGoals,
      advance_team_id:
        homeGoals >= awayGoals ? match.home_team_id ?? null : match.away_team_id ?? null,
      resolution_prediction: isKnockoutPhase(match.phase) ? '90min' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    changed = true
  })

  if (changed) saveDemoPredictions(groupId, predictions)
}

export function runDemoSimulationStep(groupId: string): void {
  if (!isDemoSimulationEnabled()) return

  const results = getDemoMatchResults()
  const now = getAppNow()

  getDemoMatches().forEach((match) => {
    ensureDemoPredictionsForMatch(groupId, match)

    const matchEnd = new Date(match.kickoff_at)
    matchEnd.setMinutes(matchEnd.getMinutes() + 120)
    if (now < matchEnd || results[match.id]?.is_confirmed) return

    let [homeGoals90, awayGoals90] = seededGoals(match.id)
    let winnerTeamId: number | null = null
    let resolution: Resolution | null = null

    if (isKnockoutPhase(match.phase)) {
      resolution = homeGoals90 === awayGoals90 ? 'PEN' : '90min'
      winnerTeamId =
        homeGoals90 >= awayGoals90 ? match.home_team_id ?? null : match.away_team_id ?? null
    }

    if (!isKnockoutPhase(match.phase) && match.id % 9 === 0) {
      awayGoals90 = homeGoals90
    }

    results[match.id] = {
      id: `result-${match.id}`,
      match_id: match.id,
      home_goals_90: homeGoals90,
      away_goals_90: awayGoals90,
      home_goals_aet: null,
      away_goals_aet: null,
      home_goals_pen: resolution === 'PEN' ? 4 : null,
      away_goals_pen: resolution === 'PEN' ? 3 : null,
      outcome:
        homeGoals90 > awayGoals90 ? '1' : homeGoals90 < awayGoals90 ? '2' : 'X',
      winner_team_id: winnerTeamId,
      resolution,
      is_confirmed: true,
      entered_by: DEMO_OWNER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  writeJson(resultKey(), results)
}

export function getDemoTournamentStats(groupId: string): {
  teamStats: TeamTournamentStats[]
  playerStats: PlayerTournamentStats[]
} {
  const rows = new Map<number, TeamTournamentStats>()
  const players: PlayerTournamentStats[] = []

  getDemoMatchesWithResults()
    .filter((match) => match.match_result?.is_confirmed)
    .forEach((match) => {
      const result = match.match_result!
      const teams = [
        { team: match.home_team, goalsFor: result.home_goals_90, goalsAgainst: result.away_goals_90 },
        { team: match.away_team, goalsFor: result.away_goals_90, goalsAgainst: result.home_goals_90 },
      ]

      teams.forEach(({ team, goalsFor, goalsAgainst }) => {
        if (!team) return
        const existing =
          rows.get(team.id) ??
          ({
            id: `demo-team-stat-${team.id}`,
            group_id: groupId,
            team_id: team.id,
            goals_scored: 0,
            goals_conceded: 0,
            matches_played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            updated_at: new Date().toISOString(),
            teams: team,
          } satisfies TeamTournamentStats)

        existing.matches_played += 1
        existing.goals_scored += goalsFor
        existing.goals_conceded += goalsAgainst
        if (goalsFor > goalsAgainst) existing.wins += 1
        else if (goalsFor < goalsAgainst) existing.losses += 1
        else existing.draws += 1
        rows.set(team.id, existing)
      })
    })

  Array.from(rows.values())
    .sort((a, b) => b.goals_scored - a.goals_scored)
    .slice(0, 10)
    .forEach((team, index) => {
      if (!team.teams) return
      players.push({
        id: `demo-player-stat-${team.team_id}`,
        group_id: groupId,
        player_id: 10000 + team.team_id,
        goals: Math.max(1, Math.ceil(team.goals_scored / 2) - (index % 2)),
        assists: Math.max(0, Math.floor(team.goals_scored / 3)),
        yellow_cards: index % 4,
        red_cards: index === 0 ? 0 : index % 7 === 0 ? 1 : 0,
        updated_at: new Date().toISOString(),
        players_catalog: {
          id: 10000 + team.team_id,
          name: `Lider ${team.teams.name}`,
          team_id: team.team_id,
          position: index % 3 === 0 ? 'FW' : 'MF',
          teams: team.teams,
        },
      })
    })

  return {
    teamStats: Array.from(rows.values()).sort((a, b) => b.goals_scored - a.goals_scored),
    playerStats: players.sort((a, b) => b.goals - a.goals),
  }
}
