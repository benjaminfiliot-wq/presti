#!/usr/bin/env node
// scripts/tic-qa.mjs — le juge de la fiche 026-049 (app/api/agents/tic/route.ts, le tic que pg_cron appelle chaque minute), écrit
// par Claude Code en 026-045. La vraie route est importée dans un processus à part (la sonde du lot 03), sans réseau ni secret,
// avec l'horloge simulée (scripts/lib/horloge-simulee.mjs) et des doublures qui comptent leurs appels sur une seule ligne de
// temps (veilleur/doublures/) : lib/agents/bus, lib/agents/fileArgent, lib/agents/veilleur, lib/agents/pause, lib/alertes,
// lib/limites ; lib/flags est la doublure du lot 03 (le drapeau busAgents baissé ou levé par le juge).
//
//   TC-1  le fichier existe ; il exporte GET et aucune autre méthode, runtime = 'nodejs', dynamic = 'force-dynamic',
//         maxDuration = 60.
//   TC-2  drapeau baissé → 404 ; drapeau levé et CRON_SECRET absent → 401 ; mauvais jeton → 401 ; jeton sans « Bearer » →
//         401 ; zéro appel aux doublures dans les quatre cas.
//   TC-3  10 h 05 (simulée) : ops_baux_expirer, balayerCommandesPayees, traiterFileArgent (budgetMs ≤ 12 000), veilleur, puis
//         enregistrerPassage('tic', …, true) en dernier ; 10 h 06 : pas de veilleur, enregistrerPassage toujours le dernier.
//   TC-4  balayerCommandesPayees lève → traiterFileArgent et le veilleur appelés quand même, enregistrerPassage reçoit
//         reussi = false, réponse 500 avec l'étape en echec, sans le texte de l'erreur.
//   TC-5  traiterFileArgent dure 20 s (simulées) → veilleur « saute » pour le budget, durée totale ≤ 26 s, passage noté.
//   TC-6  10 h 05 puis 10 h 05 m 30 s → le veilleur une seule fois, par consommerLimite('a0:creneau:<AAAAMMJJHHmm>', 1, 300).
//   TC-7  pause générale active → les étapes tournent, le détail du passage porte pause: true.
//   TC-8  la réponse ne contient ni @, ni uuid, ni « ops. », même quand les modules rendent ou lèvent de tels textes.
//   TC-9  le diff de scripts/fermeture-e2e.mjs avec HEAD se limite au chemin du tic ajouté dans la ligne busAgents (026-042 ;
//         tant qu'elle n'est pas à HEAD, la ligne que 026-042 y pose est la base) ; la route contient actif('busAgents').
//   TC-10 npm run typecheck en code 0, la route parmi les fichiers vérifiés (en --temoin : la lecture du typecheck éprouvée).
//   TC-11 (--reel, après déploiement, drapeau levé) https://prestiapp.fr/api/agents/tic : sans en-tête → 401 ; avec CRON_SECRET
//         (lu dans .env.local sans affichage) → 200 et etapes ; passages_cron.tic mis à jour dans la minute.
//
// Usage : node scripts/tic-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
// Sortie : une ligne par critère, puis « tic-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert, 1 sinon, 2 si un
// préalable manque.
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as S from './fixtures/026-horloge-bus/veilleur/socle-lot04.mjs'
import { fermetureDerive } from './agents-routes-qa.mjs'
import { RACCOURCI_DIT } from './lib/horloge-simulee.mjs'

const { C, res, court } = S
const JUGE = 'tic-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['TC-1', 'TC-2', 'TC-3', 'TC-4', 'TC-5', 'TC-6', 'TC-7', 'TC-8', 'TC-9', 'TC-10', 'TC-11']
const TIC = 'app/api/agents/tic/route.ts'
const FERMETURE = 'scripts/fermeture-e2e.mjs'
const A_10H05 = '2026-10-20T08:05:00Z' // 10 h 05 à Paris (heure d'été)
const METHODES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const nonJuge = (racine) => (C.existe(racine, TIC) ? null : res([`non jugé : ${TIC} absent (TC-1)`]))
const sonde = (nom, racine, figer = A_10H05) => S.sonde({ juge: JUGE, fichier: FICHIER, nom, racine, figer, doublures03: ['lib/flags'] })

// ── Côté sonde ─────────────────────────────────────────────────────────────────────────────────────────────────────
const NOMS = { 'bus.ops_baux_expirer': 'baux', 'fileArgent.balayerCommandesPayees': 'balayage', 'fileArgent.traiterFileArgent': 'argent', 'veilleur.veilleur': 'veilleur', 'alertes.enregistrerPassage': 'passage' }
async function monter(ctx, config = {}) {
  const J = S.journal(config)
  const J26 = (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [] })
  J26.drapeaux = { busAgents: true }
  const reseau = S.tenirReseau()
  S.doubler(ctx.racine, { 'lib/agents/bus': 'bus.mjs', 'lib/agents/fileArgent': 'file-argent.mjs', 'lib/agents/veilleur': 'veilleur.mjs', 'lib/agents/pause': 'pause.mjs', 'lib/alertes': 'alertes.mjs', 'lib/limites': 'limites.mjs', 'lib/email': 'email.mjs' })
  const { NextRequest } = await import('next/server')
  const secret = `cron-essai-${crypto.randomBytes(12).toString('hex')}`
  let n = 0
  /** Une instance neuve de la route (le secret est relu, même s'il était lu au chargement). */
  const charger = () => import(`${pathToFileURL(path.join(ctx.racine, TIC)).href}?cas=${++n}`)
  /** Un appel : { status, json, texte, appels (doublures et SQL, dans l'ordre), suite (noms courts), duree }. */
  const appeler = async ({ entete = `Bearer ${secret}`, avecSecret = true, drapeau = true } = {}) => {
    if (avecSecret) process.env.CRON_SECRET = secret; else delete process.env.CRON_SECRET
    J26.drapeaux = drapeau ? { busAgents: true } : {}
    const mod = await charger()
    const a0 = J.appels.length, f0 = ctx.fp.appels.length
    const t0 = Date.now()
    const h = {}
    if (entete !== null) h.authorization = entete
    const rep = await mod.GET(new NextRequest('https://prestiapp.fr/api/agents/tic', { headers: h }))
    const duree = Date.now() - t0
    const l = await ctx.lireReponse(rep)
    const sql = ctx.fp.appels.slice(f0).map((a) => ({ rang: a.rang, quoi: `sql.${a.fonction ?? a.table}`, args: a.params }))
    const appels = [...J.appels.slice(a0), ...sql].sort((a, b) => a.rang - b.rang)
    const suite = appels.map((a) => NOMS[a.quoi] ?? (a.quoi === 'sql.ops_baux_expirer' ? 'baux' : null)).filter(Boolean)
    return { ...l, duree, appels, suite, mod }
  }
  return { J, J26, reseau, secret, appeler }
}
/** Les étapes d'une réponse, quelle que soit leur forme (objet par nom, ou liste de { nom|etape, statut }). */
function etapesDe(json) {
  const e = json?.etapes
  if (Array.isArray(e)) return Object.fromEntries(e.map((x, i) => [String(x?.nom ?? x?.etape ?? x?.id ?? i), x ?? {}]))
  return e && typeof e === 'object' ? e : {}
}
const veilleurDe = (json) => { const e = etapesDe(json); const k = Object.keys(e).find((x) => /veill|a0/i.test(x)); return k ? e[k] : null }

export const SONDES = {
  async exports(ctx) {
    const m = await monter(ctx)
    const mod = await import(pathToFileURL(path.join(ctx.racine, TIC)).href)
    const e = []
    if (typeof mod.GET !== 'function') e.push('GET n\'est pas exportée')
    for (const x of METHODES.slice(1)) if (mod[x] !== undefined) e.push(`${x} exportée : GET seulement attendue`)
    if (mod.runtime !== 'nodejs') e.push(`runtime = ${JSON.stringify(mod.runtime)}, 'nodejs' attendu`)
    if (mod.dynamic !== 'force-dynamic') e.push(`dynamic = ${JSON.stringify(mod.dynamic)}, 'force-dynamic' attendu`)
    if (mod.maxDuration !== 60) e.push(`maxDuration = ${JSON.stringify(mod.maxDuration)}, 60 attendu`)
    m.reseau.rendre()
    return { echecs: e, resume: 'GET seule, runtime nodejs, dynamic force-dynamic, maxDuration 60' }
  },
  async portes(ctx) {
    const m = await monter(ctx)
    const e = []
    const cas = [
      ['drapeau baissé', { drapeau: false }, 404],
      ['CRON_SECRET absent', { avecSecret: false }, 401],
      ['mauvais jeton', { entete: 'Bearer faux-jeton-du-juge' }, 401],
      ['jeton sans « Bearer »', { entete: m.secret }, 401],
      ['sans en-tête', { entete: null }, 401],
    ]
    for (const [nom, o, att] of cas) {
      const x = await m.appeler(o)
      if (x.status !== att) e.push(`${nom} → ${x.status}, ${att} attendu`)
      if (x.appels.length) e.push(`${nom} : ${x.appels.length} appel(s) (${x.appels.map((a) => a.quoi).slice(0, 3).join(', ')}), zéro attendu`)
    }
    const bon = await m.appeler()
    if (bon.status !== 200) e.push(`le bon jeton → ${bon.status}, 200 attendu (les portes ne se jugent qu'avec une route qui répond)`)
    m.reseau.rendre()
    return { echecs: e, resume: 'drapeau baissé → 404 ; secret absent, mauvais jeton, jeton sans Bearer, sans en-tête → 401 ; zéro appel' }
  },
  async ordre(ctx) {
    const m = await monter(ctx)
    const e = []
    // 10 h 06 d'abord, créneau libre : un veilleur appelé hors des minutes multiples de 5 se voit même s'il prend la clé
    S.horloge().figer('2026-10-20T08:06:00Z')
    const y = await m.appeler()
    if (y.suite.includes('veilleur')) e.push('10 h 06 : le veilleur appelé hors créneau')
    if (y.appels.at(-1)?.quoi !== 'alertes.enregistrerPassage') e.push(`10 h 06 : le dernier appel est ${y.appels.at(-1)?.quoi ?? '(aucun)'}, enregistrerPassage attendu`)
    for (const k of ['baux', 'balayage', 'argent']) if (!y.suite.includes(k)) e.push(`10 h 06 : l'étape ${k} n'a pas tourné`)
    S.horloge().figer(A_10H05)
    m.J.limites = {}
    const x = await m.appeler()
    const att = ['baux', 'balayage', 'argent', 'veilleur', 'passage']
    if (JSON.stringify(x.suite) !== JSON.stringify(att)) e.push(`10 h 05 : ${x.suite.join(' → ') || '(aucun appel)'} ; ${att.join(' → ')} attendu`)
    const tr = x.appels.find((a) => a.quoi === 'fileArgent.traiterFileArgent')
    if (tr && !(Number(tr.args?.budgetMs) > 0 && Number(tr.args?.budgetMs) <= 12000)) e.push(`traiterFileArgent reçoit budgetMs = ${tr.args?.budgetMs}, ≤ 12 000 attendu`)
    const dernier = x.appels.at(-1)
    if (dernier?.quoi !== 'alertes.enregistrerPassage') e.push(`10 h 05 : le dernier appel est ${dernier?.quoi ?? '(aucun)'}, enregistrerPassage attendu`)
    else if (dernier.args?.nom !== 'tic' || dernier.args?.reussi !== true) e.push(`10 h 05 : enregistrerPassage(${JSON.stringify(dernier.args?.nom)}, …, ${dernier.args?.reussi}) ; ('tic', …, true) attendu`)
    if (x.status !== 200) e.push(`10 h 05 → ${x.status}, 200 attendu`)
    m.reseau.rendre()
    return { echecs: e, resume: `10 h 05 : ${x.suite.join(' → ')} (budgetMs ${tr?.args?.budgetMs}) ; 10 h 06 : ${y.suite.join(' → ')}` }
  },
  async isolement(ctx) {
    const texte = `panne-du-juge-${crypto.randomBytes(5).toString('hex')}`
    const m = await monter(ctx, { 'fileArgent.balayerCommandesPayees': { erreur: texte } })
    const e = []
    const x = await m.appeler()
    for (const k of ['argent', 'veilleur']) if (!x.suite.includes(k)) e.push(`balayage en panne : l'étape ${k} n'a pas été appelée`)
    const p = x.appels.filter((a) => a.quoi === 'alertes.enregistrerPassage')
    if (p.length !== 1) e.push(`enregistrerPassage appelée ${p.length} fois, 1 attendue`)
    else if (p[0].args?.reussi !== false) e.push(`enregistrerPassage reçoit reussi = ${p[0].args?.reussi}, false attendu`)
    if (x.status !== 500) e.push(`réponse ${x.status}, 500 attendu`)
    if (!Object.values(etapesDe(x.json)).some((v) => v?.statut === 'echec')) e.push('aucune étape en « echec » dans la réponse')
    if (x.texte.includes(texte)) e.push('le texte de l\'erreur levée est dans la réponse')
    m.reseau.rendre()
    return { echecs: e, resume: 'balayage en panne : la file et le veilleur appelés quand même, passage reussi=false, 500 avec l\'étape en echec, sans le texte de l\'erreur' }
  },
  async budget(ctx) {
    const m = await monter(ctx, { 'fileArgent.traiterFileArgent': { dureeMs: 20_000 } })
    const e = []
    const x = await m.appeler()
    const v = veilleurDe(x.json)
    if (x.suite.includes('veilleur')) e.push('le veilleur appelé alors que la file de l\'argent a pris 20 s sur 25')
    if (!v) e.push('aucune étape du veilleur dans la réponse')
    else if (v.statut !== 'saute' || !/budget/i.test(String(v.raison ?? ''))) e.push(`étape du veilleur ${JSON.stringify(v)} : « saute » pour le budget attendu`)
    if (x.duree > 26_000) e.push(`durée simulée ${x.duree} ms, 26 000 au plus`)
    if (!x.suite.includes('passage')) e.push('enregistrerPassage non appelée')
    m.reseau.rendre()
    return { echecs: e, resume: `file de 20 s : veilleur ${v ? `${v.statut} (${v.raison})` : '—'}, ${x.duree} ms simulées, passage noté` }
  },
  async creneau(ctx) {
    const m = await monter(ctx)
    const e = []
    const x = await m.appeler()
    S.horloge().figer('2026-10-20T08:05:30Z')
    const y = await m.appeler()
    const n = [...x.suite, ...y.suite].filter((s) => s === 'veilleur').length
    if (n !== 1) e.push(`10 h 05 puis 10 h 05 m 30 s : le veilleur appelé ${n} fois, 1 attendue`)
    const cles = [...x.appels, ...y.appels].filter((a) => a.quoi === 'limites.consommerLimite')
    if (cles.length < 1) e.push('consommerLimite jamais appelée')
    for (const c of cles) {
      const k = String(c.args?.cle ?? '')
      const mm = /^a0:creneau:(\d{12})$/.exec(k)
      if (!mm) e.push(`clé « ${court(k, 40)} » : a0:creneau:<AAAAMMJJHHmm> attendue`)
      else if (Number(mm[1].slice(-2)) % 5) e.push(`clé ${k} : minutes non arrondies à 5`)
      if (c.args?.max !== 1 || c.args?.fenetreSec !== 300) e.push(`consommerLimite(…, ${c.args?.max}, ${c.args?.fenetreSec}) ; (…, 1, 300) attendu`)
    }
    if (cles.length === 2 && cles[0].args?.cle !== cles[1].args?.cle) e.push('les deux passages du même créneau n\'ont pas la même clé')
    m.reseau.rendre()
    return { echecs: e, resume: `deux passages dans le créneau de 10 h 05 : veilleur ${n} fois, clé ${court(cles[0]?.args?.cle, 30)}` }
  },
  async pause(ctx) {
    const m = await monter(ctx, { pause: true })
    const e = []
    const x = await m.appeler()
    for (const k of ['baux', 'balayage', 'argent', 'veilleur']) if (!x.suite.includes(k)) e.push(`pause active : l'étape ${k} n'a pas tourné`)
    const p = x.appels.find((a) => a.quoi === 'alertes.enregistrerPassage')
    if (!p) e.push('enregistrerPassage non appelée')
    else if (p.args?.detail?.pause !== true) e.push(`le détail du passage porte pause = ${JSON.stringify(p.args?.detail?.pause)}, true attendu`)
    m.reseau.rendre()
    return { echecs: e, resume: 'pause active : baux, balayage, argent et veilleur tournent ; détail pause: true' }
  },
  async fuites(ctx) {
    const id = crypto.randomUUID()
    const sale = { lus: 1, faits: 1, echecs: 0, inconnus: 0, dureeMs: 3, detail: `contact@artisan-${id.slice(0, 5)}.invalid`, id, table: 'ops.taches' }
    const m = await monter(ctx, {
      'fileArgent.traiterFileArgent': { rend: sale },
      'fileArgent.balayerCommandesPayees': { rend: { vues: 1, envoyees: 1, commande: id } },
      'veilleur.veilleur': { rend: { attention: [{ motif: 'agent_muet', texte: `agent ${id} muet, écrire à benj@exemple.invalid` }], urgents: 0, digest: `ops.evenements ${id}`, notifications: 0 } },
    })
    const e = []
    const verifier = (x, quand) => {
      if (x.texte.includes('@')) e.push(`${quand} : la réponse contient « @ »`)
      if (S.RE_UUID.test(x.texte)) e.push(`${quand} : la réponse contient un uuid`)
      if (/ops\./.test(x.texte)) e.push(`${quand} : la réponse contient « ops. »`)
    }
    verifier(await m.appeler(), 'modules bavards')
    S.horloge().figer('2026-10-20T08:10:00Z')
    m.J.config['bus.ops_baux_expirer'] = { erreur: `violates foreign key ops.taches ${id} benj@exemple.invalid` }
    verifier(await m.appeler(), 'erreur bavarde')
    m.reseau.rendre()
    return { echecs: e, resume: 'modules qui rendent ou lèvent @, uuid et ops. : la réponse n\'en porte aucun' }
  },
}

// ── Côté juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
const parSonde = (nom) => async (racine) => { const n = nonJuge(racine); if (n) return n; return S.deSonde(await sonde(nom, racine)) }
async function jugerFichier(racine) {
  if (!C.existe(racine, TIC)) return res([`${TIC} absent`])
  const src = C.sansCommentairesTs(C.lire(racine, TIC))
  const e = []
  const exportees = [...src.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+([A-Z]+)\b/g)].map((m) => m[1]).filter((x) => METHODES.includes(x))
  if (/export\s*\{[^}]*\b(POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/.test(src)) exportees.push('export { … }')
  const autres = exportees.filter((x) => x !== 'GET')
  if (autres.length) e.push(`méthode(s) exportée(s) en plus de GET : ${autres.join(', ')}`)
  const x = await sonde('exports', racine)
  const r = S.deSonde(x)
  return res([...e, ...r.echecs], r.resume)
}
const CARTE = /^\s*['"]?busAgents['"]?\s*:\s*\[(.*)\]\s*,?\s*$/
const elements = (ligne) => (CARTE.exec(ligne)?.[1] ?? '').split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
function jugerFermeture(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  const h = C.aHead(FERMETURE)
  if (h === null) return res([`${FERMETURE} introuvable à HEAD`])
  const base = /'busAgents'/.test(h) ? h : fermetureDerive(h)
  const t = C.lire(racine, FERMETURE)
  if (t === null) return res([`${FERMETURE} absent de la racine`])
  const { ajoutes, retires } = C.diffLignes(base, t)
  const lb = base.split('\n').find((l) => CARTE.test(l))
  if (retires.length !== 1 || retires[0] !== lb || ajoutes.length !== 1 || !CARTE.test(ajoutes[0])) e.push(`${FERMETURE} : le diff (${retires.length} ligne(s) retirée(s), ${ajoutes.length} ajoutée(s)) ne se limite pas à la ligne busAgents${ajoutes[0] && !CARTE.test(ajoutes[0]) ? ` (« ${court(ajoutes[0], 50)} »)` : ''}`)
  else {
    const avant = elements(lb), apres = elements(ajoutes[0])
    const plus = apres.filter((x) => !avant.includes(x)), moins = avant.filter((x) => !apres.includes(x))
    if (moins.length || plus.length !== 1 || plus[0] !== TIC) e.push(`ligne busAgents : ${plus.length ? `ajouté ${plus.join(', ')}` : 'rien d\'ajouté'}${moins.length ? `, retiré ${moins.join(', ')}` : ''} ; seul ${TIC} attendu`)
  }
  if (!/actif\(\s*['"]busAgents['"]\s*\)/.test(C.sansCommentairesTs(C.lire(racine, TIC)))) e.push(`${TIC} ne contient pas actif('busAgents')`)
  return res(e, `${FERMETURE} : seul ${TIC} ajouté à la ligne busAgents ; la route lit actif('busAgents')`)
}
async function jugerTypecheck(racine) {
  const n = nonJuge(racine)
  if (n) return n
  return C.typecheck(JUGE, racine, [TIC])
}
async function jugerReel(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const k = S.clesReelles()
  if (!k.cron || !k.url || !k.service) return res(['.env.local : CRON_SECRET, adresse ou clé de service absente (rien n\'est affiché)'])
  const e = []
  const url = 'https://prestiapp.fr/api/agents/tic'
  try {
    const a = await fetch(url, { signal: AbortSignal.timeout(40_000) })
    if (a.status !== 401) e.push(`sans en-tête → ${a.status}, 401 attendu`)
    const avant = Date.now()
    const b = await fetch(url, { headers: { authorization: `Bearer ${k.cron}` }, signal: AbortSignal.timeout(40_000) })
    let j = null
    try { j = await b.json() } catch { /* pas du JSON */ }
    if (b.status !== 200 || !j || typeof j.etapes !== 'object') e.push(`avec CRON_SECRET → ${b.status}${j?.etapes ? '' : ', sans etapes'} ; 200 et etapes attendus`)
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(k.url, k.service, { auth: { persistSession: false, autoRefreshToken: false } })
    const p = await sb.from('passages_cron').select('nom, dernier_passage, reussi').eq('nom', 'tic').maybeSingle()
    if (p.error || !p.data) e.push('passages_cron.tic illisible ou absent')
    else if (Date.parse(p.data.dernier_passage) < avant - 60_000) e.push(`passages_cron.tic date du ${p.data.dernier_passage}, pas de la dernière minute`)
  } catch (x) { e.push(`appel réel impossible : ${court(S.masquer(x.message, [k.cron, k.service]), 80)}`) }
  return res(e.map((t) => S.masquer(t, [k.cron, k.service])), 'sans en-tête 401 ; avec CRON_SECRET 200 et etapes ; passages_cron.tic de la dernière minute')
}

// ── Le témoin : la ligne busAgents que 026-042 pose (si HEAD ne l'a pas), avec le chemin du tic ─────────────────────
export function ticFermetureDerive(h) {
  const base = /'busAgents'/.test(h) ? h : fermetureDerive(h)
  return base.split('\n').map((l) => (CARTE.test(l) && !l.includes(TIC) ? l.replace(/\]\s*,?\s*$/, (fin) => `, '${TIC}'${fin}`) : l)).join('\n')
}
export const SABOTAGES = [
  { id: 'TC-1', nom: 'runtime edge', fichier: TIC, chercher: "export const runtime = 'nodejs'", remplacer: "export const runtime = 'edge'" },
  { id: 'TC-1', nom: 'POST exportée', fichier: TIC, chercher: 'export async function GET(req: Request) {', remplacer: 'export async function POST(req: Request) { return GET(req) }\nexport async function GET(req: Request) {' },
  { id: 'TC-1', nom: 'maxDuration 300', fichier: TIC, chercher: 'export const maxDuration = 60', remplacer: 'export const maxDuration = 300' },
  { id: 'TC-2', nom: 'drapeau non lu', fichier: TIC, chercher: "  if (!actif('busAgents')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", remplacer: '' },
  { id: 'TC-2', nom: 'jeton sans Bearer accepté', fichier: TIC, chercher: 'auth !== `Bearer ${secret}`', remplacer: '![`Bearer ${secret}`, secret].includes(auth ?? \'\')' },
  { id: 'TC-2', nom: 'ouvert sans secret', fichier: TIC, chercher: 'if (!secret || auth', remplacer: 'if (secret && auth' },
  { id: 'TC-3', nom: 'veilleur à chaque minute', fichier: TIC, chercher: 'getUTCMinutes() % 5 !== 0', remplacer: 'getUTCMinutes() % 1 !== 0' },
  { id: 'TC-3', nom: 'passage noté d\'abord', fichier: TIC, chercher: "  await etape('baux',", remplacer: "  await enregistrerPassage('tic', {}, true)\n  await etape('baux'," },
  { id: 'TC-3', nom: 'file sans borne de 12 s', fichier: TIC, chercher: 'budgetMs: Math.min(12_000, reste())', remplacer: 'budgetMs: reste()' },
  { id: 'TC-4', nom: 'échec non signalé', fichier: TIC, chercher: '      reussi = false\n', remplacer: '' },
  { id: 'TC-4', nom: 'une panne arrête tout', fichier: TIC, chercher: "  await etape('balayage', () => balayerCommandesPayees())", remplacer: "  await etape('balayage', () => balayerCommandesPayees())\n  if (!reussi) { await enregistrerPassage('tic', { etapes }, false); return NextResponse.json({ ok: false, etapes }, { status: 500 }) }" },
  { id: 'TC-4', nom: 'texte de l\'erreur rendu', fichier: TIC, chercher: "    } catch {\n      reussi = false\n      etapes[nom] = { statut: 'echec', dureeMs: Date.now() - t }", remplacer: "    } catch (err) {\n      reussi = false\n      etapes[nom] = { statut: 'echec', dureeMs: Date.now() - t, raison: String((err as Error).message) }" },
  { id: 'TC-5', nom: 'réserve du veilleur ignorée', fichier: TIC, chercher: 'else if (reste() < RESERVE_VEILLEUR_MS)', remplacer: 'else if (reste() < 0)' },
  { id: 'TC-5', nom: 'passage oublié après une longue file', fichier: TIC, chercher: '  let pause = false\n', remplacer: '  if (reste() < 6_000) return NextResponse.json({ ok: true, etapes })\n  let pause = false\n' },
  { id: 'TC-6', nom: 'créneau non verrouillé', fichier: TIC, chercher: 'libre = await consommerLimite(`a0:creneau:${creneau(maintenant)}`, 1, 300)', remplacer: 'libre = true' },
  { id: 'TC-6', nom: 'fenêtre de 20 s', fichier: TIC, chercher: '`a0:creneau:${creneau(maintenant)}`, 1, 300)', remplacer: '`a0:creneau:${creneau(maintenant)}`, 1, 20)' },
  { id: 'TC-7', nom: 'pause non reportée', fichier: TIC, chercher: '{ etapes, dureeMs, pause }', remplacer: '{ etapes, dureeMs }' },
  { id: 'TC-7', nom: 'pause qui arrête le tic', fichier: TIC, chercher: '  const debut = Date.now()\n', remplacer: "  if ((await pauseGenerale()).active) { await enregistrerPassage('tic', { pause: true }, true); return NextResponse.json({ ok: true, pause: true }) }\n  const debut = Date.now()\n" },
  { id: 'TC-8', nom: 'rendus bruts', fichier: TIC, chercher: "etapes[nom] = { statut: 'ok', dureeMs: Date.now() - t, ...nombres(r) }", remplacer: "etapes[nom] = { statut: 'ok', dureeMs: Date.now() - t, ...(r as object) }" },
  { id: 'TC-8', nom: 'identifiant du passage rendu', fichier: TIC, chercher: 'NextResponse.json({ ok: true, etapes, dureeMs })', remplacer: 'NextResponse.json({ ok: true, etapes, dureeMs, passage: globalThis.crypto.randomUUID() })' },
  { id: 'TC-9', nom: 'autre chemin ajouté', fichier: FERMETURE, chercher: `, '${TIC}'`, remplacer: `, '${TIC}', 'app/api/agents/horloge/route.ts'` },
  { id: 'TC-9', nom: 'tic absent de la carte', fichier: FERMETURE, chercher: `, '${TIC}'`, remplacer: '' },
  { id: 'TC-9', nom: 'drapeau lu autrement', fichier: TIC, chercher: "if (!actif('busAgents'))", remplacer: "if (!actif('busAgents' as never) && !actif(['bus', 'Agents'].join('') as never))" },
]

export const CRITERES = {
  'TC-1': { juger: jugerFichier },
  'TC-2': { juger: parSonde('portes') },
  'TC-3': { juger: parSonde('ordre') },
  'TC-4': { juger: parSonde('isolement') },
  'TC-5': { juger: parSonde('budget') },
  'TC-6': { juger: parSonde('creneau') },
  'TC-7': { juger: parSonde('pause') },
  'TC-8': { juger: parSonde('fuites') },
  'TC-9': { juger: async (r) => jugerFermeture(r) },
  'TC-10': { juger: jugerTypecheck, temoin: async (r) => C.eprouverLectureTypecheck(r, [TIC]) },
  'TC-11': { juger: jugerReel, reel: true },
}

async function principal() {
  const o = C.lireOptions(process.argv.slice(2), JUGE)
  await S.derouler({
    juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o,
    temoin: { propres: [TIC], derives: [[FERMETURE, ticFermetureDerive]] },
    notes: [`horloge simulée figée à ${A_10H05} (10 h 05 à Paris) dans chaque sonde ; ${RACCOURCI_DIT}`],
  })
}
if (S.estLance(FICHIER)) await principal()
