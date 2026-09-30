import { euros, relTime } from '@/lib/direction/fraicheur'

export type Agent = {
  nom: string
  libelle: string
  en_pause: boolean
  pause_motif: string | null
  battement_le: string | null
  periode_minutes: number
  disjoncteur_ouvert_le: string | null
  cout_mois_eur: number | null
}

export type EtatAgent = 'actif' | 'muet' | 'panne' | 'pause' | 'disjoncteur' | 'jamais'

export function etatAgent(a: Agent, maintenant: Date = new Date()) {
  const age = a.battement_le ? maintenant.getTime() - Date.parse(a.battement_le) : 0
  const periode = Math.max(0, a.periode_minutes) * 60_000
  let etat: EtatAgent
  if (a.disjoncteur_ouvert_le) etat = 'disjoncteur'
  else if (a.en_pause) etat = 'pause'
  else if (!a.battement_le) etat = 'jamais'
  else if (age > 2 * periode + 2 * 3_600_000) etat = 'panne'
  else if (age > 2 * periode) etat = 'muet'
  else etat = 'actif'
  const date = etat === 'disjoncteur' ? a.disjoncteur_ouvert_le : a.battement_le
  return {
    nom: a.nom,
    libelle: a.libelle,
    etat,
    depuis: date ? relTime(date, maintenant.getTime()) : null,
    cout: euros(a.cout_mois_eur),
    panne2h: etat === 'panne',
  }
}

const PRIORITE: EtatAgent[] = ['panne', 'disjoncteur', 'muet', 'pause', 'jamais', 'actif']

export function lignesAgents(rows: Agent[], maintenant: Date = new Date()) {
  return rows.map((a) => etatAgent(a, maintenant)).sort((a, b) =>
    PRIORITE.indexOf(a.etat) - PRIORITE.indexOf(b.etat) || a.nom.localeCompare(b.nom, 'fr'))
}
