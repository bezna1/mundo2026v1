import { useAuth } from '@/hooks/useAuth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { formatPoints } from '@/lib/utils'
import { Trophy, RefreshCw } from 'lucide-react'

export function LeaderboardPage() {
  const { appUser } = useAuth()
  const { entries, loading, error, refetch } = useLeaderboard(appUser?.group.id)

  const myEntry = entries.find((e) => e.user_id === appUser?.auth.id)
  const myRank = entries.findIndex((e) => e.user_id === appUser?.auth.id) + 1

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="premium-heading text-2xl font-extrabold text-white">Ranking</h1>
        <button
          onClick={refetch}
          className="w-10 h-10 glass rounded-2xl border border-white/10 flex items-center justify-center text-white/45 hover:text-white/80 hover:border-blue-300/35 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* My position hero */}
      {myEntry && (
        <div className="premium-panel premium-animated glass-gold rounded-[32px] border border-gold-300/25 p-6 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/40 mb-1">Moja pozycja</div>
              <div className="flex items-baseline gap-2">
                <span className="premium-heading text-5xl font-extrabold gradient-text">#{myRank}</span>
                <span className="text-white/40 text-sm">z {entries.length}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="premium-heading text-4xl font-extrabold text-gold-200">
                {myEntry.total_points}
              </div>
              <div className="text-xs text-white/30">punktów łącznie</div>
              <div className="text-xs text-white/20 mt-0.5">
                {myEntry.match_points} meczowe + {myEntry.bonus_points} bonusowe
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoring legend */}
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1">
        {[
          { label: 'Dokładny wynik', pts: '5 pkt', color: 'text-gold-400' },
          { label: 'Wynik + różnica', pts: '3 pkt', color: 'text-blue-400' },
          { label: 'Zwycięzca lub remis', pts: '2 pkt', color: 'text-green-400' },
        ].map(({ label, pts, color }) => (
          <div key={label} className="glass rounded-2xl border border-white/10 px-3.5 py-2.5 shrink-0">
            <div className={`text-xs font-bold ${color}`}>{pts}</div>
            <div className="text-[10px] text-white/30">{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl border border-white/5 animate-shimmer" />
          ))}
        </div>
      ) : (
        <LeaderboardTable entries={entries} currentUserId={appUser?.auth.id} />
      )}
    </div>
  )
}
