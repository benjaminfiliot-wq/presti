#!/usr/bin/env node
// scripts/modeles-qa.mjs — le juge du registre des IA et de la sonde réelle (scripts/modeles/*, 08/10/2026).
//
//   node scripts/modeles-qa.mjs [--racine=<copie>] [--json]   MQ-1 à MQ-12 sur l'arbre (ou sur une copie)
//   node scripts/modeles-qa.mjs --preuve-echecs                le témoin (tout vert), puis chaque SABOTAGE sur copie : il doit rendre rouge le critère qu'il vise
//
// Tout se passe en local : doublures de fetch, de http local et de commandes, une fausse clé tirée au hasard à chaque passage et CHERCHÉE dans chaque
// sortie. Aucun modèle réel, aucun réseau, aucune dépense. Ce juge ne remplace ni scripts/relais-ia-qa.mjs, ni chef-qa.mjs, ni preneur-qa.mjs : il
// ne relâche aucun de leurs critères et ne touche pas à leurs fichiers.
// Codes : 0 tout vert ; 1 un critère rouge (ou un sabotage non attrapé) ; 2 usage ou préalable absent.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const args = process.argv.slice(2)
for (const a of args) if (a !== '--preuve-echecs' && a !== '--json' && !a.startsWith('--racine=')) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const PREUVE = args.includes('--preuve-echecs')
const JSON_SORTIE = args.includes('--json')
const RACINE = path.resolve(args.find((a) => a.startsWith('--racine='))?.slice(9) || DEPOT)
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'modeles-qa')

const lire = (f) => fs.readFileSync(f, 'utf8')
const importer = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const FICHIERS = ['scripts/modeles/registre.mjs', 'scripts/modeles/adaptateurs.mjs', 'scripts/modeles/sonde.mjs', 'scripts/usine/relais-chef.mjs', 'scripts/usine/moteurs-anthropic.mjs', 'scripts/modele/chef-leger-entree.mjs', 'scripts/modele/prompt-chef.mjs', 'docs/agents/modeles-ecosysteme.md']
for (const f of FICHIERS) if (!fs.existsSync(path.join(RACINE, f)) && !f.endsWith('.md')) { console.error(`✗ préalable absent : ${f}`); process.exit(2) }

const REQUIS = ['claude_haiku', 'codex', 'codex_gratuit', 'antigravity', 'freellmapi_gemini', 'freellmapi_mistral', 'freellmapi_auto', 'freellmapi_cloudflare', 'freellmapi_cerebras', 'groq', 'ollama_cloud', 'ollama_chef_leger', 'ollama_8b', 'ollama_4b', 'ollama_preneur_v1', 'ollama_preneur_v2', 'ollama_vision', 'hermes', 'openclaw', 'atomic_agent', 'perplexity', 'firecrawl', 'fish_audio']
const MODELES_LOCAUX = ['qwen3:4b-instruct-2507-q4_K_M', 'qwen3:8b-q4_K_M', 'presti-chef-leger:1.5b', 'presti-preneur:1.5b', 'presti-preneur:1.5b-v2', 'qwen2.5vl:3b']
const FORMES_CLE = [/sk-ant-[A-Za-z0-9_-]{20,}/, /\bfc-[A-Za-z0-9]{32}\b/, /sk-fish-[A-Za-z0-9_-]{10,}/, /\beyJ[\w-]{10,}\.[\w-]{10,}\./]

// ── les doublures ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const reponse = (statut, corps) => ({ ok: statut >= 200 && statut < 300, status: statut, text: async () => (typeof corps === 'string' ? corps : JSON.stringify(corps)), json: async () => (typeof corps === 'string' ? JSON.parse(corps) : corps) })
function fauxFetch(rep) { const f = async (url, init) => { f.appels.push({ url: String(url), init }); return typeof rep === 'function' ? rep(url, init) : rep }; f.appels = []; return f }
const depsDe = (extra = {}) => ({ env: {}, racine: RACINE, lire: () => { throw new Error('absent') }, lireSudo: () => { throw new Error('absent') }, requeteHttp: async () => ({ statut: 0, texte: 'ECONNREFUSED', ms: 1 }), lancer: () => ({ status: 1, stdout: '', stderr: '' }), tmp: TRAVAIL, ...extra })
const HAIKU_OK = { content: [{ type: 'text', text: 'OK' }], usage: { input_tokens: 20, output_tokens: 4 } }

const criteres = []
const critere = (id, titre, fn) => criteres.push({ id, titre, fn })

// MQ-1 ─ le registre : sain, complet, chaque IA déclarée a sa sonde
critere('MQ-1', 'le registre est sain et couvre toutes les IA de l\'écosystème', async () => {
  const { REGISTRE, defautsDuRegistre } = await importer('scripts/modeles/registre.mjs')
  const e = defautsDuRegistre(REGISTRE)
  for (const id of REQUIS) if (!REGISTRE.some((x) => x.id === id)) e.push(`IA absente du registre : ${id}`)
  for (const m of MODELES_LOCAUX) if (!REGISTRE.some((x) => x.modele === m)) e.push(`modèle local absent du registre : ${m}`)
  const h = REGISTRE.find((x) => x.id === 'claude_haiku')
  if (h && (h.modele !== 'claude-haiku-5-5' || h.acces !== 'anthropic')) e.push('claude_haiku : id d\'API ou accès inattendu')
  for (const x of REGISTRE) for (const l of x.lieux) if (x.branche?.[l] === true && (!x.sonde?.type || x.sonde.type === 'declare')) e.push(`${x.id} : déclaré branché (${l}) sans sonde réelle`)
  return e
})

// MQ-2 ─ le registre et la chaîne du relais disent la même chose
critere('MQ-2', 'chaque moteur du relais du chef est dans le registre, dans le même ordre', async () => {
  const { REGISTRE } = await importer('scripts/modeles/registre.mjs')
  const { CHAINE_SECOURS } = await importer('scripts/usine/relais-chef.mjs')
  const e = []
  let dernier = -1
  for (const m of CHAINE_SECOURS) {
    const x = REGISTRE.find((r) => r.relais === m.id)
    if (!x) { e.push(`moteur du relais sans entrée de registre : ${m.id}`); continue }
    if (x.modele !== m.modele) e.push(`${m.id} : modèle ${x.modele} au registre, ${m.modele} dans le relais`)
    if (x.gratuit !== m.gratuit) e.push(`${m.id} : gratuit ${x.gratuit} au registre, ${m.gratuit} dans le relais`)
    const local = x.acces === 'ollama' && !/cloud/i.test(x.modele)
    if (local !== m.local) e.push(`${m.id} : local ${local} au registre, ${m.local} dans le relais`)
    if (typeof x.ordre !== 'number' || x.ordre <= dernier) e.push(`${m.id} : l'ordre du registre (${x.ordre}) ne suit pas celui du relais`)
    dernier = x.ordre ?? dernier
  }
  return e
})

// MQ-3 ─ Haiku 5.5 dans le relais : requête, tarif, ordre, donnée de prospect
critere('MQ-3', 'Haiku 5.5 : API Messages sans réflexion forcée, avant les gratuits distants, jamais pour un prospect', async () => {
  const ma = await importer('scripts/usine/moteurs-anthropic.mjs')
  const rc = await importer('scripts/usine/relais-chef.mjs')
  const e = []
  const avant = { ...process.env }
  const dossier = fs.mkdtempSync(path.join(TRAVAIL, 'mq3-'))
  try {
    delete process.env.PRESTI_HAIKU_PLAFOND_USD
    process.env.PRESTI_HAIKU_COMPTEUR = path.join(dossier, 'compteur.json')
    process.env.PRESTI_HAIKU_CLE = 'cle-essai-0123456789abcdef'
    if (ma.MODELE_HAIKU !== 'claude-haiku-5-5') e.push(`modèle ${ma.MODELE_HAIKU}`)
    if (ma.TARIF_ENTREE !== 0.10 / 1e6 || ma.TARIF_SORTIE !== 0.50 / 1e6) e.push('tarif différent de 0,10 $ / 0,50 $ le million')
    if (ma.plafondUsd() !== 1) e.push(`plafond par jour ${ma.plafondUsd()} au lieu de 1 $`)
    const f = fauxFetch(reponse(200, { content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'A' }, { type: 'text', text: 'B' }], usage: { input_tokens: 1000, output_tokens: 200 } }))
    const r = await ma.appelerHaiku({ systeme: 's', utilisateur: 'u', fetchFn: f, cle: 'cle-essai-0123456789abcdef' })
    const q = f.appels[0]
    if (!q) e.push('aucune requête envoyée')
    else {
      const corps = JSON.parse(q.init.body)
      if (q.url !== 'https://api.anthropic.com/v1/messages') e.push(`adresse ${q.url}`)
      if (q.init.headers['x-api-key'] !== 'cle-essai-0123456789abcdef' || q.init.headers['anthropic-version'] !== '2023-06-01') e.push('en-têtes x-api-key / anthropic-version')
      if (corps.model !== 'claude-haiku-5-5') e.push(`model ${corps.model}`)
      if (corps.thinking?.type !== 'disabled') e.push('thinking:{type:"disabled"} absent de la requête (appel simple)')
      if (!Array.isArray(corps.messages) || !corps.system) e.push('messages / system absents')
    }
    if (r.texte !== 'AB') e.push(`blocs text mal lus : ${JSON.stringify(r.texte)}`)
    if (Math.abs((r.cout ?? -1) - (1000 * 0.10 + 200 * 0.50) / 1e6) > 1e-12) e.push(`coût ${r.cout}`)
    // l'ordre : Haiku avant tout moteur gratuit distant, ni gratuit ni local, api anthropic
    const ids = rc.CHAINE_SECOURS.map((m) => m.id)
    const h = rc.CHAINE_SECOURS.find((m) => m.id === 'claude_haiku')
    if (!h) e.push('claude_haiku absent de la chaîne du relais')
    else {
      if (h.api !== 'anthropic' || h.gratuit || h.local) e.push('claude_haiku : api / gratuit / local inattendus')
      for (const m of rc.CHAINE_SECOURS) if ((m.gratuit && !m.local) && ids.indexOf(m.id) < ids.indexOf('claude_haiku')) e.push(`${m.id} (gratuit distant) passe avant Haiku`)
      for (const m of rc.CHAINE_SECOURS) if (m.local && ids.indexOf(m.id) < ids.indexOf('claude_haiku')) e.push(`${m.id} (local) passe avant Haiku`)
      // jamais pour un prospect
      for (const flag of [true, false]) if (rc.secoursPermis('prospect', flag).some((m) => m.id === 'claude_haiku' || m.gratuit || !m.local)) e.push(`prospect (drapeau ${flag}) : un moteur distant ou gratuit est permis`)
      if (rc.secoursPermis('publique', false)[0]?.id !== 'claude_haiku') e.push('donnée publique : Haiku n\'est pas le premier moteur de secours')
      const g = fauxFetch(reponse(200, HAIKU_OK))
      const dest = path.join(dossier, 'plan.json')
      const p = await rc.appelDirect({ moteur: h, prompt: { systeme: 's', utilisateur: 'Contact : jean.dupont@exemple.com, 06 12 34 56 78', destination: dest, dernierMessage: null }, cle: null, delaiMs: 5000, fetchFn: g })
      if (p.code === 0 || g.appels.length) e.push('une donnée de prospect est partie vers Haiku')
    }
  } finally { for (const k of Object.keys(process.env)) if (!(k in avant)) delete process.env[k]; Object.assign(process.env, avant); fs.rmSync(dossier, { recursive: true, force: true }) }
  return e
})

// MQ-4 ─ les adaptateurs : un vrai appel, rien d'autre ne donne « OK »
critere('MQ-4', 'une IA ne répond OK que si son appel a répondu (clé absente, vide, quota, refus, panne)', async () => {
  const { REGISTRE, trouver } = await importer('scripts/modeles/registre.mjs')
  const { appeler } = await importer('scripts/modeles/adaptateurs.mjs')
  const e = []
  const haiku = trouver('claude_haiku', REGISTRE)
  const cle = { env: { PRESTI_HAIKU_CLE: 'cle-essai-0123456789abcdef' } }
  const cas = async (nom, entree, lieu, deps, attendu) => {
    const r = await appeler(entree, lieu, depsDe(deps))
    if (r.etat !== attendu.etat || (attendu.raison && r.raison !== attendu.raison)) e.push(`${nom} : ${r.etat}/${r.raison ?? '-'} au lieu de ${attendu.etat}/${attendu.raison ?? '-'}`)
    return r
  }
  // anthropic
  let f = fauxFetch(reponse(200, HAIKU_OK))
  const bon = await cas('Haiku répond', haiku, 'pc', { ...cle, fetchFn: f }, { etat: 'OK' })
  if (!(bon.ms >= 0) || typeof bon.depense_usd !== 'number') e.push('Haiku répond : latence ou dépense non mesurées')
  f = fauxFetch(reponse(200, HAIKU_OK))
  await cas('Haiku sans clé', haiku, 'pc', { env: {}, fetchFn: f }, { etat: 'KO', raison: 'cle_absente' })
  if (f.appels.length) e.push('Haiku sans clé : un appel est parti quand même')
  await cas('Haiku sur l\'usine (aucune clé déployée)', haiku, 'usine', { env: {}, fetchFn: fauxFetch(reponse(200, HAIKU_OK)) }, { etat: 'KO', raison: 'cle_absente' })
  await cas('Haiku vide', haiku, 'pc', { ...cle, fetchFn: fauxFetch(reponse(200, { content: [], usage: { input_tokens: 5, output_tokens: 0 } })) }, { etat: 'KO', raison: 'sortie_vide' })
  await cas('Haiku texte blanc', haiku, 'pc', { ...cle, fetchFn: fauxFetch(reponse(200, { content: [{ type: 'text', text: '   ' }], usage: { input_tokens: 5, output_tokens: 1 } })) }, { etat: 'KO', raison: 'sortie_vide' })
  await cas('Haiku 429', haiku, 'pc', { ...cle, fetchFn: fauxFetch(reponse(429, { error: { message: 'rate limit' } })) }, { etat: 'KO', raison: 'quota' })
  await cas('Haiku 401', haiku, 'pc', { ...cle, fetchFn: fauxFetch(reponse(401, { error: { message: 'invalid x-api-key' } })) }, { etat: 'KO', raison: 'non_autorise' })
  await cas('Haiku 404', haiku, 'pc', { ...cle, fetchFn: fauxFetch(reponse(404, { error: { message: 'model: not found' } })) }, { etat: 'KO', raison: 'modele_absent' })
  await cas('Haiku injoignable', haiku, 'pc', { ...cle, fetchFn: async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }) } }, { etat: 'KO', raison: 'injoignable' })
  // openai-compatible (freellmapi)
  const auto = trouver('freellmapi_auto', REGISTRE)
  const lectureCle = { lire: () => 'cle-freellmapi-0123456789abcdef' }
  await cas('freellmapi répond', auto, 'usine', { ...lectureCle, fetchFn: fauxFetch(reponse(200, { model: 'x', choices: [{ message: { content: 'OK' } }] })) }, { etat: 'OK' })
  await cas('freellmapi vide', auto, 'usine', { ...lectureCle, fetchFn: fauxFetch(reponse(200, { choices: [{ message: { content: '' } }] })) }, { etat: 'KO', raison: 'sortie_vide' })
  await cas('freellmapi sans choix', auto, 'usine', { ...lectureCle, fetchFn: fauxFetch(reponse(200, {})) }, { etat: 'KO', raison: 'sortie_vide' })
  await cas('freellmapi erreur 200', auto, 'usine', { ...lectureCle, fetchFn: fauxFetch(reponse(200, { error: { message: 'All models exhausted' } })) }, { etat: 'KO', raison: 'quota' })
  await cas('freellmapi 429', auto, 'usine', { ...lectureCle, fetchFn: fauxFetch(reponse(429, 'exhausted')) }, { etat: 'KO', raison: 'quota' })
  await cas('freellmapi depuis le PC', auto, 'pc', { ...lectureCle, fetchFn: fauxFetch(reponse(200, { choices: [{ message: { content: 'OK' } }] })) }, { etat: 'KO', raison: 'injoignable' })
  f = fauxFetch(reponse(200, { choices: [{ message: { content: 'OK' } }] }))
  await cas('freellmapi sans clé', auto, 'usine', { fetchFn: f }, { etat: 'KO', raison: 'cle_absente' })
  if (f.appels.length) e.push('freellmapi sans clé : un appel est parti quand même')
  // ollama
  const q4 = trouver('ollama_4b', REGISTRE)
  await cas('Ollama répond (flux)', q4, 'usine', { requeteHttp: async () => ({ statut: 200, texte: '{"message":{"content":"O"},"done":false}\n{"message":{"content":"K"},"done":true}\n', ms: 3 }) }, { etat: 'OK' })
  await cas('Ollama vide', q4, 'usine', { requeteHttp: async () => ({ statut: 200, texte: '{"message":{"content":""},"done":true}', ms: 3 }) }, { etat: 'KO', raison: 'sortie_vide' })
  await cas('Ollama modèle absent', q4, 'usine', { requeteHttp: async () => ({ statut: 404, texte: '{"error":"model not found"}', ms: 3 }) }, { etat: 'KO', raison: 'modele_absent' })
  await cas('Ollama injoignable', q4, 'usine', { requeteHttp: async () => ({ statut: 0, texte: 'ECONNREFUSED', ms: 3 }) }, { etat: 'KO', raison: 'injoignable' })
  await cas('Ollama cloud en quota', trouver('ollama_cloud', REGISTRE), 'usine', { requeteHttp: async () => ({ statut: 429, texte: 'you have reached your monthly usage limit', ms: 3 }) }, { etat: 'KO', raison: 'quota' })
  // api de recherche (solde)
  const fc = trouver('firecrawl', REGISTRE)
  const cleFc = { lire: () => `fc-${'a'.repeat(32)}` }
  await cas('Firecrawl répond', fc, 'pc', { ...cleFc, fetchFn: fauxFetch(reponse(200, { success: true, data: { remaining_credits: 200 } })) }, { etat: 'OK' })
  await cas('Firecrawl sans solde', fc, 'pc', { ...cleFc, fetchFn: fauxFetch(reponse(200, {})) }, { etat: 'KO', raison: 'reponse_inattendue' })
  await cas('Firecrawl 401', fc, 'pc', { ...cleFc, fetchFn: fauxFetch(reponse(401, 'unauthorized')) }, { etat: 'KO', raison: 'non_autorise' })
  // cli
  const ag = trouver('antigravity', REGISTRE)
  await cas('exécutant répond', ag, 'pc', { lancer: () => ({ status: 0, stdout: '✓ sonde flash_lite : Antigravity répond\n', stderr: '' }) }, { etat: 'OK' })
  await cas('exécutant non authentifié', ag, 'pc', { lancer: () => ({ status: 1, stdout: '✗ codex : pas authentifié', stderr: '' }) }, { etat: 'KO', raison: 'non_autorise' })
  await cas('exécutant en quota', ag, 'pc', { lancer: () => ({ status: 1, stdout: '✗ sonde : flux coupé (quota) RESOURCE_EXHAUSTED', stderr: '' }) }, { etat: 'KO', raison: 'quota' })
  await cas('exécutant introuvable', ag, 'pc', { lancer: () => ({ error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }), status: null }) }, { etat: 'KO' })
  // sans sonde réelle : jamais OK
  const sans = { ...perplexityOuPremier(REGISTRE), sonde: { type: 'declare' } }
  const rs = await appeler(sans, 'pc', depsDe({}))
  if (rs.etat === 'OK') e.push('une entrée sans sonde réelle rend OK')
  return e
})
function perplexityOuPremier(reg) { return reg.find((x) => x.id === 'perplexity') ?? reg[0] }

// MQ-5 ─ jamais OK par défaut : l'état affiché ne dépend que du vrai appel ET de la déclaration
critere('MQ-5', 'l\'état final n\'est jamais OK par défaut (non branché ≠ OK, appel KO ≠ OK)', async () => {
  const { REGISTRE } = await importer('scripts/modeles/registre.mjs')
  const { etatFinal } = await importer('scripts/modeles/adaptateurs.mjs')
  const { sonder } = await importer('scripts/modeles/sonde.mjs')
  const e = []
  const hors = REGISTRE.find((x) => x.id === 'groq')
  if (etatFinal(hors, 'usine', { etat: 'OK', ms: 1 }).etat === 'OK') e.push('une IA non branchée est OK parce que son appel a répondu')
  const bon = REGISTRE.find((x) => x.id === 'freellmapi_auto')
  if (etatFinal(bon, 'usine', { etat: 'KO', ms: 1, raison: 'quota' }).etat !== 'KO') e.push('une IA branchée dont l\'appel est KO n\'est pas KO')
  if (etatFinal(bon, 'usine', { etat: 'OK', ms: 1 }).etat !== 'OK') e.push('une IA branchée dont l\'appel répond n\'est pas OK')
  const tousKO = await sonder({ lieux: ['pc', 'usine'], appelFn: async () => ({ etat: 'KO', ms: 1, raison: 'panne' }), maintenant: () => new Date('2026-10-08T10:30:00Z') })
  if (tousKO.some((l) => l.etat === 'OK')) e.push('un appel KO donne une ligne OK')
  const tousOK = await sonder({ lieux: ['pc', 'usine'], appelFn: async () => ({ etat: 'OK', ms: 1, detail: 'x' }), maintenant: () => new Date('2026-10-08T10:30:00Z') })
  for (const l of tousOK) {
    const x = REGISTRE.find((r) => r.id === l.id)
    if ((l.etat === 'OK') !== (x.branche?.[l.lieu] === true)) e.push(`${l.id}@${l.lieu} : état ${l.etat} alors que branche=${x.branche?.[l.lieu]}`)
  }
  const leve = await sonder({ ids: ['claude_haiku'], lieux: ['pc'], appelFn: async () => { throw new Error('boom') } })
  if (leve.some((l) => l.etat === 'OK')) e.push('un appel qui lève donne OK')
  return e
})

// MQ-6 ─ la sonde : une ligne par IA et par lieu, code de sortie, cycle du chef, ligne de commande
critere('MQ-6', 'la sonde rend une ligne par IA et par lieu, exit 1 sur un KO, respecte le cycle du chef', async () => {
  const { REGISTRE } = await importer('scripts/modeles/registre.mjs')
  const S = await importer('scripts/modeles/sonde.mjs')
  const e = []
  const attendu = REGISTRE.reduce((n, x) => n + x.lieux.length, 0)
  const pc = await S.sonder({ lieux: ['pc'], appelFn: async () => ({ etat: 'OK', ms: 1 }), maintenant: () => new Date('2026-10-08T10:30:00Z') })
  if (pc.length !== attendu) e.push(`${pc.length} ligne(s) pour ${attendu} (IA × lieu)`)
  for (const l of pc) if (l.lieu === 'usine' && l.etat !== 'NON_SONDE') e.push(`${l.id}@usine : appelé sans --usine`)
  if (S.codeSortie([{ etat: 'OK' }, { etat: 'KO' }]) !== 1) e.push('un KO ne donne pas le code 1')
  if (S.codeSortie([{ etat: 'OK' }, { etat: 'NON_BRANCHE' }, { etat: 'NON_SONDE' }]) !== 0) e.push('sans KO le code n\'est pas 0')
  // un modèle local de l'usine ne se charge pas pendant un cycle du chef
  let appels = 0
  const local = await S.sonder({ ids: ['ollama_4b'], lieux: ['usine'], appelFn: async () => { appels++; return { etat: 'OK', ms: 1 } }, maintenant: () => new Date('2026-10-08T10:10:00Z') })
  if (appels || local[0]?.etat !== 'NON_SONDE') e.push('un modèle local est appelé pendant un cycle du chef (H:05-H:20)')
  await S.sonder({ ids: ['ollama_4b'], lieux: ['usine'], forcer: true, appelFn: async () => { appels++; return { etat: 'OK', ms: 1 } }, maintenant: () => new Date('2026-10-08T10:10:00Z') })
  if (appels !== 1) e.push('--forcer n\'appelle pas le modèle local')
  await S.sonder({ ids: ['ollama_4b'], lieux: ['usine'], appelFn: async () => { appels++; return { etat: 'OK', ms: 1 } }, maintenant: () => new Date('2026-10-08T10:30:00Z') })
  if (appels !== 2) e.push('hors cycle, le modèle local n\'est pas appelé')
  // la ligne de commande
  const cli = (...a) => spawnSync(process.execPath, [path.join(RACINE, 'scripts/modeles/sonde.mjs'), ...a], { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  const c1 = cli('--id=perplexity', '--sans-fichier')
  if (c1.status !== 0 || !/NON BRANCHÉ/.test(c1.stdout)) e.push(`--id=perplexity : code ${c1.status}, sortie sans « NON BRANCHÉ »`)
  if (cli('--id=inexistante', '--sans-fichier').status !== 2) e.push('un id inconnu ne rend pas le code 2')
  if (cli('--bidon').status !== 2) e.push('une option inconnue ne rend pas le code 2')
  return e
})

// MQ-7 ─ aucune clé dans le source, la sortie, le rapport, le tableau
critere('MQ-7', 'aucune clé n\'est écrite ni affichée (source, lignes, tableau, JSON), même quand le fournisseur ou l\'erreur la répète', async () => {
  const { REGISTRE } = await importer('scripts/modeles/registre.mjs')
  const A = await importer('scripts/modeles/adaptateurs.mjs')
  const S = await importer('scripts/modeles/sonde.mjs')
  const e = []
  for (const f of ['scripts/modeles/registre.mjs', 'scripts/modeles/adaptateurs.mjs', 'scripts/modeles/sonde.mjs', 'docs/agents/modeles-ecosysteme.md']) {
    const p = path.join(RACINE, f)
    if (!fs.existsSync(p)) continue
    const t = lire(p)
    for (const re of FORMES_CLE) if (re.test(t)) e.push(`${f} : une clé semble écrite en clair (${re})`)
  }
  const canari = `sk-ant-api03-${crypto.randomBytes(24).toString('base64url')}`
  const canariFl = `flk-${crypto.randomBytes(20).toString('hex')}`
  const canariFc = `fc-${crypto.randomBytes(16).toString('hex')}`
  const haiku = REGISTRE.find((x) => x.id === 'claude_haiku')
  const auto = REGISTRE.find((x) => x.id === 'freellmapi_auto')
  const fc = REGISTRE.find((x) => x.id === 'firecrawl')
  const lignes = []
  const prises = []
  const sonderUne = async (entree, lieu, deps) => { const a = await A.appeler(entree, lieu, depsDe(deps)); const f = A.etatFinal(entree, lieu, a); prises.push(a); lignes.push({ id: entree.id, lieu, etat: f.etat, ms: a.ms, detail: `${f.etat === 'NON_BRANCHE' ? '' : (a.raison ?? '')} ${a.detail ?? ''}` }) }
  await sonderUne(haiku, 'pc', { env: { PRESTI_HAIKU_CLE: canari }, fetchFn: fauxFetch(reponse(401, { error: { message: `invalid x-api-key ${canari}` } })) })
  await sonderUne(haiku, 'pc', { env: { PRESTI_HAIKU_CLE: canari }, fetchFn: async () => { throw new Error(`boom ${canari} Bearer ${canari}`) } })
  await sonderUne(haiku, 'pc', { env: { PRESTI_HAIKU_CLE: canari }, fetchFn: fauxFetch(reponse(200, { content: [{ type: 'text', text: `OK ${canari}` }], usage: { input_tokens: 1, output_tokens: 1 } })) })
  await sonderUne(auto, 'usine', { lire: () => canariFl, fetchFn: fauxFetch(reponse(500, `erreur interne, clé ${canariFl} refusée, Authorization: Bearer ${canariFl}`)) })
  await sonderUne(auto, 'usine', { lire: () => canariFl, fetchFn: fauxFetch(reponse(200, { model: canariFl, choices: [{ message: { content: `OK ${canariFl}` } }] })) })
  await sonderUne(fc, 'pc', { lire: () => `ligne 1 : ${canariFc}\nligne 2`, fetchFn: fauxFetch(reponse(403, `forbidden ${canariFc}`)) })
  const sortie = JSON.stringify(lignes) + S.tableau(lignes) + S.resume(lignes) + JSON.stringify(prises)
  for (const [nom, c] of [['Anthropic', canari], ['freellmapi', canariFl], ['Firecrawl', canariFc]]) if (sortie.includes(c)) e.push(`la clé ${nom} apparaît dans la sortie (lignes, tableau, résumé ou JSON)`)
  if (/Bearer\s+[A-Za-z0-9._-]{12,}/.test(sortie)) e.push('un en-tête Bearer apparaît dans la sortie')
  return e
})

// MQ-8 ─ aucune donnée de prospect vers une IA gratuite ou externe
critere('MQ-8', 'une IA gratuite ou externe ne reçoit jamais de donnée de prospect (registre, choix, relais)', async () => {
  const R = await importer('scripts/modeles/registre.mjs')
  const rc = await importer('scripts/usine/relais-chef.mjs')
  const e = []
  for (const x of R.REGISTRE) {
    const externe = !(x.id === 'codex' || (x.acces === 'ollama' && !/cloud/i.test(x.modele)))
    if ((x.gratuit || externe) && R.peutRecevoir(x, 'prospect')) e.push(`${x.id} : peut recevoir une donnée de prospect`)
    if ((x.gratuit || externe) && x.donnees_personnelles_ok) e.push(`${x.id} : donnees_personnelles_ok vrai pour une IA gratuite ou externe`)
  }
  for (const lieu of R.LIEUX) for (const apt of ['redaction', 'code', 'json', 'relecture', 'recherche web']) {
    for (const x of R.choisirModeles({ aptitude: apt, nature: 'prospect', lieu })) if (x.gratuit || !(x.id === 'codex' || x.acces === 'ollama')) e.push(`choisirModeles(prospect, ${apt}, ${lieu}) rend ${x.id}`)
  }
  // un registre trafiqué est refusé
  const trafique = R.REGISTRE.map((x) => (x.id === 'freellmapi_auto' ? { ...x, donnees_personnelles_ok: true } : x))
  if (!R.defautsDuRegistre(trafique).length) e.push('un registre où une IA gratuite reçoit du personnel n\'est pas refusé')
  // le relais : seul le local (avec le « oui » daté), jamais le reste
  for (const flag of [true, false]) for (const m of rc.secoursPermis('prospect', flag)) if (!m.local || m.gratuit || m.id === 'claude_haiku') e.push(`relais, prospect (drapeau ${flag}) : ${m.id} est permis`)
  const executes = []
  const etat = { m: {}, lire() { return this.m }, ecrire(x) { this.m = x } }
  const avant = { ...process.env }
  process.env.PRESTI_HAIKU_ACTIF = 'oui'; process.env.PRESTI_HAIKU_CLE = 'cle-essai-0123456789abcdef'
  try {
    await rc.relayer({ texteEntree: 'Contact : jean.dupont@exemple.com 06 12 34 56 78', delaiMs: 600_000, drapeau: true, cle: 'k', etat, journal: () => {}, attendre: async () => {}, executer: async (m) => { executes.push(m.id); return { code: 1, sortie: 'ERROR: unexpected status 503' } } })
  } finally { for (const k of Object.keys(process.env)) if (!(k in avant)) delete process.env[k]; Object.assign(process.env, avant) }
  for (const id of executes) if (!(id === 'codex' || id.startsWith('ollama_')) || id === 'ollama_cloud') e.push(`le relais a exécuté ${id} pour une donnée de prospect`)
  if (!executes.length) e.push('le relais n\'a rien exécuté (essai non concluant)')
  return e
})

// MQ-9 ─ comment un agent choisit son modèle
critere('MQ-9', 'le choix des modèles suit l\'ordre de la chaîne, l\'aptitude, la nature et le lieu', async () => {
  const R = await importer('scripts/modeles/registre.mjs')
  const e = []
  const reel = R.choisirModeles({ aptitude: 'redaction', nature: 'publique', lieu: 'usine' })
  for (const x of reel) if (!R.estBranche(x, 'usine')) e.push(`${x.id} choisi alors qu'il n'est pas branché`)
  // Haiku déployé (hypothèse) : après Codex, avant les gratuits distants et les locaux
  const hypo = R.REGISTRE.map((x) => (x.id === 'claude_haiku' ? { ...x, branche: { ...x.branche, usine: true } } : x))
  const ordre = R.choisirModeles({ aptitude: 'redaction', nature: 'publique', lieu: 'usine', registre: hypo }).map((x) => x.id)
  const iC = ordre.indexOf('codex'), iH = ordre.indexOf('claude_haiku'), iF = ordre.indexOf('freellmapi_gemini'), iL = ordre.indexOf('ollama_4b')
  if (!(iC === 0 && iC < iH && iH < iF && iF < iL)) e.push(`ordre Haiku / freellmapi / local inattendu : ${ordre.join(' > ')}`)
  const prospect = R.choisirModeles({ aptitude: 'redaction', nature: 'prospect', lieu: 'usine', registre: hypo }).map((x) => x.id)
  for (const id of prospect) if (id === 'claude_haiku' || id.startsWith('freellmapi') || id === 'ollama_cloud') e.push(`prospect : ${id} choisi`)
  if (R.choisirModeles({ aptitude: 'redaction', nature: 'publique', lieu: 'usine', registre: hypo, etat: { claude_haiku: 'KO' } }).some((x) => x.id === 'claude_haiku')) e.push('un modèle relevé KO n\'est pas écarté')
  if (R.choisirModeles({ aptitude: 'voix', nature: 'publique', lieu: 'usine' }).length) e.push('une aptitude sans modèle branché rend des modèles')
  try { R.choisirModeles({ nature: 'inconnue' }); e.push('une nature inconnue est acceptée') } catch { /* attendu */ }
  return e
})

// MQ-10 ─ les adaptateurs « coquille » du parc de la passerelle ne comptent jamais comme vérifiés
critere('MQ-10', 'le registre ne s\'appuie sur aucun adaptateur-coquille du parc (écrit « Fait par » sans appeler de modèle)', async () => {
  const { REGISTRE } = await importer('scripts/modeles/registre.mjs')
  const e = []
  const dossier = path.join(RACINE, 'scripts/passerelle-code/adaptateurs')
  const coquilles = []
  if (fs.existsSync(dossier)) for (const f of fs.readdirSync(dossier)) {
    if (!f.endsWith('.mjs')) continue
    const t = lire(path.join(dossier, f))
    const appelle = /fetch\(|https?:\/\/|spawn|execFile|execSync|child_process|http\.request/.test(t)
    if (/Fait par/.test(t) && !appelle) coquilles.push(f)
  }
  for (const x of REGISTRE) {
    const sondes = JSON.stringify(x.sonde ?? {})
    if (/passerelle-code\/adaptateurs/.test(sondes)) e.push(`${x.id} : la sonde s'appuie sur un adaptateur de la passerelle`)
    if (/passerelle-code\/adaptateurs/.test(x.commande ?? '') && x.branche && Object.values(x.branche).some(Boolean)) e.push(`${x.id} : déclaré branché par un adaptateur de la passerelle`)
  }
  if (coquilles.length) console.error(`  ⚠ constat (non bloquant) : ${coquilles.length} adaptateur(s) du parc sont des coquilles qui écrivent « Fait par » + un PASS sans appeler aucun modèle : ${coquilles.join(', ')}`)
  return e
})

// MQ-11 ─ la doc dit la même chose que le registre
critere('MQ-11', 'la doc modeles-ecosysteme.md nomme chaque IA du registre, le geste de Benj pour la clé Haiku et la sortie réelle de la sonde', async () => {
  const { REGISTRE } = await importer('scripts/modeles/registre.mjs')
  const f = path.join(RACINE, 'docs/agents/modeles-ecosysteme.md')
  if (!fs.existsSync(f)) return ['docs/agents/modeles-ecosysteme.md absente']
  const t = lire(f)
  const e = []
  for (const x of REGISTRE) if (!t.includes('`' + x.id + '`')) e.push(`IA absente de la doc : ${x.id}`)
  if (!/coffre/i.test(t) || !/geste/i.test(t) || !/PRESTI_HAIKU_CLE_FICHIER/.test(t)) e.push('le geste manuel de Benj pour la clé Haiku n\'est pas écrit (coffre, geste, PRESTI_HAIKU_CLE_FICHIER)')
  if (!/Sortie réelle de la sonde/i.test(t) || !/NON BRANCHÉ/.test(t)) e.push('la sortie réelle de la sonde n\'est pas dans la doc')
  if (/\bbranché\b/i.test(t) && !/non branché|NON BRANCHÉ/i.test(t)) e.push('la doc écrit « branché » sans dire ce qui ne l\'est pas')
  return e
})

// MQ-12 ─ la dépense de Haiku : plafond par jour, repli sur le moteur suivant
critere('MQ-12', 'Haiku : plafond de 1 $ par jour tenu, 429 et plafond = repli sur le moteur suivant', async () => {
  const ma = await importer('scripts/usine/moteurs-anthropic.mjs')
  const rc = await importer('scripts/usine/relais-chef.mjs')
  const e = []
  const avant = { ...process.env }
  const dossier = fs.mkdtempSync(path.join(TRAVAIL, 'mq12-'))
  try {
    const compteur = path.join(dossier, 'compteur.json')
    process.env.PRESTI_HAIKU_COMPTEUR = compteur; delete process.env.PRESTI_HAIKU_PLAFOND_USD
    fs.writeFileSync(compteur, JSON.stringify({ jour: new Date().toISOString().slice(0, 10), depense: 0.99, reserve: 0 }))
    const f = fauxFetch(reponse(200, HAIKU_OK))
    const r = await ma.appelerHaiku({ systeme: 's', utilisateur: 'u', fetchFn: f, cle: 'cle-essai-0123456789abcdef' })
    if (r.ok || r.raison !== 'plafond' || f.appels.length) e.push(`dépense à 0,99 $ : appel ${r.ok ? 'passé' : r.raison}, ${f.appels.length} requête(s) envoyée(s)`)
    fs.writeFileSync(compteur, JSON.stringify({ jour: new Date().toISOString().slice(0, 10), depense: 0, reserve: 0 }))
    const g = fauxFetch(reponse(200, { content: [{ type: 'text', text: 'OK' }], usage: { input_tokens: 1000, output_tokens: 100 } }))
    const r2 = await ma.appelerHaiku({ systeme: 's', utilisateur: 'u', fetchFn: g, cle: 'cle-essai-0123456789abcdef' })
    const lu = JSON.parse(lire(compteur))
    if (!r2.ok || Math.abs(lu.depense - (1000 * 0.10 + 100 * 0.50) / 1e6) > 1e-12 || lu.reserve !== 0) e.push(`compteur après un appel : ${JSON.stringify(lu)}`)
    const q = await ma.appelerHaiku({ systeme: 's', utilisateur: 'u', fetchFn: fauxFetch(reponse(429, 'x')), cle: 'cle-essai-0123456789abcdef' })
    if (q.ok || q.raison !== 'quota') e.push(`429 : ${q.raison}`)
    delete process.env.PRESTI_HAIKU_COMPTEUR
    const sans = await ma.appelerHaiku({ systeme: 's', utilisateur: 'u', fetchFn: fauxFetch(reponse(200, HAIKU_OK)), cle: 'cle-essai-0123456789abcdef' })
    if (sans.ok) e.push('sans compteur partagé, l\'appel payant passe (il doit se mettre en repli)')
    // le relais : Haiku en 429 → le moteur suivant sert
    process.env.PRESTI_HAIKU_ACTIF = 'oui'; process.env.PRESTI_HAIKU_CLE = 'cle-essai-0123456789abcdef'
    for (const sortie of ['ERROR: 429 Too Many Requests', 'ERROR: plafond', 'ERROR: indisponible']) {
      const vus = []
      const etat = { m: {}, lire() { return this.m }, ecrire(x) { this.m = x } }
      const res = await rc.relayer({ texteEntree: 'texte public', delaiMs: 600_000, drapeau: false, cle: 'k', etat, journal: () => {}, attendre: async () => {}, executer: async (m) => { vus.push(m.id); return m.id === 'claude_haiku' || m.id === 'codex' ? { code: 1, sortie } : { code: 0, sortie: 'fait' } }, verifier: () => true })
      if (res.code !== 0 || res.moteur === 'claude_haiku' || !vus.includes('claude_haiku') || vus.indexOf('claude_haiku') > vus.length - 2) e.push(`relais (${sortie}) : moteur ${res.moteur}, essais ${vus.join(',')}`)
    }
  } finally { for (const k of Object.keys(process.env)) if (!(k in avant)) delete process.env[k]; Object.assign(process.env, avant); fs.rmSync(dossier, { recursive: true, force: true }) }
  return e
})

// ── exécution ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(TRAVAIL, { recursive: true })
async function evaluer() {
  const sortie = []
  for (const c of criteres) {
    let ecarts
    try { ecarts = await c.fn() } catch (err) { ecarts = [`exception : ${String(err?.stack ?? err).split('\n').slice(0, 3).join(' | ')}`] }
    sortie.push({ id: c.id, titre: c.titre, ok: ecarts.length === 0, ecarts })
  }
  return sortie
}

// ── les sabotages (sur copie) : chacun doit rendre rouge le critère qu'il vise ──────────────────────────────────────────────────────────
const SABOTAGES = [
  { id: 'S1', titre: 'entrée sans clé (freellmapi_auto déclarée sans emplacement de clé)', vise: 'MQ-1', fichier: 'scripts/modeles/registre.mjs', de: /(id: 'freellmapi_auto'[\s\S]*?)cle: FL_CLE,/, vers: '$1cle: AUCUNE,' },
  { id: 'S2', titre: 'appel qui renvoie vide pris pour une réponse (Haiku)', vise: 'MQ-4', fichier: 'scripts/modeles/adaptateurs.mjs', de: "if (!texte.trim()) return ko(ms, 'sortie_vide', 'réponse sans texte', { depense_usd: depense })", vers: '' },
  { id: 'S3', titre: 'modèle déclaré branché sans sonde (claude_haiku → declare)', vise: 'MQ-1', fichier: 'scripts/modeles/registre.mjs', de: "sonde: { type: 'anthropic', thinking: 'disabled' }", vers: "sonde: { type: 'declare' }" },
  { id: 'S3b', titre: 'modèle déclaré branché sans aucune sonde (hermes)', vise: 'MQ-1', fichier: 'scripts/modeles/registre.mjs', de: /parc: 'hermes', sonde: \{ type: 'agent'/, vers: "parc: 'hermes', sondeX: { type: 'agent'" },
  { id: 'S4', titre: 'clé qui fuit : assainir ne masque plus rien', vise: 'MQ-7', fichier: 'scripts/modeles/adaptateurs.mjs', de: "export function assainir(texte, secrets = [], max = 300) {\n  let t = String(texte ?? '')", vers: "export function assainir(texte, secrets = [], max = 300) {\n  return String(texte ?? '').slice(0, 4000)\n  let t = String(texte ?? '')" },
  { id: 'S5', titre: 'IA gratuite recevant une donnée perso (freellmapi_auto : donnees_personnelles_ok vrai)', vise: 'MQ-8', fichier: 'scripts/modeles/registre.mjs', de: /(id: 'freellmapi_auto'[\s\S]*?)donnees_personnelles_ok: false/, vers: '$1donnees_personnelles_ok: true' },
  { id: 'S5b', titre: 'relais : le prospect reçoit toute la chaîne', vise: 'MQ-8', fichier: 'scripts/usine/relais-chef.mjs', de: "if (nature === 'prospect') return drapeau ? chaine.filter((m) => m.local) : []", vers: "if (nature === 'prospect') return [...chaine]" },
  { id: 'S5c', titre: 'choisirModeles ignore la nature de la donnée', vise: 'MQ-8', fichier: 'scripts/modeles/registre.mjs', de: 'estBranche(e, lieu) && e.aptitudes.includes(aptitude) && peutRecevoir(e, nature)', vers: 'estBranche(e, lieu) && e.aptitudes.includes(aptitude)' },
  { id: 'S6', titre: 'requête Haiku sans thinking désactivé', vise: 'MQ-3', fichier: 'scripts/usine/moteurs-anthropic.mjs', de: "thinking: { type: 'disabled' }, ", vers: '' },
  { id: 'S7', titre: 'Haiku passé après les gratuits distants dans la chaîne', vise: 'MQ-3', fichier: 'scripts/usine/relais-chef.mjs', de: /(  Object\.freeze\(\{ id: 'claude_haiku'[^\n]*\n)([\s\S]*?)(  Object\.freeze\(\{ id: 'ollama_cloud')/, vers: '$2$1$3' },
  { id: 'S8', titre: 'Perplexity déclaré branché alors qu\'il n\'a ni clé ni sonde', vise: 'MQ-1', fichier: 'scripts/modeles/registre.mjs', de: "lieux: ['pc'], branche: { pc: false }, reserve: { pc: 'AUCUNE clé", vers: "lieux: ['pc'], branche: { pc: true }, reserve: { pc: 'AUCUNE clé" },
  { id: 'S9', titre: 'etatFinal rend OK pour une IA non branchée', vise: 'MQ-5', fichier: 'scripts/modeles/adaptateurs.mjs', de: "return { etat: 'NON_BRANCHE', declare_branche: false,", vers: "return { etat: appel.etat, declare_branche: false," },
  { id: 'S10', titre: 'plafond de dépense ignoré (reserverDepense toujours vrai)', vise: 'MQ-12', fichier: 'scripts/usine/moteurs-anthropic.mjs', de: 'if (etat.depense + etat.reserve + RESERVATION_USD > plafondUsd() + 1e-9) return false', vers: '' },
  { id: 'S11', titre: 'la sonde ne rend jamais le code 1', vise: 'MQ-6', fichier: 'scripts/modeles/sonde.mjs', de: "export const codeSortie = (lignes) => (lignes.some((l) => l.etat === 'KO') ? 1 : 0)", vers: 'export const codeSortie = () => 0' },
  { id: 'S12', titre: 'la doc oublie une IA du registre (fish_audio)', vise: 'MQ-11', fichier: 'docs/agents/modeles-ecosysteme.md', de: /`fish_audio`/g, vers: 'fish-audio' },
  { id: 'S13', titre: 'Groq retiré du registre (couverture)', vise: 'MQ-1', fichier: 'scripts/modeles/registre.mjs', de: /  \{\n    id: 'groq',[\s\S]*?\n  \},\n/, vers: '' },
  { id: 'S14', titre: 'la sonde charge un modèle local pendant un cycle du chef', vise: 'MQ-6', fichier: 'scripts/modeles/sonde.mjs', de: 'return m >= 5 && m < 20', vers: 'return false' },
  { id: 'S15', titre: 'une entrée sans sonde réelle rend OK', vise: 'MQ-4', fichier: 'scripts/modeles/adaptateurs.mjs', de: "r = { etat: 'KO', ms: 0, raison: 'sans_sonde', detail: 'aucune sonde réelle : jamais « OK » par défaut', sans_appel: true }", vers: "r = { etat: 'OK', ms: 0, detail: 'rien à sonder' }" },
  { id: 'S16', titre: 'un modèle local vide pris pour une réponse (Ollama)', vise: 'MQ-4', fichier: 'scripts/modeles/adaptateurs.mjs', de: "if (!String(texte).trim()) return ko(ms, 'sortie_vide', 'réponse sans texte')", vers: '' },
  { id: 'S17', titre: 'le registre et la chaîne du relais divergent (modèle de ministral)', vise: 'MQ-2', fichier: 'scripts/modeles/registre.mjs', de: "base: FL, modele: 'ministral-14b',", vers: "base: FL, modele: 'ministral-8b'," },
  { id: 'S18', titre: 'la donnée de prospect part vers Haiku', vise: 'MQ-3', fichier: 'scripts/usine/relais-chef.mjs', de: "if (natureDeTexte(prompt.utilisateur) === 'prospect') return { code: 1, sortie: 'ERROR: donnees_personnelles' }", vers: '' },
]

function copier(dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  for (const f of [...FICHIERS, ...(fs.existsSync(path.join(DEPOT, 'scripts/passerelle-code/adaptateurs')) ? fs.readdirSync(path.join(DEPOT, 'scripts/passerelle-code/adaptateurs')).map((x) => `scripts/passerelle-code/adaptateurs/${x}`) : [])]) {
    const src = path.join(DEPOT, f)
    if (!fs.existsSync(src)) continue
    fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true })
    fs.copyFileSync(src, path.join(dest, f))
  }
}
function lancerEnfant(racine) {
  const r = spawnSync(process.execPath, [path.join(DEPOT, 'scripts/modeles-qa.mjs'), `--racine=${racine}`, '--json'], { encoding: 'utf8', windowsHide: true, timeout: 600_000, maxBuffer: 20 * 1024 * 1024 })
  try { return JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))).criteres } catch { return null }
}

const criteresVus = await evaluer()
if (JSON_SORTIE) { console.log(JSON.stringify({ criteres: criteresVus })); process.exit(0) }
for (const c of criteresVus) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.id} — ${c.titre}`)
  for (const x of c.ecarts) console.log(`  ✗ ${c.id} ${x}`)
}
const rouges = criteresVus.filter((c) => !c.ok).map((c) => c.id)
let mauvais = rouges.length > 0
if (PREUVE) {
  if (mauvais) console.log('\n✗ le témoin n\'est pas vert : les sabotages n\'ont pas de sens')
  else {
    console.log('\n— sabotages (chacun sur une copie, doit rendre rouge le critère visé) —')
    let attrapes = 0
    for (const s of SABOTAGES) {
      const dest = path.join(TRAVAIL, `copie-${s.id}`)
      copier(dest)
      const f = path.join(dest, s.fichier)
      let t = lire(f)
      const nouveau = typeof s.de === 'string' ? t.replace(s.de, () => s.vers) : t.replace(s.de, s.vers)
      if (nouveau === t) { console.log(`✗ ${s.id} inapplicable (motif absent de ${s.fichier}) : ${s.titre}`); mauvais = true; continue }
      fs.writeFileSync(f, nouveau)
      const vus = lancerEnfant(dest)
      const cible = vus?.find((c) => c.id === s.vise)
      if (cible && !cible.ok) { attrapes++; console.log(`✓ ${s.id} attrapé par ${s.vise} : ${s.titre}`) }
      else { console.log(`✗ ${s.id} NON attrapé (${s.vise} reste ${vus ? 'vert' : 'illisible'}) : ${s.titre}`); mauvais = true }
      fs.rmSync(dest, { recursive: true, force: true })
    }
    console.log(`\n${attrapes}/${SABOTAGES.length} sabotage(s) attrapé(s)`)
  }
}
console.log(mauvais ? `\n✗ modeles-qa : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'sabotage non attrapé'}` : `\n✓ modeles-qa : ${criteresVus.length}/${criteresVus.length} critère(s) vert(s)${PREUVE ? ' · tous les sabotages attrapés' : ''}`)
process.exitCode = mauvais ? 1 : 0
