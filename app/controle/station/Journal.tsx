'use client'

import type { Bulle, Compteur, Equipage, Env, Role } from './Station'

// Le cadre du journal de bord. Il reçoit le flux UNIQUE des bulles (200 dernières) que la station lit une fois pour la
// carte et pour lui ; la fiche du journal (026-123) le remplit sans toucher à Station.tsx.
export type JournalProps = {
  bulles: Bulle[]
  role: Role
  equipage: Env<Equipage> | null
  agentsActifs: Compteur | null
}

export default function Journal(_props: JournalProps) {
  return (
    <section className="mc-zone mc-journal" data-station-journal aria-label="Journal de bord">
      <h2 className="mc-titre-zone">JOURNAL</h2>
      <p className="mc-etat">Le journal de bord arrive avec sa fiche.</p>
    </section>
  )
}
