// Normalisation + bornage d'une ligne de devis/facture (validation d'entrée serveur).
// Empêche les quantités/prix négatifs ou démesurés et les taux de TVA hors barème.
const TVA_OK = [0, 5.5, 10, 20]

export type LigneNorm = {
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  tva_taux: number
  /** D'où vient le prix (v4 §8/F4). Bornée à un libellé court, jamais du texte libre. */
  source_prix?: string
}

/**
 * Coupe un texte à `max` CARACTÈRES (points de code), jamais au milieu d'un émoji, et retire les demi-paires orphelines.
 * Audit argent du 21/10 (M2) : `.slice()` compte en unités UTF-16 — un émoji coupé en deux rendait le JSON invalide pour la
 * base, qui refusait TOUTE l'écriture des lignes.
 */
export function couperTexte(s: string, max: number): string {
  const propre = s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
  return Array.from(propre).slice(0, max).join('')
}

export function normalizeLigne(
  l: { designation?: unknown; quantite?: unknown; unite?: unknown; prix_unitaire_ht?: unknown; tva_taux?: unknown; source_prix?: unknown },
  franchise: boolean,
): LigneNorm {
  const q = Number(l.quantite)
  const pu = Number(l.prix_unitaire_ht)
  const tv = Number(l.tva_taux)
  return {
    designation: couperTexte(typeof l.designation === 'string' ? l.designation : '', 300),
    quantite: Number.isFinite(q) && q > 0 ? Math.min(q, 100000) : 1,
    unite: couperTexte(typeof l.unite === 'string' ? l.unite : 'u', 16) || 'u',
    prix_unitaire_ht: Number.isFinite(pu) && pu >= 0 ? Math.min(pu, 10000000) : 0,
    tva_taux: franchise ? 0 : (TVA_OK.includes(tv) ? tv : 20),
    ...(typeof l.source_prix === 'string' && l.source_prix.trim()
      ? { source_prix: couperTexte(l.source_prix.trim(), 120) }
      : {}),
  }
}

/**
 * Le taux de TVA d'une ligne LU (base, chiffrage IA) : le défaut ne remplace qu'un taux ABSENT ou illisible, jamais un 0 voulu.
 * Vérification du 21/10 (en production) : l'éditeur écrivait `Number(l.tva_taux) || 10` — le 0 % d'un artisan en franchise
 * (art. 293 B du CGI) redevenait 10 % à l'écran, et un devis rechargé repartait à 20 %.
 */
export function tauxTvaLu(v: unknown, defaut: number): number {
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return defaut
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : defaut
}
