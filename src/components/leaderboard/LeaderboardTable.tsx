import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'
import { Target, Zap } from 'lucide-react'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

const FORM_COLORS = {
  W: 'bg-green-500/80',
  H: 'bg-gold-500/80',
  M: 'bg-white/15',
  '-': 'bg-white/5',
}

const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-white/30 text-sm">
        Brak danych w rankingu
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin rounded-[28px] border border-white/10 shadow-premium">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/8">
              <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider w-8">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Gracz</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Łącznie</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Mecze</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Bonusy</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Dokł.</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Traf.</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Efekt.</th>
              <th className="px-3 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider text-center">Forma</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry.user_id}
                className={cn(
                  'border-b border-white/5 transition-colors',
                  idx < 3 && 'bg-gold-300/4',
                  entry.user_id === currentUserId ? 'bg-gold-300/8' : 'hover:bg-white/5'
                )}
              >
                <td className="px-4 py-4 text-sm font-bold text-white/50">
                  {MEDALS[idx] ?? `${idx + 1}`}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gold-300/14 border border-gold-300/24 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-gold-200">
                        {entry.nickname.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        entry.user_id === currentUserId ? 'text-gold-200' : 'text-white'
                      )}
                    >
                      {entry.nickname}
                    </span>
                    {entry.user_id === currentUserId && (
                      <span className="text-[10px] text-gold-200/70">(ty)</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <span className="premium-heading text-lg font-extrabold text-gold-200">
                    {entry.total_points}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-right text-sm font-medium text-white/60">
                  {entry.match_points}
                </td>
                <td className="px-3 py-3.5 text-right text-sm font-medium text-white/60">
                  {entry.bonus_points}
                </td>
                <td className="px-3 py-3.5 text-right text-sm text-white/50">
                  {entry.exact_scores}
                </td>
                <td className="px-3 py-3.5 text-right text-sm text-white/50">
                  {entry.correct_outcomes}
                </td>
                <td className="px-3 py-3.5 text-right text-sm text-white/50">
                  {entry.effectiveness > 0 ? `${Math.round(entry.effectiveness)}%` : '–'}
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-center gap-0.5">
                    {entry.last_5.map((f, i) => (
                      <div
                        key={i}
                        className={cn('w-2.5 h-2.5 rounded-sm', FORM_COLORS[f])}
                        title={f === 'W' ? 'Dokładny' : f === 'H' ? 'Trafiony' : f === 'M' ? 'Chybiony' : '–'}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2">
        {entries.map((entry, idx) => (
          <div
            key={entry.user_id}
            className={cn(
              'glass rounded-[24px] border p-4 flex items-center gap-3',
              idx < 3 && 'bg-gold-300/5',
              entry.user_id === currentUserId
                ? 'border-gold-300/34 bg-gold-300/8'
                : 'border-white/10'
            )}
          >
            <div className="text-xl w-8 text-center shrink-0">
              {MEDALS[idx] ?? <span className="text-sm font-bold text-white/40">{idx + 1}</span>}
            </div>

            <div className="w-10 h-10 rounded-full bg-gold-300/14 border border-gold-300/24 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-gold-200">
                {entry.nickname.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-sm font-bold truncate',
                    entry.user_id === currentUserId ? 'text-gold-200' : 'text-white'
                  )}
                >
                  {entry.nickname}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Target size={10} />
                  {entry.exact_scores}
                </span>
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Zap size={10} />
                  {entry.correct_outcomes}
                </span>
                <div className="flex gap-0.5 ml-1">
                  {entry.last_5.map((f, i) => (
                    <div key={i} className={cn('w-2 h-2 rounded-sm', FORM_COLORS[f])} />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="premium-heading text-2xl font-extrabold text-gold-200">{entry.total_points}</div>
              <div className="text-[10px] text-white/30">pkt</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
