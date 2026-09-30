// lib/agents/acquisition/affirmations.ts — la liste fermée de ce qu'un message de Presti a le droit d'affirmer (fiche 026-083).
//
// Les six affirmations du plan (SaaS/Produit/Ecosysteme-Plan-2026-09-24.md §3.1, rédaction corrigée), les deux phrases d'offre
// du message qui suit un « oui » (rectification §3.7) et les deux phrases de l'offre du Studio (voie gratuite, décision 3).
// Approuvées une fois par Benj avec les modèles. Module pur : aucun import, aucun effet.

export interface Affirmation {
  id: string
  texte: string
  /** D'où la phrase tire son droit d'être écrite. */
  source: string
  /** Approuvée (approbation.txt de 026-083, à l'empreinte du texte) ; false par défaut. */
  approuve: boolean
}

/** Approuvées le 29/09/2026 par Claude Code, par délégation de Benj. Les deux phrases d'offre du Studio restent non approuvées (conditions d'ads_archive non lues). */
export const AFFIRMATIONS_APPROUVEES: readonly string[] = Object.freeze(['prix_site', 'delai_48h', 'formules', 'reponse_prete', 'accuse_reception', 'domaine_a_votre_nom', 'offre_site', 'offre_delai'])

export const AFFIRMATIONS_PERMISES: readonly Affirmation[] = Object.freeze(([
  { id: 'prix_site', texte: '300 €, une fois, TVA non applicable', source: 'Plan 2026-09-24 §3.1 ; lib/plans.ts ; franchise en base, art. 293 B du CGI' },
  { id: 'delai_48h', texte: 'en ligne sous 48 h ouvrées après validation par Presti ; sur votre domaine dès que ses DNS sont posés', source: 'Plan 2026-09-24 §3.1 ; procédure de mise en ligne' },
  { id: 'formules', texte: 'formules 29, 59 et 99 € par mois', source: 'Plan 2026-09-24 §3.1 ; lib/plans.ts' },
  { id: 'reponse_prete', texte: "la réponse est prête en moins d'une minute : Presti la prépare, vous l'envoyez ; avec Studio ou Signature, l'assistant peut répondre seul", source: 'Plan 2026-09-24 §3.1 ; lib/ai.ts' },
  { id: 'accuse_reception', texte: "un accusé de réception part par e-mail quand le client laisse son adresse", source: 'Plan 2026-09-24 §3.1 ; formulaire du site' },
  { id: 'domaine_a_votre_nom', texte: 'le domaine est à votre nom, et vous le réservez vous-même avec notre guide', source: 'Plan 2026-09-24 §3.1 (D9)' },
  { id: 'offre_site', texte: 'Le site complet : 300 €, une fois, TVA non applicable.', source: 'Rectification du 24/09 §3.7' },
  { id: 'offre_delai', texte: 'En ligne sous 48 h ouvrées après validation.', source: 'Rectification du 24/09 §3.7' },
  { id: 'offre_studio', texte: '{videos} vidéos de démonstration de {produit}, pour {prix}, une fois.', source: 'Voie gratuite du 25/09, décision 3 ; valeurs lues dans lib/studio/offre.ts (026-166)' },
  { id: 'offre_studio_accord', texte: "Rien n'est diffusé sans votre accord écrit.", source: 'Voie gratuite du 25/09, décision 3 ; procédure du Studio' },
] as Omit<Affirmation, 'approuve'>[]).map((a) => Object.freeze({ ...a, approuve: AFFIRMATIONS_APPROUVEES.includes(a.id) })))

/** Ce qui ne s'écrit plus : « site maintenu 12 mois » tant que le retrait et l'envoi du dossier n'existent pas (D15). */
export const AFFIRMATIONS_RETIREES: readonly string[] = Object.freeze(['site maintenu 12 mois'])
