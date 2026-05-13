// ─── Database row types (match Supabase table structure) ─────────────────────

export interface Group {
  id: string
  name: string
  slug: string
  invite_code: string
  owner_id: string
  bonus_deadline: string
  created_at: string
  settings: Record<string, unknown>
}

export interface Profile {
  id: string
  nickname: string
  created_at: string
}

export type MemberRole = 'player' | 'admin' | 'owner'

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  profiles?: Profile
}

export interface Team {
  id: number
  name: string
  flag_emoji: string
  group_code: string | null
  federation: string | null
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'
export type MatchPhase = 'Grupa' | '1/16 finału' | '1/8 finału' | 'Ćwierćfinał' | 'Półfinał' | 'Mecz o 3. miejsce' | 'Finał'
export type Resolution = '90min' | 'AET' | 'PEN'

export interface Match {
  id: number
  stage: string
  phase: MatchPhase
  group_code: string | null
  home_team_placeholder: string
  away_team_placeholder: string
  home_team_id: number | null
  away_team_id: number | null
  venue: string
  kickoff_at: string
  status: MatchStatus
  round_number: number | null
  home_team?: Team
  away_team?: Team
  match_result?: MatchResult | null
}

export interface MatchResult {
  id: string
  match_id: number
  home_goals_90: number
  away_goals_90: number
  home_goals_aet: number | null
  away_goals_aet: number | null
  home_goals_pen: number | null
  away_goals_pen: number | null
  outcome: '1' | 'X' | '2'
  winner_team_id: number | null
  resolution: Resolution | null
  is_confirmed: boolean
  entered_by: string
  created_at: string
  updated_at: string
}

export interface Prediction {
  id: string
  group_id: string
  user_id: string
  match_id: number
  home_goals: number
  away_goals: number
  advance_team_id: number | null
  resolution_prediction: Resolution | null
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'id' | 'nickname'>
  prediction_scores?: PredictionScore[]
}

export interface PredictionScore {
  id: string
  prediction_id: string
  group_id: string
  user_id: string
  match_id: number
  score_breakdown: ScoreBreakdown
  total_points: number
  calculated_at: string
}

export interface ScoreBreakdown {
  exact: boolean
  outcome: boolean
  goal_diff: boolean
  advance: boolean
  resolution: boolean
  points_exact: number
  points_outcome: number
  points_diff: number
  points_advance: number
  points_resolution: number
}

export type BonusType =
  | 'champion'
  | 'runner_up'
  | 'semifinalist_1'
  | 'semifinalist_2'
  | 'top_scorer'
  | 'best_keeper'
  | 'best_player'
  | 'top_scoring_team'
  | 'total_goals_range'
  | 'final_penalties'

export interface BonusPrediction {
  id: string
  group_id: string
  user_id: string
  bonus_type: BonusType
  value: BonusValue
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'id' | 'nickname'>
  bonus_scores?: BonusScore[]
}

export type BonusValue =
  | { team_id: number; team_name: string }
  | { team_ids: number[]; team_names: string[] }
  | { player_name: string; team_id?: number }
  | { min: number; max: number }
  | { answer: boolean }

export interface BonusScore {
  id: string
  bonus_prediction_id: string
  group_id: string
  user_id: string
  bonus_type: BonusType
  points: number
  notes: string | null
  calculated_at: string
}

export interface LeaderboardEntry {
  user_id: string
  nickname: string
  match_points: number
  bonus_points: number
  total_points: number
  exact_scores: number
  correct_outcomes: number
  correct_advances: number
  matches_predicted: number
  matches_total: number
  effectiveness: number
  last_5: Array<'W' | 'H' | 'M' | '-'>
}

export interface PlayerTournamentStats {
  id: string
  group_id: string
  player_id: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  updated_at: string
  players_catalog?: PlayerCatalog
}

export interface PlayerCatalog {
  id: number
  name: string
  team_id: number
  position: 'GK' | 'DF' | 'MF' | 'FW'
  teams?: Team
}

export type MatchEventType =
  | 'goal'
  | 'assist'
  | 'yellow_card'
  | 'red_card'
  | 'penalty_goal'
  | 'penalty_miss'
  | 'own_goal'

export interface MatchEvent {
  id: string
  match_id: number
  team_id: number | null
  player_id: number | null
  event_type: MatchEventType
  minute: number | null
  extra_minute: number | null
  payload: Record<string, unknown>
  created_at: string
  teams?: Team
  players_catalog?: PlayerCatalog
}

export interface TeamTournamentStats {
  id: string
  group_id: string
  team_id: number
  goals_scored: number
  goals_conceded: number
  matches_played: number
  wins: number
  draws: number
  losses: number
  updated_at: string
  teams?: Team
}

export interface SyncLog {
  id: string
  source: 'manual' | 'football-data.org'
  match_id: number | null
  status: 'success' | 'error' | 'info'
  message: string | null
  created_at: string
}

// ─── App-level types ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email?: string
}

export interface AppUser {
  auth: AuthUser
  profile: Profile
  member: GroupMember
  group: Group
}

export interface FixtureMatch {
  id: number
  stage: string
  phase: MatchPhase
  group: string | null
  home: string
  away: string
  venue: string
  kickoffUtc: string
}

export interface GoalsRange {
  label: string
  min: number
  max: number
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface LoginFormData {
  nickname: string
  password: string
}

export interface RegisterFormData {
  nickname: string
  password: string
  confirmPassword: string
}

export interface PredictionFormData {
  homeGoals: string
  awayGoals: string
  advanceTeamId?: number | null
  resolutionPrediction?: Resolution | null
}

export interface MatchResultFormData {
  homeGoals90: string
  awayGoals90: string
  homeGoalsAet?: string
  awayGoalsAet?: string
  homeGoalsPen?: string
  awayGoalsPen?: string
  winnerTeamId?: number | null
  resolution: Resolution
  isConfirmed: boolean
}
