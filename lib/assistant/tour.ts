// L'assistant de gestion de la console — le DÉROULÉ d'un tour, côté argent et plafond (plans/016-assistant.md §6).
//
// Pur et injecté (la base, le crédit et le modèle arrivent en dépendances) pour que les règles se testent seules
// (scripts/assistant-qa.mjs) :
//  1. prendre un tour (plafond de la conversation, atomique en base) — refusé : rien n'est débité ;
//  2. débiter le crédit du tour au tarif du palier — refusé : le tour est rendu, « Plus de crédit ce mois-ci » ;
//  3. jouer le tour — le modèle ou le journal tombe : le crédit ET le tour sont rendus, l'écran lit pourquoi.
import { REFUS_CREDIT, REFUS_PANNE, REFUS_PLAFOND, verdictTour } from './cadrage'
import { JournalIndisponible, TourEchoue, type ResultatTour } from './boucle'
import { LIBELLE_OUTIL, type NomOutil } from './outils'

export type EvenementTour =
  | { e: 'consulte'; outil: NomOutil; libelle: string }
  | { e: 'fin'; texte: string; brouillons: ResultatTour['brouillons']; consultes: string[]; tour: number; restants: number; palier: string; chiffres_retires: number }
  | { e: 'erreur'; message: string }

export type DependancesTour = {
  palier: string
  /** Résultat brut de `assistant_prendre_tour` (null si la base a répondu une erreur). */
  prendreTour: () => Promise<unknown>
  rendreTour: () => Promise<void>
  consommerCredit: () => Promise<{ ok: boolean }>
  rendreCredit: () => Promise<void>
  executer: (onOutil: (nom: NomOutil) => void) => Promise<ResultatTour>
  signalerPanne?: (e: unknown) => Promise<void>
}

/** Panne APRÈS des appels au modèle déjà facturés : le crédit n'est pas rendu, l'écran ne doit pas dire le contraire. */
export const MESSAGE_INTERROMPU = 'L’assistant n’a pas pu terminer sa réponse. Réessayez dans un instant.'
export const MESSAGE_JOURNAL_INDISPONIBLE = 'Le journal de l’assistant est indisponible : par sécurité, le tour est arrêté. Le crédit vous a été rendu.'

export type Preparation =
  | { ok: false; status: 402 | 404 | 429 | 503; corps: { error: string; code: string; outOfCredits?: true } }
  | { ok: true; tour: number; restants: number; jouer: (envoyer: (ev: EvenementTour) => void) => Promise<void> }

export async function preparerTour(d: DependancesTour): Promise<Preparation> {
  const v = verdictTour(await d.prendreTour().catch(() => null))
  if (!v.ok) {
    if (v.motif === 'plafond') return { ok: false, status: 429, corps: { error: REFUS_PLAFOND, code: 'plafond' } }
    if (v.motif === 'autre_compte') return { ok: false, status: 404, corps: { error: 'Conversation introuvable.', code: 'conversation' } }
    return { ok: false, status: 503, corps: { error: 'L’assistant est indisponible pour l’instant.', code: 'indisponible' } }
  }
  const credit = await d.consommerCredit()
  if (!credit.ok) {
    await d.rendreTour()
    return { ok: false, status: 402, corps: { error: REFUS_CREDIT, code: 'credit', outOfCredits: true } }
  }
  return {
    ok: true, tour: v.tour, restants: v.restants,
    async jouer(envoyer) {
      try {
        const r = await d.executer((nom) => envoyer({ e: 'consulte', outil: nom, libelle: LIBELLE_OUTIL[nom] }))
        const consultes = [...new Set(r.outilsAppeles.filter((o): o is NomOutil => o in LIBELLE_OUTIL).map((o) => LIBELLE_OUTIL[o]))]
        envoyer({ e: 'fin', texte: r.texte, brouillons: r.brouillons, consultes, tour: v.tour, restants: v.restants, palier: d.palier, chiffres_retires: r.garde.retires.length })
      } catch (e) {
        // Abandon du client : ni panne signalée (elle masquerait une vraie panne une heure), ni crédit rendu.
        // Appels au modèle déjà facturés : le crédit et le tour restent pris. Sinon (panne avant tout appel abouti,
        // journal indisponible) : on rend les deux, comme avant.
        const echec = e instanceof TourEchoue ? e : null
        if (!(e instanceof JournalIndisponible) && !echec?.parClient) await d.signalerPanne?.(echec?.cause ?? e).catch(() => {})
        const rendu = e instanceof JournalIndisponible || (!echec?.parClient && (echec?.appelsAboutis ?? 0) === 0)
        if (rendu) {
          await d.rendreCredit()
          await d.rendreTour()
        }
        envoyer({ e: 'erreur', message: e instanceof JournalIndisponible ? MESSAGE_JOURNAL_INDISPONIBLE : rendu ? REFUS_PANNE : MESSAGE_INTERROMPU })
      }
    },
  }
}
