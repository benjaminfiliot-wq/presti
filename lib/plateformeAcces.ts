// La plateforme (page de conversation publique, réponse préparée par l'IA, comptes clients, relances de conversation, nom de domaine
// sur la page) commence avec Studio — décision de Benj du 15/10 : « Dans Essentiel il n'y a PAS de plateforme », pour TOUS les comptes.
// Une seule décision, lue dans la matrice (lib/plans.ts), pour toutes les routes publiques et le passage quotidien des relances :
// jamais un `plan === 'studio'` en dur. Pure : testée par scripts/ecrans-offre-qa.mjs.
import { peut } from './plans.ts'

/** Ce que voit le client d'un artisan dont l'offre n'a pas de plateforme (page publique) ou ce que renvoie la route (JSON). */
export const MESSAGE_PUBLIC_SANS_PLATEFORME = 'Cet artisan ne reçoit pas de demandes en ligne pour le moment.'

/** Les champs qui suffisent à décider. Un fondateur compte comme Business (le compte de démonstration n'est jamais coupé). */
export type CompteOffre = { plan?: string | null; is_founder?: boolean | null }

/** La plateforme de ce compte est-elle ouverte ? (Offre Studio et au-dessus, fondateur compris.) */
export const plateformeOuverte = (a: CompteOffre): boolean => peut(a.is_founder ? 'business' : a.plan, 'plateforme.conversation')
