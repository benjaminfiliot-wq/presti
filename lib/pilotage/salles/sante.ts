// 026-178 — direct.barre.sante : le verdict de santeService() (026-174, la MÊME fonction que la barre du Poste) dans le vocabulaire de
// l'écran de la station, plus les battements de l'agent `usine` (026-053) et du Veilleur `a0` (pilotage_agents). Pure : la lecture se
// fait dans station.ts, qui appelle santeService() ; ici on traduit, on ne mesure rien. Un verdict absent ou en panne lève : la
// sous-partie sort alors en erreur, jamais « en ligne » par défaut.
import type { Sourcee } from '@/lib/direction/fraicheur'
import { masquer } from '../fil'

type Etat = 'en ligne' | 'dégradée' | 'hors ligne'
// Le vocabulaire de la barre du Poste (ok, degrade, incident) vers celui de l'écran de la station : table fermée.
export const ETAT_DE: Readonly<Record<string, Etat>> = Object.freeze({ ok: 'en ligne', degrade: 'dégradée', incident: 'hors ligne' })

export function sante(brut: Sourcee<{ etat: string; detail?: string }>, agents: readonly { nom: string; battement_le?: string | null }[]) {
  if (brut.erreur || !brut.valeur) throw new Error(brut.erreur ?? 'santé du service non mesurée')
  const etat = ETAT_DE[brut.valeur.etat]
  if (!etat) throw new Error(`état de santé « ${brut.valeur.etat} » inconnu`)
  const battement = (nom: string) => agents.find((a) => a.nom === nom)?.battement_le ?? null
  return {
    etat,
    raison: etat === 'en ligne' ? null : masquer(brut.valeur.detail) || null,
    battements: { usine: battement('usine'), a0: battement('a0') },
  }
}
