// lib/sms/tarifs.ts — la FORME des tarifs, et rien d'autre. AUCUN prix n'est écrit ici : la session principale les sourcera (fournisseur,
// URL, date du relevé) quand Benj aura choisi. Un tarif `null` ferme l'envoi réel (fail-closed) et rend un coût « inconnu » à blanc.
// Le plan §11 (R5 §3) cite des ordres de grandeur ; ils ne sont pas repris : « un prix qui a l'air sourcé alors qu'il est deviné est pire ».
import { PLAFOND_EUROS_HT_JOUR } from './contrat'

export type TarifSms = {
  /** Prix HT d'UN segment, en euros ; `null` tant qu'il n'est pas sourcé. */
  prixSegmentHt: number | null
  /** Où il a été lu (URL ou document) et quand (AAAA-MM-JJ) ; `null` avec le prix. */
  source: string | null
  releveLe: string | null
}

export const TARIFS: Readonly<Record<string, TarifSms>> = {
  sweego: { prixSegmentHt: null, source: null, releveLe: null },
  factice: { prixSegmentHt: null, source: null, releveLe: null },
}

/**
 * Le prix d'un segment que Benj a APPROUVÉ par écrit (euros HT). `null` = jamais approuvé : aucun envoi réel, quel que soit le reste.
 * Seule la session principale le change, après le « go » écrit de Benj (`securite.md` : toute dépense attend son accord).
 */
export const SMS_COUT_APPROUVE: number | null = null

/** Le plafond de dépense par jour (plan §11) : une borne, pas un prix. */
export const PLAFOND_EUROS_JOUR = PLAFOND_EUROS_HT_JOUR

export const prixValide = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

export type CoutEstime = { coutHt: number | null; coutEtat: 'connu' | 'inconnu' }

/** Coût calculé par le code : segments × prix du tarif. `null`/invalide → « inconnu » (jamais 0, jamais un défaut). */
export function estimerCout(fournisseur: string, segments: number, tarifs: Readonly<Record<string, TarifSms>> = TARIFS): CoutEstime {
  const prix = tarifs[fournisseur]?.prixSegmentHt
  if (!prixValide(prix) || !Number.isFinite(segments) || segments <= 0) return { coutHt: null, coutEtat: 'inconnu' }
  return { coutHt: Math.round(prix * segments * 10000) / 10000, coutEtat: 'connu' }
}
