'use client'

import { TIERS, type Tier, tierAllowed } from '@/lib/models'

const PLAN_BADGE: Record<string, string> = { gratuit: 'Inclus', essentiel: 'Dès Essentiel', studio: 'Dès Studio', signature: 'Signature', pro: 'Offre Pro', business: 'Business' }

const Lock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
)

export default function ModelSelect({ plan, value, onChange }: { plan: string; value: Tier; onChange: (t: Tier) => void }) {
  return (
    <div className="msel">
      <span className="msel-lab">Moteur de chiffrage</span>
      <div className="msel-grid" role="radiogroup" aria-label="Niveau de modèle IA">
        {TIERS.map((t) => {
          const allowed = tierAllowed(t.value, plan)
          const on = value === t.value
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!allowed}
              className={`msel-opt${on ? ' on' : ''}${allowed ? '' : ' locked'}`}
              onClick={() => { if (allowed) onChange(t.value) }}
              title={allowed ? t.desc : `Réservé à l'offre ${PLAN_BADGE[t.plan] ?? t.plan}`}
            >
              {!allowed && <span className="lk"><Lock /></span>}
              <span className="mt">{t.value === 'expert' && <span className="crown">◆</span>}{t.label}</span>
              <span className="md">{t.desc}</span>
              <span className="mb">{PLAN_BADGE[t.plan] ?? t.plan}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
