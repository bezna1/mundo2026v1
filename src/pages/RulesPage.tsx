import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { BONUS_LABELS, BONUS_SCORING, GROUP_SCORING, KNOCKOUT_SCORING } from '@/data/scoringRules'
import { Badge } from '@/components/ui/Badge'
import { ShieldCheck, Trophy, Star } from 'lucide-react'
import type { BonusType } from '@/types'

const bonusTypes = Object.keys(BONUS_LABELS) as BonusType[]

export function RulesPage() {
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="premium-panel premium-animated glass-gold rounded-[32px] border border-gold-300/25 px-5 py-6 md:px-7 md:py-8">
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-3xl bg-gold-300/12 border border-gold-300/30 flex items-center justify-center">
            <ShieldCheck size={22} className="text-gold-200" />
          </div>
          <div>
            <h1 className="premium-heading text-3xl font-extrabold text-white">Reguły gry</h1>
            <p className="text-sm text-white/58 mt-1">
              Punktacja, blokady typowania i bonusy turniejowe.
            </p>
          </div>
        </div>
      </div>

      <Card variant="gold">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-gold-200" />
            <h2 className="premium-heading text-sm font-bold text-white">Mecze grupowe</h2>
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RuleTile points={GROUP_SCORING.exact} label="Dokładny wynik" />
          <RuleTile points={GROUP_SCORING.outcome_and_diff} label="Rezultat i różnica bramek" />
          <RuleTile points={GROUP_SCORING.outcome} label="Poprawny rezultat 1/X/2" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="premium-heading text-sm font-bold text-white">Faza pucharowa</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RuleTile points={KNOCKOUT_SCORING.exact_90} label="Dokładny wynik po 90 min" />
            <RuleTile points={KNOCKOUT_SCORING.correct_advance} label="Poprawny awansujący" />
            <RuleTile points={KNOCKOUT_SCORING.correct_resolution} label="Sposób rozstrzygnięcia" />
          </div>
          <p className="text-sm text-white/52">
            Wynik po 90 minutach jest liczony jak w fazie grupowej. Bonusy za awansującego
            i rozstrzygnięcie doliczają się do wyniku meczu, maksymalnie do{' '}
            <span className="font-bold text-gold-200">{KNOCKOUT_SCORING.max_points} pkt</span>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star size={16} className="text-gold-200" />
            <h2 className="premium-heading text-sm font-bold text-white">Bonusy turniejowe</h2>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {bonusTypes.map((type) => {
            const scoring = BONUS_SCORING[type]
            const label =
              typeof scoring === 'number'
                ? `${scoring} pkt`
                : `${scoring.sole} pkt / ${scoring.shared} pkt`
            return (
              <div
                key={type}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <span className="text-sm font-semibold text-white/78">{BONUS_LABELS[type]}</span>
                <Badge variant="gold" size="sm">{label}</Badge>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="premium-heading text-sm font-bold text-white">Blokady i widoczność</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 text-sm text-white/58">
          <p>Typ meczu można dodać lub edytować tylko przed godziną rozpoczęcia meczu.</p>
          <p>Typy innych graczy są ukryte do kickoffu danego meczu.</p>
          <p>Bonusy turniejowe można zmieniać tylko do deadline ustawionego dla grupy.</p>
          <p>Wyniki zatwierdza admin, a punkty są przeliczane według tych samych zasad w aplikacji i backendzie.</p>
        </CardBody>
      </Card>
    </div>
  )
}

function RuleTile({ points, label }: { points: number; label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-4">
      <div className="premium-heading text-3xl font-extrabold text-gold-200">{points}</div>
      <div className="text-xs font-semibold text-white/56 mt-1">{label}</div>
    </div>
  )
}
