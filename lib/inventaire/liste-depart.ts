import type { TypeFournisseur } from './types'

// Liste de départ des fournisseurs (§8 F2) — DÉRIVÉE de docs/fournisseurs.md, vérifiée
// par curl le 03/09/2026. Rien ici n'est supposé : un site passe en `prix_publics: true`
// uniquement si un prix numérique a été lu dans une fiche produit sans connexion.
//
// Les ❌ (Point.P, Leroy Merlin, ManoMano, Bricoman, Cedeo, Legallais, Sonepar) ne sont
// PAS proposés : bloqués par une protection anti-robot ou prix strictement réservés aux
// comptes connectés. L'artisan peut toujours les saisir lui-même.
//
// Zéro donnée en base par défaut : cette liste n'est insérée que sur clic de l'artisan
// (« Ajouter mes fournisseurs habituels »), et de façon idempotente.

/** Phrase exacte du plan §8, affichée à la configuration d'un fournisseur sans prix publics. */
export const NOTE_ACCES_CONNEXION =
  'ce site n’affiche ses prix qu’aux comptes connectés : vous verrez le catalogue, pas vos tarifs'

export type FournisseurDepart = {
  nom: string
  url: string
  type: TypeFournisseur
  prix_publics: boolean
  note_acces: string | null
}

export const LISTE_DEPART: FournisseurDepart[] = [
  // ✅ prix publics lus dans la fiche produit (docs/fournisseurs.md)
  { nom: 'Castorama', url: 'https://www.castorama.fr', type: 'gsb', prix_publics: true, note_acces: null },
  { nom: 'Brico Dépôt', url: 'https://www.bricodepot.fr', type: 'gsb', prix_publics: true, note_acces: null },
  { nom: 'Tout Faire', url: 'https://www.toutfaire.fr', type: 'negoce', prix_publics: true, note_acces: null },
  // ⚠️ catalogue accessible, prix masqués sans compte (ou sans choix de magasin)
  { nom: 'Rexel', url: 'https://www.rexel.fr', type: 'negoce', prix_publics: false, note_acces: NOTE_ACCES_CONNEXION },
  { nom: 'Gedimat', url: 'https://www.gedimat.fr', type: 'negoce', prix_publics: false, note_acces: NOTE_ACCES_CONNEXION },
  { nom: 'BigMat', url: 'https://www.bigmat.fr', type: 'negoce', prix_publics: false, note_acces: NOTE_ACCES_CONNEXION },
  { nom: 'Würth', url: 'https://eshop.wurth.fr', type: 'fabricant', prix_publics: false, note_acces: NOTE_ACCES_CONNEXION },
  { nom: 'Chausson Matériaux', url: 'https://www.chausson.fr', type: 'negoce', prix_publics: false, note_acces: NOTE_ACCES_CONNEXION },
]

/** « https://www.castorama.fr/x » → « castorama.fr » — ce que F3 passe en `allowed_domains`. */
export function domaineDe(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const h = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase()
    return h.replace(/^www\./, '') || null
  } catch { return null }
}
