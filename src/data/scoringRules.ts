import type { BonusType, GoalsRange, MatchPhase } from '@/types'

export const GROUP_SCORING = {
  exact: 5,
  outcome_and_diff: 3,
  outcome: 2,
  miss: 0,
} as const

export const KNOCKOUT_SCORING = {
  exact_90: 5,
  outcome_and_diff_90: 3,
  outcome_90: 2,
  correct_advance: 2,
  correct_resolution: 1,
  max_points: 8,
} as const

export const BONUS_SCORING: Record<BonusType, number | { sole: number; shared: number }> = {
  champion: 15,
  runner_up: 10,
  semifinalist_1: 4,
  semifinalist_2: 4,
  top_scorer: { sole: 10, shared: 7 },
  best_keeper: 8,
  best_player: 8,
  top_scoring_team: 8,
  total_goals_range: 5,
  final_penalties: 3,
}

export const BONUS_LABELS: Record<BonusType, string> = {
  champion: 'Mistrz Świata',
  runner_up: 'Wicemistrz Świata',
  semifinalist_1: 'Półfinalista 1',
  semifinalist_2: 'Półfinalista 2',
  top_scorer: 'Król Strzelców',
  best_keeper: 'Najlepszy Bramkarz',
  best_player: 'Najlepszy Zawodnik',
  top_scoring_team: 'Drużyna z Największą Liczbą Goli',
  total_goals_range: 'Przedział Łącznej Liczby Goli',
  final_penalties: 'Czy Finał Zakończy Się Karnymi?',
}

export const BONUS_DESCRIPTIONS: Record<BonusType, string> = {
  champion: '15 pkt za trafienie',
  runner_up: '10 pkt za trafienie',
  semifinalist_1: '4 pkt za trafienie',
  semifinalist_2: '4 pkt za trafienie',
  top_scorer: '10 pkt (sole) / 7 pkt (współlider)',
  best_keeper: '8 pkt za trafienie',
  best_player: '8 pkt za trafienie',
  top_scoring_team: '8 pkt za trafienie',
  total_goals_range: '5 pkt za trafienie',
  final_penalties: '3 pkt za trafienie',
}

export const GOALS_RANGES: GoalsRange[] = [
  { label: '0–99', min: 0, max: 99 },
  { label: '100–109', min: 100, max: 109 },
  { label: '110–119', min: 110, max: 119 },
  { label: '120–129', min: 120, max: 129 },
  { label: '130–139', min: 130, max: 139 },
  { label: '140–149', min: 140, max: 149 },
  { label: '150–159', min: 150, max: 159 },
  { label: '160–169', min: 160, max: 169 },
  { label: '170+', min: 170, max: 999 },
]

export const KNOCKOUT_PHASES: MatchPhase[] = [
  '1/16 finału',
  '1/8 finału',
  'Ćwierćfinał',
  'Półfinał',
  'Mecz o 3. miejsce',
  'Finał',
]

export function isKnockoutPhase(phase: string): boolean {
  return KNOCKOUT_PHASES.includes(phase as MatchPhase)
}

export const PHASE_ORDER: Record<string, number> = {
  'Grupa': 0,
  '1/16 finału': 1,
  '1/8 finału': 2,
  'Ćwierćfinał': 3,
  'Półfinał': 4,
  'Mecz o 3. miejsce': 5,
  'Finał': 6,
}
