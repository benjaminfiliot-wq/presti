// scripts/mcp/presti-station.mjs — connecteur MCP « presti » : LECTURE SEULE de l'écosystème réel, sans dépendance.
//
// Pourquoi : le harnais de bureau (docs/agents/starnet.md) doit montrer l'état réel de l'équipe Presti, pas un décor.
// Ce serveur répond au protocole MCP (JSON-RPC 2.0 : initialize, tools/list, tools/call) et n'expose QUE des lectures.
//
// Garanties (vérifiées par scripts/mcp/presti-station.test.mjs) :
//   · aucune écriture : la seule porte vers la base est `lire()`, qui n'accepte qu'une LISTE BLANCHE de fonctions
//     `public.pilotage_*` / `public.station_*_lire|etat|actif` toutes déclarées `stable` (lecture seule, 0107/0108/0112/0113) ;
//   · aucune donnée de prospect : les textes passent par `masquer()` (adresses, liens, numéros, noms), les décisions
//     ne rendent ni contexte ni options, les envois ne rendent que des nombres ;
//   · la clé de service est lue dans .env.local (ou l'environnement) au démarrage, tenue en mémoire, JAMAIS affichée,
//     écrite, ni renvoyée à un client : toute sortie est filtrée de la valeur de la clé avant d'être émise.
//
// Deux transports (même code) :
//   node scripts/mcp/presti-station.mjs              → stdio (une ligne JSON par message) — pour les clients MCP standard ;
//   node scripts/mcp/presti-station.mjs --http=8799  → HTTP 127.0.0.1:8799/mcp — pour le harnais de bureau, dont le
//                                                      transport stdio exige un conteneur Docker (« Safe Cell »).
// Aucun `npm install` : uniquement des modules de Node.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const VERSION = '1.0.0'
const PROTOCOLE = '2025-03-26'
const SITE = 'https://prestiapp.fr'

// ── configuration : lue, jamais affichée ─────────────────────────────────────────────────────────
function chargerEnv() {
  const env = { ...process.env }
  try {
    for (const ligne of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne)
      if (m && env[m[1]] == null) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* pas de .env.local : les outils répondront « non configuré » */ }
  return env
}
const ENV = chargerEnv()
const BASE = (ENV.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const CLE = ENV.SUPABASE_SERVICE_ROLE_KEY || ''
const SECRETS = [CLE, ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY, ENV.SUPABASE_DB_PASSWORD].filter((s) => s && s.length >= 12)

// ── liste blanche des lectures (fonctions `stable`, security definer, service_role) ─────────────────
export const LECTURES = Object.freeze([
  'pilotage_agents', 'pilotage_evenements', 'pilotage_decisions', 'pilotage_attention_sources', 'pilotage_etat_envoi',
  'pilotage_compteurs_du_jour', 'pilotage_couts_agents',
])

export function masquer(texte) {
  if (!texte) return ''
  return String(texte)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[adresse]')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>]+|\b[a-z0-9][a-z0-9.-]+\.(?:fr|com|net|org|invalid)(?:\/[^\s<>]*)?/gi, '[lien]')
    .replace(/(?<!\w)(?:(?:\+33|0033|0)[\s.()-]*[1-9](?:[\s.()-]*\d){8}|[1-9](?:[\s.()-]*\d){8})(?!\w)/g, '[numéro]')
    .replace(/\b(?:M\.|Mme\.?|Monsieur|Madame)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?/g, '[nom]')
    .slice(0, 200)
}

async function lire(fonction, args = {}) {
  if (!LECTURES.includes(fonction)) throw new Error(`lecture refusée : ${fonction} n'est pas dans la liste blanche`)
  if (!BASE || !CLE) throw new Error('non configuré : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de .env.local')
  const r = await fetch(`${BASE}/rest/v1/rpc/${fonction}`, {
    method: 'POST',
    headers: { apikey: CLE, Authorization: `Bearer ${CLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
  })
  const texte = await r.text()
  if (!r.ok) throw new Error(`${fonction} : HTTP ${r.status} ${masquer(texte).slice(0, 120)}`)
  const donnees = texte ? JSON.parse(texte) : []
  return Array.isArray(donnees) ? donnees : [donnees]
}

// ── dérivations (mêmes seuils que lib/pilotage/agents.ts et equipage.ts) ───────────────────────────
export function etatAgent(a, maintenant = Date.now()) {
  if (a.disjoncteur_ouvert_le) return 'disjoncteur'
  if (a.en_pause) return 'pause'
  if (!a.battement_le) return 'jamais'
  const age = maintenant - Date.parse(a.battement_le), periode = (a.periode_minutes ?? 0) * 60000
  return age > 2 * periode + 7200000 ? 'panne' : age > 2 * periode ? 'muet' : 'actif'
}
const iso = (v) => (v ? new Date(v).toISOString() : null)
const nb = (v) => (v == null ? null : Number(v))

// ── les outils ──────────────────────────────────────────────────────────────────────────────────
const OUTILS = [
  {
    nom: 'equipe_etat',
    description: "L'équipe Presti réelle : une ligne par agent (nom, libellé, état actif/muet/panne/pause/disjoncteur/jamais, dernier battement, cadence, coût du mois, modèle vu). Lecture seule, noms et nombres seulement.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async lancer() {
      const lignes = await lire('pilotage_agents'), maintenant = Date.now()
      const agents = lignes.map((a) => ({
        nom: a.nom, libelle: a.libelle, etat: etatAgent(a, maintenant), en_pause: !!a.en_pause,
        battement_le: iso(a.battement_le), periode_minutes: a.periode_minutes ?? null, prochain_le: iso(a.prochain_le),
        dernier_evenement: a.dernier_type ?? null, dernier_le: iso(a.dernier_le), cout_mois_eur: nb(a.cout_mois_eur),
        modele: a.modele ?? null, fournisseur: a.fournisseur ?? null,
      }))
      const par = {}
      for (const a of agents) par[a.etat] = (par[a.etat] ?? 0) + 1
      return { total: agents.length, par_etat: par, agents }
    },
  },
  {
    nom: 'journal_recent',
    description: "Le journal de bord récent de l'équipe (événements du bus, sans les battements). Textes masqués (adresses, liens, numéros, noms retirés). Paramètres : limite (1-100, défaut 30), agent (optionnel).",
    inputSchema: { type: 'object', properties: { limite: { type: 'integer', minimum: 1, maximum: 100 }, agent: { type: 'string', pattern: '^[a-z0-9_]{1,40}$' } }, additionalProperties: false },
    async lancer({ limite = 30, agent = null } = {}) {
      const n = Math.max(1, Math.min(100, Number(limite) || 30))
      const lignes = await lire('pilotage_evenements', { p_apres: null, p_limite: n, p_agent: agent, p_types: null })
      return { nombre: lignes.length, evenements: lignes.map((e) => ({ id: e.id, le: iso(e.le), agent: e.agent, type: e.type, resume: masquer(e.resume) })) }
    },
  },
  {
    nom: 'decisions_en_attente',
    description: "Les décisions ouvertes qui attendent Benj : question (masquée), portée, montant, échéance. Ni contexte ni options (données internes).",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async lancer() {
      const lignes = await lire('pilotage_decisions', { p_limite: 50 })
      return { nombre: lignes.length, decisions: lignes.map((d) => ({ id: d.id, question: masquer(d.question).slice(0, 140), portee: d.portee, montant_cents: d.montant_cents ?? null, echeance: iso(d.echeance), cree_le: iso(d.cree_le), creee_par: d.creee_par ?? null, nombre_options: Array.isArray(d.options) ? d.options.length : null })) }
    },
  },
  {
    nom: 'jauges',
    description: "Jauges et quotas : plafonds d'envoi du jour par canal (utilisés / plafond, palier), plaintes et abus (nombres), et dépenses des agents depuis le début du mois (doivent rester à 0 €).",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async lancer() {
      const debutMois = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
      const [canaux, couts] = await Promise.all([lire('pilotage_compteurs_du_jour'), lire('pilotage_couts_agents', { p_depuis: debutMois })])
      const total = couts.reduce((s, c) => s + (Number(c.montant_eur) || 0), 0)
      return {
        canaux: canaux.map((c) => ({ canal: c.canal, palier: c.palier, plafond: c.plafond, utilises: c.utilises, plaintes_7j: c.plaintes_7j, avis_abus: c.avis_abus, stop_100: c.stop_100, reponses_positives: c.reponses_positives })),
        depenses_agents_mois_eur: Math.round(total * 100) / 100,
        depenses_par_agent: couts.map((c) => ({ agent: c.agent, eur: nb(c.montant_eur), appels: c.appels })),
      }
    },
  },
  {
    nom: 'interrupteurs',
    description: "Les deux interrupteurs du bus (envoi_froid, pause_generale) et le palier d'envoi. LECTURE seule : aucun outil de ce connecteur ne les actionne ; seul Benj le fait depuis la station.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async lancer() {
      const [etat, attention] = await Promise.all([lire('pilotage_etat_envoi'), lire('pilotage_attention_sources')])
      const e = etat[0] ?? {}, pause = attention.find((x) => x.cle === 'pause_generale')
      return { envoi_froid: !!e.envoi_froid, pause_generale: !!(pause && Number(pause.nombre) > 0), palier: e.palier ?? null, epreuve_passee: !!e.epreuve_passee, technologies_en_pause: e.technologies_pause ?? [], modeles_suspendus: e.modeles_suspendus ?? [] }
    },
  },
  {
    nom: 'attention',
    description: "Ce qui demande l'attention de Benj, en nombres : tâches bloquées, disjoncteurs, décisions d'argent, escalades du Chef, idées du Chef, pause générale.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async lancer() {
      const lignes = await lire('pilotage_attention_sources')
      return { sources: lignes.map((l) => ({ cle: l.cle, nombre: l.nombre, plus_ancien: iso(l.plus_ancien) })) }
    },
  },
  {
    nom: 'sante_production',
    description: "Santé de la production : le site répond-il (HTTP, durée) et combien d'agents sont en panne / muets / en disjoncteur. Requêtes HEAD/GET publiques sur la page d'accueil seulement.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async lancer() {
      const t0 = Date.now()
      let site
      try {
        const r = await fetch(SITE, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000) })
        site = { url: SITE, http: r.status, ok: r.ok, duree_ms: Date.now() - t0 }
      } catch (e) { site = { url: SITE, ok: false, erreur: masquer(e?.message ?? e).slice(0, 100), duree_ms: Date.now() - t0 } }
      let equipe = null
      try {
        const agents = await lire('pilotage_agents'), maintenant = Date.now(), par = {}
        for (const a of agents) { const s = etatAgent(a, maintenant); par[s] = (par[s] ?? 0) + 1 }
        equipe = par
      } catch (e) { equipe = { erreur: masquer(e?.message ?? e).slice(0, 100) } }
      return { site, equipe_par_etat: equipe, verifie_le: new Date().toISOString() }
    },
  },
]
export const NOMS_OUTILS = OUTILS.map((o) => o.nom)

function epurer(texte) {
  let s = texte
  for (const secret of SECRETS) s = s.split(secret).join('[secret]')
  return s
}

// ── JSON-RPC ────────────────────────────────────────────────────────────────────────────────────
export async function traiter(message) {
  const { id, method, params } = message ?? {}
  const ok = (result) => (id === undefined ? null : { jsonrpc: '2.0', id, result })
  const ko = (code, texte) => (id === undefined ? null : { jsonrpc: '2.0', id, error: { code, message: texte } })
  switch (method) {
    case 'initialize':
      return ok({ protocolVersion: params?.protocolVersion ?? PROTOCOLE, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'presti', version: VERSION }, instructions: "Connecteur de LECTURE de l'écosystème Presti : équipe, journal, décisions, jauges, interrupteurs, santé. Aucune écriture possible." })
    case 'notifications/initialized': case 'notifications/cancelled': return null
    case 'ping': return ok({})
    case 'tools/list':
      return ok({ tools: OUTILS.map(({ nom, description, inputSchema }) => ({ name: nom, description, inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } })) })
    case 'tools/call': {
      const outil = OUTILS.find((o) => o.nom === params?.name)
      if (!outil) return ko(-32602, `outil inconnu : ${params?.name}`)
      try {
        const sortie = await outil.lancer(params?.arguments ?? {})
        return ok({ content: [{ type: 'text', text: epurer(JSON.stringify(sortie, null, 1)) }], isError: false })
      } catch (e) {
        return ok({ content: [{ type: 'text', text: epurer(`Erreur : ${e?.message ?? e}`) }], isError: true })
      }
    }
    default:
      return id === undefined ? null : ko(-32601, `méthode inconnue : ${method}`)
  }
}

// ── transports ──────────────────────────────────────────────────────────────────────────────────
function stdio() {
  const rl = readline.createInterface({ input: process.stdin })
  rl.on('line', async (ligne) => {
    if (!ligne.trim()) return
    let m
    try { m = JSON.parse(ligne) } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } }) + '\n'); return }
    const lot = Array.isArray(m) ? m : [m]
    for (const x of lot) { const r = await traiter(x); if (r) process.stdout.write(JSON.stringify(r) + '\n') }
  })
  rl.on('close', () => { process.exitCode = 0 })
}

function serveurHttp(port) {
  const s = http.createServer(async (req, res) => {
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(obj == null ? '' : JSON.stringify(obj)) }
    if (req.url !== '/mcp') return json(404, { error: 'POST /mcp' })
    if (req.method === 'GET' || req.method === 'DELETE') return json(405, { error: 'méthode non permise' })
    if (req.method !== 'POST') return json(405, { error: 'méthode non permise' })
    let corps = ''
    for await (const morceau of req) { corps += morceau; if (corps.length > 1 << 20) return json(413, { error: 'trop gros' }) }
    let m
    try { m = JSON.parse(corps) } catch { return json(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } }) }
    if (Array.isArray(m)) { const rs = (await Promise.all(m.map(traiter))).filter(Boolean); return rs.length ? json(200, rs) : json(202, null) }
    const r = await traiter(m)
    return r ? json(200, r) : json(202, null)
  })
  s.listen(port, '127.0.0.1', () => console.error(`[presti-station] MCP en lecture seule sur http://127.0.0.1:${port}/mcp`))
  return s
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const h = process.argv.find((a) => a.startsWith('--http'))
  if (h) serveurHttp(Number(h.split('=')[1]) || 8799)
  else stdio()
}
