import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBonusPredictions } from '@/hooks/useGroup'
import { ALL_TEAMS, getFlag } from '@/data/fixtures'
import { BONUS_LABELS, BONUS_DESCRIPTIONS, GOALS_RANGES } from '@/data/scoringRules'
import { formatDeadline, isPast } from '@/lib/dates'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Lock, Star } from 'lucide-react'
import type { BonusType, BonusValue } from '@/types'
import { cn } from '@/lib/utils'

function TeamSelector({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (name: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto scrollbar-thin">
      {ALL_TEAMS.map((team) => (
        <button
          key={team}
          onClick={() => !disabled && onChange(team)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
            value === team
              ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
              : 'border-white/8 text-white/50 hover:border-white/20 hover:text-white/80',
            disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          <span>{getFlag(team)}</span>
          <span className="truncate max-w-[80px]">{team}</span>
        </button>
      ))}
    </div>
  )
}

interface BonusCardProps {
  bonusType: BonusType
  currentValue: BonusValue | null
  points?: number
  locked: boolean
  onSave: (value: unknown) => Promise<void>
}

function BonusCard({ bonusType, currentValue, points, locked, onSave }: BonusCardProps) {
  const [editing, setEditing] = useState(false)
  const [teamName, setTeamName] = useState(
    (currentValue as { team_name?: string })?.team_name ?? ''
  )
  const [playerName, setPlayerName] = useState(
    (currentValue as { player_name?: string })?.player_name ?? ''
  )
  const [rangeMin, setRangeMin] = useState(
    (currentValue as { min?: number })?.min ?? 0
  )
  const [penaltiesAnswer, setPenaltiesAnswer] = useState<boolean | null>(
    (currentValue as { answer?: boolean })?.answer ?? null
  )
  const [saving, setSaving] = useState(false)

  const label = BONUS_LABELS[bonusType]
  const desc = BONUS_DESCRIPTIONS[bonusType]

  const isTeamType = ['champion', 'runner_up', 'semifinalist_1', 'semifinalist_2', 'top_scoring_team'].includes(bonusType)
  const isPlayerType = ['top_scorer', 'best_keeper', 'best_player'].includes(bonusType)
  const isRange = bonusType === 'total_goals_range'
  const isPenalties = bonusType === 'final_penalties'

  const handleSave = async () => {
    setSaving(true)
    let value: unknown
    if (isTeamType) value = { team_name: teamName }
    else if (isPlayerType) value = { player_name: playerName }
    else if (isRange) {
      const range = GOALS_RANGES.find((r) => r.min === rangeMin)
      value = range ? { min: range.min, max: range.max } : null
    } else if (isPenalties) value = { answer: penaltiesAnswer }
    if (value != null) {
      await onSave(value)
      setEditing(false)
    }
    setSaving(false)
  }

  const currentDisplay = (() => {
    if (isTeamType) return (currentValue as { team_name?: string })?.team_name
    if (isPlayerType) return (currentValue as { player_name?: string })?.player_name
    if (isRange) {
      const r = GOALS_RANGES.find((g) => g.min === (currentValue as { min?: number })?.min)
      return r?.label
    }
    if (isPenalties) {
      const a = (currentValue as { answer?: boolean })?.answer
      return a === true ? 'Tak' : a === false ? 'Nie' : undefined
    }
  })()

  return (
    <Card variant={points != null && points > 0 ? 'gold' : 'default'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{label}</h3>
            <p className="text-xs text-white/35 mt-0.5">{desc}</p>
          </div>
          {locked ? (
            <Lock size={14} className="text-white/20" />
          ) : (
            <Star size={14} className="text-gold-400/60" />
          )}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {/* Current value */}
        {currentDisplay && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Twój typ:</span>
            <span className="text-sm font-bold text-white">{currentDisplay}</span>
            {points != null && (
              <Badge variant={points > 0 ? 'green' : 'default'} size="sm">
                {points > 0 ? `+${points} pkt` : '0 pkt'}
              </Badge>
            )}
          </div>
        )}

        {!locked && (
          <>
            {!editing ? (
              <Button
                variant="gold"
                size="sm"
                onClick={() => setEditing(true)}
                className="w-full"
              >
                {currentDisplay ? 'Zmień typ' : 'Dodaj typ'}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                {isTeamType && (
                  <TeamSelector
                    value={teamName}
                    onChange={setTeamName}
                    disabled={locked}
                  />
                )}
                {isPlayerType && (
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Imię i nazwisko zawodnika"
                    className="w-full bg-navy-500 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold-500"
                  />
                )}
                {isRange && (
                  <div className="flex flex-wrap gap-1.5">
                    {GOALS_RANGES.map((r) => (
                      <button
                        key={r.min}
                        onClick={() => setRangeMin(r.min)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                          rangeMin === r.min
                            ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
                            : 'border-white/10 text-white/50 hover:border-white/20'
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
                {isPenalties && (
                  <div className="flex gap-2">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        onClick={() => setPenaltiesAnswer(v)}
                        className={cn(
                          'flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all',
                          penaltiesAnswer === v
                            ? 'border-gold-500/50 bg-gold-500/10 text-gold-400'
                            : 'border-white/10 text-white/50 hover:border-white/20'
                        )}
                      >
                        {v ? 'Tak' : 'Nie'}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Anuluj
                  </Button>
                  <Button variant="primary" size="sm" loading={saving} onClick={handleSave} className="flex-1">
                    Zapisz
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

export function BonusesPage() {
  const { appUser } = useAuth()
  const { bonuses, saveBonusPrediction } = useBonusPredictions(appUser?.group.id)

  const deadline = appUser?.group.bonus_deadline ?? ''
  const locked = deadline ? isPast(deadline) : false

  const bonusTypes: BonusType[] = [
    'champion', 'runner_up', 'semifinalist_1', 'semifinalist_2',
    'top_scorer', 'best_keeper', 'best_player',
    'top_scoring_team', 'total_goals_range', 'final_penalties',
  ]

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-black text-white">Bonusy turniejowe</h1>
        {deadline && (
          <p className={cn('text-xs mt-1', locked ? 'text-red-400' : 'text-white/40')}>
            {locked ? '🔒 Deadline minął — ' : '⏰ Deadline: '}
            {formatDeadline(deadline)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {bonusTypes.map((type) => {
          const bonus = bonuses.find((b) => b.bonus_type === type)
          const score = bonus?.bonus_scores?.[0]
          return (
            <BonusCard
              key={type}
              bonusType={type}
              currentValue={bonus?.value ?? null}
              points={score?.points}
              locked={locked}
              onSave={async (value) => {
                await saveBonusPrediction(type, value)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
