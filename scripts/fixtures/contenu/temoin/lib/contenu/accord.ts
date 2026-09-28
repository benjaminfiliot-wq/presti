// scripts/fixtures/contenu/temoin/lib/contenu/accord.ts — TÉMOIN de `lib/contenu/accord.ts` (026-217, partie
// « geste »). Le geste d'accord de Benj : options accorder/refuser, défaut refuser, portée securite. N'écrit jamais
// dans le bus lui-même (ops_decision_creer est un appel réel, hors périmètre d'un témoin) : ce noyau porte la même
// règle de lecture qu'utilisera la production, sur une décision déjà lue.
import { accordValide, type DecisionAccord, type VerdictAccord } from './_noyau'

export const OPTIONS_DECISION = Object.freeze([
  { cle: 'accorder', libelle: 'Publier tel quel', recommandee: false },
  { cle: 'refuser', libelle: 'Ne pas publier', recommandee: true },
])
export const DEFAUT = 'refuser'
export const PORTEE = 'securite'

export function verdictAccord(decision: DecisionAccord, cibleAttendue: string, texteVersion: string): VerdictAccord {
  return accordValide(decision, cibleAttendue, texteVersion)
}

/** Une retouche du texte ou du média après l'accord le rend caduc : même une décision `tranchee`/`accorder` ne
 *  suffit plus si `texte_version` ne correspond plus à ce qui est sur le point d'être publié. */
export function accordEncoreValable(decision: DecisionAccord, texteVersionActuelle: string): boolean {
  return !!decision && decision.statut === 'tranchee' && decision.choix === 'accorder' && decision.texte_version === texteVersionActuelle
}
