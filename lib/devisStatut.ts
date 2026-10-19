// Les DATES d'un devis qui change de statut — un seul calcul pour toutes les routes qui écrivent `devis.statut`.
//
// Audit de cohérence du 18/10, C1 et C5 : `envoye_le` n'était écrit que par la règle « tout auto » (lib/reglesServeur.ts) et
// `accepte_le` que par l'acceptation dans la conversation. Un devis envoyé depuis l'écran Devis, ou marqué « Accepté » à la
// main (écran, assistant), n'avait donc pas de date : « signé ce mois » le rangeait au mois de sa création, « à relancer » le
// comptait dès l'envoi d'un devis préparé il y a trois semaines, et la fiche chantier affichait « Signé le : — ».
//
// Règles :
//   • passer à « envoye » depuis un AUTRE statut (brouillon, ou un devis expiré que l'artisan rouvre) pose `envoye_le` à
//     maintenant : c'est de là que partent la validité et les relances ; rester « envoye » ne touche à rien ;
//   • passer à « accepte » pose `accepte_le` (et `accepte_canal = 'manuel'`) s'il n'y en a pas déjà un — la preuve d'une
//     acceptation en ligne (date, IP pseudonymisée, canal « plateforme ») n'est jamais écrasée ;
//   • aucune date n'est jamais inventée dans le passé : sans geste daté, la case reste vide (et les écrans savent la lire vide).
// Module pur (aucun import) : rejoué par scripts/coherence-flux-qa.mjs.

export type EtatDevis = { statut?: string | null; envoye_le?: string | null; accepte_le?: string | null }

export function datesDuStatut(avant: EtatDevis, nouveau: string | null | undefined, maintenant: Date = new Date()): Record<string, string> {
  const patch: Record<string, string> = {}
  if (!nouveau || nouveau === (avant.statut ?? 'brouillon')) return patch
  const iso = maintenant.toISOString()
  if (nouveau === 'envoye') patch.envoye_le = iso
  if (nouveau === 'accepte' && !avant.accepte_le) { patch.accepte_le = iso; patch.accepte_canal = 'manuel' }
  return patch
}
