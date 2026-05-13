import { isKnockoutPhase } from '@/data/scoringRules'
import type {
  MatchPhase as AppMatchPhase,
  MatchResult,
  Prediction,
  ScoreBreakdown as AppScoreBreakdown,
} from '@/types'

export type MatchPhase = 'group' | 'knockout'

export type Decision = '90' | 'AET' | 'PEN' | 'DRAW'

export interface PredictionInput {
  homeGoals90: number
  awayGoals90: number
  predictedWinnerTeamId?: string | null
  predictedDecision?: Decision | null
}

export interface ResultInput {
  homeGoals90: number
  awayGoals90: number
  winnerTeamId?: string | null
  decision?: Decision | null
}

export interface ScoreBreakdown {
  total: number
  exactScore: boolean
  correctOutcome: boolean
  correctGoalDifference: boolean
  correctAdvancingTeam: boolean
  correctDecision: boolean
  parts: {
    score90: number
    advancingTeam: number
    decision: number
  }
}

function sign(value: number): -1 | 0 | 1 {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

export function scoreMatchPrediction(
  phase: MatchPhase,
  prediction: PredictionInput,
  result: ResultInput
): ScoreBreakdown {
  const predictedDiff = prediction.homeGoals90 - prediction.awayGoals90
  const resultDiff = result.homeGoals90 - result.awayGoals90

  const exactScore =
    prediction.homeGoals90 === result.homeGoals90 &&
    prediction.awayGoals90 === result.awayGoals90

  const correctOutcome = sign(predictedDiff) === sign(resultDiff)
  const correctGoalDifference = predictedDiff === resultDiff

  let score90 = 0
  if (exactScore) {
    score90 = 5
  } else if (correctOutcome && correctGoalDifference) {
    score90 = 3
  } else if (correctOutcome) {
    score90 = 2
  }

  const correctAdvancingTeam =
    phase === 'knockout' &&
    !!prediction.predictedWinnerTeamId &&
    !!result.winnerTeamId &&
    prediction.predictedWinnerTeamId === result.winnerTeamId

  const correctDecision =
    phase === 'knockout' &&
    !!prediction.predictedDecision &&
    !!result.decision &&
    prediction.predictedDecision === result.decision

  const advancingTeamPoints = correctAdvancingTeam ? 2 : 0
  const decisionPoints = correctDecision ? 1 : 0

  const total =
    phase === 'knockout'
      ? score90 + advancingTeamPoints + decisionPoints
      : score90

  return {
    total,
    exactScore,
    correctOutcome,
    correctGoalDifference,
    correctAdvancingTeam,
    correctDecision,
    parts: {
      score90,
      advancingTeam: advancingTeamPoints,
      decision: decisionPoints,
    },
  }
}

function toDecision(value: MatchResult['resolution']): Decision | null {
  if (value === '90min') return '90'
  if (value === 'AET') return 'AET'
  if (value === 'PEN') return 'PEN'
  return null
}

function toAppBreakdown(score: ScoreBreakdown): AppScoreBreakdown {
  return {
    exact: score.exactScore,
    outcome: score.correctOutcome,
    goal_diff: score.correctGoalDifference,
    advance: score.correctAdvancingTeam,
    resolution: score.correctDecision,
    points_exact: score.exactScore ? score.parts.score90 : 0,
    points_outcome: score.exactScore ? 0 : score.parts.score90,
    points_diff: 0,
    points_advance: score.parts.advancingTeam,
    points_resolution: score.parts.decision,
  }
}

export function calculateMatchScore(
  prediction: Prediction,
  result: MatchResult,
  phase: AppMatchPhase | string
): { breakdown: AppScoreBreakdown; total: number } {
  const normalizedPhase: MatchPhase = isKnockoutPhase(phase) ? 'knockout' : 'group'
  const score = scoreMatchPrediction(
    normalizedPhase,
    {
      homeGoals90: prediction.home_goals,
      awayGoals90: prediction.away_goals,
      predictedWinnerTeamId: prediction.advance_team_id?.toString() ?? null,
      predictedDecision: toDecision(prediction.resolution_prediction),
    },
    {
      homeGoals90: result.home_goals_90,
      awayGoals90: result.away_goals_90,
      winnerTeamId: result.winner_team_id?.toString() ?? null,
      decision: toDecision(result.resolution),
    }
  )

  return {
    breakdown: toAppBreakdown(score),
    total: score.total,
  }
}
