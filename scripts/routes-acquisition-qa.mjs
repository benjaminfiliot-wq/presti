#!/usr/bin/env node
// scripts/routes-acquisition-qa.mjs — le juge des routes de l'acquisition (fiche 026-037), écrit par Claude Code AVANT les
// fiches qu'il juge, qui ne peuvent pas le modifier : lot « recensement » (026-077, cahier RA) et lot « echanges » (026-094,
// cahier RB).
//
//   node --import ./scripts/ts-loader.mjs scripts/routes-acquisition-qa.mjs --lot=recensement|echanges [--racine=<dossier>]
//   node … --lot=… --auto-controle     le juge éprouvé sur lui-même : le témoin (scripts/fixtures/026-acquisition/cli/
//                                      temoins/routes/) rend chaque critère vert, et chaque sabotage rend ROUGE le critère
//                                      qu'il vise (une ligne « AC-… » par épreuve ; code 0 seulement si toutes tiennent).
//   node … --lot=echanges --partie=passes   RB-17 seul, sur place (Linux) : c'est ce que le juge relance sur l'usine.
//
// Trois façons de juger, toutes faites par le juge lui-même :
//   · la lecture des sources (commentaires ôtés par sansCommentaires de commun.mjs) : exports, garde du jeton, ordre des
//     appels, battement, arguments de console.* et d'enregistrerPassage ;
//   · le BANC : la route importée par Node avec des doublures (crochet cli/banc-crochet.mjs : chaque import @/lib/… et
//     chaque paquet npm devient une doublure qui consigne ses appels ; `fetch` est remplacé), exécutée sur une vraie
//     Request, sans base ni réseau ; les messages de la doublure de releverGmail viennent de cli/doublures/ ;
//   · le SERVICE (RA-3, RB-3) : `next dev` démarré par serveur() de scripts/lib/capture.mjs avec un CRON_SECRET tiré au
//     hasard et PAUSE_GENERALE=1 (posés avant : ils l'emportent sur .env.local) ; jamais un travail réel. Sur un témoin, le
//     même contrôle HTTP passe par un petit serveur qui sert les routes du banc.
// RB-17 ne tourne que sous Linux (un lanceur s'y exécute sans shell) : lancé ailleurs, le juge relance cette seule partie sur
// l'usine par `node scripts/usine.mjs executer --nom=passes -- …` et rend son verdict ; usine injoignable → code 2.
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide ou préalable manquant. N'écrit que sous
// .orchestre/travail/routes-acquisition-qa/ et dans le dossier temporaire du système (copies hors dépôt des jeux d'essai).
// Ne lit ni .env.local ni presti-secrets ; aucun appel réseau hors 127.0.0.1 et l'usine.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { register } from 'node:module'
import { R, TRAVAIL, court, premiereLigne, lireOptions, exigerSousTravail, sansCommentaires, importsDe, exportsNommes, jourParis } from './fixtures/026-acquisition/commun.mjs'

const NOM = 'routes-acquisition-qa'
// ── Les chaînes refusées (026-037, JP-5) : le seul endroit du juge où ces mots s'écrivent ─────────────────────────────────
// chaînes refusées : début
const REFUS = Object.freeze({ jetonVariable: 'META_ADLIB_TOKEN', adressesVariable: 'ACQ_ADRESSES_NOMINATIVES', motMajuscules: 'SEQUENCEUR', routeWebhook: 'app/api/webhooks/sequenceur/route.ts' })
// chaînes refusées : fin
const CLI = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'cli')
const TEMOIN = path.join(CLI, 'temoins', 'routes')
const HOTE = 'prestiapp.fr', HOTE_IMAP = 'imap.gmail.com'
const K = await import(pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)
const GRATUITE = K.MESSAGERIES_GRATUITES.find((d) => d.startsWith('orange')) ?? K.MESSAGERIES_GRATUITES[1]
const LOTS = {
  recensement: { prefixe: 'RA', n: 12, routes: [['recenseur', 'recenseur', 'acq-recenseur'], ['juge-faits', 'juge_faits', 'acq-juge-faits'], ['vigie-meta', 'vigie_meta', 'acq-vigie-meta']] },
  echanges: { prefixe: 'RB', n: 18, routes: [['redacteur', 'redacteur', 'acq-redacteur'], ['standardiste', 'standardiste', 'acq-standardiste']] },
}
const ROUTE = (r) => `app/api/cron/${r}/route.ts`
const USINE = { travail: 'app/api/usine/standard/travail/route.ts', classement: 'app/api/usine/standard/classement/route.ts' }
const SCRIPTS = { candidats: 'scripts/agents/candidats-ajouter.mjs', opposition: 'scripts/agents/opposition-importer.mjs', jeton: 'scripts/agents/jeton-meta-poser.mjs', passes: 'scripts/agents/passes-modele.mjs' }
const ROUTES_EXISTANTES = ['app/api/cron/relances/route.ts', 'app/api/cron/alertes/route.ts', 'app/api/cron/purge-comptes/route.ts']
const ADRESSE_PROSPECTION = 'prospection@presti-essai.invalid', AUTRE_ADRESSE = 'autre@presti-essai.invalid'
const ALEA = crypto.randomBytes(4).toString('hex')
const JETON_TEMOIN = `JETON-TEMOIN-${'7f3a'}`
const JETON_ROUTE = `JETON-ROUTE-${ALEA}`
const MOT_DE_PASSE = `PIEGE-GMAIL-${ALEA}`
const EXEC = (n, agent, soir = false) => `/usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_${n} -- /usr/bin/node --import ./scripts/ts-loader.mjs scripts/agents/passes-modele.mjs --agent=${agent}${soir ? ' --soir' : ''}`
const UNITES = {
  'presti-standard': { exec: EXEC('STANDARDISTE', 'standardiste'), minuteur: 5 },
  'presti-facteur': { exec: EXEC('FACTEUR', 'facteur'), minuteur: 15 },
  'presti-facteur-soir': { exec: EXEC('FACTEUR', 'facteur', true), minuteur: 'soir' },
}

// ── Lecture du source ─────────────────────────────────────────────────────────────────────────────────────────────────────
const lireBrut = (racine, rel) => { try { return fs.readFileSync(path.join(racine, rel), 'utf8').replace(/\r\n?/g, '\n') } catch { return null } }
const existe = (racine, rel) => fs.existsSync(path.join(racine, rel))
/** L'indice du guillemet qui ferme la chaîne ouverte en `j` (', ", `), gabarits ${…} compris ; -1 si rien ne ferme. */
function finChaine(s, j) {
  const q = s[j]
  for (j++; j < s.length && s[j] !== q; j++) {
    if (s[j] === '\\') j++
    else if (q === '`' && s[j] === '$' && s[j + 1] === '{') { const k = fermante(s, j + 1); if (k < 0) return -1; j = k }
  }
  return j < s.length ? j : -1
}
/** L'indice de la fermante qui répond à l'ouvrante en `i` ((, [, {), chaînes et gabarits sautés. */
function fermante(s, i) {
  const paire = { '(': ')', '[': ']', '{': '}' }
  const pile = []
  for (let j = i; j < s.length; j++) {
    const c = s[j]
    if (c === '"' || c === "'" || c === '`') { const k = finChaine(s, j); if (k < 0) return -1; j = k; continue }
    if (paire[c]) pile.push(paire[c])
    else if (c === ')' || c === ']' || c === '}') { if (pile.pop() !== c) return -1; if (!pile.length) return j }
  }
  return -1
}
/** Découpe aux virgules de premier niveau. */
function virgules(s) {
  const out = []
  let d = 0, j = 0
  while (j < s.length) {
    const c = s[j]
    if ('([{'.includes(c)) { const k = fermante(s, j); if (k < 0) break; j = k + 1; continue }
    if (c === '"' || c === "'" || c === '`') { const k = finChaine(s, j); if (k < 0) break; j = k + 1; continue }
    if (c === ',') { out.push(s.slice(d, j).trim()); d = j + 1 }
    j++
  }
  if (s.slice(d).trim()) out.push(s.slice(d).trim())
  return out
}
/** Les appels `nom(…)` (nom : une expression régulière) : [{ i, fin, args: [texte], texte }]. */
function appelsJs(src, nomRe) {
  const out = []
  for (const m of src.matchAll(new RegExp(`(?<![\\w$.])(?:${nomRe})\\s*\\(`, 'g'))) {
    const i = m.index + m[0].length - 1, j = fermante(src, i)
    if (j < 0) continue
    out.push({ i: m.index, fin: j, args: virgules(src.slice(i + 1, j)), texte: src.slice(m.index, j + 1) })
  }
  return out
}
/** Le corps d'une fonction exportée (GET, POST) : { debut, fin, texte } ou null. */
function corpsExport(src, nom) {
  const m = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\s*\\(|export\\s+const\\s+${nom}\\s*=\\s*(?:async\\s*)?(?:function\\s*)?\\(`).exec(src)
  if (!m) return null
  const p = fermante(src, m.index + m[0].length - 1)
  const a = src.indexOf('{', p)
  const f = a < 0 ? -1 : fermante(src, a)
  return f < 0 ? null : { debut: a, fin: f, texte: src.slice(a, f + 1) }
}
/** Les blocs `catch (…) { … }` et les branches `if (cond) …` dont la condition répond à `re` : [[début, fin]]. */
function blocsCatch(src) {
  return [...src.matchAll(/\bcatch\s*(\([^)]*\))?\s*\{/g)].map((m) => [m.index, fermante(src, m.index + m[0].length - 1)])
}
function branchesSi(src, re) {
  const out = []
  for (const m of src.matchAll(/\bif\s*\(/g)) {
    const a = m.index + m[0].length - 1, b = fermante(src, a)
    if (b < 0 || !re.test(src.slice(a, b + 1))) continue
    const reste = src.slice(b + 1)
    const acc = /^\s*\{/.exec(reste)
    if (acc) out.push([m.index, fermante(src, b + 1 + acc[0].length - 1)])
    else { const fin = reste.search(/;|\n/); out.push([m.index, b + 1 + (fin < 0 ? reste.length : fin)]) }
  }
  return out
}
const dans = (i, blocs) => blocs.some(([a, b]) => i > a && i < b)
const sansChaines = (s) => s.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, "''")
/** Une source jugée : { brut, nu, get (corps de GET), post }. */
function source(racine, rel) {
  const brut = lireBrut(racine, rel)
  if (brut === null) return null
  const nu = sansCommentaires(brut)
  return { rel, brut, nu, get: corpsExport(nu, 'GET'), post: corpsExport(nu, 'POST') }
}
/** RA-1 / RB-1 : GET, runtime, dynamic, maxDuration ≤ 60. */
function exportsRoute(s, { maxDuration = true } = {}) {
  const e = []
  if (!exportsNommes(s.nu).includes('GET')) e.push(`${s.rel} n'exporte pas GET`)
  if (!/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(s.nu)) e.push(`${s.rel} sans runtime = 'nodejs'`)
  if (!/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(s.nu)) e.push(`${s.rel} sans dynamic = 'force-dynamic'`)
  if (maxDuration) { const m = /export\s+const\s+maxDuration\s*=\s*(\d+)/.exec(s.nu); if (!m) e.push(`${s.rel} sans maxDuration`); else if (Number(m[1]) > 60) e.push(`${s.rel} : maxDuration = ${m[1]} (60 au plus)`) }
  return e
}
/** RA-2 / RB-2 : le premier `if` de GET contrôle le jeton, refuse sans secret, sans aucun await avant. */
function gardeJeton(s) {
  const e = []
  const g = s.get
  if (!g) return [`${s.rel} : corps de GET introuvable`]
  const m = /\bif\s*\(/.exec(g.texte)
  if (!m) return [`${s.rel} : aucun if dans GET`]
  const a = m.index + m[0].length - 1, b = fermante(g.texte, a)
  const cond = g.texte.slice(a, b + 1), avant = g.texte.slice(0, m.index)
  if (/\bawait\b/.test(avant)) e.push(`${s.rel} : un await précède le contrôle du jeton`)
  const variables = [...avant.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*([^\n;]*)/g)]
  const lit = (re) => re.test(cond) || variables.some(([, v, x]) => new RegExp(`\\b${v}\\b`).test(cond) && re.test(x))
  if (!/`Bearer \$\{/.test(cond) && !variables.some(([, v, x]) => new RegExp(`\\b${v}\\b`).test(cond) && /`Bearer \$\{/.test(x))) e.push(`${s.rel} : le premier if ne compare pas à \`Bearer \${secret}\``)
  if (!lit(/authorization/i)) e.push(`${s.rel} : le premier if ne lit pas l'en-tête authorization`)
  if (!lit(/CRON_SECRET/)) e.push(`${s.rel} : le premier if ne porte pas sur CRON_SECRET`)
  if (!/!\s*[\w$.]*(secret|CRON_SECRET)\b|[\w$.]*(secret|CRON_SECRET)\s*===?\s*(undefined|''|"")/i.test(cond)) e.push(`${s.rel} : le premier if ne refuse pas quand le secret manque`)
  const suite = g.texte.slice(b + 1, b + 260)
  if (!/401/.test(suite)) e.push(`${s.rel} : le premier if ne rend pas 401`)
  return e
}
const PAUSE_ABANDONNEE = 'PRESTI_PAUSE_AGENTS'
function pauseAvant(s, avantQuoi) {
  const e = []
  const imp = importsDe(s.nu).find((x) => /(^|\/)lib\/agents\/pause$/.test(x.spec ?? '') || x.spec === '@/lib/agents/pause')
  if (!imp || !/\bpauseGenerale\b/.test(imp.liste)) e.push(`${s.rel} n'importe pas pauseGenerale de @/lib/agents/pause`)
  const g = s.get?.texte ?? ''
  const ip = g.search(/\bpauseGenerale\s*\(/), ic = g.search(avantQuoi)
  if (ip < 0) e.push(`${s.rel} n'appelle pas pauseGenerale()`)
  else if (ic >= 0 && ic < ip) e.push(`${s.rel} : ${avantQuoi.source.replace(/\\b|\\s\*|\\\(/g, '')} avant pauseGenerale()`)
  if (s.brut.includes(PAUSE_ABANDONNEE)) e.push(`${s.rel} lit ${PAUSE_ABANDONNEE}`)
  return e
}
/** Les noms des fonctions de @/lib/agents/bus importées par la route. */
const nomsBus = (s) => importsDe(s.nu).filter((x) => /(^|\/)lib\/agents\/bus$/.test(x.spec ?? '') || x.spec === '@/lib/agents/bus').flatMap((x) => (/\{([^}]*)\}/.exec(x.liste)?.[1] ?? '').split(',').map((y) => y.trim().split(/\s+as\s+/).pop()).filter(Boolean))
/** RA-8 / RB-8 : le battement, lu dans le source. */
function battementSource(s, agent) {
  const e = []
  const g = s.get ?? s.post
  if (!g) return [`${s.rel} : corps introuvable`]
  const t = g.texte
  const bus = nomsBus(s)
  const noms = bus.filter((n) => /battement/i.test(n))
  const constantes = Object.fromEntries([...s.nu.matchAll(/const\s+([\w$]+)\s*=\s*['"]([\w-]+)['"]/g)].map((m) => [m[1], m[2]]))
  const bat = [
    ...(noms.length ? appelsJs(t, noms.join('|')) : []),
    ...(bus.length ? appelsJs(t, bus.join('|')).filter((c) => /'ops_battement'/.test(c.texte)) : []),
    ...appelsJs(t, '[\\w$.]*\\.rpc').filter((c) => /^['"]ops_battement['"]/.test(c.args[0] ?? '')),
  ].filter((c) => c.args.some((a) => a.includes(`'${agent}'`) || a.includes(`"${agent}"`) || constantes[a] === agent || /p_nom\s*:\s*([\w$]+|['"][\w-]+['"])/.test(a) && (a.includes(agent) || constantes[/p_nom\s*:\s*([\w$]+)/.exec(a)?.[1]] === agent)))
  if (!bat.length) return [`${s.rel} : aucun battement de ${agent} par la fonction de @/lib/agents/bus qui porte ops_battement`]
  const passages = appelsJs(t, 'enregistrerPassage')
  const catchs = blocsCatch(t), pauses = branchesSi(t, /pause|\.active\b|enPause/)
  for (const b of bat) {
    const avant = passages.filter((p) => p.i < b.i).pop()
    if (!avant) e.push(`${s.rel} : battement de ${agent} avant tout enregistrerPassage`)
    else if (/^false$/.test(avant.args[2] ?? '')) e.push(`${s.rel} : battement de ${agent} après un enregistrerPassage(…, false)`)
    if (dans(b.i, catchs)) e.push(`${s.rel} : battement dans un catch`)
    if (dans(b.i, pauses)) e.push(`${s.rel} : battement dans une branche de pause`)
  }
  return e
}
/** RA-4, RB-5 : les arguments de console.* et d'enregistrerPassage, chaînes ôtées. */
function argumentsJournal(s, interdit, lib) {
  const e = []
  for (const c of [...appelsJs(s.nu, 'console\\.(?:log|error|warn|info|debug)'), ...appelsJs(s.nu, 'enregistrerPassage')]) {
    const a = sansChaines(c.args.join(', '))
    const m = interdit.exec(a)
    if (m) e.push(`${s.rel} : « ${court(c.texte, 70)} » reçoit ${lib} (${m[0]})`)
  }
  return e
}

// ── Le banc : doublures consignées ────────────────────────────────────────────────────────────────────────────────────────
const D = (globalThis.__DBL = { journal: [], comportements: {}, valeurs: {}, evenements: [], n: 0 })
const jsonSur = (x) => {
  try {
    const vus = new WeakSet()
    return JSON.stringify(x, (k, v) => { if (typeof v === 'function') return '[fonction]'; if (typeof v === 'bigint') return String(v); if (v && typeof v === 'object') { if (vus.has(v)) return '[cycle]'; vus.add(v) } return v }) ?? 'undefined'
  } catch { return '[illisible]' }
}
const LECTURE_EVENEMENTS = /evenements?_?lire|lire_?evenements|evenementsLire|lireEvenements/i
function defautPour(mod, nom, args) {
  const j = jsonSur(args)
  const ecriture = j.includes('echeance_lue') && !LECTURE_EVENEMENTS.test(nom) && !(nom === 'rpc' && args[0] === 'ops_evenements_lire')
  if (ecriture) D.evenements.push({ type: 'echeance_lue', agent: 'vigie_meta', le: new Date().toISOString() })
  if (mod.startsWith('lib/agents/bus')) return LECTURE_EVENEMENTS.test(nom) ? { ok: true, data: D.evenements.slice() } : { ok: true, data: null }
  if (nom === 'rpc') return args[0] === 'ops_evenements_lire' ? { data: D.evenements.slice(), error: null } : { data: null, error: null }
  return undefined
}
D.appel = (chemin, args) => {
  const [mod, exp] = chemin.split('::')
  const nom = exp.split('.').pop()
  D.journal.push({ mod, exp, nom, args, json: jsonSur(args), n: ++D.n })
  for (const k of [exp, nom]) if (Object.hasOwn(D.comportements, k)) return D.comportements[k](...args)
  return defautPour(mod, nom, args)
}
function universel(chemin) {
  return new Proxy(function () {}, {
    get(_, p) { if (p === 'then' || typeof p === 'symbol' || p === 'toJSON' || p === 'prototype') return undefined; return universel(`${chemin}.${String(p)}`) },
    apply(_, __, args) { return D.appel(chemin, args) },
    construct(_, args) { D.appel(`${chemin}#new`, args); return universel(`${chemin}#instance`) },
  })
}
D.fab = (mod, exp) => (Object.hasOwn(D.valeurs, exp) ? D.valeurs[exp] : universel(`${mod}::${exp}`))
register(pathToFileURL(path.join(CLI, 'banc-crochet.mjs')).href, import.meta.url, { data: { contrat: pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href } })
let BANC = 0
/** Exécute une route du banc : { statut, json, texte, erreur, journal, console, requetes }. */
async function banc(fichier, { methode = 'GET', url, entetes = {}, corps, env = {}, comportements = {}, valeurs = {}, fetchFaux = null, evenements } = {}) {
  D.journal = []; D.comportements = comportements; D.valeurs = valeurs; D.n = 0
  if (evenements) D.evenements = evenements
  const env0 = {}
  for (const [k, v] of Object.entries(env)) { env0[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v }
  const sortie = []
  const console0 = {}
  for (const k of ['log', 'error', 'warn', 'info', 'debug']) { console0[k] = console[k]; console[k] = (...a) => sortie.push(a.map((x) => (typeof x === 'string' ? x : x instanceof Error ? `${x.name}: ${x.message}` : jsonSur(x))).join(' ')) }
  const fetch0 = globalThis.fetch
  const requetes = []
  globalThis.fetch = async (u, init) => { const x = String(u?.url ?? u); requetes.push(x); if (fetchFaux) return fetchFaux(x, init); throw new Error('réseau coupé par le juge') }
  let statut = null, json = null, texte = '', erreur = null
  try {
    const mod = await import(`${pathToFileURL(fichier).href}?banc=${++BANC}`)
    if (typeof mod[methode] !== 'function') throw new Error(`${methode} non exportée`)
    const req = new Request(url, { method: methode, headers: entetes, body: corps === undefined ? undefined : typeof corps === 'string' ? corps : JSON.stringify(corps) })
    const rep = await mod[methode](req)
    statut = rep?.status ?? null
    texte = rep ? await rep.text() : ''
    try { json = JSON.parse(texte) } catch { json = null }
  } catch (e) { erreur = premiereLigne(e) } finally {
    for (const k of Object.keys(console0)) console[k] = console0[k]
    globalThis.fetch = fetch0
    for (const [k, v] of Object.entries(env0)) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  }
  return { statut, json, texte, erreur, journal: D.journal.slice(), console: sortie.join('\n'), requetes }
}
const appelsDe = (x, nom) => x.journal.filter((e) => e.nom === nom || e.exp === nom)
const rpcDe = (x, fn) => x.journal.filter((e) => e.nom === 'rpc' && e.args[0] === fn)
const battementsDe = (x, agent) => x.journal.filter((e) => ((e.mod.startsWith('lib/agents/bus') && (/battement/i.test(e.nom) || e.json.includes('ops_battement'))) || (e.nom === 'rpc' && e.args[0] === 'ops_battement')) && e.json.includes(`"${agent}"`))
const passagesDe = (x) => appelsDe(x, 'enregistrerPassage').map((e) => ({ ...e, nomPassage: e.args[0], reussi: e.args[2] !== false }))
const reponseJson = (donnees, statut = 200) => new Response(JSON.stringify(donnees), { status: statut, headers: { 'content-type': 'application/json' } })
const PAUSE = (active) => () => (active ? { active: true, source: 'variable' } : { active: false, source: 'base' })
const curseurLu = (x, nom) => [...rpcDe(x, 'acq_curseur_lire').filter((e) => e.json.includes(`"${nom}"`)), ...appelsDe(x, 'curseurLire').filter((e) => e.args[0] === nom)]
const curseurPose = (x, nom) => [...rpcDe(x, 'acq_curseur_poser').filter((e) => e.args[1]?.p_nom === nom).map((e) => ({ ...e, valeur: e.args[1]?.p_valeur })), ...appelsDe(x, 'curseurPoser').filter((e) => e.args[0] === nom).map((e) => ({ ...e, valeur: e.args[1] }))]
const hors = (x) => (x.erreur ? [`exception : ${x.erreur}`] : [])

// ── Le service (RA-3, RB-3) ───────────────────────────────────────────────────────────────────────────────────────────────
async function servir(racine, rels, temoin) {
  const secret = `essai-${crypto.randomBytes(16).toString('hex')}`
  if (!temoin) {
    process.env.CRON_SECRET = secret
    process.env.PAUSE_GENERALE = '1'
    const { serveur } = await import('./lib/capture.mjs')
    const srv = await serveur(racine)
    if (!srv.lance) throw new Error(`un serveur répond déjà sur ${srv.base} : le juge doit lancer le sien (CRON_SECRET tiré au hasard) — arrêter le serveur de développement`)
    return { base: srv.base, secret, arreter: srv.arreter }
  }
  const s = http.createServer(async (req, res) => {
    const rel = rels.find((r) => r.replace(/^app/, '').replace(/\/route\.ts$/, '') === req.url.split('?')[0])
    if (!rel) { res.writeHead(404); res.end(); return }
    const x = await banc(path.join(racine, rel), { url: `http://127.0.0.1${req.url}`, entetes: req.headers.authorization ? { authorization: req.headers.authorization } : {}, env: { CRON_SECRET: secret, PAUSE_GENERALE: '1' }, comportements: { pauseGenerale: () => (process.env.PAUSE_GENERALE === '1' ? { active: true, source: 'variable' } : { active: false, source: 'base' }) } })
    res.writeHead(x.statut ?? 500, { 'content-type': 'application/json' })
    res.end(x.texte)
  })
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  return { base: `http://127.0.0.1:${s.address().port}`, secret, arreter: async () => new Promise((r) => s.close(r)) }
}
async function servi(base, secret, chemin) {
  const e = []
  const q = async (auth) => { try { const r = await fetch(`${base}${chemin}`, { headers: auth ? { authorization: auth } : {}, signal: AbortSignal.timeout(150_000), redirect: 'manual' }); const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* pas du JSON */ } return { s: r.status, j } } catch (err) { return { s: 0, j: null, err: premiereLigne(err) } } }
  const a = await q(null), b = await q('Bearer mauvais-jeton'), c = await q(`Bearer ${secret}`)
  if (a.s !== 401) e.push(`${chemin} sans en-tête → ${a.s || a.err}, 401 attendu`)
  if (b.s !== 401) e.push(`${chemin} mauvais jeton → ${b.s || b.err}, 401 attendu`)
  if (c.s !== 200 || c.j?.pause !== true) e.push(`${chemin} bon jeton, PAUSE_GENERALE=1 → ${c.s || c.err} ${court(JSON.stringify(c.j), 60)}, 200 { pause: true } attendu`)
  return e
}

// ── Les scripts ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-acq-'))
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* déjà parti */ } })
function lancerScript(racine, rel, args, env = {}, avant = []) {
  const r = spawnSync(process.execPath, [...avant, '--import', pathToFileURL(path.join(R, 'scripts', 'ts-loader.mjs')).href, path.join(racine, rel), ...args], { cwd: racine, encoding: 'utf8', timeout: 60_000, windowsHide: true, env: { ...process.env, ...env } })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`, stdout: r.stdout || '' }
}
function jugerScriptsListes(racine) {
  const e = []
  const csv = path.join(CLI, 'candidats-essai.csv'), opp = path.join(CLI, 'opposition-essai.txt')
  const copieCsv = path.join(TMP, 'candidats.csv'), copieOpp = path.join(TMP, 'opposition.txt')
  fs.copyFileSync(csv, copieCsv); fs.copyFileSync(opp, copieOpp)
  const valeurs = (f, sep) => [...new Set(fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(sep ? 1 : 0).flatMap((l) => (sep ? l.split(',') : [l])).map((x) => x.trim().replace(/^@/, '')).filter((x) => x.length >= 4 && !/^#|^nom\s*:/i.test(x)))]
  const a = lancerScript(racine, SCRIPTS.candidats, [copieCsv, '--sec'])
  if (a.code !== 0) e.push(`candidats-ajouter --sec : code ${a.code} (${court(a.sortie, 80)})`)
  for (const [re, lib] of [[/\b5 lignes?\b/, '5 lignes'], [/\b3 valides?\b/, '3 valides'], [/\b1 doublons?\b/, '1 doublon'], [/\b1 invalides?\b/, '1 invalide']]) if (!re.test(a.sortie)) e.push(`candidats-ajouter --sec n'affiche pas « ${lib} »`)
  for (const v of valeurs(csv, true)) if (a.sortie.includes(v)) e.push(`candidats-ajouter affiche une valeur du CSV (${v.length} signes)`)
  const a2 = lancerScript(racine, SCRIPTS.candidats, [csv, '--sec'])
  if (a2.code !== 2) e.push(`candidats-ajouter sur un fichier du dépôt : code ${a2.code}, 2 attendu`)
  const b = lancerScript(racine, SCRIPTS.opposition, [copieOpp, '--sec'])
  if (b.code !== 0) e.push(`opposition-importer --sec : code ${b.code} (${court(b.sortie, 80)})`)
  if (!/\b4\b/.test(b.sortie) || !/\b3\b/.test(b.sortie)) e.push('opposition-importer --sec ne compte pas 4 clés et 3 lignes ignorées')
  for (const v of valeurs(opp, false)) if (b.sortie.includes(v)) e.push(`opposition-importer affiche une valeur de la liste (${v.length} signes)`)
  const b2 = lancerScript(racine, SCRIPTS.opposition, [opp, '--sec'])
  if (b2.code !== 2) e.push(`opposition-importer sur un fichier du dépôt : code ${b2.code}, 2 attendu`)
  return e
}
function jugerJetonMeta(racine) {
  const e = []
  const s = source(racine, SCRIPTS.jeton)
  if (!s) return [`${SCRIPTS.jeton} absent`]
  const dossier = path.join(TMP, 'secrets'), journal = path.join(TMP, 'piege.txt')
  fs.mkdirSync(dossier, { recursive: true })
  const piege = ['--import', pathToFileURL(path.join(CLI, 'piege-reseau.mjs')).href]
  const env = { PRESTI_SECRETS_DIR: dossier, PIEGE_JOURNAL: journal }
  const secrets = [JETON_TEMOIN]
  const fuite = (x) => { const m = []; for (let k = 0; k + 6 <= JETON_TEMOIN.length; k++) if (x.includes(JETON_TEMOIN.slice(k, k + 6))) { m.push('un morceau du jeton'); break } if (new RegExp(`\\b${JETON_TEMOIN.length}\\b`).test(x)) m.push('le nombre de ses signes'); return m }
  fs.writeFileSync(path.join(dossier, 'meta-bibliotheque-pubs.txt'), `  ${JETON_TEMOIN}\n`)
  fs.rmSync(journal, { force: true })
  const a = lancerScript(racine, SCRIPTS.jeton, ['--sec'], env, piege)
  if (a.code !== 0 || !/jeton présent/.test(a.sortie)) e.push(`--sec avec un jeton : code ${a.code}, « ${court(a.sortie, 80)} » (code 0 et « jeton présent » attendus)`)
  const reseau = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').trim() : ''
  if (reseau) e.push(`--sec a tenté ${reseau.split('\n').length} sortie(s) réseau (${court(reseau.replace(/\n/g, ', '), 60)})`)
  for (const f of fuite(a.sortie)) e.push(`--sec affiche ${f}`)
  fs.writeFileSync(path.join(dossier, 'meta-bibliotheque-pubs.txt'), '')
  const b = lancerScript(racine, SCRIPTS.jeton, ['--sec'], env, piege)
  if (b.code !== 2 || !/colle le jeton dans/.test(b.sortie)) e.push(`fichier vide : code ${b.code}, « ${court(b.sortie, 60)} » (2 et « colle le jeton dans … » attendus)`)
  fs.rmSync(path.join(dossier, 'meta-bibliotheque-pubs.txt'))
  const c = lancerScript(racine, SCRIPTS.jeton, ['--sec'], env, piege)
  if (c.code !== 2 || !/colle le jeton dans/.test(c.sortie)) e.push(`fichier absent : code ${c.code} (2 et « colle le jeton dans … » attendus)`)
  for (const x of [b, c]) for (const f of fuite(x.sortie)) e.push(`sortie qui porte ${f}`)
  const hotes = [...s.nu.matchAll(/https?:\/\/([^/'"`\s]+)[^'"`\s]*debug_token/g)].map((m) => m[1])
  if (!/debug_token/.test(s.nu)) e.push('debug_token jamais demandé')
  if (hotes.some((h) => h !== 'graph.facebook.com')) e.push(`debug_token demandé à ${hotes.join(', ')}`)
  const rpcs = [...s.nu.matchAll(/\.rpc\s*\(\s*['"]([\w]+)['"]/g)].map((m) => m[1])
  if (rpcs.join() !== 'acq_jeton_meta_poser') e.push(`rpc( appelés : ${rpcs.join(', ') || 'aucun'} (acq_jeton_meta_poser seul)`)
  if (s.brut.includes(REFUS.jetonVariable)) e.push(`le script lit ${REFUS.jetonVariable}`)
  if (existe(racine, 'scripts/agents/meta-echeance.mjs')) e.push('scripts/agents/meta-echeance.mjs existe')
  void secrets
  return e
}

// ── Les passes du modèle sur l'usine (RB-17) ──────────────────────────────────────────────────────────────────────────────
async function jugerPasses(racine, temoin) {
  const script = path.join(racine, SCRIPTS.passes)
  if (!fs.existsSync(script)) return [`${SCRIPTS.passes} absent`]
  const lanceur = path.join(TMP, 'faux-lanceur.sh')
  fs.copyFileSync(path.join(CLI, 'faux-lanceur.sh'), lanceur)
  fs.chmodSync(lanceur, 0o755)
  const BRUT = '{"classe":"oui","certitude":0.9,"extrait":""}'
  // Ce que le faux lanceur rend au Facteur : un avis de ton lisible par jugerTon (exactement { verdict, raisons }). Sans lui le second
  // juge ne rend rien (second_juge_indisponible) et aucun POST avis ne part : c'est la défaillance qui rend RB-17 faux depuis le 04/10.
  const AVIS_OK = '{"verdict":"ok","raisons":[]}'
  const jetonAgent = `jeton-agent-${crypto.randomBytes(8).toString('hex')}`
  const texte = (id) => `TEXTE-PIEGE-${id} : un texte de réponse qui ne doit jamais sortir`
  const requetes = []
  const s = http.createServer(async (req, res) => {
    let corps = ''
    for await (const c of req) corps += c
    let j = null
    try { j = JSON.parse(corps) } catch { j = null }
    requetes.push({ methode: req.method, url: req.url, auth: req.headers.authorization === `Bearer ${jetonAgent}`, corps: j })
    const u = req.url.split('?')[0]
    const envoyer = (x) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(x)) }
    if (req.method === 'GET' && u === '/api/usine/standard/travail') return envoyer({ reponses: [{ id: 'r-1', systeme: 'CONSIGNES', donnees: { texte: texte('R1') } }, { id: 'r-2', systeme: 'CONSIGNES', donnees: { texte: texte('R2') } }] })
    if (req.method === 'GET' && u === '/api/usine/facteur/travail') return envoyer({ envois: [{ id: 'e-1', canal: 'formulaire_site', type: 'premier_contact', modele_id: 'm-1', texte: texte('E1'), empreinte: crypto.createHash('sha256').update(texte('E1')).digest('hex') }] })
    if (req.method === 'POST') return envoyer({ ok: true })
    res.writeHead(404); res.end()
  })
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${s.address().port}`
  const e = []
  const courir = async (args, env) => {
    requetes.length = 0
    const journal = path.join(TMP, `lanceur-${crypto.randomBytes(4).toString('hex')}.txt`)
    const r = await new Promise((ok) => {
      const p = spawn(process.execPath, ['--import', pathToFileURL(path.join(R, 'scripts', 'ts-loader.mjs')).href, script, ...args], { cwd: racine, windowsHide: true, env: { ...process.env, PRESTI_JETON_STANDARDISTE: jetonAgent, PRESTI_JETON_FACTEUR: jetonAgent, FAUX_LANCEUR_JOURNAL: journal, FAUX_LANCEUR_BRUT: BRUT, ...env } })
      let out = ''
      p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { out += d })
      const t = setTimeout(() => p.kill(), 120_000)
      p.on('close', (code) => { clearTimeout(t); ok({ code, sortie: out }) })
    })
    const argv = fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean) : []
    return { ...r, argv, requetes: requetes.slice() }
  }
  try {
    const avecLanceur = { CODEX_LANCEUR: lanceur }
    const a = await courir(['--agent=standardiste', `--base=${base}`], avecLanceur)
    const gets = a.requetes.filter((q) => q.methode === 'GET' && q.url === '/api/usine/standard/travail')
    const posts = a.requetes.filter((q) => q.methode === 'POST' && q.url === '/api/usine/standard/classement')
    if (a.code !== 0) e.push(`--agent=standardiste : code ${a.code} (${court(a.sortie, 80)})`)
    if (gets.length !== 1) e.push(`--agent=standardiste : ${gets.length} GET travail, 1 attendu`)
    if (a.argv.length !== 2) e.push(`--agent=standardiste : ${a.argv.length} appel(s) au lanceur, 2 attendus (un par réponse)`)
    if (posts.length !== 2 || posts.some((q) => q.corps?.brut !== BRUT) || posts.map((q) => q.corps?.reponse_id).sort().join() !== 'r-1,r-2') e.push(`--agent=standardiste : ${posts.length} POST classement, 2 attendus avec le brut exact`)
    if (a.requetes.some((q) => !q.auth)) e.push('une requête sans le jeton de l\'agent')
    // Le Facteur : le lanceur rend un avis de ton valide. Les trois passes (envoi, soir) tournent sur le MÊME modèle, l'étalonné
    // (D-0410-3) : `gpt-6-luna`, jamais `gpt-6-sol` (jugerTon refuserait avant tout appel : second_juge_non_etalonne).
    const avecAvis = { ...avecLanceur, FAUX_LANCEUR_BRUT: AVIS_OK }
    const EMPREINTE_E1 = crypto.createHash('sha256').update(texte('E1')).digest('hex')
    const avisDe = (x) => x.requetes.filter((q) => q.methode === 'POST' && q.url === '/api/usine/facteur/avis')
    const modeleDe = (x) => x.argv.map((l) => /--model\s+(\S+)/.exec(l)?.[1] ?? '?')
    const b = await courir(['--agent=facteur', `--base=${base}`], avecAvis)
    if (b.code !== 0) e.push(`--agent=facteur : code ${b.code} (${court(b.sortie, 80)})`)
    if (b.requetes.filter((q) => q.methode === 'GET' && q.url === '/api/usine/facteur/travail').length !== 1) e.push('--agent=facteur : pas un GET …/usine/facteur/travail')
    if (avisDe(b).length !== 1) e.push('--agent=facteur : pas un POST avis par envoi')
    for (const q of avisDe(b)) {
      if (q.corps?.envoi_id !== 'e-1' || q.corps?.empreinte !== EMPREINTE_E1 || q.corps?.j2?.verdict !== 'ok' || !Array.isArray(q.corps?.j2?.raisons) || q.corps.j2.raisons.length) e.push('--agent=facteur : l\'avis rendu n\'est pas { envoi_id, empreinte, j2: { verdict: ok, raisons: [] } }')
      if (q.corps?.passe === 'soir') e.push('--agent=facteur : un avis du jour marqué passe: soir')
    }
    if (b.argv.length !== 1 || modeleDe(b).some((m) => m !== 'gpt-6-luna')) e.push(`--agent=facteur : le lanceur doit être appelé une fois, sur gpt-6-luna (reçu : ${modeleDe(b).join(', ') || 'aucun appel'})`)
    // Un avis de ton illisible (ici la réponse d'un classement, qui n'est pas { verdict, raisons }) ne rend RIEN : l'envoi reste
    // `prepare`, repris au passage suivant ; jamais un refus définitif d'un envoi sain (D-0410-3, option 3 refusée).
    const illisible = await courir(['--agent=facteur', `--base=${base}`], avecLanceur)
    if (illisible.code !== 0) e.push(`--agent=facteur, avis illisible : code ${illisible.code} (0 attendu)`)
    if (avisDe(illisible).length) e.push('--agent=facteur : un avis de ton illisible a été rendu à Vercel (rien ne doit l\'être)')
    const c = await courir(['--agent=facteur', '--soir', `--base=${base}`], avecAvis)
    if (c.code !== 0) e.push(`--soir : code ${c.code} (${court(c.sortie, 80)})`)
    if (!c.requetes.some((q) => q.methode === 'GET' && q.url === '/api/usine/facteur/travail?passe=soir')) e.push('--soir : pas de ?passe=soir')
    if (c.argv.length !== 1 || modeleDe(c).some((m) => m !== 'gpt-6-luna')) e.push(`--soir : le lanceur doit être appelé une fois, sur le modèle étalonné gpt-6-luna (reçu : ${modeleDe(c).join(', ') || 'aucun appel'})`)
    if (c.argv.some((l) => /\bgpt-6-sol\b/.test(l))) e.push('--soir : le modèle gpt-6-sol (non étalonné) est dans l\'argv du lanceur')
    if (avisDe(c).length !== 1 || avisDe(c).some((q) => q.corps?.passe !== 'soir' || q.corps?.envoi_id !== 'e-1' || q.corps?.j2?.verdict !== 'ok')) e.push('--soir : pas un POST avis portant passe: soir par envoi')
    if (a.argv.some((l) => /\bgpt-6-sol\b/.test(l))) e.push('--agent=standardiste : le modèle gpt-6-sol dans l\'argv du lanceur')
    const d = await courir(['--agent=standardiste', `--base=${base}`], { CODEX_LANCEUR: '' })
    if (d.code !== 0 || !/modele_absent/.test(d.sortie) || d.requetes.length) e.push(`sans CODEX_LANCEUR : code ${d.code}, ${d.requetes.length} requête(s), « ${court(d.sortie, 60)} » (modele_absent, code 0, aucun appel attendus)`)
    const ferme = await new Promise((r) => { const x = http.createServer(); x.listen(0, '127.0.0.1', () => { const p = x.address().port; x.close(() => r(p)) }) })
    const f = await courir(['--agent=standardiste', `--base=http://127.0.0.1:${ferme}`], avecLanceur)
    if (f.code !== 0 || !f.sortie.trim() || /\n\s+at\s/.test(f.sortie)) e.push(`bus injoignable : code ${f.code} (0 et une ligne de journal, sans exception, attendus)`)
    for (const x of [a, b, illisible, c, d, f]) {
      if (x.argv.some((l) => l.includes(jetonAgent)) || x.sortie.includes(jetonAgent)) e.push('le jeton de l\'agent apparaît dans l\'argv consigné ou la sortie')
      if (/TEXTE-PIEGE/.test(x.sortie)) e.push('un texte de réponse apparaît dans la sortie')
    }
  } finally { await new Promise((r) => s.close(r)) }
  void temoin
  return [...new Set(e)]
}
function passesSurUsine() {
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'usine.mjs'), 'executer', '--nom=passes', '--', 'node', '--import', './scripts/ts-loader.mjs', 'scripts/routes-acquisition-qa.mjs', '--lot=echanges', '--partie=passes'], { cwd: R, encoding: 'utf8', timeout: 20 * 60_000, windowsHide: true })
  const sortie = `${r.stdout || ''}${r.stderr || ''}`
  const ligne = sortie.split(/\r?\n/).map((l) => l.trim()).find((l) => /^(✅|❌) RB-17\b/.test(l))
  if (ligne) return { ligne }
  return { injoignable: `usine : code ${r.status} sans ligne RB-17 (${court(sortie.split(/\r?\n/).filter(Boolean).slice(-2).join(' · '), 160)})` }
}

// ── Les unités (RB-18) ────────────────────────────────────────────────────────────────────────────────────────────────────
function ini(texte) {
  const s = {}
  let sec = null
  for (const l of String(texte).split(/\r?\n/)) {
    const t = l.trim()
    if (!t || /^[#;]/.test(t)) continue
    const m = /^\[(.+)\]$/.exec(t)
    if (m) { sec = m[1]; s[sec] = s[sec] ?? {}; continue }
    const i = t.indexOf('=')
    if (i > 0 && sec) { const k = t.slice(0, i).trim(); (s[sec][k] = s[sec][k] ?? []).push(t.slice(i + 1).trim()) }
  }
  return s
}
const octets = (v) => { const m = /^(\d+(?:\.\d+)?)\s*([KMGT]?)i?B?$/i.exec(String(v).trim()); return m ? Number(m[1]) * 1024 ** ' KMGT'.indexOf((m[2] || ' ').toUpperCase()) : NaN }
function jugerUnites(racine) {
  const e = []
  const dir = 'scripts/usine/systemd'
  for (const [n, u] of Object.entries(UNITES)) {
    const sv = lireBrut(racine, `${dir}/${n}.service`), tm = lireBrut(racine, `${dir}/${n}.timer`)
    if (sv === null) { e.push(`${dir}/${n}.service absent`); continue }
    const s = ini(sv).Service ?? {}
    if ((s.User ?? []).join() !== 'agents') e.push(`${n}.service : User=${(s.User ?? []).join() || '—'}, agents attendu`)
    if (!(s.Environment ?? []).some((v) => v.replace(/^"|"$/g, '') === 'CODEX_LANCEUR=/usr/local/bin/presti-ia-modele')) e.push(`${n}.service sans Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele`)
    if (/^\s*EnvironmentFile\s*=/m.test(sv)) e.push(`${n}.service porte un EnvironmentFile=`)
    const mem = octets((s.MemoryMax ?? [])[0])
    if (!(mem <= 512 * 1024 ** 2)) e.push(`${n}.service : MemoryMax=${(s.MemoryMax ?? [])[0] ?? '—'} (512M au plus)`)
    if ((s.ExecStart ?? []).join(' | ') !== u.exec) e.push(`${n}.service : ExecStart « ${court((s.ExecStart ?? []).join(' | '), 90)} », « ${u.exec} » attendu`)
    if (tm === null) { e.push(`${dir}/${n}.timer absent`); continue }
    const t = ini(tm).Timer ?? {}
    if ((t.Persistent ?? []).join() !== 'true') e.push(`${n}.timer sans Persistent=true`)
    const cal = (t.OnCalendar ?? []).join(' | '), actif = (t.OnUnitActiveSec ?? []).join()
    const toutes = (m) => new RegExp(`^(\\*-\\*-\\* )?\\*:0?0?/${m}(:00)?$`).test(cal) || new RegExp(`^(${m}min|${m}m|${m * 60}s?)$`).test(actif)
    if (u.minuteur === 'soir' ? cal !== '*-*-* 20:05:00 Europe/Paris' : !toutes(u.minuteur)) e.push(`${n}.timer : OnCalendar=${cal || '—'}${actif ? ` OnUnitActiveSec=${actif}` : ''} (${u.minuteur === 'soir' ? '*-*-* 20:05:00 Europe/Paris' : `toutes les ${u.minuteur} min`} attendu)`)
  }
  return e
}

// ── Les critères ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const TOUS = (lot) => Array.from({ length: LOTS[lot].n }, (_, i) => `${LOTS[lot].prefixe}-${i + 1}`)
const jourP = () => jourParis(Date.now())
/** Le contexte d'un jugement : les sources, lues une fois. */
function contexte(racine, lot, temoin) {
  const src = {}
  for (const [r] of LOTS[lot].routes) src[r] = source(racine, ROUTE(r))
  if (lot === 'echanges') { src.travail = source(racine, USINE.travail); src.classement = source(racine, USINE.classement) }
  return { racine, lot, temoin, src, f: (r) => path.join(racine, ROUTE(r)) }
}
/** Le scénario de la vigie et du juge des faits (RA-9, RA-12). */
function scenarioMeta({ etat = 'ok', jeton = true, pause = false, debug = { expires_at: Math.floor(Date.now() / 1000) + 50 * 86400, is_valid: true } } = {}) {
  return {
    comportements: {
      pauseGenerale: PAUSE(pause), enPause: () => false,
      rpc: (fn, a) => (fn === 'acq_jeton_meta' ? { data: jeton ? [{ jeton: JETON_ROUTE, expire_le: null }] : [], error: null } : defautPour('lib/supabaseAdmin', 'rpc', [fn, a])),
      executerVigie: async (deps) => { await deps?.budget?.prendre?.(); return { etat, candidats: 0, annonceurs: 0, ...(etat === 'limite' ? { limite: 1 } : {}) } },
      executerJugeFaits: async () => ({ meta: etat, verifies: 0, rejetes: 0 }),
      consommerLimite: () => true, enregistrerPassage: () => undefined, envoyerAlertes: (x) => (Array.isArray(x) ? x.length : 0),
    },
    fetchFaux: async (u) => {
      const h = new URL(u).host
      if (h === 'graph.facebook.com' && /debug_token/.test(u)) return debug === 'erreur' ? reponseJson({ error: { message: 'panne' } }, 500) : reponseJson({ data: debug })
      throw new Error(`réseau coupé par le juge (${h})`)
    },
  }
}
const url = (r, q = '') => `http://127.0.0.1/api/cron/${r}${q}`
const bon = () => ({ authorization: `Bearer ${process.env.__SECRET_BANC}` })
process.env.__SECRET_BANC = `banc-${ALEA}`
const envBanc = { CRON_SECRET: `banc-${ALEA}`, PAUSE_GENERALE: undefined }
/** Le jeton ne doit apparaître dans aucun argument consigné (hors exécuteurs, qui le reçoivent par conception) ni la console. */
const fuiteJeton = (x) => (x.journal.filter((e) => !/^executer/.test(e.nom)).some((e) => e.json.includes(JETON_ROUTE)) || x.console.includes(JETON_ROUTE) || x.texte.includes(JETON_ROUTE) ? ['la valeur du jeton apparaît dans un argument consigné, la console ou la réponse'] : [])

const CRITERES = {
  recensement: {
    'RA-1': async (c) => [LOTS.recensement.routes.flatMap(([r]) => exportsRoute(c.src[r])), 'les trois routes exportent GET, runtime nodejs, dynamic force-dynamic, maxDuration ≤ 60'],
    'RA-2': async (c) => [LOTS.recensement.routes.flatMap(([r]) => [...gardeJeton(c.src[r]), ...pauseAvant(c.src[r], /\bmagasinSupabase\b/)]), 'jeton contrôlé par le premier if (Bearer, secret absent refusé, 401), sans await avant ; pauseGenerale() de @/lib/agents/pause avant magasinSupabase ; aucune variable de pause abandonnée'],
    'RA-3': async (c) => {
      const rels = LOTS.recensement.routes.map(([r]) => ROUTE(r))
      let srv
      try { srv = await servir(c.racine, rels, c.temoin) } catch (e) { return [[`service : ${premiereLigne(e)}`], ''] }
      try { const e = []; for (const [r] of LOTS.recensement.routes) e.push(...await servi(srv.base, srv.secret, `/api/cron/${r}`)); return [e, `${c.temoin ? 'témoin servi par le banc' : `next dev lancé par le juge (${srv.base})`} : sans en-tête 401, mauvais jeton 401, bon jeton 200 { pause: true } pour les trois routes`] } finally { await srv.arreter() }
    },
    'RA-4': async (c) => {
      const e = []
      for (const [r] of LOTS.recensement.routes) {
        const s = c.src[r]
        for (const v of [REFUS.jetonVariable, REFUS.adressesVariable]) if (s.brut.includes(v)) e.push(`${s.rel} contient ${v}`)
        e.push(...argumentsJournal(s, /[\w$.]*jeton[\w$]*/i, 'une variable du jeton'))
      }
      for (const r of ['vigie-meta', 'juge-faits']) if (!/\.rpc\s*\(\s*['"]acq_jeton_meta['"]/.test(c.src[r].nu)) e.push(`${ROUTE(r)} ne lit pas le jeton par rpc('acq_jeton_meta')`)
      const v = c.src['vigie-meta'].nu
      if (!/consommerLimite\s*\(\s*['"]meta:ads_archive['"]\s*,\s*150\s*,\s*3600\s*\)/.test(v)) e.push('vigie-meta n\'appelle pas consommerLimite(\'meta:ads_archive\', 150, 3600)')
      const x = await banc(c.f('vigie-meta'), { url: url('vigie-meta'), entetes: bon(), env: envBanc, ...scenarioMeta({ etat: 'ok' }) })
      e.push(...hors(x))
      const vig = appelsDe(x, 'executerVigie')
      if (vig.map((y) => y.args[0]?.cible).join() !== 'artisan,marque') e.push(`executerVigie appelée ${vig.length} fois (${vig.map((y) => y.args[0]?.cible).join(', ') || '—'}), artisan puis marque attendus`)
      if (vig.some((y) => y.args[0]?.jeton !== JETON_ROUTE)) e.push('executerVigie ne reçoit pas le jeton lu par rpc(\'acq_jeton_meta\')')
      if (!appelsDe(x, 'consommerLimite').some((y) => y.json === '["meta:ads_archive",150,3600]')) e.push('le budget de la vigie ne passe pas par consommerLimite(\'meta:ads_archive\', 150, 3600)')
      e.push(...fuiteJeton(x))
      return [e, 'jeton lu par rpc(\'acq_jeton_meta\') seulement, passé à l\'exécuteur, jamais à console.* ni enregistrerPassage ; vigie : consommerLimite(\'meta:ads_archive\', 150, 3600), executerVigie artisan puis marque (exécuté au banc)']
    },
    'RA-5': async (c) => {
      const e = []
      for (const [r, , passage] of LOTS.recensement.routes) {
        const s = c.src[r]
        const permis = r === 'recenseur' ? [passage, 'acq-rge'] : [passage]
        const noms = appelsJs(s.nu, 'enregistrerPassage').flatMap((a) => { const x = a.args[0] ?? ''; return [...(x.includes('?') ? x.slice(x.indexOf('?') + 1) : x).matchAll(/['"`]([^'"`]*)['"`]/g)].map((m) => m[1]) })
        for (const p of permis) if (!noms.includes(p)) e.push(`${s.rel} n'enregistre pas le passage ${p}`)
        for (const n of noms) if (!permis.includes(n)) e.push(`${s.rel} enregistre un passage « ${n} » (${permis.join(' ou ')} seulement)`)
        for (const i of importsDe(s.nu)) if (/(^|\/)lib\/ai(\.ts)?$|(^|\/)lib\/agents\/llm(\.ts)?$/.test(i.spec ?? '')) e.push(`${s.rel} importe ${i.spec}`)
      }
      return [e, 'passages acq-recenseur, acq-rge, acq-juge-faits, acq-vigie-meta ; ni @/lib/ai ni @/lib/agents/llm']
    },
    'RA-6': async (c) => [jugerScriptsListes(c.racine), 'candidats-ajouter et opposition-importer --sec sur une copie hors dépôt : les comptes attendus, aucune valeur affichée ; un fichier du dépôt → code 2'],
    'RA-7': async (c) => {
      if (c.temoin) return [[], 'témoin : vercel.json, les routes existantes et npm run typecheck ne se jugent que sur le dépôt']
      const e = []
      const d = spawnSync('git', ['diff', '--name-only', 'HEAD', '--', 'vercel.json', ...ROUTES_EXISTANTES], { cwd: c.racine, encoding: 'utf8' })
      if (d.status !== 0) e.push(`git diff : ${court(d.stderr)}`)
      else if (d.stdout.trim()) e.push(`changé(s) : ${d.stdout.trim().split(/\r?\n/).join(', ')}`)
      const t = typecheck(c.racine)
      if (!t.ok) e.push(t.detail)
      return [e, `vercel.json et les trois routes cron existantes inchangés (git diff HEAD) ; ${t.detail}`]
    },
    'RA-8': async (c) => [LOTS.recensement.routes.flatMap(([r, agent]) => battementSource(c.src[r], agent)), 'chaque route bat son agent après enregistrerPassage(…, true), jamais dans une branche de pause, un catch, ni après un enregistrerPassage(…, false)'],
    'RA-9': async (c) => {
      const e = []
      for (const r of ['vigie-meta', 'juge-faits']) {
        const passage = r === 'vigie-meta' ? 'acq-vigie-meta' : 'acq-juge-faits', agent = r === 'vigie-meta' ? 'vigie_meta' : 'juge_faits'
        const run = (etat) => banc(c.f(r), { url: url(r), entetes: bon(), env: envBanc, ...scenarioMeta({ etat, debug: 'erreur' }) })
        const a = await run('en_attente_jeton')
        e.push(...hors(a).map((x) => `${r} en_attente_jeton : ${x}`))
        const pa = passagesDe(a).filter((p) => p.nomPassage === passage)
        if (!pa.length || pa.some((p) => !p.reussi)) e.push(`${r} en_attente_jeton : passage ${pa.length ? 'en échec' : 'absent'}, réussi attendu`)
        if (!battementsDe(a, agent).length) e.push(`${r} en_attente_jeton : aucun battement`)
        if (appelsDe(a, 'envoyerAlertes').length) e.push(`${r} en_attente_jeton : une alerte`)
        const cles = []
        for (const etat of ['jeton_invalide', 'en_attente_identite', 'jeton_invalide']) {
          const b = await run(etat)
          e.push(...hors(b).map((x) => `${r} ${etat} : ${x}`))
          const pb = passagesDe(b).filter((p) => p.nomPassage === passage)
          if (!pb.length || pb.some((p) => p.reussi)) e.push(`${r} ${etat} : enregistrerPassage(…, false) attendu`)
          if (battementsDe(b, agent).length) e.push(`${r} ${etat} : un battement`)
          const al = appelsDe(b, 'envoyerAlertes')
          const liste = al.flatMap((x) => (Array.isArray(x.args[0]) ? x.args[0] : [x.args[0]]))
          if (al.length !== 1 || liste.length !== 1) e.push(`${r} ${etat} : ${al.length} envoyerAlertes (${liste.length} alerte(s)), un seul attendu`)
          const x = liste[0] ?? {}
          if (x.motif !== 'jeton_externe') e.push(`${r} ${etat} : motif ${x.motif}, jeton_externe attendu`)
          if (x.cle !== `jeton_externe:meta:${jourP()}`) e.push(`${r} ${etat} : clé « ${x.cle} », « jeton_externe:meta:${jourP()} » attendue`)
          if (!String(x.corps ?? '').includes('presti-secrets/meta-bibliotheque-pubs.txt') || /meta-echeance/.test(jsonSur(x))) e.push(`${r} ${etat} : le corps ne cite pas presti-secrets/meta-bibliotheque-pubs.txt (ou cite meta-echeance)`)
          if (/@/.test(jsonSur(x))) e.push(`${r} ${etat} : une adresse dans l'alerte`)
          cles.push(x.cle)
          e.push(...fuiteJeton(b).map((y) => `${r} ${etat} : ${y}`))
        }
        if (new Set(cles).size !== 1) e.push(`${r} : deux passages le même jour donnent des clés différentes`)
        e.push(...fuiteJeton(a).map((y) => `${r} en_attente_jeton : ${y}`))
      }
      const l = await banc(c.f('vigie-meta'), { url: url('vigie-meta'), entetes: bon(), env: envBanc, ...scenarioMeta({ etat: 'limite', debug: 'erreur' }) })
      const pl = passagesDe(l).filter((p) => p.nomPassage === 'acq-vigie-meta')
      if (!pl.length || pl.some((p) => !p.reussi) || !pl.some((p) => /"limite":1\b/.test(jsonSur(p.args[1])))) e.push('vigie-meta limite : passage réussi avec limite: 1 attendu')
      return [[...new Set(e)], 'vigie-meta et juge-faits au banc : en_attente_jeton → passage réussi et battement ; jeton_invalide et en_attente_identite → passage en échec, aucun battement, une alerte jeton_externe:meta:<jour de Paris> qui cite presti-secrets/meta-bibliotheque-pubs.txt, la même clé deux fois ; limite → réussi, limite: 1 ; le jeton n\'apparaît nulle part']
    },
    'RA-10': async (c) => [jugerJetonMeta(c.racine), 'jeton-meta-poser : --sec → code 0, « jeton présent », aucune sortie réseau (piège) ; fichier vide ou absent → code 2 « colle le jeton dans … » ; ni le jeton, ni un morceau, ni sa longueur ; debug_token à graph.facebook.com seulement ; acq_jeton_meta_poser seul rpc ; pas de meta-echeance.mjs'],
    'RA-11': async (c) => {
      const e = []
      const s = c.src.recenseur
      if (s.brut.includes(REFUS.adressesVariable) || /process\.env\.[A-Z_]*ADRESSE/.test(s.nu)) e.push('recenseur lit une variable d\'adresse')
      const C1 = { cle_dedup: 'siren:123456782', siren: '123456782', source: 'ademe_rge' }, C2 = { cle_dedup: 'siren:987654324', siren: '987654324', source: 'ademe_rge' }
      const scen = (rge, pause = false) => ({ comportements: {
        pauseGenerale: PAUSE(pause), enPause: () => false,
        rpc: (fn, a) => (fn === 'acq_curseur_lire' ? { data: 'CURSEUR-41', error: null } : defautPour('lib/supabaseAdmin', 'rpc', [fn, a])),
        curseurLire: () => 'CURSEUR-41', curseurPoser: () => undefined,
        importerRge: async () => rge, enregistrerCandidats: async (x) => ({ ajoutes: x?.length ?? 0, ignores: 0 }), executerRecenseur: async () => ({ reserves: 0, recense: 0 }),
        enregistrerPassage: () => undefined,
      } })
      const run = (rge, pause) => banc(c.f('recenseur'), { url: url('recenseur', '?passe=rge'), entetes: bon(), env: envBanc, ...scen(rge, pause) })
      const a = await run({ candidats: [C1, C2], curseur_suivant: 'CURSEUR-42', fini: false })
      e.push(...hors(a))
      const lu = curseurLu(a, 'rge')[0], ir = appelsDe(a, 'importerRge')[0], ec = appelsDe(a, 'enregistrerCandidats')[0], po = curseurPose(a, 'rge')[0]
      const pas = passagesDe(a).find((p) => p.nomPassage === 'acq-rge'), bat = battementsDe(a, 'recenseur')[0]
      if (!lu) e.push('acq_curseur_lire(\'rge\') non appelé')
      if (!ir) e.push('importerRge non appelé')
      else { if (lu && lu.n > ir.n) e.push('le curseur est lu après importerRge'); if (ir.args[0]?.curseur !== 'CURSEUR-41' || ir.args[0]?.limite !== 1000) e.push(`importerRge reçoit curseur ${JSON.stringify(ir.args[0]?.curseur)} et limite ${ir.args[0]?.limite} (CURSEUR-41 et 1000 attendus)`) }
      if (!ec || jsonSur(ec.args[0]) !== jsonSur([C1, C2])) e.push('enregistrerCandidats ne reçoit pas les candidats d\'importerRge')
      if (!po || po.valeur !== 'CURSEUR-42') e.push(`acq_curseur_poser('rge', 'CURSEUR-42') ${po ? `reçoit ${JSON.stringify(po.valeur)}` : 'absent'}`)
      if (!pas || !pas.reussi) e.push('passage acq-rge réussi absent')
      if (!bat) e.push('aucun battement de recenseur')
      else if (pas && bat.n < pas.n) e.push('le battement précède le passage')
      if (po && ec && po.n < ec.n) e.push('le curseur est posé avant l\'enregistrement des candidats')
      const b = await run({ refus: 'injoignable' })
      if (!passagesDe(b).some((p) => p.nomPassage === 'acq-rge' && p.reussi)) e.push('injoignable : passage acq-rge réussi attendu')
      if (curseurPose(b, 'rge').length) e.push('injoignable : le curseur a été reposé')
      const f = await run({ candidats: [C1], curseur_suivant: null, fini: true })
      const pf = curseurPose(f, 'rge')[0]
      if (!pf || pf.valeur !== '') e.push(`fini : curseur ${pf ? `posé à ${JSON.stringify(pf.valeur)}` : 'non posé'}, remis à vide attendu`)
      const p = await run({ candidats: [C1], curseur_suivant: 'X', fini: false }, true)
      if (appelsDe(p, 'importerRge').length || curseurLu(p, 'rge').length) e.push('en pause : importerRge ou le curseur appelés')
      return [e, 'passe rge au banc : curseur rge lu, importerRge(curseur, limite 1000), candidats enregistrés, curseur suivant posé, passage acq-rge puis battement ; injoignable → réussi sans curseur ; fini → curseur vide ; pause → rien ; aucune variable d\'adresse']
    },
    'RA-12': async (c) => {
      const e = []
      const f = c.f('vigie-meta')
      if (/process\.env\.META_ADLIB/.test(c.src['vigie-meta'].nu)) e.push(`vigie-meta lit process.env.${REFUS.jetonVariable}`)
      const exp50 = Math.floor(Date.now() / 1000) + 50 * 86400
      const ev = []
      const a = await banc(f, { url: url('vigie-meta'), entetes: bon(), env: envBanc, evenements: ev, ...scenarioMeta({ etat: 'ok', debug: { expires_at: exp50, is_valid: true } }) })
      e.push(...hors(a))
      const dt = a.requetes.filter((u) => /debug_token/.test(u))
      if (dt.length !== 1) e.push(`${dt.length} appel(s) à debug_token après un passage réussi, 1 attendu`)
      if (a.requetes.some((u) => new URL(u).host !== 'graph.facebook.com')) e.push(`une requête hors graph.facebook.com : ${a.requetes.map((u) => new URL(u).host).join(', ')}`)
      const ech = (x) => [...x.journal.filter((y) => (y.mod.startsWith('lib/agents/bus') && /echeance/i.test(y.nom)) || (y.nom === 'rpc' && y.args[0] === 'ops_agent_echeance'))]
      const e1 = ech(a)[0]
      const arg = e1 ? (e1.nom === 'rpc' ? e1.args[1] : e1.args[0]) ?? {} : {}
      if (!e1 || arg.p_nom !== 'vigie_meta' || String(arg.p_expire_le ?? '').slice(0, 10) !== new Date(exp50 * 1000).toISOString().slice(0, 10)) e.push(`ops_agent_echeance ${e1 ? `reçoit ${court(jsonSur(arg), 80)}` : 'non appelé'} (p_nom vigie_meta, p_expire_le à 50 jours attendus)`)
      if (!a.journal.some((y) => y.json.includes('echeance_lue') && !LECTURE_EVENEMENTS.test(y.nom) && y.args[0] !== 'ops_evenements_lire')) e.push('aucun événement echeance_lue')
      if (e1 && a.journal.find((y) => y.json.includes('echeance_lue') && !LECTURE_EVENEMENTS.test(y.nom))?.n < e1.n) e.push('l\'événement echeance_lue précède ops_agent_echeance')
      const b = await banc(f, { url: url('vigie-meta'), entetes: bon(), env: envBanc, evenements: ev, ...scenarioMeta({ etat: 'ok', debug: { expires_at: exp50, is_valid: true } }) })
      if (b.requetes.some((u) => /debug_token/.test(u))) e.push('un second passage le même jour rappelle debug_token')
      const z = await banc(f, { url: url('vigie-meta'), entetes: bon(), env: envBanc, evenements: [], ...scenarioMeta({ etat: 'ok', debug: { expires_at: 0, is_valid: true } }) })
      const ez = ech(z)[0], az = ez ? (ez.nom === 'rpc' ? ez.args[1] : ez.args[0]) ?? {} : null
      if (!az || az.p_expire_le !== null) e.push(`expires_at 0 : ops_agent_echeance ${az ? `reçoit p_expire_le ${JSON.stringify(az.p_expire_le)}` : 'non appelé'} (null attendu)`)
      const r = await banc(f, { url: url('vigie-meta'), entetes: bon(), env: envBanc, evenements: [], ...scenarioMeta({ etat: 'ok', debug: 'erreur' }) })
      if (!passagesDe(r).some((p) => p.nomPassage === 'acq-vigie-meta' && p.reussi) || !battementsDe(r, 'vigie_meta').length || appelsDe(r, 'envoyerAlertes').length || ech(r).length) e.push('debug_token en erreur : passage réussi, battement, aucune alerte et aucun ops_agent_echeance attendus')
      const p = await banc(f, { url: url('vigie-meta'), entetes: bon(), env: envBanc, evenements: [], ...scenarioMeta({ etat: 'ok', pause: true }) })
      const v = await banc(f, { url: url('vigie-meta'), entetes: bon(), env: envBanc, evenements: [], ...scenarioMeta({ etat: 'ok', jeton: false }) })
      if (p.requetes.length) e.push('en pause : un appel réseau')
      if (v.requetes.length) e.push('sans jeton : un appel à debug_token')
      for (const x of [a, b, z, r]) e.push(...fuiteJeton({ ...x, journal: x.journal }))
      return [[...new Set(e)], 'au banc : un passage réussi lit debug_token à graph.facebook.com une fois par jour, pose l\'échéance à 50 jours (null si expires_at 0) puis echeance_lue ; erreur → passage réussi sans échéance ni alerte ; pause ou sans jeton → rien']
    },
  },
  echanges: {
    'RB-1': async (c) => { const e = LOTS.echanges.routes.flatMap(([r]) => exportsRoute(c.src[r])); if (existe(c.racine, REFUS.routeWebhook)) e.push(`${REFUS.routeWebhook} existe`); return [e, 'redacteur et standardiste exportent GET, runtime nodejs, dynamic force-dynamic, maxDuration ≤ 60 ; aucune route de webhook de l\'ancien porteur'] },
    'RB-2': async (c) => {
      const e = [...gardeJeton(c.src.redacteur), ...gardeJeton(c.src.standardiste), ...pauseAvant(c.src.redacteur, /\bmagasinSupabase\b/), ...pauseAvant(c.src.standardiste, /\bexecuterStandardiste\s*\(/)]
      const g = c.src.standardiste.get?.texte ?? ''
      const ir = g.search(/\breleverGmail\s*\(/), ip = g.search(/\bpauseGenerale\s*\(/)
      if (ir < 0) e.push('standardiste n\'appelle pas releverGmail')
      else if (ip >= 0 && ip < ir) e.push('standardiste : pauseGenerale() avant la relève')
      return [e, 'jeton d\'abord sans await ; redacteur : pause avant le magasin ; standardiste : la relève, puis pauseGenerale(), puis executerStandardiste']
    },
    'RB-3': async (c) => {
      const rels = LOTS.echanges.routes.map(([r]) => ROUTE(r))
      let srv
      try { srv = await servir(c.racine, rels, c.temoin) } catch (e) { return [[`service : ${premiereLigne(e)}`], ''] }
      try { const e = []; for (const [r] of LOTS.echanges.routes) e.push(...await servi(srv.base, srv.secret, `/api/cron/${r}`)); return [e, `${c.temoin ? 'témoin servi par le banc' : `next dev lancé par le juge (${srv.base})`} : 401, 401, 200 { pause: true } pour les deux routes`] } finally { await srv.arreter() }
    },
    'RB-4': async (c) => {
      const e = []
      for (const s of [c.src.redacteur, c.src.standardiste, c.src.travail, c.src.classement].filter(Boolean)) {
        for (const i of importsDe(s.nu)) if (/(^|\/)lib\/agents\/llm(\.ts)?$|(^|\/)lib\/ai(\.ts)?$|^@anthropic-ai\/sdk$/.test(i.spec ?? '')) e.push(`${s.rel} importe ${i.spec}`)
        if (/\btools\b/.test(s.nu)) e.push(`${s.rel} contient tools`)
      }
      const p = source(c.racine, SCRIPTS.passes)
      if (!p) e.push(`${SCRIPTS.passes} absent`)
      else if (!importsDe(p.nu).some((i) => /(^|\/)lib\/agents\/llm(\.ts)?$/.test(i.spec ?? ''))) e.push(`${SCRIPTS.passes} n'importe pas lib/agents/llm.ts`)
      return [e, 'aucune route n\'importe llm, lib/ai ni le SDK, ni ne contient tools ; seul passes-modele.mjs importe lib/agents/llm.ts']
    },
    'RB-5': async (c) => [[c.src.redacteur, c.src.standardiste, c.src.travail, c.src.classement].filter(Boolean).flatMap((s) => argumentsJournal(s, /\.(texte|text|corps|contenu|brut|de|objet|donnees)\b|\b(texte|contenu|brut)\b/, 'un texte')), 'aucun texte de réponse ni d\'envoi dans console.* ni enregistrerPassage (arguments lus)'],
    'RB-6': async (c) => {
      const e = []
      for (const f of ['scripts/agents/lot-du-jour.mjs', 'scripts/agents/reponse-relayer.mjs']) if (existe(c.racine, f)) e.push(`${f} existe`)
      for (const s of [c.src.redacteur, c.src.standardiste, c.src.travail, c.src.classement].filter(Boolean)) {
        if (/lot-du-jour|reponse-relayer/.test(s.brut)) e.push(`${s.rel} cite lot-du-jour ou reponse-relayer`)
        if (s.brut.includes(REFUS.motMajuscules)) e.push(`${s.rel} contient le mot refusé en majuscules`)
      }
      return [e, 'ni lot-du-jour.mjs ni reponse-relayer.mjs, aucune route ne les cite ni ne porte le mot refusé']
    },
    'RB-7': async (c) => {
      if (c.temoin) return [[], 'témoin : lib/agents/llm.ts, vercel.json, les autres routes et npm run typecheck ne se jugent que sur le dépôt']
      const e = []
      const miens = new Set([...LOTS.echanges.routes.map(([r]) => ROUTE(r)), USINE.travail, USINE.classement])
      const d = spawnSync('git', ['diff', '--name-only', 'HEAD', '--', 'lib/agents/llm.ts', 'vercel.json', 'app/api'], { cwd: c.racine, encoding: 'utf8' })
      if (d.status !== 0) e.push(`git diff : ${court(d.stderr)}`)
      const autres = d.stdout.split(/\r?\n/).filter(Boolean).filter((x) => !miens.has(x))
      if (autres.length) e.push(`changé(s) : ${autres.join(', ')}`)
      const t = typecheck(c.racine)
      if (!t.ok) e.push(t.detail)
      return [e, `lib/agents/llm.ts, vercel.json et les autres routes inchangés (git diff HEAD) ; ${t.detail}`]
    },
    'RB-8': async (c) => [LOTS.echanges.routes.flatMap(([r, agent]) => battementSource(c.src[r], agent)), 'redacteur et standardiste battent après enregistrerPassage(…, true), jamais en pause ni dans le catch'],
    ...critereStandard(),
    ...critereUsine(),
    'RB-17': async (c) => {
      if (c.temoin || process.platform === 'linux') return [await jugerPasses(c.racine, c.temoin), `passes-modele.mjs contre un faux Presti sur 127.0.0.1 et le faux lanceur : un GET travail, un appel au lanceur et un POST classement par réponse (brut exact) ; facteur (le lanceur rend un avis de ton valide) : GET travail, un POST avis par envoi sur gpt-6-luna, un avis illisible ne rend rien ; --soir : ?passe=soir, gpt-6-luna (l'étalonné, jamais gpt-6-sol) et un POST avis portant passe: soir ; sans CODEX_LANCEUR : modele_absent ; bus injoignable : une ligne, code 0 ; ni jeton ni texte en sortie${c.temoin && process.platform !== 'linux' ? ' (témoin : le lanceur sh passe par bash)' : ''}`]
      const u = passesSurUsine()
      if (u.injoignable) { c.prealable = u.injoignable; return [[u.injoignable], ''] }
      const ok = u.ligne.startsWith('✅')
      return [ok ? [] : [u.ligne.replace(/^❌ RB-17\s*/, '')], `sur l'usine : ${u.ligne.replace(/^✅ RB-17\s*/, '')}`]
    },
    'RB-18': async (c) => [jugerUnites(c.racine), 'les six unités : User=agents, CODEX_LANCEUR, aucun EnvironmentFile, MemoryMax ≤ 512M, ExecStart exacts ; minuteurs 5 min, 15 min et 20:05:00 Europe/Paris, Persistent=true'],
  },
}
function critereStandard() {
  const MSGS = JSON.parse(fs.readFileSync(path.join(CLI, 'doublures', 'gmail-messages.json'), 'utf8')).messages.map((m) => JSON.parse(JSON.stringify(m).replaceAll('{{ADRESSE_PROSPECTION}}', ADRESSE_PROSPECTION).replaceAll('{{AUTRE_ADRESSE}}', AUTRE_ADRESSE).replaceAll('{{MESSAGERIE_GRATUITE}}', GRATUITE)))
  const ENV = { CRON_SECRET: `banc-${ALEA}`, PAUSE_GENERALE: undefined, PROSPECTION_GMAIL_USER: AUTRE_ADRESSE, PROSPECTION_GMAIL_PASS: MOT_DE_PASSE, ACQ_ADRESSE_REPONSE: ADRESSE_PROSPECTION }
  const scen = ({ releve = 'ok', pause = false, rejoue = false } = {}) => {
    const vus = new Set(rejoue ? MSGS.map((m) => m.id_externe) : [])
    return {
      comportements: {
        releverGmail: (o) => (D.adresseRecue = o?.adresse, releve === 'ok' ? { messages: MSGS.filter((m) => m.a === o?.adresse).map(({ a, ...m }) => (void a, m)), curseur_suivant: 45 } : releve === 'vide' ? { messages: [], curseur_suivant: 41 } : { erreur: releve }),
        reponseRecue: (r) => { const n = !vus.has(r?.id_externe); vus.add(r?.id_externe); return { id: crypto.randomUUID(), nouvelle: n, prospect: /reponse-2/.test(r?.id_externe ?? '') ? { id: 'p-2', siren: '123456782', domaine: 'menuiserie-essai.invalid' } : null } },
        estStop: (t) => /^\s*stop\b/i.test(String(t ?? '')),
        executerStandardiste: async () => ({ classees: 0 }), pauseGenerale: PAUSE(pause), enPause: () => false,
        rpc: (fn, a) => (fn === 'acq_curseur_lire' ? { data: '41', error: null } : defautPour('lib/supabaseAdmin', 'rpc', [fn, a])),
        curseurLire: () => '41', curseurPoser: () => undefined, opposer: () => undefined, signal: () => undefined, enregistrerPassage: () => undefined,
      },
    }
  }
  const run = (c, o, env = ENV) => banc(c.f('standardiste'), { url: url('standardiste'), entetes: bon(), env, ...scen(o) })
  const stopDe = MSGS.find((m) => /^\s*stop\b/i.test(m.texte)), ailleurs = MSGS.find((m) => m.a === AUTRE_ADRESSE)
  return {
    'RB-9': async (c) => {
      const e = []
      const a = await run(c, { pause: true })
      e.push(...hors(a))
      if (!appelsDe(a, 'releverGmail').length) e.push('pause active : releverGmail non appelée')
      if (appelsDe(a, 'reponseRecue').length !== 2) e.push(`pause active : ${appelsDe(a, 'reponseRecue').length} reponseRecue, 2 attendus`)
      if (curseurPose(a, 'gmail').length !== 1) e.push('pause active : le curseur gmail n\'est pas posé')
      if (a.json?.pause !== true) e.push(`pause active : réponse ${court(a.texte, 60)}, { pause: true } attendu`)
      if (appelsDe(a, 'executerStandardiste').length) e.push('pause active : executerStandardiste appelée')
      const b = await run(c, {}, { ...ENV, PROSPECTION_GMAIL_USER: undefined, PROSPECTION_GMAIL_PASS: undefined, ACQ_ADRESSE_REPONSE: undefined })
      if (appelsDe(b, 'releverGmail').length) e.push('sans les trois variables : releverGmail appelée')
      if (!passagesDe(b).some((p) => p.nomPassage === 'acq-standardiste' && p.reussi && /en_attente_gmail/.test(jsonSur(p.args[1])))) e.push('sans les trois variables : passage réussi portant en_attente_gmail attendu')
      const v = await run(c, { releve: 'vide' })
      if (curseurPose(v, 'gmail').length !== 1) e.push(`relève sans message : ${curseurPose(v, 'gmail').length} acq_curseur_poser, 1 attendu`)
      const i = await run(c, { releve: 'injoignable' })
      if (curseurPose(i, 'gmail').length) e.push('relève injoignable : le curseur a été reposé')
      const au = await run(c, { releve: 'auth' })
      if (!appelsDe(au, 'signal').some((x) => x.args[0]?.type === 'gmail_refus')) e.push('relève auth : aucun signal gmail_refus')
      return [e, 'au banc : la relève tourne en pause (messages reçus, curseur posé, { pause: true }, pas de classement) ; sans variables : en_attente_gmail, réussi ; sans message : curseur posé ; injoignable : curseur gardé ; auth : signal gmail_refus']
    },
    'RB-10': async (c) => {
      const e = []
      const a = await run(c, {})
      e.push(...hors(a))
      const recu = appelsDe(a, 'reponseRecue').find((x) => x.args[0]?.id_externe === stopDe.id_externe)
      const opp = appelsDe(a, 'opposer'), sig = appelsDe(a, 'signal').filter((x) => x.args[0]?.type === 'stop'), ex = appelsDe(a, 'executerStandardiste')[0]
      if (!recu) e.push('le STOP n\'est pas passé à reponseRecue')
      if (opp.length !== 1) e.push(`${opp.length} opposer, 1 attendu (le STOP seul)`)
      if (sig.length !== 1) e.push(`${sig.length} signal stop, 1 attendu`)
      if (!ex) e.push('executerStandardiste non appelée')
      if (recu && opp[0] && !(recu.n < opp[0].n)) e.push('opposer avant reponseRecue')
      if (ex && (opp[0]?.n > ex.n || sig[0]?.n > ex.n)) e.push('l\'opposition ou le signal viennent après executerStandardiste')
      const cles = opp[0]?.args[0] ?? {}
      const valeurs = jsonSur(cles)
      if (!valeurs.includes(`"${stopDe.de.toLowerCase()}"`)) e.push('l\'opposition ne porte pas l\'adresse de l\'expéditeur')
      if (Object.values(cles).some((v) => String(v).toLowerCase() === GRATUITE)) e.push(`l'opposition porte le domaine d'une messagerie gratuite (${GRATUITE})`)
      const r = await run(c, { rejoue: true })
      if (appelsDe(r, 'opposer').length || appelsDe(r, 'signal').some((x) => x.args[0]?.type === 'stop')) e.push('le même message rejoué : un second opposer ou signal')
      return [e, `au banc : le STOP → reponseRecue, puis opposer (l'adresse, jamais ${GRATUITE}) et signal stop, avant executerStandardiste ; une réponse ordinaire → reponseRecue seule ; rejoué → rien de nouveau`]
    },
    'RB-11': async (c) => {
      const e = []
      D.adresseRecue = undefined
      const a = await run(c, {})
      if (D.adresseRecue !== ADRESSE_PROSPECTION) e.push(`releverGmail reçoit l'adresse ${D.adresseRecue === AUTRE_ADRESSE ? 'de la boîte (une autre adresse)' : JSON.stringify(D.adresseRecue)}, ACQ_ADRESSE_REPONSE attendue`)
      if (appelsDe(a, 'reponseRecue').some((x) => x.args[0]?.id_externe === ailleurs.id_externe || x.json.includes('TEXTE-PIEGE-AILLEURS'))) e.push('un message adressé ailleurs atteint le magasin')
      const s = c.src.standardiste.nu
      if (!/ACQ_ADRESSE_REPONSE/.test(s)) e.push('la route ne lit pas ACQ_ADRESSE_REPONSE')
      if (/messages\s*\.\s*filter\s*\(/.test(s)) e.push('la route filtre les messages elle-même après coup')
      return [e, 'releverGmail reçoit ACQ_ADRESSE_REPONSE ; le message adressé ailleurs n\'atteint jamais reponseRecue ; la route ne filtre rien après coup']
    },
    'RB-12': async (c) => {
      const e = []
      const a = await run(c, {})
      const pieges = [...new Set([...MSGS.flatMap((m) => [m.texte, m.de, m.objet]).filter((x) => x && x.length >= 6), 'TEXTE-PIEGE', '0600000000', ADRESSE_PROSPECTION, AUTRE_ADRESSE, MOT_DE_PASSE])]
      const passages = jsonSur(passagesDe(a).map((p) => p.args))
      for (const [lieu, t] of [['la console', a.console], ['enregistrerPassage', passages], ['la réponse', a.texte]]) for (const p of pieges) if (t.includes(p)) e.push(`${lieu} porte ${p === MOT_DE_PASSE ? 'le mot de passe du Gmail' : p.includes('@') ? 'une adresse' : 'un texte de message'}`)
      return [[...new Set(e)], 'au banc : ni texte, ni adresse, ni identifiant du Gmail dans la console, les passages ou la réponse']
    },
    'RB-13': async (c) => {
      const e = []
      const a = await run(c, {})
      const ex = appelsDe(a, 'executerStandardiste')[0]
      if (!ex || ex.args[0]?.lecteur !== null || ex.args[0]?.attendreUsine !== true) e.push(`executerStandardiste reçoit lecteur ${ex ? jsonSur(ex.args[0]?.lecteur) : '—'} et attendreUsine ${ex ? jsonSur(ex.args[0]?.attendreUsine) : '—'} (null et true attendus)`)
      const t = appelsJs(c.src.standardiste.nu, 'executerStandardiste')[0]?.texte ?? ''
      if (!/lecteur\s*:\s*null/.test(t) || !/attendreUsine\s*:\s*true/.test(t)) e.push('lu dans le source : executerStandardiste sans lecteur: null et attendreUsine: true')
      return [e, 'executerStandardiste({ lecteur: null, attendreUsine: true }), lu et consigné']
    },
  }
}
function critereUsine() {
  const REPS = [
    { id: 'r-1', texte: 'Bonjour, écrivez à client.piege@menuiserie-essai.invalid ou voyez https://piege-essai.invalid/lien, tél 0611111111', source: 'courriel' },
    { id: 'r-2', texte: 'Quel est le prix ? TEXTE-PIEGE-USINE', source: 'courriel' },
    { id: 'r-stop', texte: 'STOP', source: 'courriel' },
  ]
  const CLASSES = ['oui', 'non', 'stop', 'question', 'prix', 'appel', 'pas_maintenant', 'rgpd', 'rgpd_acces', 'rgpd_effacement', 'rgpd_autre', 'entrant', 'hors_fil', 'auto', 'ignoree']
  const valider = (brut, r) => {
    let j
    try { j = JSON.parse(brut) } catch { return { classe: 'a_lire', certitude: 0, extrait: '' } }
    if (!CLASSES.includes(j?.classe) || !(Number(j?.certitude) >= 0.7)) return { classe: 'a_lire', certitude: Number(j?.certitude) || 0, extrait: '' }
    return { classe: j.classe, certitude: Number(j.certitude), extrait: typeof j.extrait === 'string' && String(r?.texte ?? '').includes(j.extrait) ? j.extrait : '' }
  }
  const scen = ({ drapeau = true, pause = false } = {}) => ({
    comportements: {
      actif: (n) => (n === 'busAgents' ? drapeau : false),
      authAgent: (req) => { const h = req?.headers?.get?.('authorization'); if (h === 'Bearer bon') return { nom: 'standardiste', capacites: [], typesCrees: [], tablesEcrites: [], debitMinute: 30 }; if (h === 'Bearer autre') return { nom: 'facteur', capacites: [], typesCrees: [], tablesEcrites: [], debitMinute: 30 }; return { status: 401, code: 'jeton_absent', error: 'jeton absent' } },
      pauseGenerale: PAUSE(pause), enPause: () => false,
      reponsesATraiter: () => REPS.map((x) => ({ ...x })),
      classerEnCode: (r) => (r?.id === 'r-stop' ? { classe: 'stop', certitude: 1, classe_par: 'code' } : null),
      preparerDonnees: (r) => ({ sentinelle: `DONNEES-${r?.id}` }),
      validerClassement: valider, appliquerClasse: () => undefined,
    },
    valeurs: { CONSIGNES: 'CONSIGNES-TEMOIN', FAQ: [] },
  })
  const u = (rel) => `http://127.0.0.1/${rel.replace(/^app\//, '').replace(/\/route\.ts$/, '')}`
  const get = (c, o, auth = 'bon') => banc(path.join(c.racine, USINE.travail), { url: u(USINE.travail), entetes: auth ? { authorization: `Bearer ${auth}` } : {}, env: envBanc, ...scen(o) })
  const post = (c, o, corps, auth = 'bon') => banc(path.join(c.racine, USINE.classement), { methode: 'POST', url: u(USINE.classement), entetes: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, corps, env: envBanc, ...scen(o) })
  const absent = (c) => [!c.src.travail && `${USINE.travail} absent`, !c.src.classement && `${USINE.classement} absent`].filter(Boolean)
  return {
    'RB-14': async (c) => {
      if (absent(c).length) return [absent(c), '']
      const e = []
      for (const [nom, f] of [['travail', (o, a) => get(c, o, a)], ['classement', (o, a) => post(c, o, { reponse_id: 'r-1', brut: '{}' }, a)]]) {
        const x = await f({ drapeau: false })
        if (x.statut !== 404 || appelsDe(x, 'authAgent').length) e.push(`${nom} drapeau baissé : ${x.statut}${appelsDe(x, 'authAgent').length ? ', authAgent appelée' : ''} (404 avant toute identité attendu)`)
        const n = await f({}, null)
        if (n.statut !== 401) e.push(`${nom} sans jeton : ${n.statut}, 401 attendu`)
        const a = await f({}, 'autre')
        if (a.statut !== 403) e.push(`${nom} jeton d'un autre agent : ${a.statut}, 403 attendu`)
        const p = await f({ pause: true })
        if (nom === 'travail' && (p.statut !== 200 || jsonSur(p.json) !== '{"reponses":[]}')) e.push(`travail en pause : ${p.statut} ${court(p.texte, 40)}, { reponses: [] } attendu`)
        if (nom === 'classement' && (p.statut !== 423 || appelsDe(p, 'appliquerClasse').length)) e.push(`classement en pause : ${p.statut}, 423 sans rien écrire attendu`)
        const ok = await f({})
        for (const [lib, x2] of [['en pause', p], ['authentifié', ok]]) if (!battementsDe(x2, 'standardiste').length) e.push(`${nom} ${lib} : aucun battement de standardiste`)
        e.push(...hors(ok).map((y) => `${nom} : ${y}`))
      }
      return [e, 'travail et classement au banc : drapeau busAgents baissé → 404 avant authAgent ; sans jeton 401 ; autre agent 403 ; pause → { reponses: [] } et 423 ; battement de standardiste à chaque appel authentifié']
    },
    'RB-15': async (c) => {
      if (absent(c).length) return [absent(c), '']
      const e = []
      const x = await get(c, {})
      e.push(...hors(x))
      const l = x.json?.reponses
      if (!Array.isArray(l)) e.push(`réponse ${court(x.texte, 60)} sans liste reponses`)
      else {
        if (l.map((r) => r.id).join() !== 'r-1,r-2') e.push(`ids rendus ${l.map((r) => r.id).join(', ')}, r-1 et r-2 attendus (r-stop classée en code)`)
        for (const r of l) {
          if (Object.keys(r).sort().join() !== 'donnees,id,systeme') e.push(`${r.id} porte ${Object.keys(r).join(', ')} (id, systeme, donnees seulement)`)
          if (jsonSur(r.donnees) !== jsonSur({ sentinelle: `DONNEES-${r.id}` })) e.push(`${r.id} : donnees ≠ preparerDonnees(…) de la doublure`)
        }
      }
      if (!appelsDe(x, 'appliquerClasse').some((y) => y.args[1]?.id === 'r-stop')) e.push('la réponse classée en code (r-stop) n\'est pas appliquée aussitôt')
      for (const p of ['client.piege@', 'piege-essai.invalid', '0611111111', 'TEXTE-PIEGE-USINE']) if (x.texte.includes(p)) e.push(`la réponse porte ${p.includes('@') ? 'une adresse' : /^\d/.test(p) ? 'un numéro' : p.includes('.') ? 'un lien' : 'un texte'}`)
      return [e, 'GET travail : id, systeme et donnees seulement, donnees = preparerDonnees(…) ; ce qui se classe en code est appliqué aussitôt ; ni adresse, ni lien, ni numéro']
    },
    'RB-16': async (c) => {
      if (absent(c).length) return [absent(c), '']
      const e = []
      const brut = '{"classe":"oui","certitude":0.9,"extrait":"Bonjour"}'
      const a = await post(c, {}, { reponse_id: 'r-1', brut })
      e.push(...hors(a))
      const v = appelsDe(a, 'validerClassement')[0], ap = appelsDe(a, 'appliquerClasse')[0]
      if (a.statut !== 200 || !v || !ap || v.n > ap.n || v.args[0] !== brut || ap.args[2]?.classe !== 'oui') e.push(`brut valide : ${a.statut}, validerClassement puis appliquerClasse(classe oui) attendus`)
      for (const [lib, b] of [['non JSON', 'pas du json'], ['classe inconnue', '{"classe":"zzz","certitude":0.9}'], ['certitude 0,5', '{"classe":"oui","certitude":0.5}']]) {
        const x = await post(c, {}, { reponse_id: 'r-2', brut: b })
        if (appelsDe(x, 'appliquerClasse')[0]?.args[2]?.classe !== 'a_lire') e.push(`brut ${lib} : appliquerClasse ne reçoit pas a_lire`)
      }
      const x = await post(c, {}, { reponse_id: 'r-2', brut: '{"classe":"prix","certitude":0.9,"extrait":"absent du texte"}' })
      if (appelsDe(x, 'appliquerClasse')[0]?.args[2]?.extrait !== '') e.push('extrait absent du texte : non vidé')
      const d = await post(c, {}, { reponse_id: 'r-deja', brut })
      if (d.statut !== 409 || appelsDe(d, 'appliquerClasse').length) e.push(`réponse déjà classée : ${d.statut}${appelsDe(d, 'appliquerClasse').length ? ', appliquerClasse appelée' : ''} (409 sans rien écrire attendu)`)
      const m = await post(c, {}, { brut })
      if (m.statut !== 400) e.push(`corps mal formé : ${m.statut}, 400 attendu`)
      if (importsDe(c.src.classement.nu).some((i) => /(^|\/)lib\/agents\/llm(\.ts)?$/.test(i.spec ?? ''))) e.push('la route de classement importe @/lib/agents/llm')
      return [e, 'POST classement : validerClassement puis appliquerClasse ; non JSON, classe inconnue, certitude 0,5 → a_lire ; extrait absent vidé ; déjà classée 409 ; mal formé 400 ; aucun import de llm']
    },
  }
}

/** `npm run typecheck` sur la racine. */
function typecheck(racine) {
  const tsc = path.join(racine, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!fs.existsSync(tsc)) return { ok: false, detail: 'typescript introuvable dans node_modules' }
  const info = exigerSousTravail(path.join(TRAVAIL, NOM, 'tsbuildinfo'))
  fs.mkdirSync(info, { recursive: true })
  const t0 = Date.now()
  const x = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '--incremental', '--tsBuildInfoFile', path.join(info, 'routes.tsbuildinfo')], { cwd: racine, encoding: 'utf8', timeout: 15 * 60_000, windowsHide: true, maxBuffer: 64 << 20 })
  if (x.status === 0) return { ok: true, detail: `npm run typecheck vert (${Math.round((Date.now() - t0) / 1000)} s)` }
  return { ok: false, detail: `npm run typecheck en code ${x.status} : ${court((x.stdout || '').split(/\r?\n/).filter((l) => /error TS/.test(l)).slice(0, 2).join(' | ') || x.stderr, 240)}` }
}

/** Juge un lot : Map(id → { echecs, ok }) ; `seul` : ne juger que ce critère (sabotages). */
async function juger(racine, lot, { temoin, seul = null } = {}) {
  const c = contexte(racine, lot, temoin)
  const res = new Map()
  const ids = TOUS(lot)
  const manquent = [...LOTS[lot].routes.map(([r]) => ROUTE(r)).filter((f) => !existe(racine, f))]
  if (manquent.length) {
    res.set(ids[0], { echecs: [`absente(s) : ${manquent.join(', ')}`], ok: '' })
    for (const id of ids.slice(1)) res.set(id, { echecs: ['non jugé : route(s) du lot absente(s)'], ok: '' })
    return { res, c }
  }
  for (const id of ids) {
    if (seul && id !== seul) continue
    try { const [e, ok] = await CRITERES[lot][id](c); res.set(id, { echecs: [...new Set(e.filter(Boolean))], ok }) } catch (err) { res.set(id, { echecs: [`le juge n'a pas pu juger : ${premiereLigne(err)}`], ok: '' }) }
  }
  return { res, c }
}
const ligneDe = (id, r) => (r.echecs.length ? `❌ ${id} ${r.echecs.slice(0, 6).join(' ; ')}${r.echecs.length > 6 ? ` ; … (${r.echecs.length} défauts)` : ''}` : `✅ ${id} ${r.ok || 'conforme'}`).replace(/\s*\n\s*/g, ' · ')

// ── Le témoin et ses sabotages ────────────────────────────────────────────────────────────────────────────────────────────
const AUTO = exigerSousTravail(path.join(TRAVAIL, NOM, 'auto'))
function materialiser(dest, sabotages = []) {
  fs.rmSync(dest, { recursive: true, force: true })
  const copier = (s, d) => { for (const e of fs.readdirSync(s, { withFileTypes: true })) { const a = path.join(s, e.name), b = path.join(d, e.name); if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copier(a, b) } else { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.writeFileSync(b, fs.readFileSync(a, 'utf8').replaceAll('{{BASE_PRESTI}}', `https://${HOTE}`).replaceAll('{{HOTE_PRESTI}}', HOTE).replaceAll('{{HOTE_IMAP}}', HOTE_IMAP)) } } }
  copier(TEMOIN, dest)
  for (const s of sabotages) {
    const f = path.join(dest, s.fichier)
    if (s.creer !== undefined) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s.creer); continue }
    const avant = fs.readFileSync(f, 'utf8'), apres = s.remplacer(avant)
    if (apres === avant) throw new Error(`rien à remplacer dans ${s.fichier}`)
    fs.writeFileSync(f, apres)
  }
}
const RV = ROUTE('vigie-meta'), RR = ROUTE('recenseur'), RJ = ROUTE('juge-faits'), RD = ROUTE('redacteur'), RS = ROUTE('standardiste')
const rempl = (fichier, a, b) => ({ fichier, remplacer: (t) => t.replace(a, b) })
const SABOTAGES = {
  recensement: [
    ['AC-RA-1', 'RA-1', 'maxDuration de 300', rempl(RV, 'export const maxDuration = 60', 'export const maxDuration = 300')],
    ['AC-RA-2A', 'RA-2', 'le contrôle du jeton vient après un await', rempl(RR, "  const secret = process.env.CRON_SECRET\n", "  const p0 = await pauseGenerale()\n  const secret = process.env.CRON_SECRET\n")],
    ['AC-RA-2B', 'RA-2', 'la variable de pause abandonnée', rempl(RJ, 'if (p.active)', `if (p.active || process.env.${PAUSE_ABANDONNEE} === '1')`)],
    ['AC-RA-2C', 'RA-2', 'le magasin avant pauseGenerale()', rempl(RV, "  const p = await pauseGenerale()\n  if (p.active) return NextResponse.json({ pause: true, source: p.source })\n  if (await magasinSupabase.enPause(AGENT)) return NextResponse.json({ pause: true })", "  if (await magasinSupabase.enPause(AGENT)) return NextResponse.json({ pause: true })\n  const p = await pauseGenerale()\n  if (p.active) return NextResponse.json({ pause: true, source: p.source })")],
    ['AC-RA-3', 'RA-3', 'la vigie servie sans jeton', rempl(RV, 'if (!secret || auth !== `Bearer ${secret}`)', 'if (false && (!secret || auth !== `Bearer ${secret}`))')],
    ['AC-RA-4A', 'RA-4', 'la variable du jeton dans l\'environnement', rempl(RV, 'const jeton = await lireJeton()', `const jeton = process.env.${REFUS.jetonVariable} ?? await lireJeton()`)],
    ['AC-RA-4B', 'RA-4', 'la passe marque oubliée', rempl(RV, "const marque = await executerVigie({ jeton, cible: 'marque', magasin: magasinSupabase, recuperer: recuperateurReseau, horloge, echeance, budget })", "const marque = { etat: 'ok', candidats: 0 }")],
    ['AC-RA-4C', 'RA-4', 'le jeton passé à console.log', rempl(RV, '    const jeton = await lireJeton()\n', '    const jeton = await lireJeton()\n    console.log(\'[vigie]\', jeton)\n')],
    ['AC-RA-5', 'RA-5', 'le passage mal nommé', rempl(RJ, "enregistrerPassage('acq-juge-faits', { verifies", "enregistrerPassage('juge-faits', { verifies")],
    ['AC-RA-6A', 'RA-6', 'candidats-ajouter affiche une valeur', rempl(SCRIPTS.candidats, '  vus.add(cle); valides++', '  vus.add(cle); valides++; console.log(cle)')],
    ['AC-RA-6B', 'RA-6', 'opposition-importer accepte un fichier du dépôt', rempl(SCRIPTS.opposition, "if (depot && (abs", "if (false && depot && (abs")],
    ['AC-RA-8A', 'RA-8', 'le battement avant le passage', rempl(RJ, "    await enregistrerPassage('acq-juge-faits', { verifies: bilan?.verifies ?? 0, rejetes: bilan?.rejetes ?? 0 }, true)\n    const b = await battement('juge_faits')", "    const b = await battement('juge_faits')\n    await enregistrerPassage('acq-juge-faits', { verifies: bilan?.verifies ?? 0, rejetes: bilan?.rejetes ?? 0 }, true)")],
    ['AC-RA-8B', 'RA-8', 'un battement dans le catch', rempl(RR, "    await enregistrerPassage(passe === 'rge' ? 'acq-rge' : 'acq-recenseur', { erreur", "    await battement('recenseur')\n    await enregistrerPassage(passe === 'rge' ? 'acq-rge' : 'acq-recenseur', { erreur")],
    ['AC-RA-9A', 'RA-9', 'jeton invalide compté réussi', rempl(RV, "await enregistrerPassage('acq-vigie-meta', { etat: bloquant }, false)", "await enregistrerPassage('acq-vigie-meta', { etat: bloquant }, true)")],
    ['AC-RA-9B', 'RA-9', 'la clé d\'alerte sans le jour', rempl(RV, 'cle: `jeton_externe:meta:${jourParis()}`', "cle: 'jeton_externe:meta'")],
    ['AC-RA-9C', 'RA-9', 'l\'alerte renvoie à meta-echeance', rempl(RV, "corps: 'Générer un nouveau jeton Meta, le coller dans presti-secrets/meta-bibliotheque-pubs.txt", "corps: 'Lancer scripts/agents/meta-echeance.mjs")],
    ['AC-RA-10A', 'RA-10', 'jeton-meta-poser dit la longueur du jeton', rempl(SCRIPTS.jeton, "console.log('jeton présent (--sec", "console.log(`jeton de ${jeton.length} signes`); console.log('jeton présent (--sec")],
    ['AC-RA-10B', 'RA-10', 'jeton-meta-poser interroge Meta en --sec', rempl(SCRIPTS.jeton, "if (sec) { console.log('jeton présent", "if (sec) { await fetch('https://graph.facebook.com/debug_token').catch(() => null); console.log('jeton présent")],
    ['AC-RA-11A', 'RA-11', 'le curseur rge jamais reposé', rempl(RR, "      await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'rge', p_valeur: r.fini ? '' : (r.curseur_suivant ?? '') })\n", '')],
    ['AC-RA-11B', 'RA-11', 'importerRge limité à 500', rempl(RR, 'limite: 1000', 'limite: 500')],
    ['AC-RA-12A', 'RA-12', 'debug_token relu à chaque passage', rempl(RV, '    if (deja.ok && Array.isArray(deja.data) && deja.data.length) return\n', '')],
    ['AC-RA-12B', 'RA-12', 'un jeton sans expiration reçoit une date', rempl(RV, 'p_expire_le: exp > 0 ? new Date(exp * 1000).toISOString() : null', 'p_expire_le: new Date(Math.max(exp, 1) * 1000).toISOString()')],
  ],
  echanges: [
    ['AC-RB-1A', 'RB-1', 'redacteur sans dynamic', rempl(RD, "export const dynamic = 'force-dynamic'\n", '')],
    ['AC-RB-1B', 'RB-1', 'une route de webhook de l\'ancien porteur', { fichier: REFUS.routeWebhook, creer: 'export async function POST() { return new Response(null) }\n' }],
    ['AC-RB-2', 'RB-2', 'la pause lue avant la relève', rempl(RS, '  const releve = { etat: \'ok\', messages: 0, stop: 0 }\n', "  const releve = { etat: 'ok', messages: 0, stop: 0 }\n  const p0 = await pauseGenerale()\n  if (p0.active) return NextResponse.json({ pause: true })\n")],
    ['AC-RB-3', 'RB-3', 'redacteur accepte un mauvais jeton', rempl(RD, 'if (!secret || auth !== `Bearer ${secret}`)', 'if (!secret || !auth)')],
    ['AC-RB-4', 'RB-4', 'la route de classement importe llm', rempl(USINE.classement, "import { NextResponse } from 'next/server'\n", "import { NextResponse } from 'next/server'\nimport { creerLecteur } from '@/lib/agents/llm'\nvoid creerLecteur\n")],
    ['AC-RB-5', 'RB-5', 'le texte d\'un message dans console.log', rempl(RS, '          releve.messages++\n', '          releve.messages++\n          console.log(\'[standard]\', m.texte)\n')],
    ['AC-RB-6', 'RB-6', 'une route cite lot-du-jour', rempl(RD, '// TÉMOIN', '// voir scripts/agents/lot-du-jour.mjs — TÉMOIN')],
    ['AC-RB-8', 'RB-8', 'redacteur bat en pause', rempl(RD, "  if (p.active) return NextResponse.json({ pause: true, source: p.source })", "  if (p.active) { await battement('redacteur'); return NextResponse.json({ pause: true, source: p.source }) }")],
    ['AC-RB-9A', 'RB-9', 'le curseur non reposé sans message', rempl(RS, "        await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'gmail', p_valeur: String(r.curseur_suivant ?? '') })", "        if (r.messages.length) await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'gmail', p_valeur: String(r.curseur_suivant ?? '') })")],
    ['AC-RB-9B', 'RB-9', 'aucun signal sur un refus du Gmail', rempl(RS, "        if (r.erreur === 'auth') await magasinSupabase.signal({ type: 'gmail_refus' })\n", '')],
    ['AC-RB-10A', 'RB-10', 'l\'opposition après le classement', { fichier: RS, remplacer: (t) => t.replace('  const releve = { etat', '  const differes: Record<string, string>[] = []\n  const releve = { etat').replace("            await magasinSupabase.opposer(cles, 'stop', 'courriel')\n", '            differes.push(cles)\n').replace("    await enregistrerPassage('acq-standardiste', { releve_etat", "    for (const x of differes) await magasinSupabase.opposer(x, 'stop', 'courriel')\n    await enregistrerPassage('acq-standardiste', { releve_etat") }],
    ['AC-RB-10B', 'RB-10', 'le domaine d\'une messagerie gratuite opposé', rempl(RS, 'if (domaine && !MESSAGERIES_GRATUITES.includes(domaine)) cles.domaine = domaine', 'if (domaine) cles.domaine = domaine')],
    ['AC-RB-11', 'RB-11', 'la relève sur l\'adresse de la boîte', rempl(RS, 'const r = await releverGmail({ imap, adresse, curseur: curseur ?? null })', 'const r = await releverGmail({ imap, adresse: user, curseur: curseur ?? null })')],
    ['AC-RB-12', 'RB-12', 'l\'adresse dans le passage', rempl(RS, "{ releve_etat: releve.etat, releve_messages", "{ adresse: process.env.ACQ_ADRESSE_REPONSE, releve_etat: releve.etat, releve_messages")],
    ['AC-RB-13', 'RB-13', 'le classement sans attendre l\'usine', rempl(RS, 'lecteur: null, attendreUsine: true', 'lecteur: null, attendreUsine: false')],
    ['AC-RB-14', 'RB-14', 'le drapeau busAgents ignoré', rempl(USINE.travail, "  if (!actif('busAgents')) return NextResponse.json({ error: 'introuvable' }, { status: 404 })\n", '')],
    ['AC-RB-15', 'RB-15', 'le texte rendu à l\'usine', rempl(USINE.travail, 'out.push({ id: r.id, systeme: CONSIGNES, donnees: preparerDonnees(r, FAQ, METIERS) })', 'out.push({ id: r.id, systeme: CONSIGNES, donnees: preparerDonnees(r, FAQ, METIERS), texte: r.texte })')],
    ['AC-RB-16', 'RB-16', 'le brut appliqué sans validation', rempl(USINE.classement, '  const classement = validerClassement(corps.brut, reponse)\n', '  const classement = JSON.parse(corps.brut)\n')],
    ['AC-RB-17', 'RB-17', 'les passes écrivent le jeton', rempl(SCRIPTS.passes, "const journal = (o) => console.log(JSON.stringify({ agent, ...o }))", "const journal = (o) => console.log(JSON.stringify({ agent, jeton: process.env.PRESTI_JETON_STANDARDISTE, ...o }))")],
    // D-0410-3 : le rejugement du soir se fait sur le modèle étalonné ; RB-17 doit rougir si la passe du soir ne part pas, part sur un
    // autre modèle, ne rend rien, ou si le lanceur n'est pas rappelé.
    ['AC-RB-17B', 'RB-17', 'le rejugement du soir sur gpt-6-sol', rempl(SCRIPTS.passes, "const modele = 'gpt-6-luna'", "const modele = soir ? 'gpt-6-sol' : 'gpt-6-luna'")],
    ['AC-RB-17C', 'RB-17', 'la passe du soir sans ?passe=soir', rempl(SCRIPTS.passes, "${soir ? '?passe=soir' : ''}", '')],
    ['AC-RB-17D', 'RB-17', 'la passe du soir ne rend aucun avis', rempl(SCRIPTS.passes, 'for (const e of (t?.envois ?? []).slice(0, 20)) {', 'for (const e of (soir ? [] : (t?.envois ?? [])).slice(0, 20)) {')],
    ['AC-RB-17E', 'RB-17', 'l\'avis du soir sans passe: soir', rempl(SCRIPTS.passes, "...(soir ? { passe: 'soir' } : {})", '')],
    ['AC-RB-17F', 'RB-17', 'un avis de ton illisible rendu à Vercel', rempl(SCRIPTS.passes, "if (!j2 || (j2.verdict !== 'ok' && j2.verdict !== 'refus') || !Array.isArray(j2.raisons)) continue", "if (!j2) continue")],
    ['AC-RB-18', 'RB-18', 'MemoryMax de 1G', rempl('scripts/usine/systemd/presti-facteur.service', 'MemoryMax=512M', 'MemoryMax=1G')],
  ],
}
async function autoControle(lots) {
  const l = []
  const noter = (id, ok, d) => l.push(`${ok ? '✅' : '❌'} ${id} ${d}`.replace(/\s*\n\s*/g, ' · '))
  for (const lot of lots) {
    const dest = path.join(AUTO, lot, 'temoin')
    try {
      materialiser(dest)
      const { res } = await juger(dest, lot, { temoin: true })
      const rouges = [...res].filter(([, r]) => r.echecs.length)
      noter(`AC-TEMOIN-${lot.toUpperCase()}`, !rouges.length, rouges.length ? `le témoin est rouge : ${rouges.map(([id, r]) => court(ligneDe(id, r), 220)).join(' | ')}` : `le témoin (${path.relative(R, TEMOIN).split(path.sep).join('/')}) rend ${res.size} critère(s) vert(s) : ${[...res.keys()].join(', ')}`)
    } catch (e) { noter(`AC-TEMOIN-${lot.toUpperCase()}`, false, `témoin non jugé : ${premiereLigne(e)}`) }
    for (const [id, critere, lib, ...sab] of SABOTAGES[lot]) {
      const d = path.join(AUTO, lot, id)
      try {
        materialiser(d, sab)
        const { res } = await juger(d, lot, { temoin: true, seul: critere })
        const r = res.get(critere)
        noter(id, r && r.echecs.length > 0, r && r.echecs.length ? `sabotage « ${lib} » → ${court(ligneDe(critere, r), 200)}` : `sabotage « ${lib} » NON repéré : ${r ? court(ligneDe(critere, r), 120) : `${critere} non jugé`}`)
      } catch (e) { noter(id, false, `sabotage « ${lib} » non joué : ${premiereLigne(e)}`) }
      fs.rmSync(d, { recursive: true, force: true })
    }
  }
  return l
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptions(process.argv.slice(2), { connues: ['lot', 'partie'] })
const refuser = (m) => { console.log(`${NOM} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const LOT = o.valeurs.lot
if (LOT !== undefined && !LOTS[LOT]) refuser(`--lot=recensement|echanges attendu (reçu : ${LOT})`)
if (o.autoControle) {
  console.log(`${NOM} --auto-controle — témoin et sabotages ${LOT ?? 'des deux lots'}`)
  const l = await autoControle(LOT ? [LOT] : ['recensement', 'echanges'])
  for (const x of l) console.log(x)
  const rouges = l.filter((x) => x.startsWith('❌')).map((x) => x.split(' ')[1])
  console.log(rouges.length ? `${NOM} --auto-controle : FAIL — ${rouges.join(', ')}` : `${NOM} --auto-controle : PASS (${l.length} épreuves)`)
  process.exitCode = rouges.length ? 1 : 0
} else {
  if (!LOT) refuser('--lot=recensement|echanges attendu')
  const racine = o.racine
  if (!fs.existsSync(racine)) refuser(`racine introuvable : ${racine}`)
  const temoin = path.resolve(racine) !== path.resolve(R)
  if (o.valeurs.partie !== undefined) {
    if (o.valeurs.partie !== 'passes' || LOT !== 'echanges') refuser('--partie=passes ne va qu\'avec --lot=echanges')
    const e = await jugerPasses(racine, false)
    console.log(ligneDe('RB-17', { echecs: e, ok: `sur ${os.hostname()} (${process.platform}) : passes-modele.mjs contre un faux Presti et le faux lanceur, tous les cas du cahier` }))
    process.exitCode = e.length ? 1 : 0
  } else {
    console.log(`${NOM} --lot=${LOT} — racine ${path.relative(R, racine).split(path.sep).join('/') || '.'}`)
    const { res, c } = await juger(racine, LOT, { temoin })
    for (const [id, r] of res) console.log(ligneDe(id, r))
    const rouges = [...res].filter(([, r]) => r.echecs.length).map(([id]) => id)
    if (c.prealable) { console.log(`${NOM} --lot=${LOT} : préalable manquant — ${c.prealable}`); process.exitCode = 2 }
    else { console.log(rouges.length ? `${NOM} --lot=${LOT} : FAIL — ${rouges.join(', ')}` : `${NOM} --lot=${LOT} : PASS`); process.exitCode = rouges.length ? 1 : 0 }
  }
}
