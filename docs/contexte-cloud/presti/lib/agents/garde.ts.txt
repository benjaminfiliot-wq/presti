// lib/agents/garde.ts — la garde des agents extérieurs à Vercel (fiche 026-040) : routines Claude, chef d'opérations sur
// Codex, scripts de l'usine et du poste. Chaque appel à /api/agents/* passe ici avant tout le reste.
//
// authAgent(req), dans cet ordre :
//   1. l'en-tête `Authorization: Bearer <jeton>` au format de lib/agents/jetons ; absent ou mal formé → le plafond par
//      réseau IP (`agents:ip:<réseau>`, 30 essais par 10 min), puis 401 `jeton`. Rien n'est haché, la base n'est pas lue ;
//   2. `ops_agent_par_jeton(empreinte)` : aucune ligne, ou un nom qui n'est pas celui du jeton → 401 `jeton`, au MÊME corps
//      qu'un jeton absent (rien à apprendre pour qui essaie) ; ces essais comptent aussi dans le plafond du réseau ;
//      la base en erreur → 503 ;
//   3. agent en pause ou disjoncteur ouvert → 423 `agent_en_pause` ;
//   4. `consommer_limite('agent:<nom>:minute', debit_minute, 60)` : false → 429 `quota` ; erreur → 503.
// Aucune de ces étapes ne laisse passer en panne : à l'inverse de lib/limites.ts (juste pour un prospect du site, faux pour
// un agent), un compteur injoignable REFUSE. La garde appelle donc consommer_limite (migration 0049) elle-même.
//
// Temps constant : le jeton n'est jamais comparé en clair ; seule son empreinte sha256 sert de clé de recherche en base
// (voir lib/agents/jetons.ts). Le jeton, son empreinte et le corps de la requête ne vont ni dans le journal, ni en console.
//
// exigerType / exigerTable : la portée de l'agent (ses types de tâches, ses tables). Chaque refus 403 ou 429 d'un agent
// connu est journalisé (`ops_evenement_ajouter`, type `refus` : l'agent, le motif, la route) ; si le journal échoue, le
// refus tient quand même. Les refus de débit ne s'écrivent qu'une fois par agent et par minute : un agent qui boucle au-delà
// de son débit ne peut pas remplir ops.evenements, qui ne se purge pas avant 30 jours.
//
// Jamais ici : la clé d'un modèle, une clé de paiement, les moteurs de modèle. La clé de service seule, par lib/supabaseAdmin.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { reseauIp } from '@/lib/audienceServeur'
import { getIp } from '@/lib/security'
import { FORMAT_JETON, empreinteJeton, nomDuJeton } from '@/lib/agents/jetons'
import { DELAI_MS, ops_agent_par_jeton, ops_evenement_ajouter } from '@/lib/agents/bus'

// Types sans `readonly`, exprès : une route écrit `const refus = (r: unknown): r is { status: number; code: string;
// error: string } => …` puis `if (refus(agent)) return …` ; une propriété readonly n'est pas un sous-type strict d'une
// propriété modifiable, et TypeScript ne retirerait plus RefusAgent de l'union (agent.nom ne compilerait pas). Les refus
// partagés restent gelés (Object.freeze) : une route ne peut pas les modifier.
/** Un agent reconnu : sa portée et son débit, tels que la base les a rendus pour ce jeton. */
export type AgentAuth = {
  nom: string
  capacites: string[]
  typesCrees: string[]
  tablesEcrites: string[]
  debitMinute: number
  /** Le chemin appelé, pour le journal des refus (jamais la requête ni son corps). */
  route: string
}
export type RefusAgent = { status: number; code: string; error: string }

/** Plafond des essais sans jeton valable, par réseau IP (l'IPv4 entière, le /64 d'une IPv6). */
export const PLAFOND_ESSAIS_IP = 30
export const FENETRE_ESSAIS_IP_S = 600

const JETON: RefusAgent = Object.freeze({ status: 401, code: 'jeton', error: 'Jeton d’agent refusé.' })
const ESSAIS: RefusAgent = Object.freeze({ status: 429, code: 'essais', error: 'Trop d’essais : réessayez plus tard.' })
const INJOIGNABLE: RefusAgent = Object.freeze({ status: 503, code: 'base_injoignable', error: 'Service momentanément indisponible.' })
const EN_PAUSE: RefusAgent = Object.freeze({ status: 423, code: 'agent_en_pause', error: 'Cet agent est en pause.' })
const DEBIT: RefusAgent = Object.freeze({ status: 429, code: 'quota', error: 'Débit de l’agent dépassé : réessayez dans une minute.' })
const HORS_TYPES: RefusAgent = Object.freeze({ status: 403, code: 'type', error: 'Type de tâche hors du périmètre de cet agent.' })
const HORS_TABLES: RefusAgent = Object.freeze({ status: 403, code: 'table', error: 'Table hors du périmètre de cet agent.' })

/** Vrai pour un refus (à rendre tel quel par reponseRefusAgent), faux pour un agent reconnu. */
export const estRefusAgent = (r: AgentAuth | RefusAgent | null | undefined): r is RefusAgent => !!r && typeof r === 'object' && 'error' in r

/** consommer_limite (0049), appelée directement : true = passe, false = plafond atteint, null = compteur injoignable. */
async function consommer(cle: string, max: number, fenetreS: number): Promise<boolean | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('consommer_limite', { p_cle: cle, p_max: max, p_fenetre_s: fenetreS }).abortSignal(AbortSignal.timeout(DELAI_MS))
    if (error) { console.error('[agents] consommer_limite :', error.message); return null }
    return data === true
  } catch (e) {
    console.error('[agents] consommer_limite injoignable :', e instanceof Error ? e.message : e)
    return null
  }
}

/** Le jeton de l'en-tête Authorization, s'il est au format ; null sinon (absent, autre schéma, mal formé). */
function jetonDeLEntete(valeur: string | null): string | null {
  if (!valeur || valeur.length > 200) return null
  const m = /^Bearer +(\S+)$/i.exec(valeur.trim())
  return m && FORMAT_JETON.test(m[1]) ? m[1] : null
}

/** Un essai sans jeton valable : il compte dans le plafond de son réseau, puis 401 (ou 429 au-delà, 503 en panne). */
async function refusSansJeton(req: Request): Promise<RefusAgent> {
  const reseau = reseauIp(getIp(req)).slice(0, 100)
  const ok = await consommer(`agents:ip:${reseau}`, PLAFOND_ESSAIS_IP, FENETRE_ESSAIS_IP_S)
  if (ok === null) return INJOIGNABLE
  return ok ? JETON : ESSAIS
}

function cheminDe(req: Request): string {
  try { return new URL(req.url).pathname.slice(0, 120) } catch { return '/api/agents' }
}
const chaines = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** Le refus d'un agent connu, journalisé ; un journal en panne ne change rien au refus. */
async function journaliser(agent: AgentAuth, r: RefusAgent, motif: string): Promise<RefusAgent> {
  let journal = false
  try {
    const ev = await ops_evenement_ajouter({ p_agent: agent.nom, p_type: 'refus', p_objet: agent.route || null, p_resume: `refus ${r.status} : ${motif}`.slice(0, 200), p_tache: null })
    journal = ev.ok
  } catch { /* le refus tient */ }
  if (!journal) console.error('[agents] refus non journalisé :', agent.nom, r.code)
  return r
}

export async function authAgent(req: Request): Promise<AgentAuth | RefusAgent> {
  // 1. le format, avant tout hachage et toute lecture de la base
  const jeton = jetonDeLEntete(req.headers.get('authorization'))
  if (jeton === null) return refusSansJeton(req)

  // 2. l'agent qui porte cette empreinte
  const r = await ops_agent_par_jeton({ p_hash: empreinteJeton(jeton) })
  if (!r.ok) return INJOIGNABLE
  const ligne = Array.isArray(r.data) && r.data.length === 1 ? (r.data[0] as Record<string, unknown> | null) : null
  if (!ligne || typeof ligne.nom !== 'string' || ligne.nom !== nomDuJeton(jeton)) return refusSansJeton(req)

  // 3. en pause ou disjoncté
  if (ligne.en_pause !== false || ligne.disjoncteur_ouvert !== false) return EN_PAUSE

  const debitMinute = Number(ligne.debit_minute)
  const agent: AgentAuth = {
    nom: ligne.nom,
    capacites: chaines(ligne.capacites),
    typesCrees: chaines(ligne.types_crees),
    tablesEcrites: chaines(ligne.tables_ecrites),
    debitMinute: Number.isInteger(debitMinute) && debitMinute > 0 ? debitMinute : 0,
    route: cheminDe(req),
  }

  // 4. le débit de l'agent (un débit illisible vaut 0 : tout est refusé)
  const debit = await consommer(`agent:${agent.nom}:minute`, agent.debitMinute, 60)
  if (debit === null) return INJOIGNABLE
  if (!debit) {
    // une seule trace par agent et par minute ; si ce second compteur est injoignable, on journalise quand même
    const tracer = await consommer(`agent:${agent.nom}:refus_debit`, 1, 60)
    return tracer === false ? DEBIT : journaliser(agent, DEBIT, `débit de ${agent.debitMinute} appels par minute dépassé`)
  }
  return agent
}

/** null si `type` est l'un des types de tâches de l'agent ; sinon un refus 403, journalisé. */
export async function exigerType(agent: AgentAuth, type: string): Promise<RefusAgent | null> {
  if (typeof type === 'string' && agent.typesCrees.includes(type)) return null
  return journaliser(agent, HORS_TYPES, 'type de tâche hors de ses types')
}

/** null si l'agent écrit dans `table` ; sinon un refus 403, journalisé. */
export async function exigerTable(agent: AgentAuth, table: string): Promise<RefusAgent | null> {
  if (typeof table === 'string' && agent.tablesEcrites.includes(table)) return null
  return journaliser(agent, HORS_TABLES, /^[a-z_]{2,30}$/.test(String(table)) ? `table ${table} hors de ses tables` : 'table hors de ses tables')
}

/** La réponse JSON d'un refus : { error, code }, au statut du refus, jamais mise en cache. */
export function reponseRefusAgent(r: RefusAgent): NextResponse {
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (r.status === 401) headers['www-authenticate'] = 'Bearer realm="agents"'
  if (r.status === 429) headers['retry-after'] = String(r.code === 'quota' ? 60 : FENETRE_ESSAIS_IP_S)
  if (r.status === 503) headers['retry-after'] = '30'
  return NextResponse.json({ error: r.error, code: r.code }, { status: r.status, headers })
}
