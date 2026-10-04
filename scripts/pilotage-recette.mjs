// scripts/pilotage-recette.mjs — la recette en production de la station minimale (fiche 026-140, critères RE et C ; écrit
// en 026-104 par Claude Code, réservé à Claude Code).
//
//   node scripts/pilotage-recette.mjs                     critères statiques, puis code 2 (préalable : choisir un mode)
//   node scripts/pilotage-recette.mjs --racine=<d>        critères statiques sur <d> seulement (la preuve du lot c)
//   node scripts/pilotage-recette.mjs --temoin            le harnais : statiques verts sur le témoin du lot c posé EN MÉMOIRE
//                                                         sur la référence, rouges (RE-0) sur la référence nue
//   node scripts/pilotage-recette.mjs --avant   [--base=https://prestiapp.fr]   RE-1 à RE-3, drapeau encore baissé
//   node scripts/pilotage-recette.mjs --reel    [--base=…]                      RE-4 à RE-12, drapeau levé (026-140)
//   node scripts/pilotage-recette.mjs --constat=envoi|reunion|consigne [--base=…]  C1, C2, C3 : observer, jamais écrire
//
// Les critères statiques (lus dans la racine, sans rien lancer) : RE-0 (les pages et les routes de la station existent),
// RE-0-CARTE (Carte.tsx est le cadre d'attente, avec sa liste des salles, décision Claw3D du 25/09), RE-0-CADRES
// (Panneaux.tsx, Journal.tsx et Vues.tsx ne sont plus des cadres d'attente), RE-0-ENVOIS (aucune route
// app/api/controle/pilotage/envois/), RE-0-DRAPEAU (lib/flags.ts porte `pilotage`). Sur la référence du lot c, RE-0
// échoue (app/controle/station/page.tsx absent).
//
// Les modes réels chargent .env.local eux-mêmes (chargerEnv de scripts/lib/capture.mjs : rien n'est affiché), créent leur
// compte fondateur d'essai (e-mail en @presti-test.invalid, mot de passe tiré, gardé en mémoire, jamais écrit) et leurs objets
// d'essai (agent `essai_e2e_<aléa>`, décisions `essai-pilotage-<aléa>`), capturent eux-mêmes dans
// .orchestre/preuves/026-140/ (l'image d'avant effacée), et font TOUT leur ménage dans un `finally` : code 1 si le ménage
// échoue. `--constat` n'écrit rien (ni envoi, ni réunion, ni consigne). Aucun push, aucun e-mail.
// Sortie « ✅ ID … » / « ❌ ID … », puis « pilotage-recette : PASS|FAIL ». Code 0, 1, ou 2 (préalable ou appel invalide).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { R, court, premiereLigne, lireOptions, creerSortie, sansCommentaires, git, lsTree } from './fixtures/026-pilotage/a/commun.mjs'

const JUGE = 'pilotage-recette'
const REFERENCE = '4041ec9b41432576037dbc0b45e0647bd60a0347'
const o = lireOptions(process.argv.slice(2), { connues: ['avant', 'reel', 'constat', 'base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const modes = [o.drapeaux.has('avant') && 'avant', o.drapeaux.has('reel') && 'reel', 'constat' in o.valeurs && 'constat'].filter(Boolean)
if (modes.length > 1) refuser(`un seul mode à la fois (${modes.join(', ')})`)
const MODE = modes[0] ?? null
if (MODE && (o.temoin || o.valeurs.racine)) refuser(`--${MODE} ne juge que la production, depuis la racine réelle : ni --racine ni --temoin`)
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
const CONSTAT = o.valeurs.constat
if (MODE === 'constat' && !['envoi', 'reunion', 'consigne'].includes(CONSTAT)) refuser(`--constat=envoi|reunion|consigne attendu, reçu : ${CONSTAT}`)
const BASE = (o.valeurs.base ?? 'https://prestiapp.fr').replace(/\/+$/, '')
if (!/^https:\/\/[\w.-]+$/.test(BASE)) refuser(`--base « ${BASE} » : une origine https:// attendue`)

// ── Lecteurs de racine : un dossier, un commit, ou un commit recouvert du témoin du lot c (en mémoire) ──────────────────
const ST = 'app/controle/station'
function lecteurDossier(racine) {
  return { nom: racine, existe: (rel) => fs.existsSync(path.join(racine, rel)), lire: (rel) => { try { return fs.readFileSync(path.join(racine, rel), 'utf8') } catch { return null } }, dossier: (rel) => { try { return fs.statSync(path.join(racine, rel)).isDirectory() && fs.readdirSync(path.join(racine, rel)).length > 0 } catch { return false } } }
}
function lecteurCommit(commit, recouvrement = new Map()) {
  const arbre = lsTree(commit)
  const lire = (rel) => { if (recouvrement.has(rel)) return recouvrement.get(rel).toString('utf8'); if (!arbre.has(rel)) return null; const r = git(['show', `${commit}:${rel}`], { binaire: true }); return r.code === 0 ? r.stdout.toString('utf8') : null }
  const chemins = () => [...arbre.keys(), ...recouvrement.keys()]
  return { nom: `${commit.slice(0, 7)}${recouvrement.size ? ` + témoin du lot c (${recouvrement.size} fichiers, en mémoire)` : ''}`, existe: (rel) => recouvrement.has(rel) || arbre.has(rel), lire, dossier: (rel) => chemins().some((k) => k.startsWith(`${rel.replace(/\/$/, '')}/`)) }
}

// ── Les critères statiques ───────────────────────────────────────────────────────────────────────────────────────────────
const ROUTES = ['app/controle/station/page.tsx', 'app/api/controle/station/route.ts', 'app/api/controle/pilotage/route.ts', 'app/api/controle/pilotage/decisions/[id]/route.ts', 'app/api/controle/pilotage/appels/[id]/route.ts', 'app/api/controle/pilotage/agents/[nom]/route.ts', 'app/api/controle/pilotage/consignes/route.ts', 'app/api/controle/pilotage/gestes/route.ts', 'app/api/agents/reunion/route.ts']
const RE_NULL = /export\s+default\s+function\s+\w*\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*return\s+null\s*;?\s*\}/
/** Les critères statiques sur un lecteur : [{ id, echecs, detail }], RE-0 d'abord. */
function statiques(L) {
  const out = []
  const code = (rel) => { const s = L.lire(rel); return s === null ? null : sansCommentaires(s) }
  { const m = ROUTES.filter((r) => !L.existe(r)); out.push({ id: 'RE-0', echecs: m.length ? [`${m.length} fichier(s) absent(s) de ${L.nom} : ${m.join(', ')}`] : [], detail: `la page de la station, la route de la station, la route du Pilotage, les cinq routes d'écriture (decisions, appels, agents, consignes, gestes) et la route des réunions existent dans ${L.nom}` }) }
  {
    const e = [], s = code(`${ST}/Carte.tsx`), brut = L.lire(`${ST}/Carte.tsx`) ?? ''
    if (s === null) e.push('Carte.tsx absent')
    else {
      if (!/data-station-carte/.test(s) || !/data-liste-salles/.test(s) || !/data-salle=/.test(s)) e.push('Carte.tsx : [data-station-carte] et sa liste [data-liste-salles] de boutons [data-salle] attendus')
      if (!/La carte de la station arrive avec sa fiche\./.test(brut)) e.push('Carte.tsx : « La carte de la station arrive avec sa fiche. » absent (ce n’est plus le cadre d’attente)')
      if (/['"]phaser['"]|\/moteur\//.test(s)) e.push('Carte.tsx charge Phaser ou le moteur : la carte Claw3D a sa propre recette (026-193)')
    }
    out.push({ id: 'RE-0-CARTE', echecs: e, detail: 'Carte.tsx est le cadre d’attente de la carte, avec sa liste des salles, sans Phaser' })
  }
  {
    const e = []
    const p = code(`${ST}/Panneaux.tsx`), j = L.lire(`${ST}/Journal.tsx`), v = code(`${ST}/Vues.tsx`)
    if (p === null || !/data-salle-panneau/.test(p) || RE_NULL.test(p)) e.push('Panneaux.tsx est encore le cadre d’attente (ou absent)')
    if (j === null || /Le journal de bord arrive avec sa fiche/.test(j) || !/data-bulle-fil/.test(sansCommentaires(j))) e.push('Journal.tsx est encore le cadre d’attente (ou absent)')
    if (v === null || !/data-vue/.test(v) || RE_NULL.test(v)) e.push('Vues.tsx est encore le cadre d’attente (ou absent)')
    out.push({ id: 'RE-0-CADRES', echecs: e, detail: 'Panneaux.tsx, Journal.tsx et Vues.tsx sont remplis (026-120, 026-123, 026-113)' })
  }
  out.push({ id: 'RE-0-ENVOIS', echecs: L.dossier('app/api/controle/pilotage/envois') || L.existe('app/api/controle/pilotage/envois/route.ts') ? ['app/api/controle/pilotage/envois/ existe : aucun geste d’envoi'] : [], detail: 'aucune route app/api/controle/pilotage/envois/' })
  { const f = code('lib/flags.ts'); out.push({ id: 'RE-0-DRAPEAU', echecs: f === null ? ['lib/flags.ts absent'] : /\bpilotage\s*:\s*(true|false)\s*,/.test(f) ? [] : ['lib/flags.ts ne porte pas le drapeau pilotage'], detail: 'lib/flags.ts porte le drapeau pilotage' }) }
  return out
}
const IDS_STATIQUES = ['RE-0', 'RE-0-CARTE', 'RE-0-CADRES', 'RE-0-ENVOIS', 'RE-0-DRAPEAU']

// ── --temoin : le harnais ────────────────────────────────────────────────────────────────────────────────────────────────
if (o.temoin) {
  const S = creerSortie(JUGE, ['TM-1', 'TM-2'], `${JUGE} --temoin — critères statiques éprouvés sur le témoin du lot c posé en mémoire sur ${REFERENCE.slice(0, 7)}, puis sur ${REFERENCE.slice(0, 7)} seul ; rien n'est écrit`)
  await S.critere('TM-1', async () => {
    const { fichiersTemoinC } = await import('./fixtures/026-pilotage/c/commun.mjs')
    const L = lecteurCommit(REFERENCE, fichiersTemoinC())
    const r = statiques(L)
    return { echecs: r.flatMap((x) => x.echecs.map((m) => `${x.id} : ${m}`)), detail: `${r.length} critères statiques verts sur ${L.nom}` }
  })
  await S.critere('TM-2', async () => {
    const r = statiques(lecteurCommit(REFERENCE))
    const e = []
    if (r[0].id !== 'RE-0' || !r[0].echecs.length) e.push('RE-0 vert sur la référence nue : il ne verrait pas l’absence de la station')
    return { echecs: e, detail: `sur ${REFERENCE.slice(0, 7)} seul, RE-0 échoue : « ${court(r[0].echecs[0] ?? '', 90)} »` }
  })
  process.exit(S.finir())
}

// ── Statiques (sans option, ou --racine) ──────────────────────────────────────────────────────────────────────────────────
const RAC = o.racine
const IDS_MODE = { avant: ['RE-1', 'RE-2', 'RE-3'], reel: ['RE-4', 'RE-5', 'RE-6', 'RE-7', 'RE-8', 'RE-9', 'RE-10', 'RE-12', 'RE-11'], constat: [{ envoi: 'C1', reunion: 'C2', consigne: 'C3' }[CONSTAT]] }
const S = creerSortie(JUGE, [...IDS_STATIQUES, ...(MODE ? IDS_MODE[MODE] : [])], `${JUGE}${MODE ? ` --${MODE}${CONSTAT ? `=${CONSTAT}` : ''}` : ''} — racine ${RAC}${MODE ? ` — production ${BASE}` : ''}`)
const stat = statiques(lecteurDossier(RAC))
for (const x of stat) S.juger(x.id, x.echecs, x.detail)
if (!MODE) {
  if (!o.racineParDefaut) process.exit(S.finir())
  S.finir()
  console.log(`${JUGE} : préalable — choisir --avant, --reel ou --constat=envoi|reunion|consigne (026-140) ; sans mode, seuls les critères statiques sont jugés`)
  process.exit(2)
}
if (stat.some((x) => x.echecs.length)) { S.nonJuges(IDS_MODE[MODE], 'critères statiques en échec : la recette en production n’est pas lancée'); process.exit(S.finir()) }

// ═══ Les modes réels ═════════════════════════════════════════════════════════════════════════════════════════════════════
const { chargerEnv } = await import('./lib/capture.mjs')
chargerEnv(R)
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SB || !SVC || !ANON) { console.log(`${JUGE} : préalable — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_ANON_KEY attendues dans .env.local`); process.exit(2) }
const HS = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const ALEA = crypto.randomBytes(3).toString('hex')
const PREUVES = path.join(R, '.orchestre', 'preuves', '026-140')
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const requireDepot = createRequire(path.join(R, 'package.json'))
async function rpc(nom, args = {}) {
  const r = await fetch(`${SB}/rest/v1/rpc/${nom}`, { method: 'POST', headers: HS, body: JSON.stringify(args) })
  let corps = null; try { corps = await r.json() } catch { /* vide */ }
  return { ok: r.ok, status: r.status, corps }
}
async function rest(chemin, init = {}) { const r = await fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...HS, ...(init.headers ?? {}) } }); let corps = null; try { corps = await r.json() } catch { /* vide */ } return { ok: r.ok, status: r.status, corps, entetes: r.headers } }
async function compter(table, filtre) { const r = await fetch(`${SB}/rest/v1/${table}?select=*&${filtre}`, { headers: { ...HS, Prefer: 'count=exact', Range: '0-0' } }); const n = Number((r.headers.get('content-range') ?? '').split('/')[1]); if (!r.ok || !Number.isFinite(n)) throw new Error(`${table} illisible (${r.status})`); return n }
/** GET/POST en production avec la session du compte d'essai (ou sans). */
async function prod(chemin, { jeton = null, methode = 'GET', corps, entetes = {} } = {}) {
  const r = await fetch(`${BASE}${chemin}`, { method: methode, headers: { ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(corps !== undefined ? { 'Content-Type': 'application/json' } : {}), ...entetes }, body: corps !== undefined ? JSON.stringify(corps) : undefined, redirect: 'manual' })
  let donnees = null; try { donnees = await r.json() } catch { /* HTML ou vide */ }
  return { status: r.status, donnees }
}
/** Le compte fondateur d'essai : créé ici, mot de passe gardé en mémoire (RE-5 le redonne à /api/controle/reconfirmer). */
async function compteFondateur() {
  const email = `recette.pilotage.${Date.now()}.${ALEA}@presti-test.invalid`, mdp = `Recette-${crypto.randomBytes(12).toString('base64url')}`
  const u = await (await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: HS, body: JSON.stringify({ email, password: mdp, email_confirm: true }) })).json()
  if (!u?.id) throw new Error('création du compte d’essai refusée')
  const supprimer = async () => {
    await fetch(`${SB}/rest/v1/journal_direction?acteur_id=eq.${u.id}`, { method: 'DELETE', headers: HS }).catch(() => {})
    await fetch(`${SB}/rest/v1/artisans?id=eq.${u.id}`, { method: 'DELETE', headers: HS }).catch(() => {})
    await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: HS }).catch(() => {})
    const a = await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { headers: HS })
    const l = await rest(`artisans?select=id&id=eq.${u.id}`)
    return a.status === 404 && Array.isArray(l.corps) && !l.corps.length
  }
  const r = await fetch(`${SB}/rest/v1/artisans`, { method: 'POST', headers: { ...HS, Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Direction (recette pilotage)', metier: 'Plombier', slug: `recette-pilotage-${ALEA}`, is_founder: true }) })
  if (!r.ok) { await supprimer(); throw new Error(`ligne artisans refusée (${r.status})`) }
  const s = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: mdp }) })).json()
  if (!s?.access_token) { await supprimer(); throw new Error('session d’essai refusée') }
  const ref = SB.replace(/^https?:\/\//, '').split('.')[0]
  return { id: u.id, email, mdp, sess: s, jeton: s.access_token, cleLocale: `sb-${ref}-auth-token`, supprimer }
}
/** Chromium à la taille dite, la session posée ; la capture efface l'image d'avant au même chemin. */
let NAV = null
async function page(chemin, compte, { largeur = 1440, hauteur = 900 } = {}) {
  NAV ??= await requireDepot('playwright').chromium.launch()
  const ctx = await NAV.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris', ...(largeur < 1024 ? { isMobile: true, hasTouch: true } : {}) })
  const p = await ctx.newPage()
  if (compte) await p.addInitScript(([k, v]) => { try { localStorage.setItem(k, v) } catch { /* fermé */ } }, [compte.cleLocale, JSON.stringify(compte.sess)])
  await p.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await p.waitForSelector('[data-station]', { timeout: 30_000 }).catch(() => {})
  return { p, fermer: () => ctx.close().catch(() => {}) }
}
async function capturer(p, nom) {
  const { analyserJpeg, sha256 } = await import('./fixtures/026-pilotage/c/commun.mjs')
  const f = path.join(PREUVES, nom)
  fs.mkdirSync(PREUVES, { recursive: true }); fs.rmSync(f, { force: true })
  await p.screenshot({ path: f, type: 'jpeg', quality: 82 })
  const buf = fs.readFileSync(f)
  return { fichier: f, octets: buf.length, empreinte: sha256(buf), ...analyserJpeg(buf) }
}
const defauts = (c, l, h) => [...(c.octets < 10 * 1024 ? [`${path.basename(c.fichier)} : ${c.octets} octets`] : []), ...(c.octets > 1.5 * 1024 * 1024 ? [`${path.basename(c.fichier)} : plus de 1,5 Mo`] : []), ...(c.ecartType < 4 ? [`${path.basename(c.fichier)} : uniforme`] : []), ...(c.largeur !== l || c.hauteur !== h ? [`${path.basename(c.fichier)} : ${c.largeur}×${c.hauteur}`] : [])]
const euros = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const esp = (t) => String(t ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()

let codeFin = 0
try {
  if (MODE === 'avant') await avant()
  else if (MODE === 'reel') await reel()
  else await constat()
} catch (e) {
  S.nonJuges(IDS_MODE[MODE], `interrompu : ${premiereLigne(e)}`)
} finally {
  await NAV?.close().catch(() => {})
}
// Un ménage raté (--constat) a posé process.exitCode = 1 : il n'est pas écrasé par le verdict.
codeFin = Math.max(S.finir(), process.exitCode ?? 0)
process.exit(codeFin)

// ── --avant : RE-1 à RE-3 ────────────────────────────────────────────────────────────────────────────────────────────────
async function avant() {
  // RE-1 : le dernier déploiement READY, son commit contient les fiches déployées ; drapeau baissé → 404.
  {
    const e = []
    const d = spawnSync(process.execPath, ['scripts/deploiement-etat.mjs', '--n=1'], { cwd: R, encoding: 'utf8', windowsHide: true })
    if (d.status !== 0) e.push(`deploiement-etat : code ${d.status} (le dernier déploiement de production n'est pas READY)`)
    const sha = (/READY\s+([0-9a-f]{7})/.exec(d.stdout ?? '') ?? [])[1]
    if (!sha) e.push('commit du dernier déploiement READY illisible')
    else for (const f of ['026-044', '026-049', '026-051', '026-059', '026-068', '026-074', '026-092', '026-111', '026-113', '026-117', '026-120', '026-123', '026-125']) {
      const c = git(['log', '-1', '--format=%H', `--grep=^${f} `, 'HEAD']).stdout.trim()
      if (!c) { e.push(`${f} : aucun commit`); continue }
      if (git(['merge-base', '--is-ancestor', c, sha]).code !== 0) e.push(`${f} (${c.slice(0, 7)}) n'est pas dans le déploiement ${sha}`)
    }
    for (const ch of ['/api/controle/station?vue=direct', '/api/controle/pilotage?bloc=decider', '/controle/station']) { const r = await prod(ch); if (r.status !== 404) e.push(`${ch} : ${r.status} en production, 404 attendu (drapeau baissé)`) }
    S.juger('RE-1', e, `dernier déploiement READY (${sha}), les treize fiches déployées y sont ; drapeau baissé : vue=direct, bloc=decider et /controle/station en 404`)
  }
  // RE-2 : les lectures de 0107, 0108 et 0112 répondent ; l'horloge tourne ; les deux tâches de la station existent.
  {
    const e = []
    const depuis = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const lectures = [['pilotage_decisions', { p_limite: 1 }], ['pilotage_agents'], ['pilotage_chef'], ['pilotage_evenements', { p_apres: 0, p_limite: 1, p_agent: null, p_types: null }], ['pilotage_attention_sources'], ['pilotage_code_lire'], ['pilotage_envois_du_jour'], ['pilotage_compteurs_du_jour'], ['pilotage_entonnoir', { p_depuis: depuis }], ['pilotage_appels', { p_limite: 1 }], ['pilotage_etat_envoi'], ['pilotage_tapis', { p_depuis: depuis }], ['station_reunion_lire', { p_limite: 1 }], ['station_objectif_actif'], ['station_experience_etat'], ['ops_etat']]
    for (const [f, a] of lectures) { const r = await rpc(f, a ?? {}); if (!r.ok) e.push(`${f} : ${r.status} ${court(JSON.stringify(r.corps), 80)}`) }
    const tic = await rest('passages_cron?select=nom,dernier_passage&nom=eq.tic')
    const le = Array.isArray(tic.corps) && tic.corps[0] ? Date.parse(tic.corps[0].dernier_passage) : NaN
    if (!(Date.now() - le < 20 * 60_000)) e.push(`passages_cron : dernier passage tic ${Number.isFinite(le) ? `il y a ${Math.round((Date.now() - le) / 60_000)} min` : 'absent'}, moins de 20 min attendu`)
    // cron.job n'est pas lisible par la clé de service : la preuve des deux tâches est leur passage consigné (ou la
    // fonction station_crons si elle existe).
    const job = await rest('job?select=jobname,active', { headers: { 'Accept-Profile': 'cron' } })
    const crons = job.ok ? null : await rpc('station_crons')
    const noms = job.ok && Array.isArray(job.corps) ? job.corps.filter((c) => c.active !== false).map((c) => c.jobname) : crons?.ok && Array.isArray(crons.corps) ? crons.corps.map((c) => c.jobname ?? c.nom) : ((await rest('passages_cron?select=nom&nom=in.(station-reunions-echues,station-experiences-echues)')).corps ?? []).map((c) => c.nom)
    for (const n of ['station-reunions-echues', 'station-experiences-echues']) if (!noms.includes(n)) e.push(`tâche cron ${n} introuvable (ni station_crons, ni passage consigné) : à lire par execute_sql avant la levée`)
    S.juger('RE-2', e, `${lectures.length} lectures (pilotage_*, station_*, ops_etat) répondent ; tic passé il y a moins de 20 min ; station-reunions-echues et station-experiences-echues présentes`)
  }
  // RE-3 : au moins un appareil de notification actif d'un fondateur réel (nombre seul).
  {
    const f = await rest('artisans?select=id&is_founder=eq.true&email=not.like.*presti-test.invalid')
    const ids = Array.isArray(f.corps) ? f.corps.map((x) => x.id) : []
    const n = ids.length ? await compter('push_abonnements', `actif=eq.true&artisan_id=in.(${ids.join(',')})`) : 0
    if (!n) { S.echoue('RE-3', 'préalable : Benj n’a pas encore activé les notifications du Poste'); S.finir(); process.exit(2) }
    S.passe('RE-3', `${n} appareil(s) de notification actif(s) chez un fondateur réel (nombre seul)`)
  }
}

// ── --reel : RE-4 à RE-12 ────────────────────────────────────────────────────────────────────────────────────────────────
async function reel() {
  let compte = null, agent = null, menage = true
  const decisions = []
  // ops n'est pas exposé à PostgREST (0096) : les envois du jour et les consignes se comptent par les lectures pilotage_*.
  const releveEnvois = async () => { const r = await rpc('pilotage_compteurs_du_jour'); return r.ok ? JSON.stringify(r.corps) : null }
  const derniereConsigne = async () => { const r = await rpc('pilotage_evenements', { p_apres: 0, p_limite: 1000, p_agent: null, p_types: ['consigne'] }); return r.ok && Array.isArray(r.corps) ? Math.max(0, ...r.corps.map((x) => Number(x.id) || 0)) : null }
  const envoisAvant = await releveEnvois()
  const consignesAvant = await derniereConsigne()
  try {
    compte = await compteFondateur()
    const J = compte.jeton
    // RE-4 : les vues sourcées, les blocs, la trésorerie ; deux chiffres, un écran.
    {
      const e = []
      const d = await prod('/api/controle/station?vue=direct', { jeton: J })
      if (d.status !== 200 || !d.donnees?.source) e.push(`vue=direct : ${d.status}`)
      else for (const k of ['barre', 'equipage', 'attention', 'commandement', 'tapis', 'bandeau']) if (!d.donnees.valeur?.[k]?.source && !d.donnees.valeur?.[k]?.raison) e.push(`vue=direct : sous-partie ${k} sans source`)
      const f = await prod('/api/controle/station?vue=fil', { jeton: J }); if (f.status !== 200 || !f.donnees?.source) e.push(`vue=fil : ${f.status}`)
      for (const s of ['recettes', 'tresorerie', 'usine', 'atelier', 'reunion', 'envois', 'experience', 'standard', 'redaction', 'machines']) { const r = await prod(`/api/controle/station?vue=salle&salle=${s}`, { jeton: J }); if (r.status !== 200 || !r.donnees?.source || r.donnees?.manque === 'arrive avec sa fiche') e.push(`salle=${s} : ${r.status}${r.donnees?.manque ? ` (${r.donnees.manque})` : ''}`) }
      const a = await prod('/api/controle/station?vue=agent&nom=chef', { jeton: J }); if (a.status !== 200) e.push(`agent chef : ${a.status}`)
      for (const b of ['decider', 'appeler', 'envois', 'entonnoir', 'agents', 'code']) { const r = await prod(`/api/controle/pilotage?bloc=${b}`, { jeton: J }); if (r.status !== 200 || !r.donnees?.source) e.push(`bloc=${b} : ${r.status}`) }
      const t = await prod('/api/controle/tresorerie', { jeton: J }); if (t.status !== 200) e.push(`trésorerie : ${t.status}`)
      // Deux chiffres, un écran : ENVOIS DU JOUR = acq_plafond_du_jour et acq_envois_du_jour au même moment.
      const envois = d.donnees?.valeur?.barre?.valeur?.compteurs?.find((c) => c.cle === 'envois')
      const [pl, ev] = await Promise.all([rpc('acq_plafond_du_jour', { p_canal: 'formulaire_site' }), rpc('acq_envois_du_jour', { p_canal: 'formulaire_site' })])
      if (!envois || !pl.ok || !ev.ok || !esp(envois.texte).includes(`${ev.corps}/${pl.corps}`)) e.push(`ENVOIS DU JOUR « ${envois?.texte} », acq_envois_du_jour ${JSON.stringify(ev.corps)} / acq_plafond_du_jour ${JSON.stringify(pl.corps)} au même moment`)
      const { p, fermer } = await page('/controle/station', compte)
      await p.waitForFunction(() => { const x = document.querySelector('[data-compteur="encaisse_mois"] [data-valeur]'); return x && !/…/.test(x.textContent) }, null, { timeout: 20_000 }).catch(() => {})
      const t2 = await prod('/api/controle/tresorerie', { jeton: J })
      const tv = t2.donnees
      const cases = await p.evaluate(() => Object.fromEntries(['encaisse_mois', 'depense_mois', 'marge_mois'].map((k) => [k, (document.querySelector(`[data-compteur="${k}"] [data-valeur]`)?.textContent ?? '').replace(/[  ]/g, ' ').trim()])))
      for (const [k, v] of [['encaisse_mois', tv?.encaisse?.mois?.valeur?.net], ['depense_mois', tv?.depenses_mois?.valeur], ['marge_mois', tv?.marge?.valeur]]) if (typeof v === 'number' && cases[k] !== esp(euros(v))) e.push(`${k} : « ${cases[k]} » à l'écran, ${euros(v)} dans /api/controle/tresorerie au même moment`)
      await fermer()
      S.juger('RE-4', e, 'vue=direct (six sous-parties sourcées), vue=fil, les dix salles à panneau remplies, agent chef, les six blocs et la trésorerie en 200 ; ENVOIS DU JOUR = acq_envois_du_jour / acq_plafond_du_jour ; ENCAISSÉ, DÉPENSÉ et MARGE à l’écran = la trésorerie au même moment')
    }
    // RE-5 : l'agent d'essai, deux décisions, trancher sans et avec reconfirmation ; journal : deux decision_tranchee.
    {
      const e = []
      agent = `essai_e2e_${ALEA}`
      const r0 = await rpc('ops_agent_enregistrer', { p_nom: agent, p_libelle: `Essai recette ${ALEA}`, p_capacites: ['decider'], p_types_crees: [], p_tables: [], p_periode_minutes: 60, p_debit_minute: 1, p_quota_creations_jour: 5, p_plafond_euros_jour: 0 })
      if (!r0.ok) throw new Error(`ops_agent_enregistrer : ${r0.status} ${court(JSON.stringify(r0.corps), 100)}`)
      const creer = async (portee, montant) => { const r = await rpc('ops_decision_creer', { p_agent: agent, p_question: `Décision d’essai ${ALEA} (${portee ?? 'sans enjeu'}) ?`, p_contexte: `essai-pilotage-${ALEA}`, p_options: [{ cle: 'oui', libelle: 'Oui' }, { cle: 'non', libelle: 'Non' }], p_defaut: 'non', p_montant_cents: montant, p_portee: portee, p_echeance: new Date(Date.now() + 3_600_000).toISOString(), p_cle: `essai-pilotage-${ALEA}-${portee ?? 'libre'}`, p_tache: null }); if (!r.ok) throw new Error(`ops_decision_creer : ${r.status}`); const id = typeof r.corps === 'string' ? r.corps : r.corps?.id ?? r.corps?.[0]?.id; decisions.push(id); return id }
      const d1 = await creer(null, null), d2 = await creer('argent', 100)
      const bloc = await prod('/api/controle/pilotage?bloc=decider', { jeton: J })
      const ids = (bloc.donnees?.valeur?.cartes ?? []).map((c) => c.id)
      if (!ids.includes(d1) || !ids.includes(d2)) e.push('les deux décisions d’essai ne sont pas dans le bloc decider')
      const t1 = await prod(`/api/controle/pilotage/decisions/${d1}`, { jeton: J, methode: 'POST', corps: { choix: 'oui' } })
      if (t1.status !== 200) e.push(`trancher sans enjeu : ${t1.status}`)
      const apres = await prod('/api/controle/pilotage?bloc=decider', { jeton: J })
      if ((apres.donnees?.valeur?.cartes ?? []).some((c) => c.id === d1)) e.push('la décision tranchée reste dans le bloc')
      const t1b = await prod(`/api/controle/pilotage/decisions/${d1}`, { jeton: J, methode: 'POST', corps: { choix: 'oui' } })
      if (![404, 409].includes(t1b.status)) e.push(`second POST sur la décision tranchée : ${t1b.status}, 404 ou 409 attendu`)
      const t2 = await prod(`/api/controle/pilotage/decisions/${d2}`, { jeton: J, methode: 'POST', corps: { choix: 'oui' } })
      if (t2.status !== 403 || t2.donnees?.portee !== 'argent') e.push(`enjeu argent sans reconfirmation : ${t2.status} (portée ${t2.donnees?.portee}), 403 argent attendu`)
      const rc = await prod('/api/controle/reconfirmer', { jeton: J, methode: 'POST', corps: { password: compte.mdp, portee: 'argent' } })
      if (!rc.donnees?.jeton) e.push(`reconfirmation : ${rc.status}`)
      else { const t3 = await prod(`/api/controle/pilotage/decisions/${d2}`, { jeton: J, methode: 'POST', corps: { choix: 'oui' }, entetes: { 'x-presti-reconfirmation': rc.donnees.jeton } }); if (t3.status !== 200) e.push(`enjeu argent après reconfirmation : ${t3.status}`) }
      const n = await compter('journal_direction', `acteur_id=eq.${compte.id}&action=eq.decision_tranchee`)
      if (n !== 2) e.push(`journal_direction : ${n} ligne(s) decision_tranchee, exactement 2 attendues`)
      S.juger('RE-5', e, `agent ${agent} et deux décisions d’essai dans le bloc ; sans enjeu tranchée d’un POST puis disparue (second POST 404/409) ; argent : 403 puis 200 après reconfirmation ; deux decision_tranchee au journal`)
    }
    // RE-6 : pause et reprise de l'agent d'essai (reconfirmation securite).
    {
      const e = []
      const sans = await prod(`/api/controle/pilotage/agents/${agent}`, { jeton: J, methode: 'POST', corps: { pause: true, motif: 'Recette pilotage' } })
      if (sans.status !== 403) e.push(`pause sans reconfirmation : ${sans.status}, 403 attendu`)
      for (const pause of [true, false]) {
        const rc = await prod('/api/controle/reconfirmer', { jeton: J, methode: 'POST', corps: { password: compte.mdp, portee: 'securite' } })
        const r = await prod(`/api/controle/pilotage/agents/${agent}`, { jeton: J, methode: 'POST', corps: { pause, motif: 'Recette pilotage' }, entetes: { 'x-presti-reconfirmation': rc.donnees?.jeton ?? '' } })
        if (r.status !== 200) e.push(`${pause ? 'pause' : 'reprise'} : ${r.status}`)
        const d = await prod('/api/controle/station?vue=direct', { jeton: J })
        const a = d.donnees?.valeur?.equipage?.valeur?.agents?.find((x) => x.nom === agent)
        if (pause ? a?.etat !== 'pause' : a?.etat === 'pause') e.push(`${pause ? 'pause' : 'reprise'} : l'équipage montre ${agent} « ${a?.etat} »`)
      }
      S.juger('RE-6', e, `${agent} : sans reconfirmation 403 ; en pause dans l’équipage, puis repris`)
    }
    // RE-7 : aucun geste d'envoi.
    {
      const e = []
      const r = await prod(`/api/controle/pilotage/envois/${crypto.randomUUID()}`, { jeton: J, methode: 'POST', corps: {} })
      if (![404, 405].includes(r.status)) e.push(`POST /api/controle/pilotage/envois/<uuid> : ${r.status}, 404 ou 405 attendu`)
      for (const [l, h] of [[1440, 900], [390, 844]]) {
        const { p, fermer } = await page('/controle/station', compte, { largeur: l, hauteur: h })
        const ouvrir = ['?vue=missions', '?vue=succes', '?vue=aide', ...['recettes', 'tresorerie', 'usine', 'atelier', 'reunion', 'envois', 'experience', 'standard', 'redaction', 'machines'].map((s) => `?salle=${s}`), '?agent=chef']
        for (const q of ['', ...ouvrir]) {
          if (q) { await p.goto(`${BASE}/controle/station${q}`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200) }
          const t = await p.evaluate(() => [...document.querySelectorAll('button, a, [role="button"]')].map((b) => `${b.textContent} ${b.getAttribute('aria-label') ?? ''}`).filter((x) => /envoyer|envoyé|copier|sauter|relayer/i.test(x)))
          if (t.length) e.push(`${l}×${h} ${q || 'station'} : « ${court(t[0], 40)} »`)
        }
        await fermer()
      }
      const c1 = await prod('/api/controle/pilotage/consignes', { jeton: J, methode: 'POST', corps: { texte: '' } })
      if (c1.status !== 400) e.push(`consigne vide : ${c1.status}, 400 attendu`)
      const artisan = await (await import('./fixtures/026-pilotage/b/commun.mjs')).artisanEssai()
      try { const c2 = await prod('/api/controle/pilotage/consignes', { jeton: artisan.jeton, methode: 'POST', corps: { texte: 'Essai de recette' } }); if (c2.status !== 403) e.push(`consigne d’un compte artisan : ${c2.status}, 403 attendu`) } finally { if (!(await artisan.supprimer())) menage = false }
      const envoisApres = await releveEnvois()
      if (envoisAvant === null || envoisApres === null) e.push('pilotage_compteurs_du_jour illisible : les envois ne sont pas comptés avant et après')
      else if (envoisApres !== envoisAvant) e.push('les compteurs d’envoi du jour ont bougé pendant la recette')
      const consignesApres = await derniereConsigne()
      if (consignesAvant === null || consignesApres === null) e.push('pilotage_evenements illisible : les consignes ne sont pas comptées')
      else if (consignesApres !== consignesAvant) e.push('un événement consigne a été écrit pendant la recette')
      S.juger('RE-7', e, 'POST /envois/<uuid> → 404 ou 405 ; aucun Envoyer, Envoyé, Copier, Sauter ni Relayer (1440×900 et 390×844, vues et panneaux ouverts) ; consigne vide 400, compte artisan 403 ; aucun envoi ni consigne écrits')
    }
    // RE-8 : le relevé du code publié il y a moins de 2 min.
    {
      const e = []
      const r = spawnSync(process.execPath, ['scripts/pilotage-code-publier.mjs'], { cwd: R, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
      if (r.status !== 0) e.push(`pilotage-code-publier : code ${r.status}`)
      const b = await prod('/api/controle/pilotage?bloc=code', { jeton: J })
      const le = Date.parse(b.donnees?.valeur?.publie_le ?? '')
      if (!(Date.now() - le < 120_000) || b.donnees?.valeur?.perime) e.push(`bloc code : relevé ${Number.isFinite(le) ? `de ${Math.round((Date.now() - le) / 1000)} s` : 'absent'}${b.donnees?.valeur?.perime ? ', périmé' : ''}`)
      S.juger('RE-8', e, 'pilotage-code-publier lancé ; le bloc code montre un relevé de moins de 2 min, non périmé')
    }
    // RE-9 : un événement réel dans le fil et dans l'équipage ; LANCEMENT posé, « JOUR 1 ».
    {
      const e = []
      const { p, fermer } = await page('/controle/station', compte)
      await p.waitForSelector('[data-bulle-fil]', { timeout: 20_000 }).catch(() => {})
      const t0 = Date.now()
      const ev = await rpc('ops_evenement_ajouter', { p_agent: agent, p_type: 'tache_prise', p_objet: `essai-pilotage-${ALEA}`, p_resume: 'essai de recette', p_tache: null })
      if (!ev.ok) e.push(`ops_evenement_ajouter : ${ev.status}`)
      const vu = await p.waitForFunction(() => [...document.querySelectorAll('[data-bulle-fil]')].some((b) => b.textContent.includes('essai de recette')), null, { timeout: 10_000 }).then(() => true).catch(() => false)
      if (!vu) e.push('la bulle « essai de recette » n’apparaît pas dans le journal avant 10 s')
      const carte = await p.waitForFunction((a) => (document.querySelector(`[data-agent="${a}"] [data-activite]`)?.textContent ?? '').includes('essai de recette'), agent, { timeout: 10_000 }).then(() => true).catch(() => false)
      if (!carte) e.push(`la carte de ${agent} ne montre pas « essai de recette »`)
      const jour = await p.evaluate(() => document.querySelector('[data-jour]')?.textContent ?? '')
      const station = fs.readFileSync(path.join(R, 'lib', 'pilotage', 'station.ts'), 'utf8')
      const lancement = (/LANCEMENT[sS]{0,240}?dates*:s*['"](d{4}-d{2}-d{2})['"]/.exec(station) ?? [])[1]
      const aujourdhui = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
      if (lancement !== aujourdhui) e.push(`LANCEMENT.date « ${lancement ?? 'absente'} » dans lib/pilotage/station.ts, ${aujourdhui} (jour de la levée) attendue`)
      if (!/JOUR\s*1\b/.test(jour)) e.push(`la barre affiche « ${court(jour, 30)} », « JOUR 1 » attendu le jour de la levée`)
      await fermer()
      S.juger('RE-9', e, `l’événement tache_prise « essai de recette » : bulle dans le journal et carte de ${agent} en ${((Date.now() - t0) / 1000).toFixed(1)} s ; LANCEMENT posé, « JOUR 1 »`)
    }
    // RE-10 : les captures en production (la seconde décision, avant d'être tranchée : d'où une troisième, épinglée).
    {
      const e = []
      const d3 = (await rpc('ops_decision_creer', { p_agent: agent, p_question: `Décision épinglée d’essai ${ALEA} ?`, p_contexte: `essai-pilotage-${ALEA}`, p_options: [{ cle: 'oui', libelle: 'Oui' }, { cle: 'non', libelle: 'Non' }], p_defaut: 'non', p_montant_cents: 100, p_portee: 'argent', p_echeance: new Date(Date.now() + 3_600_000).toISOString(), p_cle: `essai-pilotage-${ALEA}-epinglee`, p_tache: null })).corps
      const id = typeof d3 === 'string' ? d3 : d3?.id; decisions.push(id)
      const t = await page(`/controle/station?decision=${id}`, compte, { largeur: 390, hauteur: 844 })
      await t.p.waitForSelector('[data-epinglee]', { timeout: 20_000 }).catch(() => {})
      const vis = await t.p.evaluate(() => { const c = document.querySelector('[data-epinglee]'); if (!c) return false; const r = c.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === c || c.contains(x)) })
      if (!vis) e.push('la carte épinglée n’est pas visible en son centre à 390×844')
      if ((await t.p.evaluate(() => document.documentElement.scrollWidth)) > 390) e.push('défilement horizontal à 390 px')
      const ct = await capturer(t.p, 'telephone.jpg'); e.push(...defauts(ct, 390, 844)); await t.fermer()
      const b = await page('/controle/station', compte)
      await b.p.waitForTimeout(2500)
      const cb = await capturer(b.p, 'bureau.jpg'); e.push(...defauts(cb, 1440, 900)); await b.fermer()
      if (ct.empreinte === cb.empreinte) e.push('bureau.jpg et telephone.jpg identiques')
      S.juger('RE-10', e, `telephone.jpg (carte épinglée visible, ${Math.round(ct.octets / 1024)} Ko) et bureau.jpg (${Math.round(cb.octets / 1024)} Ko), prises par le script en production`)
    }
    // RE-12 : IA gratuites, coût des modèles à 0, modèle de chaque agent.
    {
      const e = []
      const m = await prod('/api/controle/station?vue=salle&salle=machines', { jeton: J })
      const ia = m.donnees?.valeur?.ia
      if (!ia || (ia.valeur === null ? !ia.manque : !(ia.valeur?.fournisseurs?.length > 0))) e.push('salle machines : ni fournisseur d’IA servi, ni manque')
      const t = await prod('/api/controle/station?vue=salle&salle=tresorerie', { jeton: J })
      if (!Array.isArray(t.donnees?.valeur?.modeles) || t.donnees?.valeur?.total_modeles_eur !== 0) e.push(`salle tresorerie : modeles ${Array.isArray(t.donnees?.valeur?.modeles) ? 'servis' : 'absents'}, total_modeles_eur ${t.donnees?.valeur?.total_modeles_eur}, 0 attendu`)
      const d = await prod('/api/controle/station?vue=direct', { jeton: J })
      const sans = (d.donnees?.valeur?.equipage?.valeur?.agents ?? []).filter((a) => !a.modele)
      if (sans.length) e.push(`${sans.length} agent(s) sans modele dans direct.equipage (${sans[0].nom})`)
      const pg = await page('/controle/station?salle=machines', compte)
      await pg.p.waitForTimeout(2500)
      const c = await capturer(pg.p, 'machines.jpg'); e.push(...defauts(c, 1440, 900))
      await pg.p.goto(`${BASE}/controle/station?salle=tresorerie`, { waitUntil: 'domcontentloaded' }); await pg.p.waitForTimeout(2500)
      const txt = await pg.p.evaluate(() => (document.querySelector('[data-salle-panneau="tresorerie"]')?.innerText ?? '').replace(/[  ]/g, ' '))
      if (!txt.includes('0,00 €')) e.push('le total des modèles n’est pas écrit « 0,00 € » à l’écran')
      await pg.fermer()
      S.juger('RE-12', e, 'salle machines : ia servie (ou son manque) ; trésorerie : modèles et total 0,00 € ; un modèle sur chaque agent ; machines.jpg prise par le script')
    }
  } finally {
    // RE-11 : le ménage, relu par la clé de service.
    const e = []
    if (agent) { const r = await rpc('ops_agent_retirer', { p_nom: agent }); if (!r.ok) e.push(`ops_agent_retirer : ${r.status}`); const l = await rpc('pilotage_agents'); if (!l.ok) e.push('pilotage_agents illisible après le ménage'); else if ((Array.isArray(l.corps) ? l.corps : []).some((a) => a.nom === agent)) e.push(`${agent} existe encore`) }
    for (const id of decisions.filter(Boolean)) { const l = await rpc('pilotage_decision', { p_id: id }); if (l.ok && l.corps && (!Array.isArray(l.corps) || l.corps.length)) e.push(`décision ${id} encore là`) }
    if (compte) { if (!(await compte.supprimer())) { menage = false; e.push('le compte d’essai existe encore') } }
    if (!menage) e.push('ménage incomplet')
    S.juger('RE-11', e, `agent ${agent ?? '—'} retiré (tâches, décisions, événements emportés), journal du compte effacé, compte purgé : relu par la clé de service`)
  }
}

// ── --constat : C1, C2, C3 (rien n'est écrit) ────────────────────────────────────────────────────────────────────────────
async function constat() {
  let compte = null
  try {
    compte = await compteFondateur()
    const J = compte.jeton
    if (CONSTAT === 'envoi') {
      const e = []
      const env = await rpc('pilotage_envois_du_jour')
      const x = Array.isArray(env.corps) ? env.corps.find((y) => y.canal === 'formulaire_site' && y.envoyeur === 'facteur_usine' && y.statut === 'envoye') : null
      if (x && !x.technologie) e.push(`envoi ${x.id} : sa technologie n’est pas servie`)
      if (!x) e.push('aucun envoi formulaire_site envoyé par facteur_usine')
      else if (!['j1', 'j3', 'second'].every((k) => x.verdicts?.[k] === 'pass')) e.push(`envoi ${x.id} : verdicts ${JSON.stringify(x.verdicts)}, trois pass attendus`)
      const fil = await prod('/api/controle/station?vue=fil', { jeton: J })
      if (!(fil.donnees?.valeur?.bulles ?? []).some((b) => b.agent === 'facteur' || b.pastille === 'FACTEUR')) e.push('aucune bulle FACTEUR dans vue=fil')
      const s = await prod('/api/controle/station?vue=salle&salle=envois', { jeton: J })
      const c = (s.donnees?.valeur?.parCanal ?? []).find((y) => y.canal === 'formulaire_site')
      if (!(c?.utilises >= 1) || !(s.donnees?.valeur?.parTechnologie ?? []).some((t) => t.envois >= 1)) e.push('Salle des envois : le canal formulaire_site ou sa technologie ne comptent pas 1 envoi')
      const d = await prod('/api/controle/station?vue=direct', { jeton: J })
      const ev = d.donnees?.valeur?.barre?.valeur?.compteurs?.find((y) => y.cle === 'envois')
      if (!/^[1-9]\d*/.test(esp(ev?.texte))) e.push(`ENVOIS DU JOUR « ${ev?.texte} », au moins 1 attendu`)
      const pg = await page('/controle/station?salle=envois', compte); await pg.p.waitForTimeout(2500)
      e.push(...defauts(await capturer(pg.p, 'constat-envoi.jpg'), 1440, 900)); await pg.fermer()
      S.juger('C1', e, 'le premier formulaire réel : envoyé par facteur_usine avec ses trois pass ; bulle FACTEUR ; canal, technologie et ENVOIS DU JOUR ≥ 1 ; constat-envoi.jpg prise par le script')
    } else if (CONSTAT === 'reunion') {
      const e = []
      const fin = Date.now() + 45 * 60_000
      let vue = false
      while (Date.now() < fin && !vue) {
        const r = await prod('/api/controle/station?vue=salle&salle=reunion', { jeton: J })
        if (r.donnees?.valeur?.enCours) {
          const pg = await page('/controle/station?salle=reunion', compte); await pg.p.waitForTimeout(2500)
          if (!/Réunion en cours/.test(await pg.p.evaluate(() => document.body.innerText))) e.push('« Réunion en cours » absent de la salle de réunion ouverte')
          e.push(...defauts(await capturer(pg.p, 'constat-reunion.jpg'), 1440, 900)); await pg.fermer(); vue = true
        } else await attendre(60_000)
      }
      if (!vue) e.push('aucune réunion en cours en 45 min')
      else {
        while (Date.now() < fin) { const r = await rpc('station_reunion_lire', { p_limite: 1 }); if (r.corps?.[0]?.statut === 'close') break; await attendre(60_000) }
        const r = await rpc('station_reunion_lire', { p_limite: 1 })
        const reu = r.corps?.[0]
        if (reu?.statut !== 'close') e.push('pas de réunion close du jour')
        else { const fil = await prod('/api/controle/station?vue=fil', { jeton: J }); const b = (fil.donnees?.valeur?.bulles ?? []).find((x) => x.type === 'reunion_compte_rendu'); if (!b || JSON.stringify(b.lignes) !== JSON.stringify(reu.lignes)) e.push('les lignes de la réunion close ne sont pas celles de la bulle reunion_compte_rendu') }
      }
      S.juger('C2', e, 'pendant la réunion réelle : « Réunion en cours » (constat-reunion.jpg) ; après : réunion close du jour, ses lignes = la bulle du fil')
    } else {
      const e = []
      const fil = await prod('/api/controle/station?vue=fil', { jeton: J })
      const b = (fil.donnees?.valeur?.bulles ?? []).find((x) => x.type === 'consigne' && x.pastille === 'BENJ')
      if (!b) e.push('aucune bulle BENJ de consigne dans le fil')
      else { const lue = await rpc('pilotage_evenements', { p_apres: b.id, p_limite: 50, p_agent: 'chef', p_types: ['consigne_lue'] }); if (!lue.ok || !Array.isArray(lue.corps) || !lue.corps.length) e.push('aucun consigne_lue du Chef après la consigne') }
      S.juger('C3', e, 'la première consigne de Benj est une bulle BENJ ; un consigne_lue du Chef la suit')
    }
  } finally {
    if (compte && !(await compte.supprimer())) { console.log(`${JUGE} : ménage du compte d'essai en échec`); process.exitCode = 1 }
  }
}
