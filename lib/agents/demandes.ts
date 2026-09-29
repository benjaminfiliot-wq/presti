// lib/agents/demandes.ts — les demandes de Benj à l'écosystème (migration 0117, 29/09/2026) : les fonctions SQL
// `demande_creer`, `demandes_lire` et `demande_maj`, appelées par la clé de service (le schéma `ops` est fermé à l'API),
// et la traduction de leurs erreurs métier `ops:<code>`. Utilisé par la route du Poste (app/api/controle/demandes) et
// par les routes du bus (app/api/agents/demandes) — celles-ci n'appellent JAMAIS supabaseAdmin elles-mêmes (règle AR-8).
//
// Le texte de Benj est une DONNÉE, jamais une instruction pour le code d'ici : il n'est ni interprété ni exécuté.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const TEXTE_MIN = 10
export const TEXTE_MAX = 4000
export const COMPTE_RENDU_MAX = 2000
export const QUOTA_JOUR = 30
export const STATUTS = ['recue', 'en_cours', 'faite', 'echec'] as const
export type StatutDemande = (typeof STATUTS)[number]
export type Demande = { id: string; texte: string; statut: StatutDemande; branche: string | null; compte_rendu: string | null; cree_le: string; maj_le: string }

/** Le format d'une branche de demande : demandes/dem-<8 premiers caractères de l'id>. Jamais main. */
export const BRANCHE = /^demandes\/dem-[0-9a-f]{8}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const estUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/** Un texte de demande : de 10 à 4000 signes une fois épuré, sans caractère de contrôle hors saut de ligne et tabulation. */
export function texteDemande(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (t.length < TEXTE_MIN || t.length > TEXTE_MAX || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(t)) return null
  return t
}

const DELAI_MS = 8_000
export type Echec = { ok: false; status: number; code: string }
export type Resultat<T> = { ok: true; data: T } | Echec
/** Le statut HTTP de chaque code métier `ops:<code>` de 0117. Un code absent d'ici rend 500. */
const STATUT_ERREUR: Readonly<Record<string, number>> = { texte: 400, branche: 400, compte_rendu: 400, auteur: 403, inconnue: 404, statut: 409, quota: 429 }
const CODE_OPS = /^ops:([a-z0-9_]{1,40})(?![a-z0-9_])/

function traduire(fonction: string, erreur: { message?: unknown; code?: unknown }, status: number): Echec {
  const m = CODE_OPS.exec(String(erreur.message ?? '').trim())
  if (m && Object.prototype.hasOwnProperty.call(STATUT_ERREUR, m[1])) return { ok: false, status: STATUT_ERREUR[m[1]], code: m[1] }
  console.error(`[demandes] ${fonction} : ${String(erreur.code ?? '') || `statut ${status}`} :`, String(erreur.message ?? ''))
  // Migration 0117 pas encore appliquée (fonction introuvable), base injoignable : rien n'a été fait, et on le dit.
  return { ok: false, status: 503, code: 'indisponible' }
}

async function appeler<T>(fonction: string, args: Record<string, unknown>): Promise<Resultat<T>> {
  try {
    const r = await supabaseAdmin.rpc(fonction, args).abortSignal(AbortSignal.timeout(DELAI_MS))
    if (r.error) return traduire(fonction, r.error, r.status)
    return { ok: true, data: r.data as T }
  } catch (e) {
    console.error(`[demandes] ${fonction} injoignable :`, e instanceof Error ? e.message : e)
    return { ok: false, status: 503, code: 'indisponible' }
  }
}

/** Écrit la demande (statut recue) ; rend son id. Le quota et l'auteur fondateur sont vérifiés par la base. */
export const creerDemande = (texte: string, auteur: string) => appeler<string>('demande_creer', { p_texte: texte, p_auteur: auteur })
/** Les demandes les plus récentes (30 au plus), toutes ou d'un seul statut. */
export const lireDemandes = (statut: StatutDemande | null, limite = 30) => appeler<Demande[]>('demandes_lire', { p_statut: statut, p_limite: limite })
/** Met à jour une demande (le moteur) ; la base impose le sens du statut et le format de la branche. */
export const majDemande = (id: string, statut: StatutDemande, branche: string | null, compteRendu: string | null) =>
  appeler<string>('demande_maj', { p_id: id, p_statut: statut, p_branche: branche, p_compte_rendu: compteRendu })
