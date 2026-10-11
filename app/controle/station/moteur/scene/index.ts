// L'accroche `scene` (fiche 026-181, K3) : remplace la fabrique de la scène du moteur nu par celle de la station, qui connaît la carte et sa
// marche (theme/, 026-180), et branche sur les propriétés de la carte ce que la scène a à savoir hors des acteurs :
//   · la nuit : `carte.nuit` servi par la route (nuit() de 026-070) ; le moteur ne lit jamais l'heure, le décor est redessiné UNE fois
//     quand elle change ;
//   · l'antenne du toit : un tour de 2 s par bulle NOUVELLE du Radar ou du Veilleur ; la plus grande bulle vue à la première lecture sert de
//     repère (une bulle déjà passée ne fait jamais tourner l'antenne) ; aucun tour sur une lecture identique ;
//   · le mouvement réduit (prefers-reduced-motion) : les personnages changent de salle sans marcher, l'antenne ne tourne pas.
import { EQUIPAGE } from '@/lib/pilotage/equipage'
import { mondeDe } from '../theme/grille'
import type { Accroche, PropsCarte } from '../types'
import { createStationPixelScene } from './StationPixelScene'
import { partageDe, type EtatScene } from './suivi'

/** Les bulles qui font tourner l'antenne : celles des agents de la salle Radar, et le Veilleur. */
const RADAR: ReadonlySet<string> = new Set([...Object.entries(EQUIPAGE).filter(([, a]) => a.salle === 'radar').map(([nom]) => nom), 'veilleur'])

const reduit = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Ce que cette lecture change pour la scène : la nuit, le mouvement réduit, les tours d'antenne. Rend vrai si la scène doit se réveiller. */
function lireProprietes(props: PropsCarte, etat: EtatScene, repere: { plusGrand: number | null }): boolean {
  let change = false
  const nuit = props.carte?.valeur?.nuit?.valeur
  if (typeof nuit === 'boolean' && nuit !== etat.nuit) { etat.nuit = nuit; change = true }
  const r = reduit()
  if (r !== etat.reduit) { etat.reduit = r; change = true }
  const bulles = props.bulles ?? []
  const plusGrand = bulles.reduce((m, b) => (typeof b?.id === 'number' && b.id > m ? b.id : m), 0)
  // Le repère est la plus grande bulle de la première lecture QUI EN PORTE : la station relit le fil après la vue direct, la carte peut
  // donc paraître avant que l'historique n'arrive, et cet historique ne doit jamais faire tourner l'antenne.
  if (repere.plusGrand === null) { if (bulles.length) repere.plusGrand = plusGrand }
  else {
    const avant = repere.plusGrand
    repere.plusGrand = Math.max(avant, plusGrand)
    if (bulles.some((b) => typeof b?.id === 'number' && b.id > avant && RADAR.has(b.agent))) { etat.tours += 1; change = true }
  }
  return change
}

export const accrocheScene: Accroche = (contexte) => {
  const monde = mondeDe(contexte)
  if (!monde) return
  const { suivi, etat } = partageDe(contexte)
  const repere = { plusGrand: null as number | null }
  lireProprietes(contexte.props, etat, repere)
  contexte.fabrique = (params) => createStationPixelScene(params, { monde, suivi, etat })
  contexte.ecouter((props) => { if (lireProprietes(props, etat, repere)) etat.reveiller?.() })
}
