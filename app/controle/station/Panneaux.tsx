'use client'

import type { BarreDonnees, Env, Equipage, Role, Tresorerie } from './Station'

// Le cadre des panneaux (salles et fiche d'agent, fiche 026-120) : posé par-dessus la station, vide tant que la fiche
// n'est pas livrée. Il lira ?salle= et ?agent= dans l'adresse.
export type PanneauxProps = {
  role: Role
  equipage: Env<Equipage> | null
  tresorerie: Tresorerie | null
  barre: Env<BarreDonnees> | null
}

export default function Panneaux(_props: PanneauxProps) {
  return null
}
