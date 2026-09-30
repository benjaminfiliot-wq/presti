'use client'

import type { ReglagesServis, Role } from './Station'

// Le cadre de l'habillage (fiche 026-187) : application des réglages sur le nœud .mc et panneau ?vue=reglages. Vide tant
// que la fiche n'est pas livrée : les défauts des jetons --mc-* vivent dans station.css.
export type HabillageProps = { reglages: ReglagesServis | null; role: Role }

export default function Habillage(_props: HabillageProps) {
  return null
}
