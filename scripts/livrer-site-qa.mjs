// scripts/livrer-site-qa.mjs — juge de livrer-site, un site en une commande (fiche 026-029, lot C ; critères CH de 026-100),
// écrit par Claude Code AVANT le code qu'il juge (réécrit en entier le 27/09 : la version du 26/09 ne testait que l'existence
// d'un fichier). L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/livrer-site-qa.mjs [--racine=<dossier>] [--temoin] [--reel] [--seulement=CH-4]
//
//   --racine=<d>  juge <d>/scripts/livrer-site.mjs (défaut : le dépôt).
//   --temoin      seulement la part de non-régression de CH-3 (NR : les neuf démos gelées de public/sites-demo/ de la racine
//                 n'ont pas changé depuis HEAD — lues dans le dépôt quand la racine n'a pas de public/) et CH-PV.
//   --reel        CH-9, non écrit ici : code 2.
//   --seulement   auto-contrôle de 026-029 (preuve « sait échouer ») : ne juge que ces critères ; jamais le verdict d'une fiche.
//
// LE BANC. livrer-site n'est jamais lancé dans la racine : le juge en fait une copie minimale sous
// .orchestre/travail/livrer-site-qa/banc/ (scripts/livrer-site.mjs, commande-exporter.mjs, commande-rediger.mjs, site-qa.mjs,
// ts-loader.mjs de la racine ; lib/, maquettes/modeles/, public/sites-demo/generer.mjs, _kit/ et _polices/ de la racine), où
// scripts/site-deposer.mjs est un PIÈGE (il note son appel dans banc/depot-appele.txt et sort en 1), et où le juge remplace
// scripts/commande-rediger.mjs par une doublure quand un cas l'exige (elle note chaque appel dans banc/redacteur-appels.txt,
// puis lance le vrai rédacteur de la racine) — c'est « le rédacteur factice » du cahier : livrer-site lance node par
// process.execPath (CH-10), un rédacteur placé dans le PATH ne serait jamais appelé. Le dossier de travail de livrer-site
// (.orchestre/travail/livraison/<id>/ et journal.jsonl) est donc celui du banc. Chaque enfant tourne sans clé (chemins et
// dossiers temporaires seulement), sous un piège réseau (NODE_OPTIONS) qui refuse et consigne tout appel hors 127.0.0.1 ; en
// --usine, le piège consigne aussi toute lecture de .env.local et de process.env.SUPABASE_* par livrer-site lui-même.
//
// Contrat que ce juge fixe pour 026-100 (jeu d'essai : scripts/fixtures/026-livraison-tresor/c/) :
//   --depuis/--hote-photos : ceux de l'exporteur (commande-exporter-qa) ; avec --depuis, le fichier EST la base : « relire
//   l'état » avant le dépôt en --ci relit ce fichier, et `regenerations` s'y lit.
//   --usine : <entree>/commande.json au format --depuis, <entree>/photos/<nom> (à plat) ; manifeste.json = { fichiers: [{ nom,
//   type }] }, nom relatif à <sortie> (« site/… » ou « rapport-qa.json »), séparateur /, type MIME cohérent avec l'extension.
//   Une destination hors du dossier de travail, en mode normal : --sortie=<chemin> (option de --usine seulement) → code 2.
//
// Critères (cahier du juge de 026-100) :
//   CH-1  scripts/livrer-site.mjs existe ; sans argument → code 2 ; --sortie sous public/ sans --usine → code 2, rien d'écrit.
//         Préalables : 026-033 (scripts/commande-exporter.mjs) et 026-093 (lib/siteRedacteur.ts, scripts/commande-rediger.mjs)
//         dans la racine, sinon code 2.
//   CH-2  --depuis + --hote-photos (servi par le juge) + --sans-ia + --sans-depot : code 0 ; site/ porte index.html et site.json ;
//         site-qa.mjs <site> --statique, relancé par le juge, est vert ; le piège de site-deposer n'est pas appelé. 025-03 pas
//         PASS : code 2, « 025-03 attendue ».
//   CH-3  public/ intact : git status --porcelain public/ de la racine identique avant et après, Lestraque et les neuf démos
//         gelées identiques octet pour octet ; rien de nouveau sous public/ du banc.
//   CH-4  deux exécutions lancées ensemble : l'une sort en 5, l'autre en 0 ; un verrou daté de 61 min (contenu { pid, date } et
//         date du fichier) est repris : code 0 et la sortie le dit (« repris »).
//   CH-5  regenerations: 2 et un site qui échoue sur un critère de texte (la doublure du rédacteur répète le texte des pages
//         de commune) : code 4, et le rédacteur n'a été appelé qu'une fois.
//   CH-6  dossier sans prestation : code 3 ; la dernière ligne du journal s'arrête à l'étape de l'export (code 3) ; aucun
//         site généré.
//   CH-7  journal.jsonl : une ligne par exécution (celles de CH-2 et CH-6), chacune avec commande, duree_s, etapes (liste) et
//         issue ; aucune valeur du jeu d'essai (nom, adresse, téléphone, SIREN) dans le journal ni dans la sortie d'un
//         lancement --ci.
//   CH-8  l'ordre des étapes, lu dans le source (exporteur, rédacteur, générateur, site-qa, site-deposer) ; et, exécuté avec un
//         rédacteur qui échoue (code 1) : ni génération, ni site-qa, ni dépôt (le journal s'arrête à la rédaction).
//   CH-10 Linux, lu dans le source : ni « shell: true », ni powershell, .cmd, cmd.exe, « C:\ » ou ../SaaS ; aucun chemin
//         assemblé à la main (séparateur « \ », concaténation avec « / », gabarit « ${…}/… » hors URL) ; chaque spawn/exec
//         lance process.execPath ; ni exec ni execSync.
//   CH-11 --usine : entrée du jeu d'essai (commande.json au format --depuis, photos) et --sans-ia → code 0 ; la sortie porte
//         site/index.html, site/site.json, rapport-qa.json ({ commande, verdict, criteres }, sans donnée personnelle) et
//         manifeste.json, dont chaque entrée existe, a un nom au contrat et un type cohérent, et dont la liste couvre tout
//         site/ et rapport-qa.json ; site-qa --statique relancé par le juge sur <sortie>/site : vert ; aucun appel réseau
//         hors 127.0.0.1 ; site-deposer (piège) jamais lancé ; livrer-site ne lit ni .env.local ni SUPABASE_* ; une entrée
//         sans commande.json → code 3 ; une sortie dans le dépôt → code 2 ; ni l'une ni l'autre n'écrit de manifeste.
//   CH-12 --ci sur la commande d'essai passée à « generee » pendant la génération (la doublure du rédacteur réécrit l'état du
//         fichier --depuis) → code 6, et le piège de site-deposer n'est pas appelé.
//   CH-9  (--reel, Claude Code) : non écrit ici, code 2.
//   CH-PV un fichier de 0 octet dans .orchestre/preuves/026-100/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « livrer-site-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/livrer-site-qa/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  R, lireOptions, refuserAppel, creerSortie, court, lireRacine, sansCommentaires, importsDe, jugerPreuvesVides, dossierTravail, fichePass,
  lsTree, shaBlob, DEPOT_GIT,
} from './fixtures/026-livraison-tresor/commun.mjs'
import {
  C, JEU, PROJET, ID_COMMANDE, LOADER_URL, jeuC, copieJeu, lancerAsync, envEnfant, piegeReseau, servirPhotos, siteQaStatique,
  gitStatusPublic, lireArbre, auPlus,
} from './fixtures/026-livraison-tresor/c/commun-c.mjs'

const JUGE = 'livrer-site-qa'
const FICHE = '026-100'
const SCRIPT = 'scripts/livrer-site.mjs'
const o = lireOptions(process.argv.slice(2), { connues: ['seulement'] })
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const COMPLET = ['CH-1', 'CH-2', 'CH-3', 'CH-4', 'CH-5', 'CH-6', 'CH-7', 'CH-8', 'CH-10', 'CH-11', 'CH-12']
const SEUL = o.valeurs.seulement ? new Set(o.valeurs.seulement.split(',')) : null
const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : SEUL ? `partiel (${[...SEUL].join(',')})` : 'complet'
const IDS = o.temoin ? ['CH-3', 'CH-PV'] : [...(SEUL ? COMPLET.filter((x) => SEUL.has(x)) : COMPLET), ...(o.reel ? ['CH-9'] : []), 'CH-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: o.temoin ? ['CH-3'] : [] })
const veut = (id) => IDS.includes(id)
const finir = (code) => { jugerPreuvesVides(s, 'CH', RAC, FICHE); process.exit(Math.max(code ?? 0, s.finir())) }
const GELEES = ['lestraque', 'carreleur', 'chauffagiste', 'couvreur', 'electricien', 'macon', 'menuisier', 'peintre', 'plombier', 'serrurier']
const J = jeuC('commande-payee.json')
const CMD = J.commande, ART = J.artisan

// ── La part NR de CH-3 : les démos gelées n'ont pas bougé depuis HEAD ────────────────────────────────────────────────────────
const sha = (b) => crypto.createHash('sha1').update(b).digest('hex')
function empreintesGelees(racine) {
  const base = fs.existsSync(path.join(racine, 'public', 'sites-demo')) ? racine : DEPOT_GIT
  const m = new Map()
  for (const d of GELEES) for (const f of lireArbre(path.join(base, 'public', 'sites-demo', d))) m.set(`${d}/${f}`, sha(fs.readFileSync(path.join(base, 'public', 'sites-demo', d, f))))
  return { base, m }
}
function partNrCh3() {
  // Les neuf démos gelées seulement (Lestraque, vivante, est jugée avant/après dans le mode complet).
  const neuf = GELEES.filter((d) => d !== 'lestraque')
  const base = fs.existsSync(path.join(RAC, 'public', 'sites-demo')) ? RAC : DEPOT_GIT
  const e = []
  let n = 0
  for (const d of neuf) {
    const arbre = lsTree('HEAD', `public/sites-demo/${d}/`)
    for (const [chemin, v] of arbre) {
      const f = path.join(base, ...chemin.split('/'))
      if (!fs.existsSync(f)) { e.push(`${chemin} supprimé`); continue }
      const ici = fs.readFileSync(f)
      n++
      if (shaBlob(ici) !== v.sha && shaBlob(Buffer.from(ici.toString('utf8').replace(/\r\n/g, '\n'))) !== v.sha) e.push(`${chemin} modifié`)
    }
    // Un fichier ajouté : non suivi ET non ignoré (les polices de public/sites-demo/*/fonts/ sont ignorées par .gitignore :
    // elles sont sur le disque du dépôt principal sans être dans HEAD, et n'en sont pas une modification).
    const ajoutes = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', `public/sites-demo/${d}/`], { cwd: base, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
    if (ajoutes.status === 0) for (const f of ajoutes.stdout.split(/\r?\n/).filter(Boolean)) e.push(`${f} ajouté`)
  }
  return { echecs: e, detail: `les neuf démos gelées de ${rel(base)}/public/sites-demo/ identiques à HEAD (${n} fichiers)` }
}
if (o.temoin) { await s.critere('CH-3', partNrCh3); finir(0) }
if (o.reel) { s.echoue('CH-9', 'non écrit : --reel sera écrit par Claude Code avant la première livraison réelle (après 026-100 PASS) — code 2, jamais un PASS'); s.nonJuges(IDS, '--reel non écrit'); finir(2) }

// ── CH-1 et les préalables ───────────────────────────────────────────────────────────────────────────────────────────────
const TRAV = dossierTravail(JUGE)
if (lireRacine(RAC, SCRIPT) === null) {
  s.echoue('CH-1', `${SCRIPT} absent de ${rel(RAC)} : la chaîne de 026-100 n'existe pas encore`)
  s.nonJuges(IDS.filter((x) => x !== 'CH-PV'), `CH-1 en échec (${SCRIPT} absent)`)
  finir(1)
}
const manquants = [['026-033', 'scripts/commande-exporter.mjs'], ['026-093', 'scripts/commande-rediger.mjs'], ['026-093', 'lib/siteRedacteur.ts']].filter(([, f]) => lireRacine(RAC, f) === null)
if (manquants.length) {
  s.echoue('CH-1', `non jugé : ${[...new Set(manquants.map(([x]) => x))].join(' et ')} attendue(s) (${manquants.map(([, f]) => f).join(', ')} absent)`)
  s.nonJuges(IDS.filter((x) => x !== 'CH-PV'), 'fiche amont attendue')
  finir(2)
}

// ── Le banc ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const BANC = path.join(TRAV, 'banc')
const copier = (relatif, depuis = RAC) => { const src = path.join(depuis, relatif); if (fs.existsSync(src)) fs.cpSync(src, path.join(BANC, relatif), { recursive: true }) }
for (const f of ['scripts/livrer-site.mjs', 'scripts/commande-exporter.mjs', 'scripts/commande-rediger.mjs', 'lib', 'maquettes/modeles', 'public/sites-demo/generer.mjs', 'public/sites-demo/_kit', 'public/sites-demo/_polices', 'package.json', 'tsconfig.json']) copier(f)
for (const f of ['scripts/site-qa.mjs', 'scripts/ts-loader.mjs']) copier(f, fs.existsSync(path.join(RAC, f)) ? RAC : R)
const REDACTEUR_REEL = fs.readFileSync(path.join(BANC, 'scripts', 'commande-rediger.mjs'))
fs.renameSync(path.join(BANC, 'scripts', 'commande-rediger.mjs'), path.join(BANC, 'scripts', 'commande-rediger.reel.mjs'))
const DEPOT_APPELE = path.join(BANC, 'depot-appele.txt'), APPELS_REDACTEUR = path.join(BANC, 'redacteur-appels.txt')
fs.writeFileSync(path.join(BANC, 'scripts', 'site-deposer.mjs'), `// Piège du juge livrer-site-qa : site-deposer ne doit pas être lancé ici.\nimport fs from 'node:fs'\nfs.appendFileSync(${JSON.stringify(DEPOT_APPELE)}, process.argv.slice(2).join(' ') + '\\n')\nconsole.error('✗ site-deposer.mjs : piège du juge (aucun dépôt)')\nprocess.exit(1)\n`)
/** Pose le rédacteur du banc : 'reel', ou une doublure qui note l'appel, fait `avant`, lance le vrai, puis fait `apres`. */
function poserRedacteur(genre) {
  const f = path.join(BANC, 'scripts', 'commande-rediger.mjs')
  if (genre === 'reel') { fs.writeFileSync(f, REDACTEUR_REEL); return }
  const corps = {
    compter: '',
    // CH-5 : le texte des pages de commune répété six fois (site-qa refuse « du texte écrit, pas répété »).
    repeter: `const c = path.join(process.argv[2], 'contenu.json'); if (fs.existsSync(c)) { const x = JSON.parse(fs.readFileSync(c, 'utf8')); for (const p of Object.values(x.pages ?? {})) if (p?.type === 'commune') p.sections = [{ genre: 'prestations', h2: 'Texte répété', blocs: Array.from({ length: 6 }, () => ({ type: 'p', texte: 'Cette phrase de remplissage revient encore et encore sur la page de la commune sans rien dire de plus.' })) }]; fs.writeFileSync(c, JSON.stringify(x)) }`,
    // CH-12 : pendant la génération, une autre voie livre la commande (l'état du fichier --depuis passe à « generee »).
    livrer: `const d = process.env.CH12_DEPUIS; if (d) { const x = JSON.parse(fs.readFileSync(d, 'utf8')); x.commande.etat = 'generee'; fs.writeFileSync(d, JSON.stringify(x)) }`,
    // CH-8 : un rédacteur qui échoue.
    echouer: 'process.exit(1)',
  }[genre]
  const avant = genre === 'echouer' || genre === 'livrer'
  fs.writeFileSync(f, `// Doublure du rédacteur (juge livrer-site-qa, cas « ${genre} »).\nimport fs from 'node:fs'\nimport path from 'node:path'\nimport { spawnSync } from 'node:child_process'\nfs.appendFileSync(${JSON.stringify(APPELS_REDACTEUR)}, process.argv.slice(2).join(' ') + '\\n')\n${avant ? corps : ''}\nconst r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', 'scripts/commande-rediger.reel.mjs', ...process.argv.slice(2)], { stdio: 'inherit' })\nif (r.status === 0) { ${avant ? '' : corps} }\nprocess.exit(r.status ?? 1)\n`)
}
poserRedacteur('reel')
const TRAVAIL_BANC = path.join(BANC, '.orchestre', 'travail', 'livraison', ID_COMMANDE)
const SITE = path.join(TRAVAIL_BANC, 'site'), JOURNAL = path.join(BANC, '.orchestre', 'travail', 'livraison', 'journal.jsonl')
const lignesJournal = () => { try { return fs.readFileSync(JOURNAL, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { illisible: l } } }) } catch { return [] } }
const appelsRedacteur = () => { try { return fs.readFileSync(APPELS_REDACTEUR, 'utf8').split(/\r?\n/).filter(Boolean).length } catch { return 0 } }
const depotAppele = () => fs.existsSync(DEPOT_APPELE)
const publicBanc = () => new Map(lireArbre(path.join(BANC, 'public')).map((f) => [f, sha(fs.readFileSync(path.join(BANC, 'public', f)))]))
const PUBLIC_BANC_AVANT = publicBanc(), GELEES_AVANT = empreintesGelees(RAC).m, GIT_PUBLIC_AVANT = gitStatusPublic(RAC)

const serveur = await servirPhotos()
const piege = piegeReseau(TRAV, 'livrer-site')
// En --usine, le piège note aussi les lectures de .env.local et de process.env.SUPABASE_* par livrer-site lui-même.
fs.appendFileSync(path.join(TRAV, 'piege-reseau.mjs'), `
if (process.env.PIEGE_C_USINE && /livrer-site\\.mjs$/.test(process.argv[1] ?? '')) {
  const reel = process.env
  process.env = new Proxy(reel, { get(t, k) { if (typeof k === 'string' && /SUPABASE/.test(k)) noter('env ' + k); return Reflect.get(t, k) } })
  for (const k of ['readFileSync', 'existsSync', 'statSync', 'openSync', 'readFile', 'accessSync']) { const f0 = fs[k]; fs[k] = function (p, ...a) { if (/\\.env\\.local$/.test(String(p))) noter('lecture ' + String(p)); return f0.call(this, p, ...a) } }
}
`)
// Hors --usine, les enfants reçoivent le projet (fictif) du jeu d'essai et une clé de service factice, comme pour l'exporteur ;
// en --usine, AUCUNE variable SUPABASE_*.
const ENV_USINE = envEnfant(piege.env)
const ENV = { ...ENV_USINE, NEXT_PUBLIC_SUPABASE_URL: PROJET, ['SUPABASE_SERVICE_' + 'ROLE_KEY']: 'cle-factice-du-juge-026-029' }
const sorties = [] // { nom, ci, sortie }
const livrer = async (nom, extra, { depuis = JEU, env = ENV, ci = false } = {}) => {
  const r = await lancerAsync(process.execPath, ['--import', LOADER_URL, 'scripts/livrer-site.mjs', ID_COMMANDE, ...extra, ...(depuis ? [`--depuis=${depuis}`, `--hote-photos=${serveur.url}`] : [])], { cwd: BANC, env, timeout: 240_000 })
  if (r.code === null) r.sortie += '\n(délai de 240 s dépassé : un serveur de photos dans le même processus qu\'un spawnSync ne répond jamais)'
  sorties.push({ nom, ci, sortie: r.sortie })
  return r
}
const fin3 = (r) => court(r.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 220)

// ── CH-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (veut('CH-1')) await s.critere('CH-1', async () => {
  const e = []
  const r0 = await lancerAsync(process.execPath, ['--import', LOADER_URL, 'scripts/livrer-site.mjs'], { cwd: BANC, env: ENV })
  if (r0.code !== 2) e.push(`sans argument : code ${r0.code}, 2 attendu`)
  const hors = path.join(BANC, 'public', 'sites-demo', 'essai-026-029-ch1')
  const r1 = await livrer('destination sous public/', ['--sans-ia', '--sans-depot', `--sortie=${hors}`])
  if (r1.code !== 2) e.push(`--sortie sous public/ sans --usine : code ${r1.code}, 2 attendu`)
  if (fs.existsSync(hors)) { e.push(`--sortie sous public/ : ${rel(hors)} créé`); fs.rmSync(hors, { recursive: true, force: true }) }
  return { echecs: e, detail: `${SCRIPT} présent ; sans argument → code 2 ; --sortie sous public/ sans --usine → code 2, rien d'écrit` }
})

// ── CH-2 : la chaîne complète, sans dépôt ────────────────────────────────────────────────────────────────────────────────
let prealable = false
const j0 = lignesJournal().length
const r2 = veut('CH-2') || veut('CH-7') || veut('CH-3') ? await livrer('chaîne --sans-ia --sans-depot', ['--sans-ia', '--sans-depot']) : null
const j2 = lignesJournal().length
if (veut('CH-2')) await s.critere('CH-2', async () => {
  if (!fichePass('025-03')) { prealable = true; return { echecs: ['non jugé : 025-03 attendue (generer.mjs --source)'] } }
  const e = []
  if (r2.code !== 0) e.push(`code ${r2.code}, 0 attendu — ${fin3(r2)}`)
  for (const f of ['index.html', 'site.json']) if (!fs.existsSync(path.join(SITE, f))) e.push(`site/${f} absent (${rel(SITE)})`)
  if (depotAppele()) e.push('site-deposer.mjs lancé malgré --sans-depot')
  if (!e.length) { const q = await siteQaStatique(RAC, SITE, envEnfant()); if (!q.ok) e.push(`site-qa --statique, relancé par le juge : ${auPlus(q.echecs, 3)}`) }
  return { echecs: e, detail: `--depuis --hote-photos --sans-ia --sans-depot → code 0 en ${r2.duree.toFixed(1)} s ; site/index.html et site.json présents ; site-qa.mjs --statique relancé par le juge : vert ; aucun dépôt` }
})

// ── CH-4 : le verrou ─────────────────────────────────────────────────────────────────────────────────────────────────────
if (veut('CH-4')) await s.critere('CH-4', async () => {
  const e = []
  const [a, b] = await Promise.all([livrer('verrou A', ['--sans-ia', '--sans-depot']), new Promise((res) => setTimeout(res, 150)).then(() => livrer('verrou B', ['--sans-ia', '--sans-depot']))])
  const codes = [a.code, b.code].sort()
  if (codes.join(',') !== '0,5') e.push(`deux exécutions ensemble : codes ${a.code} et ${b.code}, 0 et 5 attendus`)
  const verrou = path.join(TRAVAIL_BANC, '.verrou')
  fs.mkdirSync(TRAVAIL_BANC, { recursive: true })
  const vieux = new Date(Date.now() - 61 * 60_000)
  fs.writeFileSync(verrou, JSON.stringify({ pid: 999999, date: vieux.toISOString() }))
  fs.utimesSync(verrou, vieux, vieux)
  const c = await livrer('verrou de 61 min', ['--sans-ia', '--sans-depot'])
  if (c.code !== 0) e.push(`verrou de 61 min : code ${c.code}, 0 attendu (repris) — ${fin3(c)}`)
  else if (!/repris/i.test(c.sortie)) e.push('verrou de 61 min repris sans le dire (« repris » absent de la sortie)')
  return { echecs: e, detail: `deux exécutions ensemble → codes ${a.code} et ${b.code} ; un verrou de 61 min → repris, code 0, et la sortie le dit` }
})

// ── CH-5 : le plafond de régénérations ───────────────────────────────────────────────────────────────────────────────────
if (veut('CH-5')) await s.critere('CH-5', async () => {
  poserRedacteur('repeter')
  fs.rmSync(APPELS_REDACTEUR, { force: true })
  const f = copieJeu(TRAV, 'ch5-regenerations-2.json', (j) => { j.commande.regenerations = 2 })
  const r = await livrer('plafond de régénérations', ['--sans-ia', '--sans-depot'], { depuis: f })
  const n = appelsRedacteur()
  poserRedacteur('reel')
  const e = []
  if (r.code !== 4) e.push(`regenerations: 2 et un texte répété : code ${r.code}, 4 attendu — ${fin3(r)}`)
  if (n !== 1) e.push(`le rédacteur a été appelé ${n} fois, 1 attendue (aucune nouvelle rédaction au plafond)`)
  return { echecs: e, detail: `regenerations: 2 et un site rouge sur le texte → code 4 ; rédacteur appelé ${n} fois` }
})

// ── CH-6 : dossier incomplet ─────────────────────────────────────────────────────────────────────────────────────────────
const f6 = copieJeu(TRAV, 'ch6-sans-prestation.json', (j) => { j.commande.matiere.prestations = [] })
const j6a = lignesJournal().length
fs.rmSync(SITE, { recursive: true, force: true })
const r6 = veut('CH-6') || veut('CH-7') ? await livrer('dossier incomplet', ['--sans-ia', '--sans-depot'], { depuis: f6 }) : null
const j6b = lignesJournal().length
if (veut('CH-6')) await s.critere('CH-6', () => {
  const e = []
  if (r6.code !== 3) e.push(`code ${r6.code}, 3 attendu — ${fin3(r6)}`)
  const derniere = lignesJournal().at(-1)
  const et = Array.isArray(derniere?.etapes) ? derniere.etapes : []
  if (j6b !== j6a + 1) e.push(`${j6b - j6a} ligne(s) ajoutée(s) au journal, 1 attendue`)
  else if (et.length !== 1 || et[0]?.code !== 3) e.push(`le journal montre les étapes ${JSON.stringify(et).slice(0, 120)} : l'export seul, en code 3, attendu`)
  if (lireArbre(SITE).length) e.push(`un site a été généré (${lireArbre(SITE).length} fichiers)`)
  return { echecs: e, detail: 'dossier sans prestation → code 3 venu de l\'exporteur, le journal s\'arrête à l\'export, aucun site généré' }
})

// ── CH-12 : --ci sur une commande livrée entre-temps ─────────────────────────────────────────────────────────────────────
let r12 = null
if (veut('CH-12') || veut('CH-7')) {
  poserRedacteur('livrer')
  fs.rmSync(DEPOT_APPELE, { force: true })
  const f12 = copieJeu(TRAV, 'ch12-livree-entre-temps.json', () => {})
  r12 = await livrer('--ci, livrée entre-temps', ['--ci', '--sans-ia'], { depuis: f12, env: { ...ENV, CH12_DEPUIS: f12 }, ci: true })
  poserRedacteur('reel')
}
if (veut('CH-12')) await s.critere('CH-12', () => {
  const e = []
  if (r12.code !== 6) e.push(`--ci sur une commande passée à « generee » pendant la génération : code ${r12.code}, 6 attendu — ${fin3(r12)}`)
  if (depotAppele()) e.push('le piège de site-deposer.mjs a été appelé')
  return { echecs: e, detail: '--ci, commande passée à « generee » pendant la génération → code 6, site-deposer.mjs jamais lancé' }
})

// ── CH-7 : le journal et la sortie --ci ──────────────────────────────────────────────────────────────────────────────────
if (veut('CH-7')) await s.critere('CH-7', async () => {
  const e = []
  const rci = await livrer('--ci --sans-depot', ['--ci', '--sans-ia', '--sans-depot'], { ci: true })
  if (rci.code !== 0) e.push(`--ci --sans-depot : code ${rci.code}, 0 attendu — ${fin3(rci)}`)
  if (j2 - j0 !== 1) e.push(`l'exécution de CH-2 a ajouté ${j2 - j0} ligne(s) au journal, 1 attendue`)
  if (j6b - j6a !== 1) e.push(`l'exécution de CH-6 a ajouté ${j6b - j6a} ligne(s) au journal, 1 attendue`)
  const lignes = lignesJournal()
  if (!lignes.length) e.push(`${rel(JOURNAL)} vide ou absent`)
  lignes.forEach((l, i) => {
    if (l.illisible) { e.push(`ligne ${i + 1} illisible`); return }
    for (const k of ['commande', 'duree_s', 'etapes', 'issue']) if (l[k] === undefined) e.push(`ligne ${i + 1} : ${k} manque`)
    if (!Array.isArray(l.etapes)) e.push(`ligne ${i + 1} : etapes n'est pas une liste`)
    if (typeof l.duree_s !== 'number') e.push(`ligne ${i + 1} : duree_s n'est pas un nombre`)
  })
  const texte = (() => { try { return fs.readFileSync(JOURNAL, 'utf8') } catch { return '' } })()
  const chiffres = (t) => String(t).replace(/\D/g, '')
  const interdits = [['le nom', ART.nom], ['l\'adresse', CMD.matiere.adresse], ['le SIREN', CMD.matiere.siren], ['le nom', 'Témoin-Vingt-Six']]
  const fuite = (quoi, t) => {
    for (const [x, v] of interdits) if (t.includes(v)) e.push(`${quoi} : ${x} (« ${v} »)`)
    const suites = (t.match(/\+?\d(?:[\d .-]*\d)?/g) ?? []).map(chiffres)
    for (const tel of [ART.tel_public, ART.tel]) { const c = chiffres(tel); if (suites.some((x) => x.includes(c) || x.includes(`33${c.slice(1)}`))) e.push(`${quoi} : le téléphone`) }
  }
  fuite('journal.jsonl', texte)
  for (const x of sorties.filter((y) => y.ci)) fuite(`sortie de ${x.nom}`, x.sortie)
  return { echecs: [...new Set(e)], detail: `${lignes.length} ligne(s) de journal, une par exécution (CH-2 : +${j2 - j0}, CH-6 : +${j6b - j6a}), toutes avec commande, duree_s, etapes et issue ; ni nom, ni adresse, ni téléphone, ni SIREN dans le journal ni dans ${sorties.filter((y) => y.ci).length} sortie(s) --ci` }
})

// ── CH-8 : l'ordre des étapes ────────────────────────────────────────────────────────────────────────────────────────────
const SRC = lireRacine(RAC, SCRIPT) ?? ''
const SC = sansCommentaires(SRC)
if (veut('CH-8')) await s.critere('CH-8', async () => {
  const e = []
  const ordre = ['commande-exporter', 'commande-rediger', 'generer', 'site-qa', 'site-deposer']
  const pos = ordre.map((n) => SC.search(new RegExp(`${n.replace('-', '\\-')}(?:\\.mjs)?['"\`]`)))
  ordre.forEach((n, i) => { if (pos[i] < 0) e.push(`étape ${n} introuvable dans le source`) })
  for (let i = 1; i < ordre.length; i++) if (pos[i] >= 0 && pos[i - 1] >= 0 && pos[i] < pos[i - 1]) e.push(`${ordre[i]} apparaît avant ${ordre[i - 1]} dans le source`)
  if (/\bspawnSync\s*\([^)]*['"`][^'"`]*(?:&&|;|\|\|)[^'"`]*['"`]/.test(SC)) e.push('une étape est enchaînée dans une chaîne de shell')
  poserRedacteur('echouer')
  fs.rmSync(DEPOT_APPELE, { force: true }); fs.rmSync(SITE, { recursive: true, force: true })
  const ja = lignesJournal().length
  const r = await livrer('rédacteur en échec', ['--sans-ia'])
  poserRedacteur('reel')
  const derniere = lignesJournal().length > ja ? lignesJournal().at(-1) : null
  const noms = (derniere?.etapes ?? []).map((x) => x?.nom)
  if (r.code === 0) e.push('rédacteur en échec : code 0')
  if (lireArbre(SITE).length) e.push('rédacteur en échec : un site a quand même été généré')
  if (depotAppele()) e.push('rédacteur en échec : site-deposer.mjs a été lancé')
  if (!derniere) e.push('rédacteur en échec : aucune ligne de journal')
  else if ((derniere.etapes ?? []).length !== 2) e.push(`rédacteur en échec : le journal montre ${JSON.stringify(noms)}, l'export puis la rédaction seulement attendus`)
  return { echecs: e, detail: `ordre lu dans le source : ${ordre.join(' → ')} ; rédacteur en code 1 → livrer-site en code ${r.code}, ni génération, ni site-qa, ni dépôt (journal : ${noms.join(', ')})` }
})

// ── CH-10 : rien de propre à Windows ─────────────────────────────────────────────────────────────────────────────────────
if (veut('CH-10')) await s.critere('CH-10', () => {
  const e = []
  const motifs = [[/shell\s*:\s*true/, 'shell: true'], [/powershell/i, 'powershell'], [/\.cmd\b/i, '.cmd'], [/cmd\.exe/i, 'cmd.exe'], [/[A-Za-z]:\\\\/, '« C:\\ »'], [/\.\.[\\/]SaaS/, '../SaaS']]
  for (const [re, quoi] of motifs) if (re.test(SRC)) e.push(`${quoi} dans le source`)
  const litteraux = [...SC.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2])
  const antislash = litteraux.filter((l) => /\\\\/.test(l) && !/\\\\[nrtu$]/.test(l))
  if (antislash.length) e.push(`séparateur « \\ » dans une chaîne : ${court(antislash[0], 40)}`)
  if (/\+\s*['"`]\/|['"`][^'"`\n]*\/['"`]\s*\+/.test(SC)) e.push('un chemin assemblé par concaténation avec « / »')
  for (const m of SC.matchAll(/`([^`]*)`/g)) if (/\$\{[^}]+\}\/|\/\$\{/.test(m[1]) && !/:\/\//.test(m[1]) && !/^\s*--/.test(m[1])) { e.push(`un chemin assemblé dans un gabarit : \`${court(m[1], 50)}\``); break }
  // exec et execSync passent par un shell (un « .exec( » de RegExp n'en est pas un).
  const cp = importsDe(SRC).filter((i) => /^(?:node:)?child_process$/.test(i.spec))
  if (cp.some((i) => i.noms.some((n) => n === 'exec' || n === 'execSync')) || /(?<![.\w$])(?:exec|execSync)\s*\(|\.execSync\s*\(/.test(SC)) e.push('exec/execSync (un shell) dans le source')
  const appels = [...SC.matchAll(/\b(spawnSync|spawn|execFileSync|execFile|fork)\s*\(\s*([^,)]+)/g)]
  if (!appels.length) e.push('aucun lancement d\'étape trouvé (spawnSync)')
  for (const a of appels) if (a[1] !== 'fork' && a[2].trim() !== 'process.execPath') e.push(`${a[1]}(${court(a[2], 30)}, …) : process.execPath attendu`)
  return { echecs: e, detail: `ni shell: true, ni powershell, .cmd, cmd.exe, « C:\\ », ../SaaS ; aucun chemin assemblé à la main ; ${appels.length} lancement(s), tous par process.execPath` }
})

// ── CH-11 : --usine ──────────────────────────────────────────────────────────────────────────────────────────────────────
if (veut('CH-11')) await s.critere('CH-11', async () => {
  const e = []
  const ENTREE = path.join(TRAV, 'usine-entree'), SORTIE = path.join(TRAV, 'usine-sortie')
  fs.mkdirSync(path.join(ENTREE, 'photos'), { recursive: true })
  fs.copyFileSync(JEU, path.join(ENTREE, 'commande.json'))
  for (const f of fs.readdirSync(path.join(C, 'photos-source'))) fs.copyFileSync(path.join(C, 'photos-source', f), path.join(ENTREE, 'photos', f))
  // Un .env.local piège dans le banc : livrer-site --usine ne doit pas le lire.
  fs.writeFileSync(path.join(BANC, '.env.local'), 'NEXT_PUBLIC_SUPABASE_URL=https://piege-usine-026.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=cle-piege-du-juge-usine\n')
  fs.rmSync(DEPOT_APPELE, { force: true })
  const avantReseau = piege.lire().length
  const envUsine = { ...ENV_USINE, PIEGE_C_USINE: '1' }
  const usine = (nom, entree, sortie) => livrer(nom, ['--usine', `--entree=${entree}`, `--sortie=${sortie}`, '--sans-ia'], { depuis: null, env: envUsine })
  const r = await usine('--usine', ENTREE, SORTIE)
  if (r.code !== 0) e.push(`--usine : code ${r.code}, 0 attendu — ${fin3(r)}`)
  for (const f of ['site/index.html', 'site/site.json', 'rapport-qa.json', 'manifeste.json']) if (!fs.existsSync(path.join(SORTIE, f))) e.push(`${f} absent de la sortie`)
  let man = null
  try { man = JSON.parse(fs.readFileSync(path.join(SORTIE, 'manifeste.json'), 'utf8')) } catch { /* jugé */ }
  const TYPES = { '.html': /^text\/html/, '.css': /^text\/css/, '.js': /^(text|application)\/javascript/, '.json': /^application\/(json|manifest\+json)/, '.webmanifest': /^application\/manifest\+json/, '.xml': /^(application|text)\/xml/, '.txt': /^text\/plain/, '.webp': /^image\/webp$/, '.avif': /^image\/avif$/, '.png': /^image\/png$/, '.jpg': /^image\/jpeg$/, '.jpeg': /^image\/jpeg$/, '.svg': /^image\/svg\+xml$/, '.ico': /^image\/(x-icon|vnd\.microsoft\.icon)$/, '.woff2': /^font\/woff2$/, '.woff': /^font\/woff$/ }
  if (!man || !Array.isArray(man.fichiers)) e.push('manifeste.json illisible ou sans liste « fichiers »')
  else {
    const noms = man.fichiers.map((x) => x?.nom)
    for (const x of man.fichiers) {
      const nom = String(x?.nom ?? '')
      if (!/^[\w.@-]+(?:\/[\w.@-]+)*$/.test(nom) || nom.includes('..')) { e.push(`nom hors contrat : ${JSON.stringify(x?.nom)}`); continue }
      if (!fs.existsSync(path.join(SORTIE, ...nom.split('/')))) e.push(`${nom} listé mais absent`)
      const re = TYPES[path.extname(nom).toLowerCase()]
      if (!re || !re.test(String(x?.type ?? ''))) e.push(`${nom} : type ${JSON.stringify(x?.type)} incohérent avec son extension`)
    }
    const dus = [...lireArbre(path.join(SORTIE, 'site')).map((f) => `site/${f}`), 'rapport-qa.json']
    const oublies = dus.filter((f) => !noms.includes(f))
    if (oublies.length) e.push(`${oublies.length} fichier(s) de la sortie absents du manifeste : ${auPlus(oublies, 3)}`)
  }
  let rap = null
  try { rap = JSON.parse(fs.readFileSync(path.join(SORTIE, 'rapport-qa.json'), 'utf8')) } catch { /* jugé */ }
  if (!rap || rap.commande !== ID_COMMANDE || rap.verdict === undefined || rap.criteres === undefined) e.push(`rapport-qa.json : { commande: ${ID_COMMANDE}, verdict, criteres } attendu`)
  const tRap = JSON.stringify(rap ?? {})
  for (const v of [ART.nom, CMD.matiere.adresse, CMD.matiere.siren, ART.tel_public, ART.tel]) if (tRap.includes(v)) e.push(`rapport-qa.json porte une donnée personnelle (« ${v} »)`)
  if (fs.existsSync(path.join(SORTIE, 'site', 'index.html'))) { const q = await siteQaStatique(RAC, path.join(SORTIE, 'site'), envEnfant()); if (!q.ok) e.push(`site-qa --statique sur <sortie>/site : ${auPlus(q.echecs, 3)}`) }
  const notes = piege.lire().slice(avantReseau)
  const reseau = notes.filter((l) => /^(fetch|connect) /.test(l)), lectures = notes.filter((l) => /^(env|lecture) /.test(l))
  if (reseau.length) e.push(`appel(s) réseau hors 127.0.0.1 : ${auPlus(reseau, 2)}`)
  if (lectures.length) e.push(`livrer-site --usine lit ${auPlus([...new Set(lectures)], 3)}`)
  if (depotAppele()) e.push('site-deposer.mjs (piège) lancé en --usine')
  // Entrée sans commande.json → 3 ; sortie dans le dépôt → 2 ; aucun manifeste.
  const vide = path.join(TRAV, 'usine-entree-vide'), s3 = path.join(TRAV, 'usine-sortie-3')
  fs.mkdirSync(path.join(vide, 'photos'), { recursive: true })
  const r3 = await usine('--usine, entrée sans commande.json', vide, s3)
  if (r3.code !== 3) e.push(`entrée sans commande.json : code ${r3.code}, 3 attendu`)
  if (fs.existsSync(path.join(s3, 'manifeste.json'))) e.push('entrée sans commande.json : un manifeste a été écrit')
  const dansDepot = path.join(BANC, '.orchestre', 'travail', 'sortie-usine-ch11')
  const r4 = await usine('--usine, sortie dans le dépôt', ENTREE, dansDepot)
  if (r4.code !== 2) e.push(`sortie dans le dépôt : code ${r4.code}, 2 attendu`)
  if (fs.existsSync(path.join(dansDepot, 'manifeste.json'))) e.push('sortie dans le dépôt : un manifeste a été écrit')
  fs.rmSync(path.join(BANC, '.env.local'), { force: true })
  return { echecs: e, detail: `--usine → code 0 ; site/, rapport-qa.json et manifeste.json (${man?.fichiers?.length ?? 0} entrées, toutes présentes, typées, couvrant la sortie) ; site-qa --statique vert ; 0 appel réseau, ni .env.local ni SUPABASE_* lus, aucun dépôt ; entrée sans commande.json → 3, sortie dans le dépôt → 2, sans manifeste` }
})

// ── CH-3 : public/ intact ────────────────────────────────────────────────────────────────────────────────────────────────
if (veut('CH-3')) await s.critere('CH-3', () => {
  const e = [...partNrCh3().echecs]
  const apres = publicBanc()
  for (const [f, h] of apres) if (PUBLIC_BANC_AVANT.get(f) !== h) e.push(`public/${f} du banc ${PUBLIC_BANC_AVANT.has(f) ? 'modifié' : 'ajouté'} par livrer-site`)
  const gel = empreintesGelees(RAC).m
  for (const [f, h] of GELEES_AVANT) if (gel.get(f) !== h) e.push(`public/sites-demo/${f} a changé pendant le jugement`)
  const git = gitStatusPublic(RAC)
  if (GIT_PUBLIC_AVANT.ok && git.ok && git.texte !== GIT_PUBLIC_AVANT.texte) e.push('git status --porcelain public/ a changé pendant le jugement')
  return { echecs: e, detail: `git status --porcelain public/ identique avant et après ; Lestraque et les neuf démos gelées inchangées (${GELEES_AVANT.size} fichiers) ; rien de nouveau sous public/ du banc après ${sorties.length} lancement(s)` }
})

await serveur.fermer()
finir(prealable ? 2 : 0)
