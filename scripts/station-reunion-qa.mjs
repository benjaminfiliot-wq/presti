// scripts/station-reunion-qa.mjs — le juge du script de réunion du Chef (fiche 026-103), écrit en 026-067 par Claude Code
// AVANT le script qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/station-reunion-qa.mjs [--racine=<d>] [--temoin] [--base=<commit>]
//
// Critères RU-1 à RU-10 de 026-103. Le juge lance <racine>/scripts/chef/reunion.mjs (par node) contre le FAUX BUS
// (s/faux-bus.mjs : un serveur 127.0.0.1 qu'il démarre et arrête lui-même) et le FAUX MODÈLE (s/faux-codex.mjs, passé par
// --codex : un chemin .mjs se lance par node), dans .orchestre/travail/station-reunion-qa/<scénario>/, avec un jeton factice
// tiré au hasard dans la variable PRESTI_JETON_CHEF, le schéma d'essai s/chef-reunion.schema.json (--schema) et la consigne
// d'essai s/consigne-reunion-essai.md (--consigne). Jamais contre la production ; aucun secret lu ; aucun réseau hors de
// 127.0.0.1.
//   --racine=<d>  juge l'arbre <d> (référence, témoin, sabotage).
//   --temoin      prouve le harnais (RU-HARNAIS : le faux bus refuse un corps mal nommé et un jeton faux, consigne chaque
//                 appel ; le faux modèle écrit, scénario par scénario, ce qu'il annonce), puis juge le témoin du lot s
//                 (s/temoin/) posé sur scripts/chef et docs/agents du commit --base (défaut HEAD).
// Le contrat que ce juge FIXE là où 026-103 le laisse ouvert : le modèle se lance comme `codex exec -m <modèle>
// -s read-only -C <travail> --skip-git-repo-check -o <travail>/reunion.json -` (l'entrée sur stdin, le plan dans le fichier
// de -o) ; une idée se poste au contrat de 026-042 ({ question, contexte, options, defaut, montant_cents, portee, echeance,
// cle }) ; la clôture porte les clés des idées.
// Sortie « ✅ ID … » / « ❌ ID … », puis « station-reunion-qa : PASS|FAIL ». Code 0, 1, ou 2 (appel invalide).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, lireOptions, creerSortie, sansCommentaires, importsDe, lancer, lancerAsync, premiereLigne, court, git, exigerSousTravail } from './fixtures/026-pilotage/a/commun.mjs'
import { spawn } from 'node:child_process'
import { S as DS, arbreTemoinS, jeuS, lireRacine, egal } from './fixtures/026-pilotage/s/commun.mjs'
import { demarrerFauxBus, ID_REUNION } from './fixtures/026-pilotage/s/faux-bus.mjs'
import { planDe, SCENARIOS } from './fixtures/026-pilotage/s/faux-codex.mjs'

const JUGE = 'station-reunion-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
let RAC = o.racine
if (o.temoin) {
  const b = git(['rev-parse', '--verify', `${o.valeurs.base || 'HEAD'}^{commit}`])
  if (b.code !== 0) refuser(`--base « ${o.valeurs.base} » introuvable`)
  try { RAC = arbreTemoinS(JUGE, { base: b.stdout.trim(), chemins: ['scripts/chef', 'docs/agents'] }).dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const SCRIPT = path.join(RAC, 'scripts', 'chef', 'reunion.mjs'), DOC = path.join(RAC, 'docs', 'agents', 'reunion.md')
const FAUX_CODEX = path.join(DS, 'faux-codex.mjs'), SCHEMA = path.join(DS, 'chef-reunion.schema.json'), CONSIGNE = path.join(DS, 'consigne-reunion-essai.md')
const TRAV = exigerSousTravail(path.join(TRAVAIL, JUGE))
const IDS = ['RU-1', 'RU-2', 'RU-3', 'RU-4', 'RU-5', 'RU-6', 'RU-7', 'RU-8', 'RU-9', 'RU-10', ...(o.temoin ? ['RU-HARNAIS'] : [])]
const S = creerSortie(JUGE, [...IDS], `${JUGE} — script ${SCRIPT}${o.temoin ? ' — témoin du lot s posé sur le commit de base' : ''} — faux bus 127.0.0.1 et faux modèle`)
// Les chemins de secrets sont assemblés : ce juge est lu à son tour (JA-4 de la preuve) et n'en nomme aucun en clair.
const ENV_LOCAL = ['', 'env', 'local'].join('.'), SECRETS = ['presti', 'secrets'].join('-'), AGENTS_ENV = ['agents', 'env'].join('.')
const vivant = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
/** Qui, du modèle et du petit-enfant du scénario « delai », bat encore (son fichier de battement change en `ms`). Un PID ne
 *  prouve rien sous Windows, qui le réutilise vite ; un battement qui s'arrête, si. */
async function battentEncore(dossier, ms = 1200) {
  const f = { 'le modèle': path.join(dossier, 'faux-codex-battement-modele.txt'), 'le petit-enfant': path.join(dossier, 'faux-codex-battement-petit.txt') }
  const lire = () => Object.fromEntries(Object.entries(f).map(([k, x]) => { try { return [k, fs.readFileSync(x, 'utf8')] } catch { return [k, null] } }))
  const a = lire()
  await dormir(ms)
  const b = lire()
  return Object.keys(f).filter((k) => b[k] !== null && b[k] !== a[k])
}
// Synchrone : un taskkill lancé sans l'attendre meurt avec le juge qui sort juste après (objet de travail de libuv), et le
// petit-enfant détaché du faux modèle survivrait au juge.
const tuer = (pid) => { if (!pid || !vivant(pid)) return; if (process.platform === 'win32') lancer('taskkill', ['/PID', String(pid), '/T', '/F'], { timeout: 15_000 }); else { try { process.kill(pid, 'SIGKILL') } catch { /* parti */ } } }
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))

// ── RU-1 : le script existe, n'importe que node:, ne lit aucun secret ; le jeton vient de la seule variable nommée ────
{
  const e = []
  const src = lireRacine(RAC, 'scripts/chef/reunion.mjs')
  if (src === null) e.push('scripts/chef/reunion.mjs absent')
  else {
    for (const i of importsDe(src)) if (!i.spec || !i.spec.startsWith('node:')) e.push(`importe « ${i.spec ?? '(dynamique)'} » : seulement des modules node:`)
    const chaines = []
    sansCommentaires(src, chaines)
    for (const { texte } of chaines) {
      if (texte.includes(ENV_LOCAL) || texte.includes(SECRETS) || texte.includes(AGENTS_ENV) || /(^|[\\/])\.env$|\.env['"`]?$/.test(texte)) e.push(`nomme un fichier de secrets (« ${court(texte, 50)} »)`)
    }
    const code = sansCommentaires(src)
    if (/@supabase|from\s+['"](?:\.\.?\/)*(?:lib|app)\//.test(code)) e.push('importe @supabase, lib/ ou app/')
    if (/process\.env\.PRESTI_JETON/.test(code)) e.push('lit le jeton par process.env.PRESTI_JETON… en dur, au lieu de la variable nommée par --jeton-env')
    if (!/process\.env\[/.test(code)) e.push('ne lit pas la variable nommée (process.env[<nom>])')
    if (/\bloadEnvFile\b|--env-file|dotenv/.test(code)) e.push('charge un fichier d’environnement')
  }
  S.juger('RU-1', e, 'scripts/chef/reunion.mjs présent ; imports node: seulement ; aucun fichier de secrets nommé ; le jeton lu dans la variable nommée')
  if (e.length) { S.nonJuges(IDS, 'RU-1 en échec (script absent ou fautif)'); process.exit(S.finir()) }
}

// ── Le banc : un scénario = un faux bus, un faux modèle, un lancement ────────────────────────────────────────────────
let n = 0
async function lancerScenario(nom, { bus = {}, codex = 'conforme', sec = false, delai = 30, schema = SCHEMA, consigne = CONSIGNE, sansJeton = false } = {}) {
  const dossier = exigerSousTravail(path.join(TRAV, `${++n}-${nom}`))
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(dossier, { recursive: true })
  const jeton = `jeton-essai-${crypto.randomBytes(12).toString('hex')}`
  const b = await demarrerFauxBus({ jeton, scenario: bus })
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^PRESTI_|^FAUX_CODEX_/.test(k)))
  Object.assign(env, { PRESTI_JETON_CHEF: sansJeton ? '' : jeton, FAUX_CODEX_SCENARIO: codex, FAUX_CODEX_JETON_INVERSE: [...jeton].reverse().join('') })
  const args = [SCRIPT, `--base=${b.base}`, '--jeton-env=PRESTI_JETON_CHEF', '--modele=gpt-6-sol', `--codex=${FAUX_CODEX}`, `--consigne=${consigne}`, `--schema=${schema}`, `--travail=${dossier}`, `--delai=${delai}`, ...(sec ? ['--sec'] : [])]
  const t0 = Date.now()
  let r
  try { r = await lancerAsync(process.execPath, args, { cwd: R, env, timeout: (delai + 60) * 1000 }) } finally { await b.arreter() }
  const lire = (f) => { try { return fs.readFileSync(path.join(dossier, f), 'utf8') } catch { return null } }
  const journal = fs.readdirSync(dossier).filter((f) => /^reunion-\d{4}-\d{2}-\d{2}\.log$/.test(f)).map((f) => lire(f)).join('\n')
  let appelModele = null, pids = null
  try { appelModele = JSON.parse(lire('faux-codex-appel.json')) } catch { /* pas lancé */ }
  try { pids = JSON.parse(lire('faux-codex-pids.json')) } catch { /* pas lancé */ }
  return { code: r.code, sortie: r.sortie, duree: (Date.now() - t0) / 1000, appels: b.appels, journal, entree: lire('reunion-entree.md'), appelModele, pids, jeton, dossier }
}
const suite = (appels) => appels.map((a) => `${a.methode} ${a.chemin}${a.corps?.action ? ` ${a.corps.action}` : ''}`)
const abandons = (appels) => appels.filter((a) => a.corps?.action === 'abandonner')

// ── Tous les scénarios, lancés d'avance, quatre à la fois (chacun son faux bus, son dossier, son jeton) ────────────────
const DELAI_ESSAI = 5
const SCENARIOS_BANC = [
  ['delai', { codex: 'delai', delai: DELAI_ESSAI }],
  ['conforme', {}],
  ['conforme-bis', { bus: { chiffresValeur: { formulaires_hier: 3, oui_hier: 0 }, evenements: [{ id: 5, le: '2026-10-23T08:00:00Z', agent: 'systeme', type: 'consigne', objet: 'fondateur', resume: 'Consigne bis du Témoin' }] } }],
  ...['six-lignes', 'ligne-141', 'arobase', 'quatre-idees', 'cle-hors-format', 'options-autres', 'vide'].map((sc) => [`refus-${sc}`, { codex: sc }]),
  ['rien-deja_tenue', { bus: { ouvrir: 'deja_tenue' } }], ['rien-pause', { bus: { ouvrir: 'pause' } }],
  ['panne-chiffres', { bus: { chiffres: 'panne' } }], ['a-sec', { sec: true }],
  ['prealable-sans-schema', { schema: path.join(TRAV, 'schema-absent.json') }], ['prealable-sans-consigne', { consigne: path.join(TRAV, 'consigne-absente.md') }], ['prealable-sans-jeton', { sansJeton: true }],
]
const BANC = new Map()
{
  const file = [...SCENARIOS_BANC]
  await Promise.all(Array.from({ length: 4 }, async () => { for (let x = file.shift(); x; x = file.shift()) BANC.set(x[0], await jouerBanc(x[0], x[1])) }))
}
async function jouerBanc(nom, opts) { try { return await lancerScenario(nom, opts) } catch (err) { return { erreur: premiereLigne(err), code: null, sortie: '', duree: 0, appels: [], journal: '', entree: null, appelModele: null, pids: null, jeton: '' } } }
const resultat = (nom) => { const r = BANC.get(nom); if (!r) throw new Error(`scénario ${nom} non joué`); if (r.erreur) throw new Error(`scénario ${nom} : ${r.erreur}`); return r }
const trace = (r) => ` [journal : ${court(r.journal.trim().split(/\r?\n/).slice(-4).join(' | '), 200) || 'vide'} ; sortie : ${court(r.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 160) || 'vide'}]`

// ── RU-2 à RU-9 ────────────────────────────────────────────────────────────────────────────────────────────────────────
const conforme = BANC.get('conforme')
const plan = planDe('conforme')
await S.critere('RU-2', () => {
  resultat('conforme')
  const e = []
  const attendu = ['POST /api/agents/reunion ouvrir', 'GET /api/agents/reunion/chiffres', 'GET /api/agents/evenements', ...plan.idees.map(() => 'POST /api/agents/decisions'), 'POST /api/agents/reunion clore']
  if (conforme.code !== 0) e.push(`code ${conforme.code}, 0 attendu (${court(conforme.sortie.trim().split(/\r?\n/).pop(), 100)})`)
  if (suite(conforme.appels).join(' → ') !== attendu.join(' → ')) e.push(`appels : ${suite(conforme.appels).join(' → ') || 'aucun'} ; ${attendu.join(' → ')} attendus`)
  for (const a of conforme.appels) if (a.statut >= 400) e.push(`${a.methode} ${a.chemin} → ${a.statut} (${a.corps && a.statut === 400 ? 'corps mal nommé' : 'refus'})`)
  const dec = conforme.appels.filter((a) => a.chemin === '/api/agents/decisions').map((a) => a.corps)
  if (dec.some((d) => d && ('engage_cents' in d || 'cle_idempotence' in d || 'option_defaut' in d))) e.push('une décision postée hors du contrat de 026-042 (engage_cents, cle_idempotence ou option_defaut)')
  if (canonCles(dec) !== canonCles(plan.idees.map((i) => i.cle_idempotence))) e.push(`décisions postées ${JSON.stringify(dec.map((d) => d?.cle))}, les clés des idées du plan attendues`)
  const clore = conforme.appels.find((a) => a.corps?.action === 'clore')?.corps
  if (clore && (!egal(clore.lignes, plan.lignes) || !egal(clore.objectif, plan.objectif) || !egal(clore.idees, plan.idees.map((i) => i.cle_idempotence)) || clore.id !== ID_REUNION)) e.push(`clôture ${court(JSON.stringify(clore), 120)} : l’id ouvert, les lignes, l’objectif et les clés des idées du plan attendus`)
  const x = conforme.entree ?? ''
  const i = x.indexOf('<donnees_etat>'), j = x.indexOf('</donnees_etat>')
  if (i < 0 || j < i) e.push('reunion-entree.md sans <donnees_etat> … </donnees_etat>')
  else {
    const dedans = x.slice(i, j)
    if (!/formulaires_hier/.test(dedans)) e.push('les chiffres servis ne sont pas entre les marques')
    for (const c of jeuS('evenements.json').evenements.filter((z) => z.type === 'consigne')) if (!dedans.includes(c.resume)) e.push(`la consigne « ${court(c.resume, 40)} » n’est pas entre les marques`)
    if (/formulaires_hier|Ralentis/.test(x.slice(0, i) + x.slice(j))) e.push('des données hors des marques')
  }
  return { echecs: e, detail: `ouvrir → chiffres → événements → ${plan.idees.length} décisions au contrat de 026-042 → clore (lignes, objectif, clés des idées) ; code 0 ; chiffres et consignes entre <donnees_etat> et </donnees_etat>` }
})
function canonCles(l) { return JSON.stringify([...l].map((x) => (typeof x === 'string' ? x : x?.cle)).sort()) }
try {
  // « rien d'autre de variable » : d'autres chiffres, d'autres consignes → la même entrée hors des marques.
  const bis = resultat('conforme-bis')
  const hors = (x) => { const t = x ?? ''; const i = t.indexOf('<donnees_etat>'), j = t.indexOf('</donnees_etat>'); return i < 0 || j < 0 ? null : t.slice(0, i) + t.slice(j) }
  if (hors(bis.entree) === null || hors(bis.entree) !== hors(conforme.entree)) S.echoue('RU-2', 'reunion-entree.md change hors des marques quand seuls les chiffres et les consignes changent (quelque chose d’autre de variable)')
  if (bis.code !== 0) S.echoue('RU-2', `second scénario conforme : code ${bis.code}`)
} catch (err) { S.echoue('RU-2', premiereLigne(err)) }
await S.critere('RU-3', async () => {
  const e = [], vus = []
  for (const sc of ['six-lignes', 'ligne-141', 'arobase', 'quatre-idees', 'cle-hors-format', 'options-autres', 'vide']) {
    const r = resultat(`refus-${sc}`)
    const motif = sc === 'vide' ? 'modele_muet' : 'plan_refuse'
    const ab = abandons(r.appels)
    if (r.code !== 1) e.push(`${sc} : code ${r.code}, 1 attendu${trace(r)}`)
    if (r.appels.some((a) => a.chemin === '/api/agents/decisions')) e.push(`${sc} : une décision postée`)
    if (r.appels.some((a) => a.corps?.action === 'clore')) e.push(`${sc} : réunion close`)
    if (ab.length !== 1 || ab[0].corps.motif !== motif || ab[0].corps.id !== ID_REUNION) e.push(`${sc} : ${ab.length} abandon(s) (${ab.map((a) => a.corps.motif).join(', ')}), un seul avec « ${motif} » attendu${trace(r)}`)
    vus.push(sc)
  }
  return { echecs: e, detail: `${vus.join(', ')} : aucune décision, aucune clôture, un abandon « plan_refuse » (« modele_muet » pour la sortie vide), code 1` }
})
await S.critere('RU-4', async () => {
  const e = []
  const r = resultat('delai')
  try {
    if (r.code !== 1) e.push(`code ${r.code}, 1 attendu${trace(r)}`)
    const ab = abandons(r.appels)
    if (ab.length !== 1 || ab[0].corps.motif !== 'delai') e.push(`abandon ${JSON.stringify(ab.map((a) => a.corps.motif))}, un seul « delai » attendu${trace(r)}`)
    if (r.duree > DELAI_ESSAI + 30) e.push(`fini en ${r.duree.toFixed(1)} s, au-delà du délai plus 30 s`)
    if (!r.pids?.modele || !r.pids?.petit_enfant) e.push('le faux modèle n’a pas été lancé (ou n’a pas noté ses PID)')
    else if (!fs.existsSync(path.join(r.dossier, 'faux-codex-battement-modele.txt')) || !fs.existsSync(path.join(r.dossier, 'faux-codex-battement-petit.txt'))) e.push('aucun battement du faux modèle ou de son petit-enfant : ils n’ont pas tourné jusqu’au délai')
    else {
      const encore = await battentEncore(r.dossier)
      if (encore.length) e.push(`${encore.join(' et ')} du faux modèle bat encore : l’arbre n’a pas été tué entier`)
    }
  } finally { if (r.pids) for (const [qui, p] of Object.entries(r.pids)) if ((await battentEncore(r.dossier, 400)).includes(qui === 'modele' ? 'le modèle' : 'le petit-enfant')) tuer(p) }
  return { echecs: e, detail: `modèle muet au-delà de ${DELAI_ESSAI} s : arbre tué (modèle et petit-enfant), abandon « delai », code 1, fini en ${r.duree.toFixed(1)} s` }
})
await S.critere('RU-5', async () => {
  const e = []
  for (const x of ['deja_tenue', 'pause']) {
    const r = resultat(`rien-${x}`)
    if (r.code !== 0) e.push(`ouvrir → 409 ${x} : code ${r.code}, 0 attendu`)
    if (suite(r.appels).join(' → ') !== 'POST /api/agents/reunion ouvrir') e.push(`ouvrir → 409 ${x} : appels ${suite(r.appels).join(' → ')}, aucun autre attendu`)
  }
  return { echecs: e, detail: '409 deja_tenue, puis 409 pause : aucun autre appel, code 0' }
})
await S.critere('RU-6', async () => {
  const e = []
  const r = resultat('panne-chiffres')
  if (r.code !== 1) e.push(`code ${r.code}, 1 attendu`)
  const ab = abandons(r.appels)
  if (ab.length !== 1 || ab[0].corps.motif !== 'erreur') e.push(`abandon ${JSON.stringify(ab.map((a) => a.corps.motif))}, un seul « erreur » attendu${trace(r)}`)
  if (r.appels.some((a) => a.chemin === '/api/agents/decisions' || a.corps?.action === 'clore')) e.push('une décision ou une clôture après la panne')
  return { echecs: e, detail: 'chiffres → 503 après l’ouverture : abandon « erreur » dans le finally, code 1' }
})
await S.critere('RU-7', async () => {
  const e = []
  const r = resultat('a-sec')
  if (r.code !== 0) e.push(`code ${r.code}, 0 attendu`)
  const posts = r.appels.filter((a) => a.methode === 'POST')
  if (posts.length) e.push(`${posts.length} POST consigné(s) à sec (${suite(posts).join(', ')})`)
  if (!r.sortie.includes(plan.lignes[0]) || !r.sortie.includes(plan.idees[0].cle_idempotence)) e.push('le plan qu’il aurait posté n’est pas imprimé')
  return { echecs: e, detail: '--sec : aucun POST, le plan imprimé, code 0' }
})
await S.critere('RU-8', () => {
  resultat('conforme')
  const e = []
  const j = conforme.jeton
  if (conforme.sortie.includes(j)) e.push('le jeton sur la sortie')
  if (conforme.journal.includes(j)) e.push('le jeton dans le journal')
  if (!conforme.journal.trim()) e.push('journal reunion-<AAAA-MM-JJ>.log absent ou vide')
  if ((conforme.entree ?? '').includes(j)) e.push('le jeton dans reunion-entree.md')
  const m = conforme.appelModele
  if (!m) e.push('le faux modèle n’a rien consigné (pas lancé ?)')
  else {
    if (m.args.join(' ').includes(j)) e.push('le jeton dans les arguments du modèle')
    if (m.variables_avec_le_jeton.length) e.push(`le jeton dans l’environnement du modèle (${m.variables_avec_le_jeton.join(', ')})`)
    if (m.entree_a_le_jeton) e.push('le jeton dans l’entrée du modèle (stdin)')
    if (!m.args.includes('gpt-6-sol')) e.push(`le modèle demandé (gpt-6-sol) absent des arguments : ${court(m.args.join(' '), 120)}`)
    if (!m.args.includes('read-only')) e.push(`aucun bac à sable en lecture seule dans les arguments : ${court(m.args.join(' '), 120)}`)
  }
  return { echecs: e, detail: 'jeton factice absent de la sortie, du journal, de reunion-entree.md, des arguments, de l’entrée et de l’environnement du modèle ; arguments : gpt-6-sol et read-only' }
})
await S.critere('RU-9', async () => {
  const e = []
  // Les trois préalables : joués d’avance dans le banc.
  for (const [quoi, x] of [['sans schéma', 'prealable-sans-schema'], ['sans consigne', 'prealable-sans-consigne'], ['sans jeton', 'prealable-sans-jeton']]) {
    const r = resultat(x)
    if (r.code !== 3) e.push(`${quoi} : code ${r.code}, 3 attendu`)
    if (r.appels.length) e.push(`${quoi} : ${r.appels.length} appel(s) au bus, aucun attendu`)
    if (r.appelModele) e.push(`${quoi} : le modèle a été lancé`)
  }
  const essai = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'))
  const reel = lireRacine(RAC, 'docs/agents/chef-reunion.schema.json')
  let compare = 'docs/agents/chef-reunion.schema.json absent de la racine (026-102) : rien à comparer'
  if (reel !== null) {
    let s = null
    try { s = JSON.parse(reel) } catch { e.push('docs/agents/chef-reunion.schema.json illisible') }
    if (s) {
      const b = (x) => ({
        lignes: x?.properties?.lignes?.maxItems, signes: x?.properties?.lignes?.items?.maxLength, idees: x?.properties?.idees?.maxItems,
        cle: x?.properties?.idees?.items?.properties?.cle_idempotence?.pattern, options: JSON.stringify([...(x?.properties?.idees?.items?.properties?.options?.items?.properties?.cle?.enum ?? [])].sort()),
      })
      const a = b(essai), r = b(s)
      for (const k of Object.keys(a)) if (a[k] !== r[k]) e.push(`schéma du dépôt : ${k} = ${JSON.stringify(r[k])}, ${JSON.stringify(a[k])} (schéma d’essai) attendu`)
      compare = 'docs/agents/chef-reunion.schema.json : mêmes bornes que le schéma d’essai (5 lignes, 140 signes, 3 idées, format de clé, lancer et reporter)'
    }
  }
  return { echecs: e, detail: `sans schéma, sans consigne ou sans jeton : code 3, aucun appel, aucun modèle ; ${compare}` }
})
await S.critere('RU-10', () => {
  const e = []
  const d = lireRacine(RAC, 'docs/agents/reunion.md')
  if (d === null || !d.trim()) e.push('docs/agents/reunion.md absent ou vide')
  else {
    if (!/18\s*h/.test(d)) e.push('l’heure (18 h) n’est pas citée')
    if (!/usine/i.test(d)) e.push('l’usine n’est pas citée')
    if (!/--sec|à sec/.test(d)) e.push('le lancement à sec n’est pas cité')
    for (const c of [0, 1, 2, 3, 5]) if (!new RegExp(`(?:\`${c}\`|\\b${c}\\s*[:—–-])`).test(d)) e.push(`le code de sortie ${c} n’est pas cité`)
    if (!/jamais/i.test(d) || !/envo/i.test(d) || !/dépens/i.test(d) || !/approuv/i.test(d)) e.push('la phrase sur ce que la réunion ne fait jamais (envoyer, dépenser, approuver) manque')
  }
  return { echecs: e, detail: 'docs/agents/reunion.md : 18 h, l’usine, le lancement à sec, les cinq codes, ce qu’elle ne fait jamais' }
})

// ── RU-HARNAIS (--temoin) : le faux bus et le faux modèle font ce qu'ils annoncent ─────────────────────────────────────
if (o.temoin) {
  await S.critere('RU-HARNAIS', async () => {
    const e = []
    const jeton = `jeton-essai-${crypto.randomBytes(8).toString('hex')}`
    const b = await demarrerFauxBus({ jeton, scenario: {} })
    const post = (ch, corps, j = jeton) => fetch(`${b.base}${ch}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(j ? { authorization: `Bearer ${j}` } : {}) }, body: JSON.stringify(corps) }).then((r) => r.status)
    try {
      const s1 = await post('/api/agents/reunion', { action: 'ouvrir' }, 'jeton-faux')
      const s2 = await post('/api/agents/reunion', { action: 'ouvrir', agent: 'chef' })
      const s3 = await post('/api/agents/decisions', { ...planDe('conforme').idees[0] })
      const s4 = await post('/api/agents/reunion', { action: 'ouvrir' })
      if (s1 !== 401) e.push(`faux bus : jeton faux → ${s1}, 401 attendu`)
      if (s2 !== 400) e.push(`faux bus : ouvrir avec une clé en trop → ${s2}, 400 attendu`)
      if (s3 !== 400) e.push(`faux bus : une idée au format du plan (cle_idempotence, option_defaut) postée telle quelle → ${s3}, 400 attendu`)
      if (s4 !== 200) e.push(`faux bus : ouvrir conforme → ${s4}, 200 attendu`)
      if (b.appels.length !== 4 || b.appels.map((a) => a.statut).join(',') !== '401,400,400,200' || b.appels.some((a) => JSON.stringify(a).includes(jeton))) e.push(`faux bus : ${b.appels.length} appels consignés (${b.appels.map((a) => a.statut).join(',')}), quatre dans l’ordre et sans le jeton attendus`)
    } finally { await b.arreter() }
    const d = exigerSousTravail(path.join(TRAV, 'harnais-modele'))
    fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true })
    for (const sc of SCENARIOS.filter((x) => x !== 'delai')) {
      const sortie = path.join(d, `${sc}.json`)
      const r = lancer(process.execPath, [FAUX_CODEX, 'exec', '-m', 'gpt-6-sol', '-s', 'read-only', '-C', d, '--skip-git-repo-check', '-o', sortie, '-'], { cwd: d, env: { ...process.env, FAUX_CODEX_SCENARIO: sc }, entree: 'entrée d’essai du harnais', timeout: 30_000 })
      const t = fs.existsSync(sortie) ? fs.readFileSync(sortie, 'utf8') : null
      const p = t ? JSON.parse(t) : null
      const ok = {
        conforme: p && p.lignes.length >= 1 && p.lignes.length <= 5 && p.idees.length <= 3 && p.idees.every((i) => /^chef:\d{4}-\d{2}-\d{2}:idee-[a-z0-9-]{3,75}$/.test(i.cle_idempotence) && i.options.map((x) => x.cle).sort().join() === 'lancer,reporter'),
        'six-lignes': p?.lignes?.length === 6, 'ligne-141': p?.lignes?.some((l) => [...l].length === 141), arobase: p?.lignes?.some((l) => l.includes('@')),
        'quatre-idees': p?.idees?.length === 4, 'cle-hors-format': p?.idees?.some((i) => !/^chef:\d{4}-\d{2}-\d{2}:idee-/.test(i.cle_idempotence)),
        'options-autres': p?.idees?.some((i) => i.options.map((x) => x.cle).sort().join() !== 'lancer,reporter'), vide: t === '',
      }[sc]
      if (r.code !== 0 || !ok) e.push(`faux modèle « ${sc} » : code ${r.code}, écrit ${t === null ? 'rien' : `${t.length} signes`} — pas ce que le scénario annonce`)
    }
    // Les scénarios précédents ont laissé leur faux-codex-pids.json dans ce dossier : il est retiré avant, sinon on lirait le
    // leur (sans petit-enfant) avant que « delai » n'ait écrit le sien.
    fs.rmSync(path.join(d, 'faux-codex-pids.json'), { force: true })
    const x = spawn(process.execPath, [FAUX_CODEX, 'exec', '-o', path.join(d, 'delai.json'), '-'], { cwd: d, env: { ...process.env, FAUX_CODEX_SCENARIO: 'delai' }, stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true })
    x.stdin.on('error', () => {})
    x.stdin.end('entrée d’essai du harnais')
    let pids = null
    for (let k = 0; k < 60 && !pids?.petit_enfant; k++) { await dormir(250); try { pids = JSON.parse(fs.readFileSync(path.join(d, 'faux-codex-pids.json'), 'utf8')) } catch { /* pas encore */ } }
    const battent = await battentEncore(d)
    if (!pids?.petit_enfant || x.exitCode !== null || battent.length !== 2 || fs.existsSync(path.join(d, 'delai.json'))) e.push(`faux modèle « delai » : il doit tourner sans rien écrire, avec un petit-enfant (battent : ${battent.join(', ') || 'aucun'})`)
    // Le modèle est notre enfant direct : son arbre se tue par son PID, tant qu'il vit ; le petit-enfant, seulement s'il bat encore.
    if (x.exitCode === null) tuer(x.pid)
    await dormir(300)
    if ((await battentEncore(d, 400)).includes('le petit-enfant') && pids?.petit_enfant) tuer(pids.petit_enfant)
    return { echecs: e, detail: `faux bus : jeton faux → 401, corps mal nommé → 400 (clé en trop, idée au format du plan), chaque appel consigné sans le jeton ; faux modèle : ${SCENARIOS.length - 1} scénarios écrivent ce qu’ils annoncent, « delai » ne rend pas la main (petit-enfant compris)` }
  })
}
process.exit(S.finir())
