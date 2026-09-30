'use client'

import type { Direct, ReglagesServis, Role, Tresorerie } from './Station'

// Le cadre des vues Missions, Succès et Aide (fiche 026-113) : ?vue=missions|succes|aide. Vide tant que la fiche n'est
// pas livrée.
export type VuesProps = {
  vue: string | null
  role: Role
  direct: Direct | null
  tresorerie: Tresorerie | null
  reglages: ReglagesServis | null
}

export default function Vues(_props: VuesProps) {
  return null
}
