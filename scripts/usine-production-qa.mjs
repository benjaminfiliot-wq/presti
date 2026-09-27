#!/usr/bin/env node
// scripts/usine-production-qa.mjs — le juge de la production sur l'usine : le tourneur du livreur de sites
// (scripts/usine/tourneur.mjs et sa table capacites.mjs), les unités systemd de l'atelier et du livreur, et
// docs/agents/usine-production.md (fiche 026-057) ; puis, en --reel, la mise en service et l'épreuve PC éteint (026-143).
// Écrit par Claude Code (fiche 026-052) AVANT ce qu'il juge. Lancé avec scripts/ts-loader.mjs.
//
// Le juge lance le tourneur POUR DE VRAI, sur le poste (c'est la preuve qu'il est reprenable par le poste), contre un faux
// bus et un faux stockage (fixtures/026/usine-production/faux-bus-usine.mjs), depuis une COPIE de l'arbre jugé où la table
// scripts/usine/capacites.mjs est enveloppée : sa commande « livraison » devient le faux fabricant
// (fixtures/026/usine-production/fabricants/faux-fabricant.mjs). Jamais par une variable d'environnement.
// La copie porte scripts/usine/, scripts/lib/, scripts/instantane-quotidien.mjs, scripts/ts-loader.mjs et lib/agents/.
// Le juge COMPTE les requêtes reçues par le faux bus, les PUT reçus par le faux stockage et leurs octets ; il DÉCODE les
// fichiers déposés ; il TIRE les jetons au hasard et les cherche partout ; il lit les unités par un analyseur INI.
//
//   tourneur  UT-1 file vide · UT-2 une livraison de bout en bout · UT-3 l'environnement du fabricant · UT-4 délai (arbre tué)
//             · UT-5 sorties fautives · UT-6 secret · UT-7 fabricant en échec · UT-8 charge ou capacité fautive · UT-9
//             ressources · UT-10 verrou · UT-11 journal sans donnée · UT-12 jeton et --base · UT-13 erreurs du bus · UT-14
//             fichier hors manifeste · UT-15 tout ou rien · UT-16 --max · UT-17 limites lues dans usineLimites.json
//   unites    UN-1 atelier · UN-2 livreur · UN-3 docs/agents/usine-production.md
//   --reel    PR-R1 minuteurs et services · PR-R2 journaux récents · PR-R3 l'atelier bat · PR-R4 une livraison d'essai réelle ·
//             PR-R5 l'épreuve PC éteint (--epreuve=preparer avant l'arrêt, --epreuve=conclure au retour)
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/usine-production-qa.mjs [--groupe=tourneur,unites] [--racine=<copie>]
//         [--critere=UT-4] | --preuve-echecs | --reel [--epreuve=preparer|conclure]
// Codes : 0 vert · 1 un critère rouge · 2 préalable manquant ou argument invalide. Tout se passe sous
// .orchestre/travail/usine-production-qa/ (et, en --preuve-echecs, la section du juge dans echecs-attendus.md).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as K from './fixtures/026/usine-production/commun.mjs'
import { demarrerFauxBusUsine } from './fixtures/026/usine-production/faux-bus-usine.mjs'
import { creerRapport, lireEnvLocal } from './lib/sql-essai.mjs'
import { sansCommentaires as sansCommentairesJs } from './webhook-muet-qa.mjs'

const NOM = 'usine-production-qa'
const FICHIER = fileURLToPath(import.meta.url)
const DEPOT = K.DEPOT
const C = K.CONTRAT
const GROUPES = {
  tourneur: ['UT-1', 'UT-2', 'UT-3', 'UT-4', 'UT-5', 'UT-6', 'UT-7', 'UT-8', 'UT-9', 'UT-10', 'UT-11', 'UT-12', 'UT-13', 'UT-14', 'UT-15', 'UT-16', 'UT-17'],
  unites: ['UN-1', 'UN-2', 'UN-3'],
}
const TOUS = [...GROUPES.tourneur, ...GROUPES.unites]
const FABRICANT = path.join(K.FIX, 'fabricants', 'faux-fabricant.mjs')
const TACHES = JSON.parse(fs.readFileSync(path.join(K.FIX, 'taches', 'taches.json'), 'utf8'))
const MEMINFO_1GO = path.join(K.FIX, 'meminfo-1go')
const TRAVAIL = K.dossierTravail(NOM)
const ENV_FABRICANT = C.tourneur.env_du_fabricant
// Variables que libuv ajoute d'office à l'environnement d'un enfant sous Windows (src/win/process.c, required_vars).
const LIBUV_WIN = ['HOMEDRIVE', 'HOMEPATH', 'LOGONSERVER', 'PATH', 'SYSTEMDRIVE', 'SYSTEMROOT', 'TEMP', 'USERDOMAIN', 'USERNAME', 'USERPROFILE', 'WINDIR']
const OK_SITE = [['site/index.html', 'text/html'], ['site/site.json', 'application/json'], ['site/styles.css', 'text/css'], ['site/images/photo.webp', 'image/webp'], ['rapport-qa.json', 'application/json']]
const { court, lf, posix } = K
const res = (echecs, resume = '') => ({ ok: echecs.length === 0, echecs, resume })
const cleChemin = (p) => { const x = path.resolve(String(p)); return K.WIN ? x.toLowerCase() : x }
// Un passage de sabotage (lancé par --preuve-echecs dans son espace, voir commun.mjs) n'a besoin que du premier rouge : les
// critères à plusieurs passages s'y arrêtent au premier échec. Un passage ordinaire va toujours au bout (tous les défauts dits).
const PRESSE = !!K.ESPACE

// ── Arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2)
const CONNUS = ['groupe', 'racine', 'critere', 'preuve-echecs', 'reel', 'epreuve']
function lireArgs() {
  for (const a of ARGS) {
    const m = /^--([a-z-]+)(=.*)?$/.exec(a)
    if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (--groupe=, --racine=, --critere=, --preuve-echecs, --reel, --epreuve=)`); process.exit(2) }
  }
  const opt = (n) => { const a = ARGS.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) }
  const o = { racine: typeof opt('racine') === 'string' ? path.resolve(opt('racine')) : DEPOT, critere: typeof opt('critere') === 'string' ? opt('critere') : null, preuve: !!opt('preuve-echecs'), reel: !!opt('reel'), epreuve: opt('epreuve') }
  const g = typeof opt('groupe') === 'string' ? opt('groupe').split(',').map((x) => x.trim()).filter(Boolean) : ['tourneur', 'unites']
  for (const x of g) if (!GROUPES[x]) { console.error(`✗ ${NOM} : groupe inconnu « ${x} » (tourneur, unites)`); process.exit(2) }
  o.ids = o.critere ? [o.critere] : TOUS.filter((id) => g.some((x) => GROUPES[x].includes(id)))
  if (o.critere && !TOUS.includes(o.critere)) { console.error(`✗ ${NOM} : --critere=${o.critere} inconnu`); process.exit(2) }
  if (!K.existe(o.racine)) { console.error(`✗ ${NOM} : racine introuvable : ${o.racine}`); process.exit(2) }
  if (o.epreuve !== undefined && !(o.reel && ['preparer', 'conclure'].includes(o.epreuve))) { console.error(`✗ ${NOM} : --epreuve=preparer|conclure ne va qu'avec --reel`); process.exit(2) }
  return o
}

// ══ La copie de l'arbre jugé, la table enveloppée ═════════════════════════════════════════════════════════════════════
const TOURNEUR = C.tourneur.fichier, TABLE = C.tourneur.table, LIMITES = C.routes.limites_lib
const DOSSIER_CAS = path.join(TRAVAIL, 'cas & essai') // une espace et un « & » : le fabricant doit être lancé sans shell
const CONSIGNE = path.join(DOSSIER_CAS, 'consigne du fabricant')
const absents = (racine) => [TOURNEUR, TABLE].filter((r) => !K.existe(path.join(racine, r)))
function copierSi(de, vers) { if (K.existe(de)) fs.cpSync(de, vers, { recursive: true }) }
/** Une copie de ce que le tourneur lit, où capacites.mjs enveloppe la table d'origine (commande → faux fabricant). */
function preparerCopie(racine, nom = 'copie', { limites = null } = {}) {
  const d = K.vider(path.join(TRAVAIL, nom))
  copierSi(path.join(racine, 'scripts', 'usine'), path.join(d, 'scripts', 'usine'))
  copierSi(path.join(racine, 'scripts', 'lib'), path.join(d, 'scripts', 'lib'))
  for (const f of ['scripts/instantane-quotidien.mjs', 'scripts/ts-loader.mjs']) copierSi(path.join(racine, f), path.join(d, f))
  copierSi(path.join(racine, 'lib', 'agents'), path.join(d, 'lib', 'agents'))
  if (limites) fs.writeFileSync(path.join(d, LIMITES), JSON.stringify(limites, null, 2))
  const table = path.join(d, TABLE)
  if (!K.existe(table)) return d
  fs.renameSync(table, path.join(path.dirname(table), 'capacites-origine-juge.mjs'))
  const faux = ['{node}', FABRICANT, '--entree={entree}', '--sortie={sortie}', `--consigne=${CONSIGNE}`]
  fs.writeFileSync(table, [
    `// Table de la copie du juge ${NOM} (026-052) : la table d'origine, dont la commande « livraison » est remplacée par le`,
    '// faux fabricant (jamais par une variable d\'environnement).',
    "import * as O from './capacites-origine-juge.mjs'",
    "export * from './capacites-origine-juge.mjs'",
    `const FAUX = ${JSON.stringify(faux)}`,
    'let C = O.CAPACITES',
    'try { C.livraison.commande = FAUX } catch { /* table gelée */ }',
    'if (!C || !C.livraison || C.livraison.commande !== FAUX) C = { ...(O.CAPACITES || {}), livraison: { ...((O.CAPACITES || {}).livraison || {}), commande: FAUX } }',
    'export const CAPACITES = C',
    'export default C',
    '',
  ].join('\n'))
  return d
}

// ── les tâches, les entrées, le passage ──
const ENTREES = TACHES.entrees.map((e) => ({ nom: e.nom, type: e.type, octets: fs.readFileSync(path.join(DEPOT, e.source)) }))
const COMMANDE_JSON = JSON.parse(ENTREES.find((e) => e.nom === 'commande.json').octets.toString('utf8'))
const valeursPrivees = () => {
  const v = []
  const prendre = (o, chemin) => chemin.split('.').reduce((x, k) => (x && typeof x === 'object' ? x[k] : undefined), o)
  for (const c of TACHES.valeurs_a_ne_jamais_journaliser) { const x = prendre(COMMANDE_JSON, c); if (typeof x === 'string' && x.length >= 6) v.push(x) }
  return v
}
const modes = new Map()
function tache(modele = 'valide', mode = 'ok-site') {
  const m = TACHES[modele]
  const commande = crypto.randomUUID()
  const charge = JSON.parse(JSON.stringify(m.charge).replaceAll('{commande}', commande))
  modes.set(commande, mode)
  return { id: crypto.randomUUID(), type: m.type, cle_idempotence: `livrer_site:${commande}`, objet: m.objet, capacite: m.capacite, charge, tentatives: m.tentatives, bail_jusqua: new Date(Date.now() + 30 * 60_000).toISOString(), origine_id: m.origine_id, profondeur: m.profondeur }
}
const jetonAgent = () => ['pa', 'livreur_usine', crypto.randomBytes(32).toString('base64url')].join('_')
function envTourneur({ jeton, sansJeton = false, extra = {} } = {}) {
  const e = {}
  for (const [k, v] of Object.entries(process.env)) if (/^(systemroot|windir|systemdrive|temp|tmp|comspec|pathext|userprofile|homedrive|homepath|username|userdomain|logonserver)$/i.test(k)) e[k] = v
  const home = path.join(TRAVAIL, 'maison'); fs.mkdirSync(home, { recursive: true })
  Object.assign(e, { PATH: [path.dirname(process.execPath), process.env.PATH || process.env.Path || ''].filter(Boolean).join(path.delimiter), HOME: home, LANG: 'fr_FR.UTF-8', TZ: 'Europe/Paris', PLAYWRIGHT_BROWSERS_PATH: path.join(TRAVAIL, 'navigateurs'), CODEX_LANCEUR: path.join(TRAVAIL, 'presti-ia-modele-essai') })
  if (!sansJeton) e[C.capacites.livraison.jeton] = jeton
  return { ...e, ...extra }
}
/** Dix variables en plus, aux valeurs tirées : aucune ne doit atteindre le fabricant. */
function dixVariables() {
  const noms = ['PRESTI_JETON_ATELIER', 'PRESTI_JETON_CHEF', 'ANTHROPIC_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'PRESTI_FABRICANT', 'PRESTI_COMMANDE_LIVRAISON', 'USINE_COMMANDE', 'GITHUB_TOKEN', 'PRESTI_URL']
  return Object.fromEntries(noms.map((n) => [n, n === 'PRESTI_URL' ? 'http://192.0.2.10:9' : K.lettres(28)]))
}
let numeroCas = 0
/**
 * Un passage du tourneur de la copie contre un faux bus neuf. → { r, bus, journal: [lignes], appels: [consignes du fabricant],
 * travail, jeton }. `avant(bus)` règle le faux bus ; `args` s'ajoutent (--max, --delai-s, --meminfo, --base…).
 */
async function passage(copie, { taches = [], args = [], env = null, avant = null, delaiMs = 90_000, meminfo = true, base = null, travail = null, garder = false } = {}) {
  const jeton = jetonAgent()
  const entrees = Object.fromEntries(taches.map((t) => [t.id, ENTREES]))
  const bus = await demarrerFauxBusUsine({ jeton, taches, entrees, contrat: C })
  if (avant) avant(bus)
  fs.mkdirSync(CONSIGNE, { recursive: true })
  fs.writeFileSync(path.join(CONSIGNE, 'modes.json'), JSON.stringify(Object.fromEntries(modes)))
  const t = travail || path.join(DOSSIER_CAS, `passage ${++numeroCas}`)
  if (!travail) K.vider(t)
  const mi = path.join(TRAVAIL, 'meminfo-8go')
  fs.writeFileSync(mi, 'MemTotal:       12011512 kB\nMemFree:         6000000 kB\nMemAvailable:    8388608 kB\n')
  const a = [path.join(copie, TOURNEUR), '--capacite=livraison', '--une-passe', `--base=${base || bus.url}`, `--travail=${t}`, ...(meminfo ? [`--meminfo=${mi}`] : []), ...args]
  const r = await K.lancer(process.execPath, a, { cwd: copie, env: env ? env(jeton) : envTourneur({ jeton }), delaiMs })
  if (!garder) await bus.fermer()
  const fj = path.join(t, `tourneur-livraison.jsonl`)
  const journal = K.existe(fj) ? lf(fs.readFileSync(fj, 'utf8')).split('\n').filter(Boolean) : []
  const commandes = new Set(taches.map((x) => x.charge?.commande))
  const appels = fs.readdirSync(CONSIGNE).filter((f) => /^appel-.*\.json$/.test(f)).map((f) => { try { return JSON.parse(fs.readFileSync(path.join(CONSIGNE, f), 'utf8')) } catch { return null } }).filter((x) => x && commandes.has(x.commande))
  return { r, bus, journal, appels, travail: t, jeton }
}
const routes = (bus) => bus.requetes.map((x) => x.route)
const rendusDe = (bus, id) => bus.rendus.filter((x) => x.tache === id)
const erreurCommence = (e, attendu) => typeof e === 'string' && (e === attendu || e.startsWith(`${attendu} `) || e.startsWith(`${attendu}:`) || e.startsWith(`${attendu} (`))
function verifierEchec(D, bus, t, attendu, quoi) {
  const r = rendusDe(bus, t.id)
  if (r.length !== 1) { D.push(`${quoi} : ${r.length} rendre (un attendu)`); return }
  if (r[0].resultat !== 'echec') D.push(`${quoi} : rendue « ${r[0].resultat} » (echec attendu)`)
  else if (!erreurCommence(r[0].erreur, attendu)) D.push(`${quoi} : erreur « ${court(r[0].erreur, 60)} » (« ${attendu} » attendu)`)
}
const sansDepot = (D, bus, quoi) => { if (bus.depots.length || bus.puts.length || bus.compter('/api/agents/usine/depot')) D.push(`${quoi} : ${bus.compter('/api/agents/usine/depot')} dépôt(s), ${bus.puts.length} PUT (aucun attendu)`) }
function tuerSiVivant(pid) { if (pid && K.vivant(pid)) K.tuerArbre(pid) }

// ══ Les critères du tourneur ══════════════════════════════════════════════════════════════════════════════════════════
/** La lecture du source : process.env n'y sert qu'aux variables permises (et aux noms que donne la table, en [ ]). */
function lectureEnv(racine) {
  const D = []
  for (const rel of [TOURNEUR, TABLE]) {
    const src = K.lireSi(path.join(racine, rel))
    if (src === null) { D.push(`${rel} absent`); continue }
    const code = sansCommentairesJs(src)
    for (const m of code.matchAll(/process\s*\.\s*env\b(\s*\.\s*([A-Za-z_$][\w$]*)|\s*\[|\s*\?\.\s*\[)?/g)) {
      if (m[2]) { if (!C.tourneur.env_du_tourneur.includes(m[2])) D.push(`${rel} lit process.env.${m[2]} (seules ${C.tourneur.env_du_tourneur.join(', ')} et les noms de la table sont permises)`) }
      else if (!m[1]) D.push(`${rel} lit process.env en entier (« ${court(code.slice(Math.max(0, m.index - 20), m.index + 30), 60)} »)`)
    }
    if (/\.env\.local|presti-coffre|agents\.env/.test(code)) D.push(`${rel} lit .env.local ou le coffre`)
    if (/\bshell\s*:\s*(true|['"`])/.test(code) || /(?<![.\w$])exec(Sync)?\s*\(/.test(code)) D.push(`${rel} lance par un shell (shell: true ou exec de child_process)`)
  }
  return D
}
const T = {
  async 'UT-1'(o, copie) {
    const D = []
    const p = await passage(copie)
    if (p.r.code !== 0) D.push(`file vide : code ${p.r.code} (0 attendu) ${court(p.r.erreur, 120)}`)
    const r = routes(p.bus)
    if (JSON.stringify(r) !== JSON.stringify(['/api/agents/battement', '/api/agents/taches/prendre'])) D.push(`requêtes ${JSON.stringify(r)} (exactement un battement puis un prendre attendus)`)
    const pass = p.journal.map((l) => { try { return JSON.parse(l) } catch { return null } })
    if (pass.length !== 1 || !pass[0] || Object.keys(pass[0]).sort().join(',') !== [...C.tourneur.journal.passage].sort().join(',') || pass[0].taches !== 0 || pass[0].capacite !== 'livraison') D.push(`journal : ${court(p.journal.join(' | '), 160) || 'vide'} (une ligne de passage { ${C.tourneur.journal.passage.join(', ')} }, taches 0, attendue)`)
    return res(D, 'file vide : un battement, un prendre, rien d\'autre ; code 0 ; une ligne de passage au journal')
  },
  async 'UT-2'(o, copie) {
    const D = [...lectureEnv(o.racine)]
    const t = tache('valide', 'ok-site')
    const dix = dixVariables()
    const p = await passage(copie, { taches: [t], env: (j) => envTourneur({ jeton: j, extra: dix }) })
    if (p.r.code !== 0) D.push(`code ${p.r.code} (0 attendu) ${court(p.r.erreur, 160)}`)
    const a = p.appels
    if (a.length !== 1) D.push(`${a.length} lancement(s) du fabricant (un attendu)`)
    else {
      const x = a[0]
      const dossier = path.join(p.travail, t.id)
      const [ae, as, ac, ...reste] = x.argv
      if (x.argv.length !== 3 || reste.length || !ae?.startsWith('--entree=') || cleChemin(ae.slice(9)) !== cleChemin(path.join(dossier, 'entree'))) D.push(`argv du fabricant ${court(JSON.stringify(x.argv), 200)} : --entree=<travail>/<tache>/entree attendu, sans rien d'autre que la table`)
      const relSortie = as?.startsWith('--sortie=') ? path.relative(cleChemin(dossier), cleChemin(as.slice(9))) : '..'
      if (!relSortie || relSortie.startsWith('..') || path.isAbsolute(relSortie)) D.push(`${court(as, 80)} : --sortie=<un dossier sous <travail>/<tache>/> attendu`)
      if (ac !== `--consigne=${CONSIGNE}`) D.push(`argument de la table altéré : ${court(ac, 120)} (le chemin avec « & » et une espace passe tel quel sans shell)`)
      if (cleChemin(x.execPath) !== cleChemin(process.execPath) || cleChemin(x.script) !== cleChemin(FABRICANT)) D.push(`fabricant lancé : ${court(x.execPath, 60)} ${court(x.script, 80)} (la commande de la table attendue)`)
      if (cleChemin(x.cwd) !== cleChemin(copie)) D.push(`dossier courant du fabricant ${court(x.cwd, 80)} (la racine du dépôt attendue)`)
      for (const e of ENTREES) {
        const vu = x.entree.find((y) => y.nom === e.nom)
        if (!vu || vu.octets !== e.octets.length || vu.sha256 !== K.sha256(e.octets)) D.push(`entrée ${e.nom} : ${vu ? `${vu.octets} octets, empreinte ${vu.sha256.slice(0, 8)}` : 'absente'} (${e.octets.length} octets, ${K.sha256(e.octets).slice(0, 8)} attendus)`)
      }
      let charge = null
      try { charge = JSON.parse(x.charge_brute) } catch { /* illisible */ }
      if (JSON.stringify(charge) !== JSON.stringify(t.charge)) D.push(`charge.json ${court(x.charge_brute, 80)} ≠ la charge de la tâche`)
    }
    const dep = p.bus.depots
    if (dep.length !== 1 || p.bus.compter('/api/agents/usine/depot') !== 1) D.push(`${p.bus.compter('/api/agents/usine/depot')} requête(s) de dépôt (une attendue)`)
    else {
      const f = dep[0].fichiers
      const noms = f.map((y) => y.nom).sort(), attendus = OK_SITE.map(([n]) => n).sort()
      if (JSON.stringify(noms) !== JSON.stringify(attendus)) D.push(`dépôt de ${JSON.stringify(noms)} (${JSON.stringify(attendus)} attendus)`)
      for (const [n, ty] of OK_SITE) { const y = f.find((z) => z.nom === n); if (y && y.type !== ty) D.push(`${n} déclaré ${y.type} (${ty} attendu)`) }
      if (p.bus.puts.length !== f.length || p.bus.compter('stockage:deposer') !== f.length) D.push(`${p.bus.compter('stockage:deposer')} PUT reçus pour ${f.length} fichiers (un par fichier attendu)`)
      for (const u of p.bus.puts) {
        if (u.sha256 !== u.attendu.sha256 || u.octets.length !== u.attendu.octets) D.push(`${u.nom} : PUT de ${u.octets.length} octets (${u.sha256.slice(0, 8)}) pour ${u.attendu.octets} déclarés (${String(u.attendu.sha256).slice(0, 8)})`)
        if (u.type !== u.attendu.type) D.push(`${u.nom} : Content-Type « ${u.type} » (${u.attendu.type} attendu)`)
      }
      const lire = (n) => p.bus.stockage.get(`usine/${t.id}/sortie/${n}`)?.octets
      const w = lire('site/images/photo.webp')
      if (!w || w.toString('latin1', 0, 4) !== 'RIFF' || w.toString('latin1', 8, 12) !== 'WEBP') D.push('site/images/photo.webp déposé sans les octets magiques RIFF…WEBP')
      for (const n of ['site/site.json', 'rapport-qa.json']) { try { JSON.parse(lire(n).toString('utf8')) } catch { D.push(`${n} déposé ne se relit pas en JSON`) } }
      if (!/<html/i.test(lire('site/index.html')?.toString('utf8') || '')) D.push('site/index.html déposé ne se relit pas')
    }
    if (p.bus.requetes.some((x) => x.bearerStockage)) D.push('le jeton de l\'agent part vers le stockage (en-tête Authorization sur une URL signée)')
    if (p.bus.compter('stockage:lire') !== ENTREES.length) D.push(`${p.bus.compter('stockage:lire')} téléchargement(s) d'entrée (${ENTREES.length} attendus)`)
    const r = rendusDe(p.bus, t.id)
    if (r.length !== 1 || r[0].resultat !== 'faite' || r[0].preuve_url !== `supabase://usine/${t.id}/sortie/` || r[0].erreur) D.push(`rendre : ${court(JSON.stringify(r), 160)} (une fois, faite, supabase://usine/<tache>/sortie/ attendu)`)
    if (K.existe(path.join(p.travail, t.id))) D.push('le dossier de la tâche n\'est pas effacé après un succès')
    return res(D, `une livraison de bout en bout : argv de la table (chemins à « & » et espace intacts, sans shell), 3 entrées aux octets et empreintes justes, charge.json égal à la charge, un dépôt des ${OK_SITE.length} fichiers du manifeste, un PUT chacun aux octets, empreintes et Content-Type justes (relus et décodés), faite avec supabase://usine/<tache>/sortie/, dossier effacé ; process.env du source limité`)
  },
  async 'UT-3'(o, copie) {
    const D = []
    const t = tache('valide', 'ok-site')
    const dix = dixVariables()
    const p = await passage(copie, { taches: [t], env: (j) => envTourneur({ jeton: j, extra: dix }) })
    const x = p.appels[0]
    if (!x) return res([`fabricant jamais lancé (code ${p.r.code}) ${court(p.r.erreur, 120)}`])
    const norm = (n) => (K.WIN ? n.toUpperCase() : n)
    const vus = x.noms_env.filter((n) => !n.startsWith('=')).map(norm)
    const permis = new Set([...ENV_FABRICANT, ...(K.WIN ? LIBUV_WIN : [])].map(norm))
    const enTrop = vus.filter((n) => !permis.has(n)), manquent = ENV_FABRICANT.map(norm).filter((n) => !vus.includes(n))
    if (enTrop.length) D.push(`le fabricant voit ${enTrop.join(', ')} (seules ${ENV_FABRICANT.join(', ')}${K.WIN ? ' et les variables de libuv' : ''} attendues)`)
    if (manquent.length) D.push(`le fabricant ne voit pas ${manquent.join(', ')}`)
    if (vus.some((n) => /^PRESTI_JETON_|^ANTHROPIC_/.test(n))) D.push('un PRESTI_JETON_* ou ANTHROPIC_* atteint le fabricant')
    const fuites = Object.keys(dix).map(norm).filter((n) => vus.includes(n))
    if (fuites.length) D.push(`variables posées en plus vues par le fabricant : ${fuites.join(', ')}`)
    return res(D, `environnement du fabricant : ${ENV_FABRICANT.join(', ')}${K.WIN ? ' (et les variables que libuv ajoute sous Windows)' : ''}, rien d'autre ; ni PRESTI_JETON_*, ni ANTHROPIC_*, ni aucune des dix variables posées en plus`)
  },
  async 'UT-4'(o, copie) {
    const D = []
    const t = tache('valide', 'lent')
    const debut = Date.now()
    const p = await passage(copie, { taches: [t], args: ['--delai-s=3'], delaiMs: 60_000 })
    const duree = (Date.now() - debut) / 1000
    const x = p.appels[0]
    try {
      if (!x) { D.push(`fabricant jamais lancé (code ${p.r.code})`); return res(D) }
      if (p.r.expire || duree > 40) D.push(`le tourneur a attendu ${Math.round(duree)} s (le délai de 3 s n'a pas coupé)`)
      verifierEchec(D, p.bus, t, 'fabrication:delai', 'délai dépassé')
      sansDepot(D, p.bus, 'délai dépassé')
      const f = path.join(CONSIGNE, `battement-${t.charge.commande}.log`)
      const n1 = K.existe(f) ? fs.statSync(f).size : 0
      await K.attendre(2500)
      const n2 = K.existe(f) ? fs.statSync(f).size : 0
      if (!n1) D.push('le petit-enfant du fabricant n\'a jamais battu (épreuve impossible)')
      if (n2 !== n1) D.push('le petit-enfant bat encore après le délai : l\'arbre n\'est pas tué')
      if (x.petit_enfant && K.vivant(x.petit_enfant)) D.push(`le petit-enfant (pid ${x.petit_enfant}) est vivant`)
      if (K.vivant(x.pid)) D.push(`le fabricant (pid ${x.pid}) est vivant`)
    } finally { tuerSiVivant(x?.petit_enfant); tuerSiVivant(x?.pid) }
    return res(D, `lent avec --delai-s=3 : fabricant et petit-enfant tués (le battement s'arrête), rendu en echec fabrication:delai en ${Math.round(duree)} s, aucun dépôt`)
  },
  async 'UT-5'(o, copie) {
    const D = []
    const lienPossible = (() => { const d = path.join(TRAVAIL, 'lien-essai'); K.vider(d); try { fs.writeFileSync(path.join(d, 'a'), 'a'); fs.symlinkSync(path.join(d, 'a'), path.join(d, 'b'), 'file'); return true } catch { return false } })()
    const cas = [['gros', 'sortie:taille'], ['hors-type', 'sortie:type'], ['nom-dangereux', 'sortie:nom'], ['manifeste-absent', 'sortie:manifeste'], ...(lienPossible ? [['lien-symbolique', 'sortie:lien']] : [])]
    const taches = cas.map(([m]) => tache('valide', m))
    const p = await passage(copie, { taches, args: [`--max=${taches.length}`] })
    sansDepot(D, p.bus, 'sorties fautives')
    cas.forEach(([m, e], i) => verifierEchec(D, p.bus, taches[i], e, m))
    if (p.bus.rendus.some((x) => x.resultat === 'faite')) D.push('une sortie fautive rendue faite')
    return res(D, `${cas.map(([m, e]) => `${m} → ${e}`).join(', ')} : aucun dépôt${lienPossible ? '' : ' ; lien-symbolique SAUTÉ (ce poste refuse les liens symboliques), jamais compté vert'}`)
  },
  async 'UT-6'(o, copie) {
    const D = []
    const t = tache('valide', 'secret')
    const p = await passage(copie, { taches: [t] })
    const x = p.appels[0]
    if (!x?.secret) return res([`fabricant jamais lancé ou secret non consigné (code ${p.r.code})`])
    sansDepot(D, p.bus, 'secret')
    verifierEchec(D, p.bus, t, 'sortie:secret', 'secret')
    const partout = [p.r.sortie, p.r.erreur, p.journal.join('\n'), JSON.stringify(p.bus.requetes.map((q) => q.corps)), JSON.stringify(p.bus.rendus)].join('\n')
    if (partout.includes(x.secret)) D.push('la valeur du secret est répétée (sortie, journal ou corps envoyé au bus)')
    return res(D, 'une chaîne au format d\'un jeton d\'agent dans site/index.html : aucun dépôt, echec sortie:secret, la valeur nulle part')
  },
  async 'UT-7'(o, copie) {
    const D = []
    const t = tache('valide', 'echec')
    const p = await passage(copie, { taches: [t] })
    if (!p.appels.length) D.push('fabricant jamais lancé')
    verifierEchec(D, p.bus, t, 'fabrication:code 3', 'fabricant en code 3')
    sansDepot(D, p.bus, 'fabricant en code 3')
    return res(D, 'fabricant en code 3 : rendue echec fabrication:code 3, aucun dépôt')
  },
  async 'UT-8'(o, copie) {
    const D = []
    const a = tache('telephone_en_trop', 'ok-site'), b = tache('capacite_inconnue', 'ok-site')
    const p = await passage(copie, { taches: [a, b], args: ['--max=2'] })
    verifierEchec(D, p.bus, a, 'charge', 'charge avec telephone')
    verifierEchec(D, p.bus, b, 'capacite', 'capacité inconnue')
    if (p.appels.length) D.push(`le fabricant a été lancé ${p.appels.length} fois (jamais attendu)`)
    sansDepot(D, p.bus, 'charge ou capacité fautive')
    if (p.bus.compter('/api/agents/usine/entree')) D.push('l\'entrée d\'une tâche fautive est demandée')
    return res(D, 'charge avec telephone → echec charge, capacité inconnue → echec capacite, fabricant jamais lancé, ni entrée ni dépôt')
  },
  async 'UT-9'(o, copie) {
    const D = []
    const p = await passage(copie, { taches: [tache('valide', 'ok-site')], meminfo: false, args: [`--meminfo=${MEMINFO_1GO}`] })
    if (p.r.code !== 0) D.push(`code ${p.r.code} (0 attendu)`)
    const r = routes(p.bus)
    if (JSON.stringify(r) !== JSON.stringify(['/api/agents/battement'])) D.push(`requêtes ${JSON.stringify(r)} (un battement, zéro prendre attendus)`)
    if (!/ressources/.test(`${p.r.sortie}\n${p.r.erreur}`)) D.push('aucune ligne « ressources »')
    return res(D, '1 Go de mémoire disponible : un battement, zéro prendre, une ligne ressources, code 0')
  },
  async 'UT-10'(o, copie) {
    const D = []
    const t = tache('valide', 'lent')
    const lieu = path.join(DOSSIER_CAS, 'verrou'); K.vider(lieu)
    const jeton = jetonAgent()
    const bus = await demarrerFauxBusUsine({ jeton, taches: [t], entrees: { [t.id]: ENTREES }, contrat: C })
    fs.writeFileSync(path.join(CONSIGNE, 'modes.json'), JSON.stringify(Object.fromEntries(modes)))
    const mi = path.join(TRAVAIL, 'meminfo-8go')
    const args = [path.join(copie, TOURNEUR), '--capacite=livraison', '--une-passe', `--base=${bus.url}`, `--travail=${lieu}`, `--meminfo=${mi}`, '--delai-s=40']
    const A = K.demarrer(process.execPath, args, { cwd: copie, env: envTourneur({ jeton }), delaiMs: 90_000 })
    let appel = null
    try {
      const fin = Date.now() + 20_000
      while (Date.now() < fin && !(appel = fs.readdirSync(CONSIGNE).map((f) => { try { return JSON.parse(fs.readFileSync(path.join(CONSIGNE, f), 'utf8')) } catch { return null } }).find((x) => x?.commande === t.charge.commande && x.petit_enfant))) await K.attendre(200)
      if (!appel) { D.push('le premier passage n\'a pas lancé son fabricant en 20 s'); return res(D) }
      const verrou = path.join(lieu, 'tourneur-livraison.verrou')
      if (!K.existe(verrou)) D.push(`aucun verrou ${posix(path.relative(lieu, verrou))} pendant le passage`)
      const B = await K.lancer(process.execPath, args, { cwd: copie, env: envTourneur({ jeton }), delaiMs: 30_000 })
      if (B.code !== 0 || !/déjà en cours/.test(`${B.sortie}${B.erreur}`)) D.push(`second passage simultané : code ${B.code}, « ${court(B.sortie + B.erreur, 80)} » (0 et « déjà en cours » attendus)`)
      if (bus.compter('/api/agents/taches/prendre') !== 1) D.push(`${bus.compter('/api/agents/taches/prendre')} prendre (le second passage ne prend rien)`)
      // le premier passage tué net (par PID) : son verrou reste ; vieilli de 65 min, avec un pid vivant (celui du juge)
      K.tuerArbre(A.pid); await A.fin
      tuerSiVivant(appel.petit_enfant); tuerSiVivant(appel.pid)
      if (!K.existe(verrou)) { D.push('le verrou a disparu avec le passage tué : la reprise d\'un vieux verrou ne s\'éprouve pas'); return res(D) }
      const vieux = new Date(Date.now() - 65 * 60_000)
      let v = fs.readFileSync(verrou, 'utf8')
      v = v.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, vieux.toISOString()).replace(/\b1\d{12}\b/g, String(vieux.getTime())).replace(new RegExp(`\\b${A.pid}\\b`, 'g'), String(process.pid))
      fs.writeFileSync(verrou, v); fs.utimesSync(verrou, vieux, vieux)
      const n0 = bus.compter('/api/agents/taches/prendre')
      const Cc = await K.lancer(process.execPath, args, { cwd: copie, env: envTourneur({ jeton }), delaiMs: 30_000 })
      if (Cc.code !== 0) D.push(`après un verrou de 65 min : code ${Cc.code} ${court(Cc.erreur, 100)}`)
      if (bus.compter('/api/agents/taches/prendre') !== n0 + 1) D.push('un verrou de 65 min n\'est pas repris (aucun prendre)')
      if (!/verrou/i.test(`${Cc.sortie}${Cc.erreur}`)) D.push('la reprise du verrou n\'est pas dite au journal (sortie du service)')
    } finally { K.tuerArbre(A.pid); tuerSiVivant(appel?.petit_enfant); tuerSiVivant(appel?.pid); await bus.fermer() }
    return res(D, 'deux passages à la fois : le second sort en 0, « déjà en cours », sans prendre ; un verrou de 65 min (pid vivant) est repris et le journal le dit')
  },
  async 'UT-11'(o, copie) {
    const D = []
    const ts = [tache('valide', 'ok-site'), tache('valide', 'echec'), tache('telephone_en_trop', 'ok-site'), tache('valide', 'gros')]
    const p = await passage(copie, { taches: ts, args: [`--max=${ts.length}`] })
    const lignes = p.journal.map((l) => { try { return JSON.parse(l) } catch { return l } })
    const P = [...C.tourneur.journal.passage].sort().join(','), Tt = [...C.tourneur.journal.tache].sort().join(',')
    const formes = lignes.map((l) => (l && typeof l === 'object' ? Object.keys(l).sort().join(',') : null))
    if (formes.some((f) => f !== P && f !== Tt)) D.push(`ligne(s) de journal hors des deux formes : ${court(JSON.stringify(lignes[formes.findIndex((f) => f !== P && f !== Tt)]), 140)}`)
    if (formes.filter((f) => f === Tt).length !== ts.length || formes.filter((f) => f === P).length !== 1) D.push(`${formes.filter((f) => f === Tt).length} ligne(s) de tâche et ${formes.filter((f) => f === P).length} de passage (${ts.length} et 1 attendues)`)
    const texte = p.journal.join('\n'), sortie = `${p.r.sortie}\n${p.r.erreur}`
    for (const v of valeursPrivees()) { if (texte.includes(v)) D.push(`le journal porte une valeur de commande.json (« ${court(v, 20)} »)`); if (sortie.includes(v)) D.push(`la console porte une valeur de commande.json (« ${court(v, 20)} »)`) }
    const jetonsUrl = [...p.bus.signes.keys()]
    if (jetonsUrl.some((j) => texte.includes(j) || sortie.includes(j)) || /\/stockage\//.test(texte + sortie)) D.push('une URL signée dans le journal ou sur la console')
    if (texte.includes(p.jeton) || sortie.includes(p.jeton)) D.push('le jeton de l\'agent dans le journal ou sur la console')
    return res(D, `journal de ${lignes.length} lignes, chacune { ${C.tourneur.journal.passage.join(', ')} } ou { ${C.tourneur.journal.tache.join(', ')} } ; ni valeur de commande.json, ni URL signée, ni jeton (journal et console)`)
  },
  async 'UT-12'(o, copie) {
    const D = []
    const t = tache('valide', 'ok-site')
    const a = await passage(copie, { taches: [t], env: (j) => envTourneur({ sansJeton: true, extra: { PRESTI_JETON: j, PRESTI_JETON_ATELIER: j, JETON: j } }) })
    if (a.r.code !== 2) D.push(`jeton absent de ${C.capacites.livraison.jeton} (présent sous d'autres noms) : code ${a.r.code} (2 attendu)`)
    if (a.bus.requetes.length) D.push(`jeton absent : ${a.bus.requetes.length} requête(s) (aucune attendue)`)
    if (PRESSE && D.length) return res(D)
    for (const b of ['http://exemple.invalid', 'http://192.0.2.10:8080']) {
      const x = await passage(copie, { taches: [tache('valide', 'ok-site')], base: b })
      if (x.r.code !== 2) D.push(`--base=${b} : code ${x.r.code} (2 attendu)`)
      if (x.bus.requetes.length) D.push(`--base=${b} : ${x.bus.requetes.length} requête(s) au bus d'essai`)
      if (PRESSE && D.length) return res(D)
    }
    const n = await passage(copie, { taches: [tache('valide', 'ok-site')] })
    const partout = [n.r.sortie, n.r.erreur, n.journal.join('\n'), JSON.stringify(n.bus.requetes.map((q) => q.corps)), JSON.stringify(n.appels)].join('\n')
    if (partout.includes(n.jeton)) D.push('le jeton de l\'agent apparaît (sortie, journal, corps envoyés ou consigne du fabricant)')
    if (n.bus.requetes.some((q) => q.route?.startsWith('/api/') && q.auth !== 'ok')) D.push('une requête au bus sans le bon jeton')
    if (PRESSE && D.length) return res(D)
    // Les chemins d'erreur aussi : un message d'erreur est le premier endroit où un jeton s'échappe. Le jeton est cherché
    // entier, puis par ses 20 derniers signes (une valeur tronquée reste une fuite).
    const cas = [
      ['401', { avant: (b) => b.fixer({ tout401: true }) }],
      ['429', { avant: (b) => b.fixer({ statutA: { rang: 2, statut: 429 } }) }],
      ['500 sur prendre', { avant: (b) => b.fixer({ statutA: { rang: 2, statut: 500 } }) }],
      ['bus injoignable', { base: 'http://127.0.0.1:9' }],
    ]
    for (const [quoi, reglage] of cas) {
      const x = await passage(copie, { taches: [tache('valide', 'ok-site')], ...reglage })
      const texte = [x.r.sortie, x.r.erreur, x.journal.join('\n')].join('\n')
      if (x.r.code === 0) D.push(`${quoi} : code 0 (un code d'erreur attendu)`)
      if (texte.includes(x.jeton) || texte.includes(x.jeton.slice(-20))) D.push(`${quoi} : le jeton de l'agent apparaît sur la sortie ou au journal`)
      if (PRESSE && D.length) return res(D)
    }
    return res(D, `jeton lu seulement dans ${C.capacites.livraison.jeton} (absent → code 2, zéro requête) ; --base en http hors local → code 2 ; le jeton n'apparaît nulle part, ni dans un passage réussi ni sur 401, 429, 500 ou bus injoignable`)
  },
  async 'UT-13'(o, copie) {
    const D = []
    const q429 = await passage(copie, { taches: [tache('valide', 'ok-site')], avant: (b) => b.fixer({ statutA: { rang: 2, statut: 429 } }) })
    if (q429.r.code !== 3 || q429.bus.requetes.length !== 2) D.push(`429 sur prendre : code ${q429.r.code}, ${q429.bus.requetes.length} requête(s) (code 3, arrêt après la deuxième attendus)`)
    if (PRESSE && D.length) return res(D)
    const q401 = await passage(copie, { taches: [tache('valide', 'ok-site')], avant: (b) => b.fixer({ tout401: true }) })
    if (q401.r.code !== 1 || q401.bus.requetes.length !== 1) D.push(`401 : code ${q401.r.code}, ${q401.bus.requetes.length} requête(s) (code 1, une attendus)`)
    if (PRESSE && D.length) return res(D)
    const pause = await passage(copie, { taches: [tache('valide', 'ok-site')], avant: (b) => b.fixer({ enPause: true }) })
    if (pause.r.code !== 0 || !/en_pause/.test(`${pause.r.sortie}${pause.r.erreur}`) || pause.bus.compter('/api/agents/taches/prendre') !== 1) D.push(`agent_en_pause : code ${pause.r.code}, « ${court(pause.r.sortie, 60)} » (ligne en_pause, code 0, un prendre attendus)`)
    if (PRESSE && D.length) return res(D)
    const t507 = tache('valide', 'ok-site')
    const s507 = await passage(copie, { taches: [t507], avant: (b) => b.fixer({ depot507: true }) })
    verifierEchec(D, s507.bus, t507, 'depot:stockage', 'dépôt en 507')
    if (s507.bus.puts.length) D.push(`dépôt en 507 : ${s507.bus.puts.length} PUT`)
    if (PRESSE && D.length) return res(D)
    const tPut = tache('valide', 'ok-site')
    const p3 = await passage(copie, { taches: [tPut], avant: (b) => b.fixer({ putEchecs: { 'site/index.html': 99 } }) })
    verifierEchec(D, p3.bus, tPut, 'depot', 'un PUT qui échoue toujours')
    if (erreurCommence(rendusDe(p3.bus, tPut.id)[0]?.erreur, 'depot:stockage')) D.push('un PUT qui échoue rendu comme depot:stockage')
    const essais = p3.bus.requetes.filter((q) => q.route === 'stockage:deposer' && q.corps?.nom === 'site/index.html').length
    if (essais !== C.tourneur.put_essais_max) D.push(`${essais} essai(s) du PUT qui échoue (${C.tourneur.put_essais_max} attendus)`)
    if (PRESSE && D.length) return res(D)
    const tRe = tache('valide', 'ok-site')
    const p2 = await passage(copie, { taches: [tRe], avant: (b) => b.fixer({ putEchecs: { 'site/styles.css': 2 } }) })
    const r2 = rendusDe(p2.bus, tRe.id)
    if (r2[0]?.resultat !== 'faite') D.push(`un PUT qui échoue deux fois puis passe : rendue « ${r2[0]?.resultat} ${r2[0]?.erreur || ''} » (faite attendue : trois essais)`)
    return res(D, `429 → code 3 et arrêt ; 401 → code 1 ; agent_en_pause → ligne en_pause, code 0 ; dépôt en 507 → echec depot:stockage ; un PUT qui échoue ${C.tourneur.put_essais_max} fois → echec depot ; deux échecs puis un succès → faite`)
  },
  async 'UT-14'(o, copie) {
    const D = []
    const t = tache('valide', 'fichier-non-liste')
    const p = await passage(copie, { taches: [t] })
    const r = rendusDe(p.bus, t.id)
    if (r[0]?.resultat !== 'faite') D.push(`rendue « ${r[0]?.resultat} ${r[0]?.erreur || ''} » (faite attendue : le fichier hors manifeste est ignoré)`)
    const declares = p.bus.depots.flatMap((d) => d.fichiers.map((f) => f.nom))
    if (declares.includes('site/non-liste.html') || p.bus.puts.some((u) => u.nom === 'site/non-liste.html')) D.push('le fichier hors manifeste est déposé')
    if (declares.length !== OK_SITE.length) D.push(`${declares.length} fichier(s) déclaré(s) (${OK_SITE.length} attendus)`)
    return res(D, 'un fichier hors manifeste : jamais déclaré ni déposé ; la tâche faite avec les seuls fichiers listés')
  },
  async 'UT-15'(o, copie) {
    const D = []
    const t = tache('valide', 'ok-site')
    const p = await passage(copie, { taches: [t], avant: (b) => b.fixer({ putRangEchec: 3 }) })
    verifierEchec(D, p.bus, t, 'depot', 'le troisième PUT échoue')
    if (p.bus.rendus.some((x) => x.resultat === 'faite')) D.push('tâche rendue faite avec une partie de ses fichiers')
    if (p.bus.puts.length >= OK_SITE.length) D.push(`${p.bus.puts.length} PUT réussis malgré l'échec du troisième`)
    return res(D, 'le troisième PUT qui échoue toujours : echec depot, jamais faite (tout ou rien)')
  },
  async 'UT-16'(o, copie) {
    const D = []
    const { nombre, max } = TACHES.pour_max
    const ts = Array.from({ length: nombre }, () => tache('valide', 'ok-site'))
    const p = await passage(copie, { taches: ts, args: [`--max=${max}`], delaiMs: 180_000 })
    if (p.r.code !== 0) D.push(`code ${p.r.code}`)
    if (p.bus.compter('/api/agents/taches/prendre') !== max) D.push(`${p.bus.compter('/api/agents/taches/prendre')} prendre (${max} attendus)`)
    if (p.bus.rendus.length !== max || p.bus.file.length !== nombre - max) D.push(`${p.bus.rendus.length} rendues, ${p.bus.file.length} laissées en file (${max} et ${nombre - max} attendues)`)
    return res(D, `${nombre} tâches en file, --max=${max} : ${max} prises et rendues, puis arrêt`)
  },
  async 'UT-17'(o, copie) {
    const D = []
    const L = K.lireSi(path.join(o.racine, LIMITES))
    let lim = null
    try { lim = JSON.parse(L) } catch { D.push(`${LIMITES} ${L === null ? 'absent' : 'illisible'}`) }
    if (lim) {
      const a = C.limites.livraison, l = lim.livraison || {}
      for (const k of Object.keys(a)) {
        const ok = k === 'types' ? Array.isArray(l.types) && l.types.length === a.types.length && a.types.every((x) => l.types.includes(x)) : l[k] === a[k]
        if (!ok) D.push(`${LIMITES} : livraison.${k} ≠ contrat`)
      }
      if (Object.keys(lim).sort().join(',') !== Object.keys(C.limites).sort().join(',')) D.push(`${LIMITES} : capacités ${Object.keys(lim).join(', ')} ≠ contrat`)
    }
    for (const rel of [TOURNEUR, TABLE]) {
      const src = K.lireSi(path.join(o.racine, rel)) || ''
      const code = sansCommentairesJs(src)
      const dur = /\b(5242880|41943040|5\s*\*\s*1024\s*\*\s*1024|40\s*\*\s*1024\s*\*\s*1024|8388608)\b/.exec(code)
      if (dur) D.push(`${rel} porte une limite écrite en dur (« ${dur[0]} ») : elle vient de ${LIMITES}`)
    }
    const src = `${K.lireSi(path.join(o.racine, TOURNEUR)) || ''}\n${K.lireSi(path.join(o.racine, TABLE)) || ''}`
    if (!/usineLimites\.json/.test(src)) D.push(`ni ${TOURNEUR} ni ${TABLE} ne lit ${LIMITES}`)
    if (PRESSE && D.length) return res(D)
    // à l'épreuve : la même livraison, avec une copie où usineLimites.json n'admet que 3 fichiers → sortie:taille
    if (lim) {
      const autre = JSON.parse(JSON.stringify(lim)); if (autre.livraison) autre.livraison.fichiers_max = 3
      const c2 = preparerCopie(o.racine, 'copie-limites', { limites: autre })
      const t = tache('valide', 'ok-site')
      const p = await passage(c2, { taches: [t] })
      verifierEchec(D, p.bus, t, 'sortie:taille', `usineLimites.json à 3 fichiers, un site de ${OK_SITE.length}`)
      sansDepot(D, p.bus, 'limite de 3 fichiers')
    }
    return res(D, `${LIMITES} égal au contrat, lu par le tourneur (aucune limite en dur) ; à l'épreuve, la copie à 3 fichiers refuse un site de ${OK_SITE.length} (sortie:taille)`)
  },
}

// ══ Les unités et la doc ══════════════════════════════════════════════════════════════════════════════════════════════
const UNITES = 'scripts/usine/systemd'
function jugerUnite(racine, nomService, nomTimer) {
  const D = []
  const A = C.unites[nomService], B = C.unites[nomTimer]
  for (const [nom, att] of [[nomService, A], [nomTimer, B]]) {
    const t = K.lireSi(path.join(racine, UNITES, nom))
    if (t === null) { D.push(`${UNITES}/${nom} absent`); continue }
    const ini = K.lireIni(t)
    if (ini.erreur) { D.push(`${nom} : ${ini.erreur}`); continue }
    for (const [section, cles] of Object.entries(att)) {
      if (section === 'interdits') continue
      for (const [cle, val] of Object.entries(cles)) {
        const vus = K.valeurs(ini, section, cle)
        if (Array.isArray(val)) { if (vus.length !== val.length || !val.every((v) => vus.includes(v))) D.push(`${nom} [${section}] ${cle} : ${JSON.stringify(vus)} (exactement ${JSON.stringify(val)} attendus)`) }
        else if (vus.length !== 1 || vus[0] !== val) D.push(`${nom} [${section}] ${cle}=${vus.join(' | ') || '(absent)'} (${val} attendu)`)
      }
    }
    for (const x of att.interdits || []) {
      if (x.includes('=')) { const [k, v] = x.split('='); if (Object.values(ini.sections).flat().some(([kk, vv]) => kk === k && vv.startsWith(v))) D.push(`${nom} porte ${x}…`) }
      else if (Object.values(ini.sections).flat().some(([k, v]) => k === x || v.includes(x))) D.push(`${nom} porte ${x}`)
    }
  }
  return D
}
const U = {
  'UN-1': (o) => { const D = jugerUnite(o.racine, 'presti-atelier.service', 'presti-atelier.timer'); return res(D, 'presti-atelier.service (oneshot, agents, avec-coffre PRESTI_JETON_ATELIER, atelier-maquettes --une-passe, append au journal de l\'atelier, 45 min, 4G, Nice 10, sans EnvironmentFile ni CODEX_LANCEUR) et son minuteur toutes les 15 min') },
  'UN-2': (o) => { const D = jugerUnite(o.racine, 'presti-livreur.service', 'presti-livreur.timer'); return res(D, 'presti-livreur.service (oneshot, agents, CODEX_LANCEUR, avec-coffre PRESTI_JETON_LIVREUR_USINE, tourneur --capacite=livraison --une-passe, 55 min, 4G, Nice 10, sans PRESTI_URL, EnvironmentFile ni append) et son minuteur toutes les 10 min') },
  'UN-3': (o) => {
    const D = []
    const t = K.lireSi(path.join(o.racine, C.doc.fichier))
    if (t === null) return res([`${C.doc.fichier} absent`])
    const apo = (s) => String(s).replace(/[’‘`´]/g, "'")
    const sections = new Map()
    let cur = null
    for (const l of lf(t).split('\n')) {
      const m = /^#{2,3}\s+(.+?)\s*#*\s*$/.exec(l)
      if (m) { cur = apo(m[1]); sections.set(cur, ''); continue }
      if (cur) sections.set(cur, `${sections.get(cur)}${l}\n`)
    }
    for (const s of C.doc.sections) if (![...sections.keys()].some((k) => k.startsWith(apo(s)))) D.push(`section « ${s} » absente`)
    for (const [s, mots] of Object.entries(C.doc.contenus)) {
      const k = [...sections.keys()].find((x) => x.startsWith(apo(s)))
      if (!k) continue
      const corps = apo(sections.get(k)).toLowerCase()
      for (const mot of mots) if (!corps.includes(apo(mot).toLowerCase())) D.push(`« ${s} » ne dit pas « ${mot} »`)
    }
    return res(D, `${C.doc.fichier} : les ${C.doc.sections.length} sections, dont le renvoi à 026-097, essai: true jamais consommée, les commandes exactes de reprise et ce qui ne va jamais sur l'usine`)
  },
}

// ── le verdict ──
async function juger(o) {
  const s = creerRapport(NOM, o.ids, { entete: `${NOM} — racine ${o.racine === DEPOT ? '(le dépôt)' : posix(path.relative(DEPOT, o.racine)) || o.racine}` })
  const tourneur = o.ids.filter((id) => id.startsWith('UT-'))
  let copie = null
  if (tourneur.length) {
    const a = absents(o.racine)
    if (a.length) for (const id of tourneur) s.echoue(id, `non jugé : ${a.join(', ')} absent(s) de la racine`)
    else {
      K.vider(DOSSIER_CAS); fs.mkdirSync(CONSIGNE, { recursive: true })
      copie = preparerCopie(o.racine)
      for (const id of tourneur) {
        let r
        try { r = await T[id](o, copie) } catch (e) { r = res([`le juge a planté sur ${id} : ${court(e.stack || e.message, 240)}`]) }
        if (r.ok) s.passe(id, r.resume); else for (const x of r.echecs) s.echoue(id, x)
      }
    }
  }
  for (const id of o.ids.filter((x) => x.startsWith('UN-'))) {
    let r
    try { r = U[id](o) } catch (e) { r = res([`le juge a planté sur ${id} : ${court(e.message, 200)}`]) }
    if (r.ok) s.passe(id, r.resume); else for (const x of r.echecs) s.echoue(id, x)
  }
  return s.fin()
}

// ══ --reel (026-143) ══════════════════════════════════════════════════════════════════════════════════════════════════
class Prealable extends Error {}
function hoteUsine() {
  const m = (K.lireSi(path.join(DEPOT, 'scripts', 'usine.mjs')) || '').match(/process\.env\.PRESTI_USINE\s*\|\|\s*'([^']+)'/)
  return process.env.PRESTI_USINE || (m ? m[1] : 'usine@88.96.53.3')
}
async function sshUsine(script, delaiMs = 240_000) {
  const cle = path.join(os.homedir(), '.ssh', 'presti-usine')
  if (!K.existe(cle)) throw new Prealable(`clé ${cle} absente : usine injoignable`)
  const r = await K.lancer(process.env.PRESTI_SSH_BIN || 'ssh', ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hoteUsine(), 'bash -s'], { cwd: DEPOT, entree: script, delaiMs })
  if (r.code === 255) throw new Prealable(`usine injoignable (${hoteUsine()}) : ${court(r.erreur, 160)}`)
  const vals = new Map()
  for (const l of lf(r.sortie).split('\n')) { const m = /^R\|([^|]+)\|(.*)$/.exec(l); if (m) vals.set(m[1], m[2]) }
  return vals
}
function clientSupabase() {
  lireEnvLocal(DEPOT)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''), service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!/^https:\/\//.test(url) || !service) throw new Prealable('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY absents de .env.local')
  const sb = async (chemin, corps, { methode = 'POST', brut = null, type = 'application/json' } = {}) => {
    try {
      const r = await fetch(`${url}${chemin}`, { method: methode, headers: { apikey: service, authorization: `Bearer ${service}`, 'content-type': type }, body: brut ?? (corps === undefined ? undefined : JSON.stringify(corps)) })
      const b = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(b.toString('utf8')) } catch { /* binaire */ }
      return { status: r.status, json: j, octets: b }
    } catch (e) { return { status: 0, json: null, octets: Buffer.alloc(0), erreur: e.message } }
  }
  return sb
}
const BASE = () => (process.env.PRESTI_URL_REELLE || 'https://prestiapp.fr')
async function busReel(chemin, jeton, corps) {
  try {
    const r = await fetch(`${BASE()}${chemin}`, { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) })
    const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ }
    return { status: r.status, json: j }
  } catch (e) { return { status: 0, json: null, erreur: e.message } }
}
/** Un agent d'essai (essai_e2e_<aléa>), son jeton, et sa tâche livrer_site d'essai avec l'entrée déposée par le juge. */
async function livraisonEssai(sb, { creer = true } = {}) {
  const nom = `essai_e2e_${K.lettres(8).toLowerCase()}`, jeton = ['pa', nom, crypto.randomBytes(32).toString('base64url')].join('_')
  const e1 = await sb('/rest/v1/rpc/ops_agent_enregistrer', { p_nom: nom, p_libelle: 'Essai de la production de l\'usine', p_capacites: ['essai_usine'], p_types_crees: ['livrer_site'], p_tables: ['taches', 'evenements'], p_periode_minutes: 60, p_debit_minute: 30, p_quota_creations_jour: 3, p_plafond_euros_jour: 0 })
  if (e1.status >= 300) throw new Error(`ops_agent_enregistrer : ${e1.status}`)
  const e2 = await sb('/rest/v1/rpc/ops_agent_poser_jeton', { p_nom: nom, p_hash: K.sha256(jeton) })
  if (e2.status >= 300) throw new Error(`ops_agent_poser_jeton : ${e2.status}`)
  if (!creer) return { nom, jeton, tache: null }
  const cree = await busReel('/api/agents/taches', jeton, { type: 'livrer_site', cle: `essai_e2e:usine:${K.lettres(10)}`, capacite: 'livraison', charge: { commande: crypto.randomUUID(), essai: true } })
  const tache = cree.json?.id ?? cree.json?.tache?.id
  if (![200, 201].includes(cree.status) || !tache) throw new Error(`création de la tâche d'essai : ${cree.status}`)
  for (const e of ENTREES) {
    const d = await sb(`/storage/v1/object/usine/${tache}/entree/${e.nom}`, undefined, { brut: e.octets, type: e.type })
    if (d.status >= 300) throw new Error(`dépôt de l'entrée ${e.nom} : ${d.status}`)
  }
  return { nom, jeton, tache }
}
async function verifierSortieReelle(sb, tache) {
  const D = []
  const lire = async (n) => (await sb(`/storage/v1/object/usine/${tache}/sortie/${n}`, undefined, { methode: 'GET' }))
  const idx = await lire('site/index.html'), sj = await lire('site/site.json'), qa = await lire('rapport-qa.json')
  if (idx.status !== 200 || !/<html/i.test(idx.octets.toString('utf8'))) D.push('site/index.html absent ou illisible')
  if (sj.status !== 200 || !sj.json) D.push('site/site.json absent ou pas du JSON')
  if (qa.status !== 200 || !qa.json) D.push('rapport-qa.json absent ou pas du JSON')
  else if (!(qa.json.verdict === 'PASS' || qa.json.ok === true || qa.json.vert === true)) D.push(`rapport-qa.json n'est pas vert (${court(JSON.stringify(qa.json), 80)})`)
  return D
}
async function menage(sb, { nom, tache }) {
  if (tache) {
    for (const dossier of ['entree', 'sortie', 'sortie/site', 'sortie/site/images']) {
      const l = await sb('/storage/v1/object/list/usine', { prefix: `${tache}/${dossier}`, limit: 1000, offset: 0 })
      const noms = Array.isArray(l.json) ? l.json.filter((x) => x.id).map((x) => `${tache}/${dossier}/${x.name}`) : []
      if (noms.length) await sb('/storage/v1/object/usine', { prefixes: noms }, { methode: 'DELETE' })
    }
  }
  if (nom) await sb('/rest/v1/rpc/ops_agent_retirer', { p_nom: nom })
}
async function reel(o) {
  const ids = o.epreuve ? ['PR-R5'] : ['PR-R1', 'PR-R2', 'PR-R3', 'PR-R4']
  const s = creerRapport(NOM, ids, { entete: `${NOM} --reel${o.epreuve ? ` --epreuve=${o.epreuve}` : ''}` })
  try {
    const sb = clientSupabase()
    if (o.epreuve) await epreuve(o.epreuve, s, sb)
    else {
      const v = await sshUsine([
        'set -u', 'cd /srv/presti-agents 2>/dev/null || true',
        'echo "R|debut|1"',
        'for u in presti-atelier.timer presti-livreur.timer; do echo "R|actif_$u|$(systemctl is-active $u 2>/dev/null)"; done',
        'for u in presti-atelier.service presti-livreur.service presti-atelier.timer presti-livreur.timer; do a=$(sha256sum /etc/systemd/system/$u 2>/dev/null | cut -c1-64); b=$(sha256sum /srv/presti-agents/scripts/usine/systemd/$u 2>/dev/null | cut -c1-64); echo "R|identique_$u|$([ -n "$a" ] && [ "$a" = "$b" ] && echo oui || echo non)"; done',
        'systemd-analyze verify /etc/systemd/system/presti-atelier.service /etc/systemd/system/presti-livreur.service >/dev/null 2>&1; echo "R|verify|$?"',
        'echo "R|commit|$(git -C /srv/presti-agents rev-parse HEAD 2>/dev/null)"',
        'echo "R|journal_atelier|$(sudo -n /usr/local/bin/presti-journal atelier 2>/dev/null | tail -n 200 | grep -oE \'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}(\\.[0-9]+)?Z\' | tail -n 1)"',
        'echo "R|journal_livreur|$(sudo -n /usr/local/bin/presti-journal livreur 2>/dev/null | tail -n 200 | grep -E \'"capacite"\' | grep -oE \'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}(\\.[0-9]+)?Z\' | tail -n 1)"',
      ].join('\n'))
      const D1 = []
      for (const u of ['presti-atelier.timer', 'presti-livreur.timer']) if (v.get(`actif_${u}`) !== 'active') D1.push(`${u} : ${v.get(`actif_${u}`) || '?'} (active attendu)`)
      for (const u of ['presti-atelier.service', 'presti-livreur.service', 'presti-atelier.timer', 'presti-livreur.timer']) if (v.get(`identique_${u}`) !== 'oui') D1.push(`${u} installé ≠ celui du commit déployé ${court(v.get('commit'), 12)}`)
      if (v.get('verify') !== '0') D1.push(`systemd-analyze verify en code ${v.get('verify')}`)
      s.verdict('PR-R1', !D1.length, `minuteurs actifs, services identiques au commit déployé ${court(v.get('commit'), 12)}, systemd-analyze verify en 0`, D1.join(' ; '))
      const age = (x) => (x ? (Date.now() - Date.parse(x)) / 60_000 : Infinity)
      const D2 = []
      if (!(age(v.get('journal_atelier')) < 20)) D2.push(`dernière ligne du journal de l'atelier : ${v.get('journal_atelier') || 'aucune'} (moins de 20 min attendues)`)
      if (!(age(v.get('journal_livreur')) < 15)) D2.push(`dernier passage du livreur : ${v.get('journal_livreur') || 'aucun'} (moins de 15 min attendues)`)
      s.verdict('PR-R2', !D2.length, `atelier il y a ${Math.round(age(v.get('journal_atelier')))} min, livreur il y a ${Math.round(age(v.get('journal_livreur')))} min`, D2.join(' ; '))
      const etat = await sb('/rest/v1/rpc/ops_etat', {})
      const at = (etat.json?.agents || []).find((x) => x.nom === 'atelier_maquettes')
      s.verdict('PR-R3', !!at && age(at.battement_le) < 30, `atelier_maquettes a battu il y a ${Math.round(age(at?.battement_le))} min`, `atelier_maquettes : battement ${at?.battement_le || 'jamais'} (moins de 30 min attendues)`)
      let essai = null
      try {
        if (Number(etat.json?.taches?.file) > 0) throw new Error(`${etat.json.taches.file} tâche(s) en file : relancer quand la file est vide (l'essai ne doit pas passer devant une vraie livraison)`)
        essai = await livraisonEssai(sb)
        const fin = Date.now() + 30 * 60_000
        let D4 = ['la tâche d\'essai n\'est pas faite en 30 min']
        while (Date.now() < fin) {
          await K.attendre(30_000)
          const l = await sb('/storage/v1/object/list/usine', { prefix: `${essai.tache}/sortie`, limit: 100, offset: 0 })
          if (Array.isArray(l.json) && l.json.some((x) => x.name === 'rapport-qa.json')) { await K.attendre(20_000); D4 = await verifierSortieReelle(sb, essai.tache); break }
        }
        s.verdict('PR-R4', !D4.length, `tâche d'essai ${essai.tache.slice(0, 8)} faite par l'usine en moins de 30 min : site/index.html, site/site.json relus, rapport-qa.json vert`, D4.join(' ; '))
      } catch (e) { s.echoue('PR-R4', e.message) } finally { if (essai) await menage(sb, essai) }
    }
  } catch (e) {
    if (e instanceof Prealable) { console.error(`✗ ${NOM} --reel : préalable manquant — ${e.message}`); return 2 }
    throw e
  }
  return s.fin()
}
/** PR-R5 : préparer avant l'arrêt du poste, conclure au retour (fenêtre d'arrêt lue dans le journal Système de Windows). */
async function epreuve(etape, s, sb) {
  const f = path.join(TRAVAIL, 'epreuve.json')
  if (etape === 'preparer') {
    const e = await livraisonEssai(sb, { creer: false })
    const alea = K.lettres(10).toLowerCase(), dir = `/tmp/epreuve-${alea}`
    const corps = JSON.stringify({ type: 'livrer_site', cle: `essai_e2e:epreuve:${alea}`, capacite: 'livraison', charge: { commande: crypto.randomUUID(), essai: true } })
    const script = [
      'set -eu', `umask 077`, `mkdir -p ${dir} && chmod 700 ${dir}`,
      `cat > ${dir}/jeton <<'FIN_JETON'`, e.jeton, 'FIN_JETON', `chmod 600 ${dir}/jeton`,
      `cat > ${dir}/corps.json <<'FIN_CORPS'`, corps, 'FIN_CORPS',
      `cat > ${dir}/creer.sh <<'FIN_SCRIPT'`, '#!/bin/bash', `curl -sS -X POST -H "authorization: Bearer $(cat ${dir}/jeton)" -H 'content-type: application/json' --data @${dir}/corps.json ${BASE()}/api/agents/taches > ${dir}/cree.json`, `date -u +%Y-%m-%dT%H:%M:%SZ > ${dir}/cree_le`, 'FIN_SCRIPT', `chmod 700 ${dir}/creer.sh`,
      `systemd-run --user --on-active=12h --unit=presti-epreuve-${alea} /bin/bash ${dir}/creer.sh >/dev/null 2>&1 && echo "R|programme|oui" || echo "R|programme|non"`,
    ].join('\n')
    const v = await sshUsine(script)
    fs.writeFileSync(f, JSON.stringify({ nom: e.nom, alea, dir, prepare_le: new Date().toISOString() }))
    s.verdict('PR-R5', v.get('programme') === 'oui', `préparée : agent ${e.nom}, jeton dans ${dir} (700/600), création programmée dans 12 h ; éteindre le poste maintenant, puis --epreuve=conclure au retour`, `systemd-run --user --on-active=12h refusé sur l'usine`)
    return
  }
  const E = JSON.parse(K.lireSi(f) || 'null')
  if (!E) throw new Prealable(`aucune épreuve préparée (${posix(path.relative(DEPOT, f))})`)
  let tache = null
  try {
    const q = `Get-WinEvent -FilterHashtable @{LogName='System'; Id=1074,6006,6005; StartTime=[datetime]'${E.prepare_le}'} | Sort-Object TimeCreated | ForEach-Object { \"$($_.Id)|$($_.TimeCreated.ToUniversalTime().ToString('o'))\" }`
    const w = spawnSync('powershell.exe', ['-NoProfile', '-Command', q], { encoding: 'utf8', windowsHide: true })
    const ev = lf(w.stdout).split('\n').filter(Boolean).map((l) => { const [id, le] = l.split('|'); return { id: Number(id), le: Date.parse(le) } })
    const arret = ev.find((x) => x.id === 1074 || x.id === 6006), retour = arret && ev.find((x) => x.id === 6005 && x.le > arret.le)
    const v = await sshUsine([`echo "R|cree|$(cat ${E.dir}/cree.json 2>/dev/null | tr -d '\\n')"`, `echo "R|cree_le|$(cat ${E.dir}/cree_le 2>/dev/null)"`, `systemctl --user stop presti-epreuve-${E.alea}.timer >/dev/null 2>&1 || true`, `rm -rf ${E.dir}`, `echo "R|efface|$([ -e ${E.dir} ] && echo non || echo oui)"`].join('\n'))
    let cree = null; try { cree = JSON.parse(v.get('cree') || 'null') } catch { /* illisible */ }
    tache = cree?.id ?? cree?.tache?.id ?? null
    const D = []
    if (!arret || !retour) D.push('aucune fenêtre d\'arrêt du poste (1074 ou 6006, puis 6005) dans le journal Système depuis la préparation')
    const creeLe = Date.parse(v.get('cree_le') || '')
    if (!tache || !(creeLe > arret?.le && creeLe < retour?.le)) D.push(`tâche ${tache ? `créée à ${v.get('cree_le')}` : 'jamais créée'} (dans la fenêtre où le poste était éteint attendu)`)
    if (tache) {
      const l = await sb('/storage/v1/object/list/usine', { prefix: `${tache}/sortie`, limit: 100, offset: 0 })
      const qa = Array.isArray(l.json) ? l.json.find((x) => x.name === 'rapport-qa.json') : null
      if (!qa || !(Date.parse(qa.created_at) < retour?.le)) D.push('la sortie n\'a pas été déposée pendant que le poste était éteint')
      else D.push(...await verifierSortieReelle(sb, tache))
    }
    if (v.get('efface') !== 'oui') D.push(`${E.dir} n'est pas effacé`)
    s.verdict('PR-R5', !D.length, `poste éteint de ${new Date(arret?.le).toISOString()} à ${new Date(retour?.le).toISOString()} ; tâche créée, prise et faite dans la fenêtre, sorties relues ; ménage fait`, D.join(' ; '))
  } finally {
    await menage(sb, { nom: E.nom, tache })
    fs.rmSync(f, { force: true })
  }
}

// ══ --preuve-echecs ═══════════════════════════════════════════════════════════════════════════════════════════════════
const SABOTAGES = [
  ['UT-1', 'scripts/usine/tourneur.mjs', "  await bus('/api/agents/battement')\n", "  await bus('/api/agents/battement')\n  await bus('/api/agents/battement')\n"],
  ['UT-1', 'scripts/usine/tourneur.mjs', "journal({ le: new Date().toISOString(), capacite, taches: nTaches, duree_s:", "journal({ le: new Date().toISOString(), capacite, taches: nTaches, hote: os.hostname(), duree_s:"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "{ cwd: RACINE, env, shell: false,", "{ cwd: RACINE, env, shell: true,"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "resultat === 'faite' ? { resultat, preuve_url: `supabase://usine/${id}/sortie/` }", "resultat === 'faite' ? { resultat, preuve_url: `supabase://usine/${id}/` }"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "headers: { 'content-type': type }, body: corps,", "headers: { 'content-type': 'application/octet-stream' }, body: corps,"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "    if (resultat === 'faite') fs.rmSync(dossier, { recursive: true, force: true })\n", ''],
  ['UT-2', 'scripts/usine/tourneur.mjs', "x.octets = b.length; x.sha256 = sha256(b)", "x.octets = b.length; x.sha256 = sha256(Buffer.concat([b, Buffer.from('\\n')]))"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "fs.writeFileSync(path.join(entreeDir, 'charge.json'), JSON.stringify(t.charge))", "fs.writeFileSync(path.join(entreeDir, 'charge.json'), JSON.stringify({ ...t.charge, tache: id }))"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "const r = await fetch(x.url, { signal", "const r = await fetch(x.url, { headers: { authorization: `Bearer ${jeton}` }, signal"],
  ['UT-2', 'scripts/usine/tourneur.mjs', "const argv = CAP.commande.map(", "const argv = (process.env.PRESTI_FABRICANT ? [process.execPath, process.env.PRESTI_FABRICANT] : CAP.commande).map("],
  ['UT-3', 'scripts/usine/tourneur.mjs', '  const env = {}\n', '  const env = { ...process.env }\n'],
  ['UT-3', 'scripts/usine/tourneur.mjs', "['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', ...(CAP.env || [])]", "['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', CAP.jeton, ...(CAP.env || [])]"],
  ['UT-3', 'scripts/usine/tourneur.mjs', "['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', ...(CAP.env || [])]", "['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH']"],
  ['UT-4', 'scripts/usine/tourneur.mjs', "const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)", "const minuterie = setTimeout(() => { expire = true; enfant.kill('SIGKILL') }, delaiMs)"],
  ['UT-4', 'scripts/usine/tourneur.mjs', "if (f.expire) return finir('echec', 'fabrication:delai')", "if (f.expire) return finir('echec', 'fabrication:code 137')"],
  ['UT-5', 'scripts/usine/tourneur.mjs', "if (!st.size || st.size > LIM.octets_fichier_max) return { erreur: 'sortie:taille' }", "if (!st.size) return { erreur: 'sortie:taille' }"],
  ['UT-5', 'scripts/usine/tourneur.mjs', "if (st.isSymbolicLink() || !st.isFile()) return { erreur: 'sortie:lien' }", "if (!fs.statSync(chemin).isFile()) return { erreur: 'sortie:lien' }"],
  ['UT-5', 'scripts/usine/tourneur.mjs', "if (!NOM.test(f.nom) || f.nom.includes('..') ||", "if (f.nom.includes('//') ||"],
  ['UT-5', 'scripts/usine/tourneur.mjs', "if (!LIM.types.includes(f.type) || !(EXT[path.extname(f.nom).toLowerCase()] || []).includes(f.type)) return { erreur: 'sortie:type' }", "if (!f.type) return { erreur: 'sortie:type' }"],
  ['UT-5', 'scripts/usine/tourneur.mjs', "try { man = JSON.parse(fs.readFileSync(path.join(sortieDir, 'manifeste.json'), 'utf8')) } catch { return { erreur: 'sortie:manifeste' } }", "try { man = JSON.parse(fs.readFileSync(path.join(sortieDir, 'manifeste.json'), 'utf8')) } catch { return { erreur: 'sortie:nom' } }"],
  ['UT-6', 'scripts/usine/tourneur.mjs', "MOTIFS_SECRETS.some(({ re }) => re.test(t)) || JETON_AGENT.test(t) || t.includes(jeton)", "MOTIFS_SECRETS.some(({ re }) => re.test(t)) || t.includes(jeton)"],
  ['UT-6', 'scripts/usine/tourneur.mjs', "    if (MOTIFS_SECRETS.some", "    const tr = JETON_AGENT.exec(t); if (tr) console.log(`secret trouvé : ${tr[0]}`)\n    if (MOTIFS_SECRETS.some"],
  ['UT-7', 'scripts/usine/tourneur.mjs', "if (f.code !== 0) return finir('echec', `fabrication:code ${f.code}`)", "if (f.code !== 0 && f.code !== 3) return finir('echec', `fabrication:code ${f.code}`)"],
  ['UT-8', 'scripts/usine/tourneur.mjs', "  if (SCHEMAS[capacite](t.charge)) return finir('echec', 'charge')\n", ''],
  ['UT-8', 'scripts/usine/tourneur.mjs', "if (!/^[0-9a-f-]{36}$/i.test(id) || t.type !== CAP.type) return finir('echec', 'capacite')", "if (!/^[0-9a-f-]{36}$/i.test(id)) return finir('echec', 'capacite')"],
  ['UT-8', 'scripts/usine/capacites.mjs', "for (const k of Object.keys(c)) if (!['commande', 'essai'].includes(k)) return `clé en trop : ${k}`", "for (const k of Object.keys(c)) if (!['commande', 'essai', 'telephone'].includes(k)) return `clé en trop : ${k}`"],
  ['UT-9', 'scripts/usine/tourneur.mjs', 'if (mem < MEMOIRE_MIN || disque < DISQUE_MIN)', 'if (disque < DISQUE_MIN)'],
  ['UT-9', 'scripts/usine/tourneur.mjs', "const m = /^MemAvailable:\\s+(\\d+)\\s+kB/m.exec(fs.readFileSync(f, 'utf8'))", "const m = /^MemTotal:\\s+(\\d+)\\s+kB/m.exec(fs.readFileSync(f, 'utf8'))"],
  ['UT-10', 'scripts/usine/tourneur.mjs', "if (!prendreVerrou()) { console.log('déjà en cours'); process.exit(0) }", 'prendreVerrou()'],
  ['UT-10', 'scripts/usine/tourneur.mjs', '  if (age < VERROU_MAX_MS) return false', '  if (age < 24 * VERROU_MAX_MS) return false'],
  ['UT-10', 'scripts/usine/tourneur.mjs', "  console.log('verrou de plus de 60 min repris')\n", ''],
  ['UT-11', 'scripts/usine/tourneur.mjs', "journal({ le: new Date().toISOString(), tache: id, code:", "journal({ le: new Date().toISOString(), tache: id, commande: t.charge?.commande, code:"],
  ['UT-11', 'scripts/usine/tourneur.mjs', "fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b)", "fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b)\n    if (x.nom === 'commande.json') console.log(`commande de ${JSON.parse(b.toString('utf8')).nom}`)"],
  ['UT-11', 'scripts/usine/tourneur.mjs', "console.log(`${id} ${resultat}${erreur ? ` ${erreur}` : ''}`)", "console.log(`${id} ${resultat}${erreur ? ` ${erreur}` : ''} ${JSON.stringify(t.charge)}`)"],
  ['UT-12', 'scripts/usine/tourneur.mjs', 'const jeton = process.env[CAP.jeton]', "const jeton = process.env[CAP.jeton] || process.env.PRESTI_JETON"],
  ['UT-12', 'scripts/usine/tourneur.mjs', "if (urlBase.protocol === 'http:' ? !['127.0.0.1', 'localhost'].includes(urlBase.hostname) : urlBase.protocol !== 'https:')", "if (!['http:', 'https:'].includes(urlBase.protocol))"],
  ['UT-12', 'scripts/usine/tourneur.mjs', "  if (r.status === 401) throw new ErreurBus(1, 'bus : 401')", "  if (r.status === 401) throw new ErreurBus(1, `bus : 401 avec ${jeton.slice(0, 60)}`)"],
  ['UT-13', 'scripts/usine/tourneur.mjs', "if (r.status === 429) throw new ErreurBus(3, 'bus : 429, passage arrêté')", "if (r.status === 429) throw new ErreurBus(1, 'bus : 429, passage arrêté')"],
  ['UT-13', 'scripts/usine/tourneur.mjs', "if (d.status === 507) return finir('echec', 'depot:stockage')", "if (d.status === 507) return finir('echec', 'depot')"],
  ['UT-13', 'scripts/usine/tourneur.mjs', 'for (let essai = 1; essai <= 3; essai++) {', 'for (let essai = 1; essai <= 1; essai++) {'],
  ['UT-13', 'scripts/usine/tourneur.mjs', "if (p.status === 423 && p.json?.code === 'agent_en_pause') { console.log('en_pause'); break }", "if (p.status === 423) throw new ErreurBus(1, 'prendre : 423')"],
  ['UT-14', 'scripts/usine/tourneur.mjs', "  for (const f of man.fichiers) {\n    if (!f ||", "  for (const n of ['site/non-liste.html']) if (fs.existsSync(path.join(sortieDir, n))) man.fichiers.push({ nom: n, type: 'text/html' })\n  for (const f of man.fichiers) {\n    if (!f ||"],
  ['UT-15', 'scripts/usine/tourneur.mjs', "    if (!u || typeof u.url !== 'string' || !(await deposer(u.url, x.chemin, x.type))) return finir('echec', 'depot')\n", "    if (u && typeof u.url === 'string') await deposer(u.url, x.chemin, x.type)\n"],
  ['UT-16', 'scripts/usine/tourneur.mjs', 'while (nTaches < max && Date.now()', 'while (nTaches < max + 2 && Date.now()'],
  ['UT-17', 'scripts/usine/tourneur.mjs', "const LIMITES = JSON.parse(fs.readFileSync(path.join(RACINE, 'lib', 'agents', 'usineLimites.json'), 'utf8'))", "const LIMITES = { livraison: { entrees_max: 50, fichiers_max: 300, octets_fichier_max: 5242880, octets_total_max: 41943040, types: ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'image/webp', 'image/avif', 'image/jpeg', 'image/png', 'image/svg+xml', 'font/woff2', 'text/plain', 'application/xml', 'text/xml'] } }"],
  ['UT-17', 'lib/agents/usineLimites.json', '"entrees_max": 50,', '"entrees_max": 60,'],
  ['UN-1', 'scripts/usine/systemd/presti-atelier.service', 'Environment=PRESTI_HOTE=usine\n', 'Environment=PRESTI_HOTE=usine\nEnvironmentFile=/home/agents/.config/presti/agents.env\n'],
  ['UN-1', 'scripts/usine/systemd/presti-atelier.service', 'TimeoutStartSec=45min', 'TimeoutStartSec=15min'],
  ['UN-1', 'scripts/usine/systemd/presti-atelier.timer', 'OnCalendar=*:0/15', 'OnCalendar=*:0/5'],
  ['UN-1', 'scripts/usine/systemd/presti-atelier.service', 'Environment=PLAYWRIGHT_BROWSERS_PATH=/srv/playwright\n', 'Environment=PLAYWRIGHT_BROWSERS_PATH=/srv/playwright\nEnvironment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele\n'],
  ['UN-2', 'scripts/usine/systemd/presti-livreur.service', 'User=agents', 'User=usine'],
  ['UN-2', 'scripts/usine/systemd/presti-livreur.service', ' --base=https://prestiapp.fr --travail=/home/agents/travail/usine', ' --base=https://prestiapp.fr'],
  ['UN-2', 'scripts/usine/systemd/presti-livreur.service', 'Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele\n', 'Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele\nEnvironment=PRESTI_URL=https://prestiapp.fr\n'],
  ['UN-2', 'scripts/usine/systemd/presti-livreur.timer', 'Persistent=false', 'Persistent=true'],
  ['UN-3', 'docs/agents/usine-production.md', '## GitHub Actions en repli', '## Le repli'],
  ['UN-3', 'docs/agents/usine-production.md', 'Une tâche dont la charge porte `essai: true` n\'est jamais consommée.', ''],
  ['UN-3', 'docs/agents/usine-production.md', 'La clé de service Supabase, une clé Stripe, la clé Anthropic du produit, `.env.local`.', 'La clé de service Supabase, une clé Stripe.'],
]

async function preuveEchecs() {
  const TT = ['AT-1', 'AT-2', 'AT-3', 'PE-1', 'PE-2', 'PE-3', 'TV-1', 'SB-1', 'PE-4']
  const s = creerRapport(`${NOM} --preuve-echecs`, TT)
  const at = []
  const note = (id, ok, m) => { at.push({ id, ok, m }); s.verdict(id, ok, m) }
  // AT-1 : le faux bus valide et refuse au contrat
  {
    const D = []
    const jeton = jetonAgent()
    const t = tache('valide', 'ok-site')
    const bus = await demarrerFauxBusUsine({ jeton, taches: [t], entrees: { [t.id]: ENTREES }, contrat: C })
    try {
      const post = (p, corps, j = jeton) => fetch(`${bus.url}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(j ? { authorization: `Bearer ${j}` } : {}) }, body: corps === undefined ? undefined : JSON.stringify(corps) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))
      if ((await post('/api/agents/battement', undefined, null)).status !== 401) D.push('battement sans jeton accepté')
      const pr = await post('/api/agents/taches/prendre')
      if (pr.status !== 200 || pr.json?.tache?.id !== t.id) D.push('prendre ne rend pas la tâche de la file')
      const en = await post('/api/agents/usine/entree', { tache: t.id })
      if (en.status !== 200 || en.json?.entrees?.length !== ENTREES.length) D.push('entree ne rend pas les trois entrées')
      else {
        const g = await fetch(en.json.entrees[0].url); const b = Buffer.from(await g.arrayBuffer())
        if (!b.equals(ENTREES.find((e) => e.nom === en.json.entrees[0].nom).octets)) D.push('le stockage d\'essai ne rend pas les octets de l\'entrée')
      }
      const f = { nom: 'site/index.html', octets: 10, type: 'text/html', sha256: 'a'.repeat(64) }
      for (const [cas, fichiers, st] of [['type', [{ ...f, type: 'application/x-php' }], 400], ['nom', [{ ...f, nom: '../x' }], 400], ['doublon', [f, f], 400], ['sha256', [{ ...f, sha256: 'z' }], 400], ['trop gros', [{ ...f, octets: C.limites.livraison.octets_fichier_max + 1 }], 413], ['clé en trop', [{ ...f, x: 1 }], 400]]) {
        const x = await post('/api/agents/usine/depot', { tache: t.id, fichiers })
        if (x.status !== st) D.push(`dépôt fautif (${cas}) : ${x.status} (${st} attendu)`)
      }
      const d = await post('/api/agents/usine/depot', { tache: t.id, fichiers: [f] })
      if (d.status !== 200 || !d.json?.depots?.[0]?.url) D.push('dépôt valide refusé')
      else {
        const u = await fetch(d.json.depots[0].url, { method: 'PUT', headers: { 'content-type': 'text/html' }, body: Buffer.from('0123456789') })
        if (u.status !== 200 || bus.puts.length !== 1) D.push('PUT refusé ou non consigné')
      }
      if ((await post(`/api/agents/taches/${t.id}/rendre`, { resultat: 'faite', preuve_url: 'https://x' })).status !== 400) D.push('faite sans preuve supabase:// acceptée')
      if ((await post(`/api/agents/taches/${t.id}/rendre`, { resultat: 'faite', preuve_url: 'supabase://usine/x/', note: 1 })).status !== 400) D.push('rendre avec un champ en trop accepté')
      if ((await post(`/api/agents/taches/${t.id}/rendre`, { resultat: 'faite', preuve_url: `supabase://usine/${t.id}/sortie/` })).status !== 200) D.push('rendre conforme refusé')
      bus.fixer({ enPause: true })
      const pa = await post('/api/agents/taches/prendre')
      if (pa.status !== 423 || pa.json?.code !== 'agent_en_pause') D.push('mode en_pause')
      if (JSON.stringify(bus.requetes).includes(jeton)) D.push('le journal du faux bus contient le jeton')
    } finally { await bus.fermer() }
    note('AT-1', !D.length, D.length ? D.join(' ; ') : 'faux bus : 401 sans jeton, prendre depuis la file, entrées servies aux octets exacts, dépôts fautifs refusés (type, nom, doublon, sha256, taille, clé en trop), PUT consigné, faite exige supabase://, clés de rendre exactes, mode en_pause ; journal sans le jeton')
  }
  // AT-2 : le faux fabricant produit des fichiers aux octets magiques justes, et consigne sans valeur
  {
    const D = []
    const d = K.vider(path.join(TRAVAIL, 'autotest-fabricant'))
    const en = path.join(d, 'entree'), so = path.join(d, 'sortie'), co = path.join(d, 'consigne')
    for (const x of [en, so, co]) fs.mkdirSync(x, { recursive: true })
    const commande = crypto.randomUUID()
    fs.writeFileSync(path.join(en, 'charge.json'), JSON.stringify({ commande }))
    fs.writeFileSync(path.join(co, 'modes.json'), JSON.stringify({ [commande]: 'ok-site' }))
    const r = await K.lancer(process.execPath, [FABRICANT, `--entree=${en}`, `--sortie=${so}`, `--consigne=${co}`], { cwd: d, env: { PATH: process.env.PATH || '', SECRET_ESSAI: 'valeur-a-ne-pas-ecrire', SystemRoot: process.env.SystemRoot || '' } })
    if (r.code !== 0) D.push(`ok-site : code ${r.code}`)
    const lire = (n) => { try { return fs.readFileSync(path.join(so, ...n.split('/'))) } catch { return null } }
    const w = lire('site/images/photo.webp')
    if (!w || w.toString('latin1', 0, 4) !== 'RIFF' || w.toString('latin1', 8, 12) !== 'WEBP' || w.readUInt32LE(4) !== w.length - 8) D.push('photo.webp : octets magiques ou taille RIFF faux')
    let man = null; try { man = JSON.parse(lire('manifeste.json').toString('utf8')) } catch { D.push('manifeste.json illisible') }
    if (man && JSON.stringify(man.fichiers.map((f) => [f.nom, f.type])) !== JSON.stringify(OK_SITE)) D.push('le manifeste d\'ok-site ≠ la liste du juge')
    for (const n of ['site/site.json', 'rapport-qa.json']) { try { JSON.parse(lire(n).toString('utf8')) } catch { D.push(`${n} n'est pas du JSON`) } }
    const trace = fs.readdirSync(co).filter((f) => f.startsWith('appel-')).map((f) => fs.readFileSync(path.join(co, f), 'utf8'))
    if (trace.length !== 1 || !trace[0].includes('SECRET_ESSAI') || trace[0].includes('valeur-a-ne-pas-ecrire')) D.push('la consigne n\'a pas les noms seuls des variables')
    note('AT-2', !D.length, D.length ? D.join(' ; ') : 'faux fabricant : ok-site écrit un WebP entier (RIFF de la bonne taille, WEBP), du JSON qui se relit et un manifeste égal à la liste du juge ; il consigne les noms de ses variables, jamais leurs valeurs')
  }
  // AT-3 : le contrat se relit, ses limites et ses unités sont cohérentes ; les jeux d'essai sont entiers
  {
    const D = []
    let c = null; try { c = JSON.parse(fs.readFileSync(K.CONTRAT_F, 'utf8')) } catch (e) { D.push(`contrat illisible : ${e.message}`) }
    if (c) {
      if (JSON.stringify(c.limites) !== JSON.stringify(C.limites)) D.push('limites')
      if (!c.unites['presti-livreur.service'].Service.ExecStart.includes(c.tourneur.fichier)) D.push('l\'unité du livreur ne lance pas le tourneur du contrat')
      if (!c.unites['presti-livreur.service'].Service.Environment.includes('CODEX_LANCEUR=/usr/local/bin/presti-ia-modele')) D.push('CODEX_LANCEUR absent de l\'unité du livreur')
      if (c.unites['presti-atelier.service'].Service.Environment.some((x) => x.startsWith('CODEX_LANCEUR'))) D.push('CODEX_LANCEUR dans l\'unité de l\'atelier')
      if (JSON.stringify(c.tourneur.env_du_fabricant) !== JSON.stringify([...c.tourneur.env_du_tourneur, ...c.capacites.livraison.env])) D.push('env du fabricant ≠ env permis + env de la table')
    }
    for (const e of ENTREES) if (!e.octets.length) D.push(`entrée ${e.nom} de 0 octet`)
    if (!/^MemAvailable:\s+1048576 kB$/m.test(K.lireSi(MEMINFO_1GO) || '')) D.push('meminfo-1go n\'a pas 1 Go disponible')
    if (valeursPrivees().length < 3) D.push('commande.json d\'essai sans assez de valeurs à chercher dans les journaux')
    note('AT-3', !D.length, D.length ? D.join(' ; ') : `contrat relu : limites, unités (CODEX_LANCEUR au livreur seul), env du fabricant = env permis + table ; ${ENTREES.length} entrées non vides, meminfo-1go à 1 Go, ${valeursPrivees().length} valeurs privées à chercher`)
  }
  // PE : les deux groupes sur la référence
  const pe = []
  const ref = K.extraireReference(NOM, ['scripts/usine-socle-qa.mjs', 'scripts/instantane-quotidien.mjs', 'scripts/ts-loader.mjs', 'lib', 'docs'].filter((x) => K.git(['cat-file', '-e', `${K.REFERENCE}:${x}`]).code === 0), [TOURNEUR, TABLE, LIMITES, C.doc.fichier, ...Object.keys(C.unites).map((u) => `${UNITES}/${u}`)])
  s.verdict('PE-1', !!ref.dest, `arbre de référence ${K.REFERENCE} (ancêtre de HEAD, sans aucun fichier jugé) extrait`, ref.echecs.join(' ; '))
  for (const [groupe, attendu, id] of [['tourneur', 'UT-1', 'PE-2'], ['unites', 'UN-1', 'PE-3']]) {
    if (!ref.dest) { s.echoue(id, 'pas d\'arbre de référence (PE-1)'); continue }
    const r = await K.lancer(process.execPath, ['--import', './scripts/ts-loader.mjs', FICHIER, `--groupe=${groupe}`, `--racine=${ref.dest}`], { cwd: DEPOT, delaiMs: 300_000 })
    const premier = K.premierFail(r.sortie)
    pe.push({ groupe, attendu, code: r.code, premier })
    s.verdict(id, r.code === 1 && K.critereDe(premier) === attendu, `--groupe=${groupe} sur la référence : code ${r.code}, premier échec « ${court(premier, 160)} »`, `--groupe=${groupe} : code ${r.code} (1 attendu), premier échec « ${court(premier || r.erreur, 160)} » (${attendu} attendu)`)
  }
  // TV-1, SB-1
  let tv = null
  try {
    const t = K.construireTemoin(NOM, { copier: ['scripts/instantane-quotidien.mjs', 'scripts/ts-loader.mjs'], prefixes: ['scripts/', 'lib/agents/usineLimites.json', 'docs/'] })
    tv = await K.eprouver({ juge: FICHIER, racine: t.dest, prefixeNode: ['--import', './scripts/ts-loader.mjs'], args: (c, r) => [`--racine=${r}`, ...(c ? [`--critere=${c}`] : [])], sabotages: SABOTAGES, criteres: TOUS, delaiMs: 900_000 })
    s.verdict('TV-1', tv.temoin.code === 0 && !tv.echecs.some((e) => e.startsWith('témoin')), `témoin (${t.superposes.length} fichiers : tourneur, table, limites, quatre unités, doc) : code 0, les ${TOUS.length} critères verts`, tv.echecs.filter((e) => e.startsWith('témoin')).join(' ; ') || `témoin : code ${tv.temoin.code}`)
    const rates = tv.echecs.filter((e) => !e.startsWith('témoin'))
    s.verdict('SB-1', !rates.length, `${tv.lignes.length} sabotages, chacun rend son critère rouge (${[...new Set(tv.lignes.map((l) => l.critere))].join(', ')})`, rates.join(' ; '))
  } catch (e) { s.echoue('TV-1', `témoin impossible : ${e.message}`); s.echoue('SB-1', 'pas de témoin') }
  try {
    const notes = tv ? lf(tv.temoin.sortie).split('\n').filter((l) => /SAUTÉ/.test(l)).map((l) => `- ${court(l, 240)}`) : []
    const md = [
      `## usine-production-qa (juge de 026-057 ; --reel pour 026-143)`, '',
      `Écrit par \`node --import ./scripts/ts-loader.mjs scripts/usine-production-qa.mjs --preuve-echecs\` le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}.`, '',
      '### Autotest des jeux d\'essai', '', '| Critère | Verdict | Ce qui est vérifié |', '|---|---|---|',
      ...at.map((x) => `| ${x.id} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.m).replace(/\|/g, '\\|')} |`), '',
      `### Sur l'arbre de référence ${K.REFERENCE} (aucun fichier jugé)`, '', '| Groupe | Critère attendu en premier | Code | Premier échec réel |', '|---|---|---|---|',
      ...pe.map((x) => `| ${x.groupe} | ${x.attendu} | ${x.code} | ${x.premier.replace(/\|/g, '\\|')} |`), '',
      '### Le témoin et les sabotages', '',
      `Témoin : \`scripts/fixtures/026/usine-production/temoin/\` (scripts/usine/tourneur.mjs, capacites.mjs, les quatre unités, lib/agents/usineLimites.json, docs/agents/usine-production.md), avec scripts/instantane-quotidien.mjs et scripts/ts-loader.mjs du dépôt. Le tourneur du témoin tourne pour de vrai sur le poste. Code du témoin intact : ${tv?.temoin.code ?? '—'}.`, '',
      ...(notes.length ? ['Notes du passage du témoin :', ...notes, ''] : []),
      ...(tv ? K.tableSabotages(tv.lignes) : ['(pas de témoin)']),
    ]
    const w = K.ecrireSection(NOM, md)
    const manque = pe.filter((x) => !x.premier || !w.relu.includes(x.premier.replace(/\|/g, '\\|')))
    s.verdict('PE-4', !manque.length && pe.length === 2, `echecs-attendus.md : section ${NOM} écrite et relue (${w.octets} octets)`, 'un extrait de la référence manque dans echecs-attendus.md')
  } catch (e) { s.echoue('PE-4', e.message) }
  return s.fin()
}

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────
const cle = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p))
if (process.argv[1] && cle(process.argv[1]) === cle(FICHIER)) {
  const o = lireArgs()
  if (o.reel) { if (o.racine !== DEPOT) { console.error(`✗ ${NOM} : --reel ne se lance que sur le dépôt`); process.exit(2) } process.exitCode = await reel(o) }
  else if (o.preuve) process.exitCode = await preuveEchecs()
  else process.exitCode = await juger(o)
}
