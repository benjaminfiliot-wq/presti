// lib/agents/bus.ts — les appels typés du contrat ops (fiche 026-040) : une fonction par fonction SQL des migrations 0097
// (identité des agents, journal, interrupteurs) et 0098 (tâches, baux, décisions, coûts, état), du MÊME nom, dont
// l'argument porte exactement les noms `p_…` du contrat (scripts/fixtures/026-horloge-bus/contrat-ops.json).
//
// Chacune rend `{ ok: true, data }` ou `{ ok: false, code, status }` :
//   · une erreur métier arrive de PostgREST avec le message `ops:<code>` : `code` est ce code, `status` celui de
//     STATUT_ERREUR ;
//   · la base injoignable (réseau, délai de DELAI_MS dépassé, passerelle en 502/503/504) : `base_injoignable`, 503 ;
//   · tout le reste : `erreur`, 500.
// Le texte brut de Postgres (noms de tables, de contraintes…) ne sort JAMAIS d'ici : il va dans console.error, seul.
//
// Seulement les agents qui tournent DANS Vercel (A0, la file de l'argent) appellent ce module directement ; les autres
// passent par /api/agents/* et la garde (lib/agents/garde.ts). Aucune clé de modèle ni de paiement ici : la clé de
// service seule, par lib/supabaseAdmin.
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type ResultatBus<T = unknown> = { ok: true; data: T } | { ok: false; code: string; status: number }
type EchecBus = Extract<ResultatBus, { ok: false }>

/** Le statut HTTP de chaque code métier `ops:<code>` (tableau de 026-040). Un code absent d'ici rend 500. */
export const STATUT_ERREUR: Readonly<Record<string, number>> = Object.freeze({
  // 400 — la demande est mal formée
  options: 400, defaut: 400, echeance: 400, choix: 400, resume: 400, preuve: 400, jeton_format: 400, purge: 400, type_argent: 400, vt: 400,
  // 403 — hors des droits de l'agent
  type: 403, auteur: 403, opposition: 403, capacite: 403,
  // 404 — ce qui est désigné n'existe pas
  agent_inconnu: 404, origine: 404, interrupteur: 404,
  // 409 — l'état ne le permet pas
  profondeur: 409, sous_taches: 409, bail_perdu: 409, deja_tranchee: 409, jeton_deja_pris: 409, statut: 409,
  '90_jours': 409, '72_heures': 409, '3_messages': 409, relance_sans_contact: 409,
  // 423 — fermé (agent en pause ou disjoncté, pause générale, canal sans quota)
  agent_en_pause: 423, pause_generale: 423, quota_absent: 423,
  // 429 — quota atteint
  quota: 429,
  // Codes levés par 0097 telle qu'appliquée, absents du tableau de la fiche : sans eux, un motif trop long ou le retrait
  // d'un agent protégé partiraient en 500 comme une panne.
  motif: 400, objet: 400, pause: 400, agent_protege: 403,
})

/** Au-delà, l'appel est abandonné et rend 503 : une fonction Vercel ne reste pas pendue à une base qui ne répond plus. */
export const DELAI_MS = 8_000

const INJOIGNABLE: EchecBus = { ok: false, code: 'base_injoignable', status: 503 }
const GENERIQUE: EchecBus = { ok: false, code: 'erreur', status: 500 }
const CODE_OPS = /^ops:([a-z0-9_]{1,40})(?![a-z0-9_])/

function traduire(fonction: string, erreur: { message?: unknown; code?: unknown }, status: number): EchecBus {
  const message = String(erreur.message ?? '').trim()
  const m = CODE_OPS.exec(message)
  if (m && Object.prototype.hasOwnProperty.call(STATUT_ERREUR, m[1])) return { ok: false, code: m[1], status: STATUT_ERREUR[m[1]] }
  const code = String(erreur.code ?? '')
  console.error(`[bus] ${fonction} : ${code || `statut ${status}`} :`, message)
  if (status === 0 || status === 502 || status === 503 || status === 504 || /^PGRST00\d$/.test(code)) return INJOIGNABLE
  return GENERIQUE
}

/** L'appel d'une fonction SQL avec les seuls paramètres `noms` (un absent part à null : aucune n'a de défaut). */
async function appeler<T>(fonction: string, noms: readonly string[], p?: object | null): Promise<ResultatBus<T>> {
  const source = (p ?? {}) as Record<string, unknown>
  const args: Record<string, unknown> = {}
  for (const n of noms) args[n] = source[n] === undefined ? null : source[n]
  let r: { data: unknown; error: { message?: unknown; code?: unknown } | null; status: number }
  try {
    r = await supabaseAdmin.rpc(fonction, args).abortSignal(AbortSignal.timeout(DELAI_MS))
  } catch (e) {
    console.error(`[bus] ${fonction} : base injoignable :`, e instanceof Error ? e.message : e)
    return INJOIGNABLE
  }
  if (r.error) return traduire(fonction, r.error, r.status)
  return { ok: true, data: r.data as T }
}

/** Une fonction du bus : ses noms de paramètres sont vérifiés contre le type de son argument. */
function fonctionBus<P extends object, T>(fonction: string, noms: readonly (keyof P & string)[]) {
  return (p: P): Promise<ResultatBus<T>> => appeler<T>(fonction, noms, p)
}

// ── Ce que rendent les fonctions (le « rend » du contrat) ───────────────────────────────────────────────────────────
/** Une ligne d'`ops_agent_par_jeton` : l'agent non retiré qui porte l'empreinte. */
export type LigneAgentJeton = {
  nom: string; capacites: string[]; types_crees: string[]; tables_ecrites: string[]; debit_minute: number; en_pause: boolean; disjoncteur_ouvert: boolean
}
export type EvenementBus = { id: number; le: string; agent: string; type: string; objet: string | null; resume: string; tache_id: string | null }
export type Creation = { id: string; creee: boolean }
export type DecisionTranchee = { id: string; cle_idempotence: string | null; choix: string; tranchee_le: string }
export type TachePrise = {
  id: string; type: string; cle_idempotence: string; objet: string | null; capacite: string; charge: unknown; tentatives: number
  bail_jusqua: string; origine_id: string | null; profondeur: number
}

// ── 0097 : identité des agents, journal, interrupteurs ───────────────────────────────────────────────────────────────
export const ops_agent_enregistrer = fonctionBus<{
  p_nom: string; p_libelle: string; p_capacites: string[]; p_types_crees: string[]; p_tables: string[]
  p_periode_minutes: number; p_debit_minute: number; p_quota_creations_jour: number; p_plafond_euros_jour: number
}, null>('ops_agent_enregistrer', ['p_nom', 'p_libelle', 'p_capacites', 'p_types_crees', 'p_tables', 'p_periode_minutes', 'p_debit_minute', 'p_quota_creations_jour', 'p_plafond_euros_jour'])
export const ops_agent_poser_jeton = fonctionBus<{ p_nom: string; p_hash: string }, null>('ops_agent_poser_jeton', ['p_nom', 'p_hash'])
export const ops_agent_par_jeton = fonctionBus<{ p_hash: string }, LigneAgentJeton[]>('ops_agent_par_jeton', ['p_hash'])
export const ops_agent_retirer = fonctionBus<{ p_nom: string }, null>('ops_agent_retirer', ['p_nom'])
export const ops_agent_pause = fonctionBus<{ p_nom: string; p_pause: boolean; p_motif?: string | null }, null>('ops_agent_pause', ['p_nom', 'p_pause', 'p_motif'])
/** `p_expire_le` nulle : le jeton externe de l'agent n'expire pas. */
export const ops_agent_echeance = fonctionBus<{ p_nom: string; p_expire_le: string | null }, null>('ops_agent_echeance', ['p_nom', 'p_expire_le'])
export const ops_battement = fonctionBus<{ p_nom: string }, string | null>('ops_battement', ['p_nom'])
export const ops_evenement_ajouter = fonctionBus<{ p_agent: string; p_type: string; p_objet?: string | null; p_resume: string; p_tache?: string | null }, number>('ops_evenement_ajouter', ['p_agent', 'p_type', 'p_objet', 'p_resume', 'p_tache'])
export const ops_evenements_lire = fonctionBus<{ p_agent: string; p_apres?: number | null; p_limite?: number | null }, EvenementBus[]>('ops_evenements_lire', ['p_agent', 'p_apres', 'p_limite'])
export const ops_evenements_purger = fonctionBus<{ p_jours: number }, number>('ops_evenements_purger', ['p_jours'])
export const ops_interrupteur = fonctionBus<{ p_nom: string }, boolean>('ops_interrupteur', ['p_nom'])
export const ops_interrupteur_poser = fonctionBus<{ p_nom: string; p_actif: boolean; p_motif: string; p_auteur: string }, null>('ops_interrupteur_poser', ['p_nom', 'p_actif', 'p_motif', 'p_auteur'])

// ── 0098 : tâches, baux, clôture par clé, décisions, coûts, état ─────────────────────────────────────────────────────
export const ops_type_sortant = fonctionBus<{ p_type: string }, boolean>('ops_type_sortant', ['p_type'])
export const ops_decision_creer = fonctionBus<{
  p_agent: string; p_question: string; p_contexte?: string | null; p_options: unknown; p_defaut: string; p_montant_cents?: number | null
  p_portee?: string | null; p_echeance: string; p_cle?: string | null; p_tache?: string | null
}, Creation[]>('ops_decision_creer', ['p_agent', 'p_question', 'p_contexte', 'p_options', 'p_defaut', 'p_montant_cents', 'p_portee', 'p_echeance', 'p_cle', 'p_tache'])
export const ops_decision_trancher = fonctionBus<{ p_id: string; p_choix: string; p_auteur: string }, null>('ops_decision_trancher', ['p_id', 'p_choix', 'p_auteur'])
export const ops_decisions_tranchees = fonctionBus<{ p_agent: string; p_depuis?: string | null }, DecisionTranchee[]>('ops_decisions_tranchees', ['p_agent', 'p_depuis'])
export const ops_decisions_echues = (): Promise<ResultatBus<number>> => appeler<number>('ops_decisions_echues', [])
export const ops_tache_creer = fonctionBus<{
  p_agent: string; p_type: string; p_cle: string; p_capacite: string; p_charge?: unknown; p_origine?: string | null; p_objet?: string | null
}, Creation[]>('ops_tache_creer', ['p_agent', 'p_type', 'p_cle', 'p_capacite', 'p_charge', 'p_origine', 'p_objet'])
export const ops_tache_prendre = fonctionBus<{ p_agent: string }, TachePrise[]>('ops_tache_prendre', ['p_agent'])
export const ops_tache_rendre = fonctionBus<{ p_agent: string; p_id: string; p_resultat: string; p_preuve_url?: string | null; p_erreur?: string | null }, string>('ops_tache_rendre', ['p_agent', 'p_id', 'p_resultat', 'p_preuve_url', 'p_erreur'])
export const ops_tache_clore = fonctionBus<{ p_agent: string; p_cle: string; p_preuve_url: string }, string>('ops_tache_clore', ['p_agent', 'p_cle', 'p_preuve_url'])
export const ops_baux_expirer = (): Promise<ResultatBus<number>> => appeler<number>('ops_baux_expirer', [])
export const ops_cout_ajouter = fonctionBus<{ p_agent: string; p_fournisseur: string; p_montant_eur: number; p_detail?: unknown; p_tache?: string | null }, number>('ops_cout_ajouter', ['p_agent', 'p_fournisseur', 'p_montant_eur', 'p_detail', 'p_tache'])
export const ops_etat = (): Promise<ResultatBus<Record<string, unknown>>> => appeler<Record<string, unknown>>('ops_etat', [])
export const ops_stockage_octets = (): Promise<ResultatBus<number>> => appeler<number>('ops_stockage_octets', [])
