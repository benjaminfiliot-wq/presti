// L'ÉMISSION d'une facture ou d'un avoir — UN appel, UNE transaction (migration 0180, public.facture_emettre).
//
// Audit argent indépendant du 21/10 (C1, E1, E2, E3, M3) : la facture, ses lignes, son numéro et son scellement étaient quatre
// appels séparés. Entre eux : une situation calculée pendant l'écriture d'une autre l'ignorait, un double clic faisait deux
// factures complètes, une coupure laissait une facture « emise » sans numéro, comptée partout ; et rien ne relisait le
// déjà-facturé pour un acompte. Désormais la base fait tout ou rien, sous verrou (artisan puis devis), et recalcule elle-même
// le déjà-facturé : jamais plus que le devis, quel que soit le type ; numéro tiré dans la même transaction (aucun trou en cas
// d'échec, aucun doublon : index unique (artisan_id, numero)).
//
// FAIL-CLOSED : tant que 0180 n'est pas appliquée, la fonction n'existe pas → 503, rien n'est écrit.
// Ce module ne calcule rien : le serveur (lib/factureDepuisDevis.ts, app/api/factures/[id]/avoir/route.ts) prépare la pièce,
// la base la vérifie et l'émet.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** Le jeton remplacé par le numéro (tiré DANS la transaction) dans le modèle d'empreinte : JSON.stringify({ numero: JETON, … }). */
export const JETON_NUMERO = '@@NUMERO@@'

export type DemandeEmission = {
  artisan_id: string
  devis_id: string | null
  type: 'standard' | 'acompte' | 'situation' | 'solde' | 'avoir'
  avoir_de?: string | null
  /** Année du numéro FAC-AAAA-NNNN (celle du serveur, comme avant 0180). */
  annee: string
  facture: Record<string, unknown>
  lignes: Record<string, unknown>[]
  /** JSON.stringify du contenu scellé, avec `numero: JETON_NUMERO` : l'empreinte SHA-256 est calculée par la base. */
  empreinte_modele: string
}

export type ResultatEmission =
  | { ok: true; id: string; numero: string }
  | { ok: false; status: 409 | 500 | 503; error: string }

export const EMISSION_INDISPONIBLE = 'L’émission des factures est momentanément fermée (mise à jour en cours). Rien n’a été émis : réessayez dans quelques minutes.'

/** La fonction n'existe pas encore (0180 non appliquée) : PostgREST PGRST202, Postgres 42883. */
export function fonctionAbsente(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false
  return e.code === 'PGRST202' || e.code === '42883' || /could not find the function|function .*facture_emettre.* does not exist/i.test(e.message ?? '')
}

/** Un refus des garde-fous (fonction : « refus : … » ; déclencheurs 0041/0078/0176 : « factures… ») : rendu tel quel, en 409. */
export function refusDeLaBase(e: { message?: string } | null | undefined): string | null {
  const m = String(e?.message ?? '')
  const r = /refus : (.*)$/s.exec(m)
  if (r) return r[1].trim()
  if (/^factures( |_lignes )?:/.test(m) || /^Facture emise/.test(m) || /duplicate key value.*factures_artisan_numero_unique/.test(m)) return m
  return null
}

export async function emettreFacture(d: DemandeEmission): Promise<ResultatEmission> {
  const { data, error } = await supabaseAdmin.rpc('facture_emettre', { p: d })
  if (error) {
    if (fonctionAbsente(error)) return { ok: false, status: 503, error: EMISSION_INDISPONIBLE }
    const refus = refusDeLaBase(error)
    console.error('[factures] émission refusée :', error.message)
    if (refus) return { ok: false, status: 409, error: `La facture n’a pas été émise : ${refus}. Rechargez la page (une autre facture a peut-être été émise entre-temps), puis réessayez.` }
    return { ok: false, status: 500, error: 'Création de la facture impossible. Rien n’a été émis.' }
  }
  const r = (data ?? {}) as { id?: unknown; numero?: unknown }
  if (typeof r.id !== 'string' || typeof r.numero !== 'string' || !r.numero) {
    console.error('[factures] émission : réponse inattendue', data)
    return { ok: false, status: 500, error: 'Création de la facture impossible : réponse inattendue de la base.' }
  }
  return { ok: true, id: r.id, numero: r.numero }
}
