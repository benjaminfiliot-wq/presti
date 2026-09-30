// lib/agents/telegram.ts — le pont Telegram, la part pure (fiche 026-195). Aucune E/S : les routes
// /api/agents/telegram/{sortie,entree} et le service de l'usine s'appuient sur ces fonctions.
//
// Règles :
//   · la liste des commandes est FERMÉE et gelée : pause, etat, consigne. Il n'existe aucune commande de reprise :
//     la pause générale ne se lève qu'à la station, par Benj ;
//   · ce qui sort vers le téléphone ne porte aucune donnée de prospect : le texte d'une alerte vient de
//     chargeFondateur(motif), qui ne reçoit que le motif ; un compte rendu du Chef passe par masquer.
import { MOTIFS_POUSSES, chargeFondateur } from '@/lib/pilotage/notifications'
import { masquer } from '@/lib/pilotage/fil'

export const COMMANDES = Object.freeze(['pause', 'etat', 'consigne'] as const)
export type Commande = typeof COMMANDES[number]

/** Les types d'événements du Chef qui sortent vers le téléphone, et leur préfixe. */
export const EVENEMENTS_SORTANTS: Readonly<Record<string, string>> = Object.freeze({
  consigne_lue: 'Chef · consigne lue',
  cycle_termine: 'Chef · cycle terminé',
  reunion_compte_rendu: 'Chef · compte rendu',
})

export const MAX_MESSAGES = 20
export const MOTIF_PAUSE_MAX = 150
export const CONSIGNE_MIN = 3
export const CONSIGNE_MAX = 200

export function estCommande(valeur: unknown): valeur is Commande {
  return typeof valeur === 'string' && (COMMANDES as readonly string[]).includes(valeur)
}

/** Le texte d'une alerte poussée : titre et ligne de chargeFondateur(motif), rien d'autre ; null hors des motifs poussés. */
export function messageAlerte(motif: string): { texte: string } | null {
  if (!(MOTIFS_POUSSES as readonly string[]).includes(motif)) return null
  const charge = chargeFondateur(motif)
  if (!charge) return null
  return { texte: `${charge.titre} : ${charge.ligne}` }
}

/** Le compte rendu d'un événement du Chef, masqué, préfixé de son type ; null pour un autre type. */
export function messageEvenement(ev: { type?: string | null; resume?: string | null }): { texte: string } | null {
  const prefixe = ev.type && Object.hasOwn(EVENEMENTS_SORTANTS, ev.type) ? EVENEMENTS_SORTANTS[ev.type] : null
  if (!prefixe) return null
  const resume = masquer(ev.resume)
  return { texte: resume ? `${prefixe} : ${resume}` : prefixe }
}

/** Le motif de la pause posée depuis le téléphone : « telegram : » + le texte masqué, 150 signes au plus. */
export function motifPause(texte: unknown): string {
  const brut = typeof texte === 'string' ? texte : ''
  return `telegram : ${masquer(brut)}`.slice(0, MOTIF_PAUSE_MAX)
}

/** Le code que la route rend quand la base répond par une erreur : le code métier `ops:<code>` tel quel, sinon un mot neutre. */
export function codeErreurBase(erreur: { message?: unknown } | null | undefined): string {
  const m = /^ops:([a-z0-9_]{1,40})(?![a-z0-9_])/.exec(String(erreur?.message ?? '').trim())
  return m ? `ops:${m[1]}` : 'base_indisponible'
}
