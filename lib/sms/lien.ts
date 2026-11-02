// lib/sms/lien.ts — l'ÉTAPE 0, gratuite : un lien `sms:` (RFC 5724) que l'artisan ouvre sur SON téléphone et envoie lui-même, d'un geste.
// Rien ne part de Presti : aucun fournisseur, aucun coût. Les mêmes règles de texte s'appliquent (STOP, GSM-7, pas de lien, pas de montant).
import { SEGMENTS_MAX } from './contrat'
import { controlerTexte, type RefusTexte } from './encodage'
import { normaliserMobileMetropole } from './numero'

export type LienSms = { ok: true; lien: string } | { ok: false; raison: 'numero' | RefusTexte }

/** `sms:+33735460001?body=…` — le corps est encodé en pourcent (RFC 3986), les sauts de ligne en %0A. */
export function lienSms(telephone: unknown, texte: unknown): LienSms {
  const numero = normaliserMobileMetropole(telephone)
  if (!numero) return { ok: false, raison: 'numero' }
  const refus = controlerTexte(texte, SEGMENTS_MAX)
  if (refus) return { ok: false, raison: refus }
  return { ok: true, lien: `sms:${numero}?body=${encodeURIComponent(texte as string)}` }
}
