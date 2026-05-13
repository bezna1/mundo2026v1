import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import {
  getDemoCurrentUser,
  approveDemoAccount,
  getDemoPendingAccounts,
  isDemoMode,
  isDemoSimulationEnabled,
  rejectDemoAccount,
  runDemoSimulationStep,
  saveDemoResult,
  setDemoSimulationEnabled,
} from '@/lib/demoStore'
import { clearDemoClock, getDemoClockIso, setDemoClockIso } from '@/lib/clock'
import { supabase } from '@/lib/supabase'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatMatchTime, isMatchStarted } from '@/lib/dates'
import { getFlag } from '@/data/fixtures'
import { isKnockoutPhase } from '@/data/scoringRules'
import { cn } from '@/lib/utils'
import { ShieldCheck, CheckCircle, RefreshCw, Settings } from 'lucide-react'
import type { Match, MatchResult, Resolution, MatchStatus } from '@/types'

function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

function DemoSimulationPanel({
  groupId,
  matches,
  onChanged,
}: {
  groupId: string
  matches: Match[]
  onChanged: () => void
}) {
  const [clockValue, setClockValue] = useState(() => toLocalInputValue(getDemoClockIso()))
  const [enabled, setEnabled] = useState(() => isDemoSimulationEnabled())
  const debugMatches = useMemo(
    () => [...matches].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()),
    [matches]
  )
  const [debugMatchId, setDebugMatchId] = useState(() => String(debugMatches[0]?.id ?? ''))
  const debugMatch = debugMatches.find((match) => String(match.id) === debugMatchId) ?? debugMatches[0]

  useEffect(() => {
    if (!debugMatchId && debugMatches[0]) {
      setDebugMatchId(String(debugMatches[0].id))
    }
  }, [debugMatchId, debugMatches])

  const applyClock = (value: string) => {
    setClockValue(value)
    setDemoClockIso(fromLocalInputValue(value))
    runDemoSimulationStep(groupId)
    onChanged()
  }

  const applyClockIso = (iso: string) => {
    applyClock(toLocalInputValue(iso))
  }

  const shiftClock = (hours: number) => {
    const next = new Date(fromLocalInputValue(clockValue))
    next.setHours(next.getHours() + hours)
    applyClock(toLocalInputValue(next.toISOString()))
  }

  const toggleSimulation = () => {
    const next = !enabled
    setEnabled(next)
    setDemoSimulationEnabled(next)
    runDemoSimulationStep(groupId)
    onChanged()
  }

  const enableDebugAndApply = (iso: string) => {
    setEnabled(true)
    setDemoSimulationEnabled(true)
    setDemoClockIso(iso)
    setClockValue(toLocalInputValue(iso))
    runDemoSimulationStep(groupId)
    onChanged()
  }

  const resetClock = () => {
    clearDemoClock()
    setClockValue(toLocalInputValue(getDemoClockIso()))
    onChanged()
  }

  return (
    <Card variant="gold">
      <CardHeader>
        <h2 className="premium-heading text-sm font-bold text-gold-200">Tryb debugowania admina</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-white/42 mb-1">Tymczasowa data i godzina aplikacji</p>
          <input
            type="datetime-local"
            value={clockValue}
            onChange={(event) => applyClock(event.target.value)}
            className="app-input w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-base sm:text-sm text-slate-950 caret-slate-950 focus:outline-none focus:border-blue-300/55 focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-white/54 mb-2">Szybki test konkretnego meczu</p>
          <select
            value={debugMatchId}
            onChange={(event) => setDebugMatchId(event.target.value)}
            className="w-full appearance-none rounded-2xl border border-white/12 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-300/55 focus:ring-2 focus:ring-blue-400/20"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
          >
            {debugMatches.slice(0, 20).map((match) => (
              <option key={match.id} value={match.id} style={{ color: '#102033' }}>
                #{match.id} {match.home_team?.name ?? match.home_team_placeholder} - {match.away_team?.name ?? match.away_team_placeholder}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!debugMatch}
              onClick={() => {
                if (!debugMatch) return
                const kickoff = new Date(debugMatch.kickoff_at)
                kickoff.setMinutes(kickoff.getMinutes() + 1)
                applyClockIso(kickoff.toISOString())
              }}
            >
              Pierwszy gwizdek
            </Button>
            <Button
              variant="gold"
              size="sm"
              disabled={!debugMatch}
              onClick={() => {
                if (!debugMatch) return
                const afterMatch = new Date(debugMatch.kickoff_at)
                afterMatch.setMinutes(afterMatch.getMinutes() + 121)
                enableDebugAndApply(afterMatch.toISOString())
              }}
            >
              Po meczu + wyniki
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftClock(3)}>
            +3h
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shiftClock(24)}>
            +1 dzień
          </Button>
          <Button variant="ghost" size="sm" onClick={resetClock}>
            Reset
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={enabled ? 'gold' : 'secondary'}
            size="sm"
            onClick={toggleSimulation}
            className="flex-1"
          >
            {enabled ? 'Symulacja włączona' : 'Włącz symulację'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              runDemoSimulationStep(groupId)
              onChanged()
            }}
          >
            Przelicz demo
          </Button>
        </div>

        <p className="text-xs text-white/42">
          Debug działa tylko w trybie demo. „Symulacja włączona” automatycznie generuje typy
          wirtualnych graczy i wyniki zakończonych meczów wraz z upływem czasu aplikacji.
          „Przelicz demo” uruchamia ten sam krok ręcznie od razu, np. po zmianie godziny.
          Część wirtualnych graczy celowo nie typuje wszystkich meczów.
        </p>
      </CardBody>
    </Card>
  )
}

interface ResultFormProps {
  match: Match
  onSaved: () => void
}

function ResultForm({ match, onSaved }: ResultFormProps) {
  const existing = match.match_result
  const isKnockout = isKnockoutPhase(match.phase)

  const [homeGoals90, setHomeGoals90] = useState(String(existing?.home_goals_90 ?? ''))
  const [awayGoals90, setAwayGoals90] = useState(String(existing?.away_goals_90 ?? ''))
  const [homeGoalsAet, setHomeGoalsAet] = useState(String(existing?.home_goals_aet ?? ''))
  const [awayGoalsAet, setAwayGoalsAet] = useState(String(existing?.away_goals_aet ?? ''))
  const [homeGoalsPen, setHomeGoalsPen] = useState(String(existing?.home_goals_pen ?? ''))
  const [awayGoalsPen, setAwayGoalsPen] = useState(String(existing?.away_goals_pen ?? ''))
  const [resolution, setResolution] = useState<Resolution>(existing?.resolution ?? '90min')
  const [winnerTeamId, setWinnerTeamId] = useState<number | null>(existing?.winner_team_id ?? null)
  const [isConfirmed, setIsConfirmed] = useState(existing?.is_confirmed ?? false)
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scoring, setScoring] = useState(false)

  const homeName = match.home_team?.name ?? match.home_team_placeholder
  const awayName = match.away_team?.name ?? match.away_team_placeholder

  const getOutcome = (h: number, a: number): '1' | 'X' | '2' =>
    h > a ? '1' : h < a ? '2' : 'X'

  const handleSave = async () => {
    setError('')
    const h = parseInt(homeGoals90, 10)
    const a = parseInt(awayGoals90, 10)
    if (isNaN(h) || isNaN(a)) return setError('Wpisz wynik po 90 minutach.')

    setSaving(true)
    const outcome = getOutcome(h, a)

    if (isDemoMode()) {
      saveDemoResult({
        matchId: match.id,
        homeGoals90: h,
        awayGoals90: a,
        winnerTeamId,
        resolution: isKnockout ? resolution : null,
        enteredBy: getDemoCurrentUser()?.auth.id ?? 'demo-admin',
        confirmed: isConfirmed,
      })
      setSaving(false)
      onSaved()
      return
    }

    const payload: Partial<MatchResult> & { match_id: number; entered_by?: string } = {
      match_id: match.id,
      home_goals_90: h,
      away_goals_90: a,
      outcome,
      resolution: isKnockout ? resolution : null,
      winner_team_id: isKnockout ? winnerTeamId : null,
      is_confirmed: isConfirmed,
    }
    if (isKnockout && resolution !== '90min') {
      const hAet = parseInt(homeGoalsAet, 10)
      const aAet = parseInt(awayGoalsAet, 10)
      if (!isNaN(hAet)) payload.home_goals_aet = hAet
      if (!isNaN(aAet)) payload.away_goals_aet = aAet
    }
    if (isKnockout && resolution === 'PEN') {
      const hPen = parseInt(homeGoalsPen, 10)
      const aPen = parseInt(awayGoalsPen, 10)
      if (!isNaN(hPen)) payload.home_goals_pen = hPen
      if (!isNaN(aPen)) payload.away_goals_pen = aPen
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) (payload as { entered_by?: string }).entered_by = user.id

    let err
    if (existing) {
      ;({ error: err } = await supabase
        .from('match_results')
        .update(payload)
        .eq('match_id', match.id))
    } else {
      ;({ error: err } = await supabase.from('match_results').insert(payload))
    }

    // Update match status
    await supabase.from('matches').update({ status }).eq('id', match.id)

    if (!err && isConfirmed) {
      const { error: scoreError } = await supabase.rpc('recalculate_match_scores', {
        p_match_id: match.id,
      })
      if (scoreError) err = scoreError
    }

    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
  }

  const handleRecalculate = async () => {
    setScoring(true)
    const { error } = await supabase.rpc('recalculate_match_scores', {
      p_match_id: match.id,
    })
    setScoring(false)
    if (error) setError(error.message)
  }

  const inp = 'w-full bg-white/8 border border-white/12 rounded-2xl px-3 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-blue-300/55 focus:ring-2 focus:ring-blue-400/20'

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="flex gap-2">
        {(['scheduled', 'live', 'finished', 'postponed'] as MatchStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              'flex-1 py-2.5 text-xs font-bold rounded-2xl border transition-all',
              status === s
                ? 'border-gold-300/50 bg-gold-300/12 text-gold-200'
                : 'border-white/12 text-white/45 hover:border-white/24'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Score 90 */}
      <div>
        <p className="text-xs text-white/40 mb-2">Wynik po 90 minutach *</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-white/30 truncate mb-1">{homeName}</p>
            <input
              type="number"
              min={0}
              value={homeGoals90}
              onChange={(e) => setHomeGoals90(e.target.value)}
              className={inp}
              placeholder="0"
            />
          </div>
          <span className="text-white/20 mt-5">:</span>
          <div className="flex-1">
            <p className="text-xs text-white/30 truncate mb-1">{awayName}</p>
            <input
              type="number"
              min={0}
              value={awayGoals90}
              onChange={(e) => setAwayGoals90(e.target.value)}
              className={inp}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Knockout extras */}
      {isKnockout && (
        <div className="flex flex-col gap-3 pt-2 border-t border-white/7">
          <div className="flex gap-2">
            {(['90min', 'AET', 'PEN'] as Resolution[]).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={cn(
              'flex-1 py-2.5 text-xs font-bold rounded-2xl border transition-all',
              resolution === r
                    ? 'border-blue-400/50 bg-blue-400/12 text-blue-200'
                    : 'border-white/12 text-white/45 hover:border-white/24'
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {resolution !== '90min' && (
            <div>
              <p className="text-xs text-white/40 mb-2">Wynik po dogrywce</p>
              <div className="flex items-center gap-3">
                <input type="number" min={0} value={homeGoalsAet} onChange={(e) => setHomeGoalsAet(e.target.value)} className={cn(inp, 'flex-1')} placeholder="0" />
                <span className="text-white/20">:</span>
                <input type="number" min={0} value={awayGoalsAet} onChange={(e) => setAwayGoalsAet(e.target.value)} className={cn(inp, 'flex-1')} placeholder="0" />
              </div>
            </div>
          )}

          {resolution === 'PEN' && (
            <div>
              <p className="text-xs text-white/40 mb-2">Rzuty karne (strzelone)</p>
              <div className="flex items-center gap-3">
                <input type="number" min={0} value={homeGoalsPen} onChange={(e) => setHomeGoalsPen(e.target.value)} className={cn(inp, 'flex-1')} placeholder="0" />
                <span className="text-white/20">:</span>
                <input type="number" min={0} value={awayGoalsPen} onChange={(e) => setAwayGoalsPen(e.target.value)} className={cn(inp, 'flex-1')} placeholder="0" />
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-white/40 mb-2">Awansujący</p>
            <div className="flex gap-2">
              {[
                { id: match.home_team_id, name: homeName },
                { id: match.away_team_id, name: awayName },
              ].map(({ id, name }) => id != null && (
                <button
                  key={id}
                  onClick={() => setWinnerTeamId(id)}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-bold rounded-2xl border transition-all',
                    winnerTeamId === id
                      ? 'border-gold-300/50 bg-gold-300/12 text-gold-200'
                      : 'border-white/12 text-white/45 hover:border-white/24'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmed */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isConfirmed}
          onChange={(e) => setIsConfirmed(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-xs text-white/60">Wynik zatwierdzony (wyzwoli przeliczenie pkt)</span>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" loading={saving} onClick={handleSave} className="flex-1">
          Zapisz wynik
        </Button>
        {existing && (
          <Button variant="ghost" size="sm" loading={scoring} onClick={handleRecalculate}>
            <RefreshCw size={14} />
            Przelicz
          </Button>
        )}
      </div>
    </div>
  )
}

export function AdminPage() {
  const { appUser } = useAuth()
  const { matches, loading, refetch } = useMatches()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [pendingAccounts, setPendingAccounts] = useState(() =>
    appUser?.group.id && isDemoMode() ? getDemoPendingAccounts(appUser.group.id) : []
  )

  const isAdmin = appUser?.member.role === 'admin' || appUser?.member.role === 'owner'

  const refreshPending = () => {
    if (!appUser?.group.id || !isDemoMode()) return
    setPendingAccounts(getDemoPendingAccounts(appUser.group.id))
  }

  useEffect(() => {
    refreshPending()
  }, [appUser?.group.id])

  const startedMatches = useMemo(() =>
    matches.filter((m) => isMatchStarted(m.kickoff_at))
      .filter((m) => m.home_team_placeholder.toLowerCase().includes(search.toLowerCase()) ||
        m.away_team_placeholder.toLowerCase().includes(search.toLowerCase()) ||
        (m.home_team?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.away_team?.name ?? '').toLowerCase().includes(search.toLowerCase()))
  , [matches, search])

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldCheck size={48} className="text-white/15" />
        <p className="text-white/40 text-sm">Brak dostępu. Wymagana rola admina.</p>
      </div>
    )
  }

  const inviteUrl = `${window.location.origin}${import.meta.env.BASE_URL}?g=${appUser?.group.slug}&i=${appUser?.group.invite_code}`

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="premium-panel premium-animated glass-gold rounded-[32px] border border-gold-300/25 px-5 py-6 md:px-7 md:py-7">
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-3xl bg-gold-300/12 border border-gold-300/30 flex items-center justify-center">
            <ShieldCheck size={22} className="text-gold-200" />
          </div>
          <div>
            <h1 className="premium-heading text-3xl font-extrabold text-white">Panel admina</h1>
            <p className="text-sm text-white/55 mt-1">Wyniki, statusy meczów i link zaproszenia.</p>
          </div>
        </div>
      </div>

      {/* Group settings */}
      <Card variant="gold">
        <CardHeader>
          <h2 className="premium-heading text-sm font-bold text-gold-200">Ustawienia grupy</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-white/40 mb-1">Link zaproszenia</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white/8 rounded-2xl px-3 py-2.5 text-white/68 truncate border border-white/10">
                {inviteUrl}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
              >
                Kopiuj
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-white/40">Kod zaproszenia: <span className="font-bold text-white/60">{appUser?.group.invite_code}</span></p>
            <p className="text-xs text-white/40 mt-1">PIN pokoju: <span className="font-bold text-white/60">{appUser?.group.invite_code}</span></p>
          </div>
        </CardBody>
      </Card>

      {isDemoMode() && pendingAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="premium-heading text-sm font-bold text-white">Oczekujące zgłoszenia</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {pendingAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{account.nickname}</p>
                  <p className="text-xs text-white/36">Czeka na zatwierdzenie dostępu do pokoju</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      rejectDemoAccount(account.id)
                      refreshPending()
                    }}
                  >
                    Odrzuć
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      approveDemoAccount(account.id)
                      refreshPending()
                    }}
                  >
                    Zatwierdź
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {isDemoMode() && appUser?.group.id && (
        <DemoSimulationPanel
          groupId={appUser.group.id}
          matches={matches}
          onChanged={() => {
            refetch()
          }}
        />
      )}

      {/* Results entry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="premium-heading text-base font-bold text-white">Wpisywanie wyników</h2>
          <button onClick={refetch} className="w-9 h-9 rounded-2xl glass border border-white/10 flex items-center justify-center text-white/38 hover:text-white/70 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <input
          type="text"
          placeholder="Szukaj meczu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/8 border border-white/12 rounded-2xl px-4 py-3.5 text-base sm:text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-300/55 focus:ring-2 focus:ring-blue-400/20 mb-3"
        />

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-shimmer rounded-xl" />)}
          </div>
        ) : startedMatches.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">
            Brak zakończonych meczów
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {startedMatches.map((match) => {
              const homeName = match.home_team?.name ?? match.home_team_placeholder
              const awayName = match.away_team?.name ?? match.away_team_placeholder
              const hasResult = !!match.match_result

              return (
                <Card key={match.id}>
                  <button
                    onClick={() => setExpanded(expanded === match.id ? null : match.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {getFlag(homeName)} {homeName} vs {getFlag(awayName)} {awayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasResult ? (
                        <Badge variant={match.match_result?.is_confirmed ? 'green' : 'default'} size="sm">
                          {match.match_result?.home_goals_90}:{match.match_result?.away_goals_90}
                          {match.match_result?.is_confirmed && ' ✓'}
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">Brak</Badge>
                      )}
                    </div>
                  </button>

                  {expanded === match.id && (
                    <div className="px-4 pb-4 border-t border-white/7 pt-4">
                      <p className="text-xs text-white/30 mb-3">{formatMatchTime(match.kickoff_at)}</p>
                      <ResultForm match={match} onSaved={() => { setExpanded(null); refetch() }} />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
