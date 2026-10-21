// CRM — le TEMPS RÉEL rendu VISIBLE dans la maquette (lot 8, demande du fondateur). Module PUR.
//
// La vue est relue en direct (app/crm/useTempsReel.ts) ; chaque relecture reconstruit la scène. Ce module COMPARE deux scènes
// successives et rend les événements à jouer — jamais au premier chargement (pas de scène d'avant), jamais sans vraie différence :
//   • vehicule   : un véhicule a changé de place (affecté au chantier du jour → il quitte la base par les routes ; le soir ou le chantier
//                  fini → il rentre) ;
//   • compagnon  : un membre de l'équipe est désormais posté sur un chantier (il y marche) ;
//   • livraison  : une commande fournisseur est attendue AUJOURD'HUI (elle n'y était pas), ou une commande due a quitté la liste des
//                  commandes en cours (reçue) → le camion arrive aux quais ;
//   • avancement : un chantier a plus de tâches faites → la maison « monte » ;
//   • paiement   : une facture du chantier est désormais payée → « + x € » au-dessus du bâtiment (son montant réel).
// Le colis d'une nouvelle demande garde sa propre règle (lib/crm/accueil.ts, nouvellesArrivees).
import type { Scene } from './atelier.ts'

export type Evenement =
  | { type: 'vehicule'; cle: string; de: [number, number]; vers: [number, number] }
  | { type: 'compagnon'; cle: string }
  | { type: 'livraison'; commandeId: string; raison: 'attendue' | 'recue' }
  | { type: 'avancement'; cle: string; de: number; vers: number }
  | { type: 'paiement'; id: string; cle: string; montant: number }

type ScenePart = Pick<Scene, 'objets' | 'signaux'>
const xz = (c: readonly number[]): [number, number] => [c[0], c[2]]

/** Les événements entre deux scènes ; `avant` null (premier chargement) → aucun. `jour` : le jour de la vue (AAAA-MM-JJ). */
export function evenementsScene(avant: ScenePart | null, apres: ScenePart, jour: string): Evenement[] {
  if (!avant) return []
  const sortie: Evenement[] = []
  const avantPar = new Map(avant.objets.map((o) => [o.cle, o]))
  for (const o of apres.objets) {
    const a = avantPar.get(o.cle)
    if (!a) continue
    const bouge = Math.hypot(o.centre[0] - a.centre[0], o.centre[2] - a.centre[2]) > 0.5
    if (o.type === 'vehicule' && bouge) sortie.push({ type: 'vehicule', cle: o.cle, de: xz(a.centre), vers: xz(o.centre) })
    if (o.type === 'membre' && bouge && o.etat.aujourdhui) sortie.push({ type: 'compagnon', cle: o.cle })
    if (o.type === 'chantier') {
      const fa = a.info?.taches?.faites ?? 0, fb = o.info?.taches?.faites ?? 0, tot = o.info?.taches?.total ?? 0
      if (fb > fa && tot > 0) sortie.push({ type: 'avancement', cle: o.cle, de: fa / tot, vers: fb / tot })
    }
  }
  const ca = avant.signaux?.commandes ?? [], cb = apres.signaux?.commandes ?? []
  const idsB = new Set(cb.map((c) => c.id))
  const jourA = new Set(ca.filter((c) => c.prevue === jour).map((c) => c.id))
  for (const c of cb) if (c.prevue === jour && !jourA.has(c.id)) sortie.push({ type: 'livraison', commandeId: c.id, raison: 'attendue' })
  for (const c of ca) if (!idsB.has(c.id) && c.prevue !== null && c.prevue <= jour) sortie.push({ type: 'livraison', commandeId: c.id, raison: 'recue' })
  const payes = new Set((avant.signaux?.paiements ?? []).map((p) => p.id))
  for (const p of apres.signaux?.paiements ?? []) if (!payes.has(p.id) && avant.signaux) sortie.push({ type: 'paiement', id: p.id, cle: p.chantierCle, montant: p.montant })
  return sortie
}

/** « + 1 250 € » ou « + 1 250,50 € » depuis des centimes. */
export const libellePaiement = (c: number): string => {
  const n = c / 100
  return `+ ${n.toLocaleString('fr-FR', Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
