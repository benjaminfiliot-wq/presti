// lib/essais.ts — SERVEUR SEULEMENT (routes et gardes) : les comptes qui essaient une fonctionnalité dont le drapeau est
// encore baissé (lib/flags.ts ESSAI). Jamais importé par un composant client : les identifiants de comptes n'ont rien
// à faire dans le JavaScript public (audit d'attaque du 12/10, B1). L'écran demande /api/essais.
import { FLAGS, ESSAI, type Flag } from './flags'

// f5b463ec… = benjaminfiliot@gmail.com (fondateur) ; ef609e9b… = « Atelier du Chêne », compte de démonstration.
const COMPTES: readonly string[] = ['f5b463ec-3736-48e9-a66e-0d7387496fc1', 'ef609e9b-84c4-4298-8787-a10dc2320526']

/** La fonctionnalité est ouverte à CE compte : drapeau levé, ou essai en cours et compte listé. */
export const ouvertPour = (f: Flag, uid: string | null | undefined): boolean =>
  FLAGS[f] || (!!ESSAI[f] && !!uid && COMPTES.includes(uid))
