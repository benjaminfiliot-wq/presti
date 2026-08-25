'use client'

import { TIERS, type Tier, tierAllowed } from '@/lib/models'

export default function ModelSelect({ plan, value, onChange }: { plan: string; value: Tier; onChange: (t: Tier) => void }) {
  const anyLocked = TIERS.some((t) => !tierAllowed(t.value, plan))
  return (
    <div className="model-row">
      <span className="lbl">Modèle</span>
      <div className="modelsel">
        {TIERS.map((t) => {
          const allowed = tierAllowed(t.value, plan)
          return (
            <button
              key={t.value}
              type="button"
              className={`modelsel-opt${value === t.value ? ' on' : ''}${allowed ? '' : ' locked'}`}
              onClick={() => { if (allowed) onChange(t.value) }}
              title={allowed ? t.desc : `Réservé à l'offre ${t.plan === 'pro' ? 'Pro' : 'Business'}`}
            >
              {t.label}{allowed ? '' : ' 🔒'}
            </button>
          )
        })}
      </div>
      {anyLocked && <span className="lbl" style={{ opacity: 0.8 }}>🔒 = offre supérieure</span>}
    </div>
  )
}
