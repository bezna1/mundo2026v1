import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Resolution } from '@/types'

interface ScoreInputProps {
  homeGoals: string
  awayGoals: string
  onHomeChange: (v: string) => void
  onAwayChange: (v: string) => void
  disabled?: boolean
  homeName: string
  awayName: string
  isKnockout?: boolean
  advanceTeamId?: number | null
  resolutionPrediction?: Resolution | null
  homeTeamId?: number | null
  awayTeamId?: number | null
  onAdvanceChange?: (id: number | null) => void
  onResolutionChange?: (r: Resolution | null) => void
}

export function ScoreInput({
  homeGoals,
  awayGoals,
  onHomeChange,
  onAwayChange,
  disabled,
  homeName,
  awayName,
  isKnockout,
  advanceTeamId,
  resolutionPrediction,
  homeTeamId,
  awayTeamId,
  onAdvanceChange,
  onResolutionChange,
}: ScoreInputProps) {
  const homeN = parseInt(homeGoals, 10)
  const awayN = parseInt(awayGoals, 10)
  const isTie = !isNaN(homeN) && !isNaN(awayN) && homeN === awayN

  const changeGoals = (currentValue: string, onChange: (v: string) => void, delta: number) => {
    const current = parseInt(currentValue, 10)
    const next = Math.min(99, Math.max(0, (isNaN(current) ? 0 : current) + delta))
    onChange(String(next))
  }

  const stepButton =
    'w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl sm:rounded-2xl border border-white/12 bg-white/7 text-lg font-black text-white/72 transition-all hover:border-blue-300/35 hover:text-white active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-col gap-4">
      {/* Score row */}
      <div className="score-input-row flex items-center justify-center gap-1.5 sm:gap-5">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs font-semibold text-white/56 text-center truncate max-w-full px-1">
            {homeName}
          </span>
          <div className="flex items-center gap-1 sm:gap-2 max-w-full">
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeGoals(homeGoals, onHomeChange, -1)}
              className={stepButton}
              aria-label={`Zmniejsz wynik ${homeName}`}
            >
              -
            </button>
            <input
              type="number"
              min={0}
              max={99}
              inputMode="numeric"
              value={homeGoals}
              onChange={(e) => onHomeChange(e.target.value)}
              disabled={disabled}
              className={cn(
                'score-input',
                homeGoals !== '' && 'score-input-selected',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              placeholder="0"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeGoals(homeGoals, onHomeChange, 1)}
              className={stepButton}
              aria-label={`Zwiększ wynik ${homeName}`}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className="premium-heading text-3xl font-extrabold text-white/24 mt-7 hidden sm:block">:</span>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs font-semibold text-white/56 text-center truncate max-w-full px-1">
            {awayName}
          </span>
          <div className="flex items-center gap-1 sm:gap-2 max-w-full">
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeGoals(awayGoals, onAwayChange, -1)}
              className={stepButton}
              aria-label={`Zmniejsz wynik ${awayName}`}
            >
              -
            </button>
            <input
              type="number"
              min={0}
              max={99}
              inputMode="numeric"
              value={awayGoals}
              onChange={(e) => onAwayChange(e.target.value)}
              disabled={disabled}
              className={cn(
                'score-input',
                awayGoals !== '' && 'score-input-selected',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              placeholder="0"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeGoals(awayGoals, onAwayChange, 1)}
              className={stepButton}
              aria-label={`Zwiększ wynik ${awayName}`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Knockout extras */}
      {isKnockout && !disabled && (
        <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
          {/* Who advances */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-white/56">Kto awansuje?</span>
            <div className="flex gap-2">
              {homeTeamId != null && (
                <button
                  onClick={() => onAdvanceChange?.(homeTeamId)}
                  className={cn(
                    'flex-1 py-3 text-xs font-bold rounded-2xl border transition-all',
                    advanceTeamId === homeTeamId
                      ? 'border-gold-300/50 bg-gold-300/12 text-gold-200'
                      : 'border-white/12 text-white/54 hover:border-white/24'
                  )}
                >
                  {homeName}
                </button>
              )}
              {isTie && (
                <span className="flex items-center text-xs text-white/30 px-1">remis</span>
              )}
              {awayTeamId != null && (
                <button
                  onClick={() => onAdvanceChange?.(awayTeamId)}
                  className={cn(
                    'flex-1 py-3 text-xs font-bold rounded-2xl border transition-all',
                    advanceTeamId === awayTeamId
                      ? 'border-gold-300/50 bg-gold-300/12 text-gold-200'
                      : 'border-white/12 text-white/54 hover:border-white/24'
                  )}
                >
                  {awayName}
                </button>
              )}
            </div>
          </div>

          {/* Resolution */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-white/56">Rozstrzygnięcie (po 90 min / dogrywka / karne)</span>
            <div className="flex gap-2">
              {(['90min', 'AET', 'PEN'] as Resolution[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onResolutionChange?.(resolutionPrediction === r ? null : r)}
                  className={cn(
                    'flex-1 py-3 text-xs font-bold rounded-2xl border transition-all',
                    resolutionPrediction === r
                      ? 'border-blue-400/50 bg-blue-400/12 text-blue-200'
                      : 'border-white/12 text-white/54 hover:border-white/24'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
