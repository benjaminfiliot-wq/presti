// .orchestre/preuves/026-023/reprise-2026-09-27/sabotages.mjs — reprise du 27/09 de 026-023 (Claude Code), notée dans
// .orchestre/brouillons-ecosysteme/026/reprises-2026-09-27.md. La preuve que ce que la reprise ajoute aux juges sait échouer :
//   - scripts/achat-public-qa.mjs : AP-13 (case de renoncement L221-28 jamais présumée, horodatage du serveur dans les deux
//     métadonnées Stripe) et AP-14 (automatic_tax jamais forcé : franchise en base, art. 293 B) ;
//   - scripts/constructeur-ferme-qa.mjs : CF-3 et sa liste fermée des lignes de CARTE déclarées par les fiches 026.
// Même méthode que ../outils/sait-echouer.mjs : une maquette (copie de l'arbre courant : app, lib, middleware.ts,
// tsconfig.json, package.json, scripts/fermeture-e2e.mjs, et next-env.d.ts s'il existe) sous .orchestre/travail/026-023-reprise/arbre/,
// jamais le dépôt ; les témoins d'abord (juges verts sur la maquette intacte) ; puis, pour chaque entrée : les fichiers
// cassés (ou posés), le juge relancé, la ligne du critère relevée telle quelle, puis tout restauré et vérifié octet pour octet.
// Une entrée « rouge » est prise si le juge sort en code ≠ 0 avec une ligne rouge de SON critère ; une entrée « verte » (le
// témoin positif d'une règle de CF-3) est tenue si le juge sort en code 0.
//
//   node .orchestre/preuves/026-023/reprise-2026-09-27/sabotages.mjs
//
// Écrit sabotages.md et sabotages.json à côté de lui. Aucun réseau (les juges ont leurs pièges), aucun secret lu. À lancer
// sur l'usine (le PC n'a que 8 Go) : node scripts/usine.mjs executer --nom=reprise-026-023 --id=026-023
//   --rapatrier=.orchestre/preuves/026-023/reprise-2026-09-27 -- node .orchestre/preuves/026-023/reprise-2026-09-27/sabotages.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..')
const BASE_TRAVAIL = path.join(R, '.orchestre', 'travail', '026-023-reprise')
const M = path.join(BASE_TRAVAIL, 'arbre')
const COPIER = ['app', 'lib', 'middleware.ts', 'tsconfig.json', 'package.json', 'scripts/fermeture-e2e.mjs']
const FACULTATIFS = ['next-env.d.ts'] // ignoré par git : présent sur le PC, absent d'un bac de l'usine
const rel = (p) => path.relative(R, p).split(path.sep).join('/')
const court = (t, n = 300) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

// ── La maquette, neuve à chaque passage ───────────────────────────────────────────────────────────────────────────────────
if (!path.resolve(M).startsWith(path.resolve(R, '.orchestre', 'travail') + path.sep)) throw new Error(`maquette hors de .orchestre/travail : ${M}`)
fs.rmSync(M, { recursive: true, force: true })
for (const c of COPIER) {
  const s = path.join(R, c)
  if (!fs.existsSync(s)) throw new Error(`${c} absent de l'arbre courant`)
  fs.cpSync(s, path.join(M, c), { recursive: true })
}
for (const c of FACULTATIFS) if (fs.existsSync(path.join(R, c))) fs.cpSync(path.join(R, c), path.join(M, c))

// ── Les juges ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const JUGES = {
  AP: { nom: 'achat-public-qa', args: ['--import', './scripts/ts-loader.mjs', 'scripts/achat-public-qa.mjs', `--racine=${M}`], rouge: (id) => (l) => l.startsWith(`❌ ${id} `) || l === `❌ ${id}`, vert: (id) => (l) => l.startsWith(`✅ ${id} `) },
  CF: { nom: 'constructeur-ferme-qa --critere=CF-3', args: ['scripts/constructeur-ferme-qa.mjs', `--racine=${M}`, '--critere=CF-3'], rouge: (id) => (l) => l.startsWith(`FAIL ${id} `), vert: (id) => (l) => l.startsWith(`PASS ${id} `) },
}
function lancer(j) {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, JUGES[j].args, { cwd: R, encoding: 'utf8', timeout: 900_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  return { code: r.status, lignes: sortie.split(/\r?\n/).map((l) => l.trim()), duree: Math.round((Date.now() - t0) / 1000) }
}
const rougesDe = (lignes) => lignes.filter((l) => l.startsWith('❌ ') || l.startsWith('FAIL CF-')).map((l) => /^(?:❌|FAIL) ([A-Z]{2}-[A-Z0-9]+)/.exec(l)?.[1]).filter(Boolean)

/** Remplace `de` par `a` (fins de ligne du fichier respectées) ; rend l'original. `de` introuvable : erreur. */
function muter(fichier, remplacements) {
  const original = fs.readFileSync(fichier)
  let t = original.toString('utf8')
  const eol = t.includes('\r\n') ? '\r\n' : '\n'
  for (const [de, a] of remplacements) {
    const re = new RegExp(de.split('\n').map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n'))
    if (!re.test(t)) throw new Error(`« ${court(de, 60)} » introuvable dans ${rel(fichier)}`)
    t = t.replace(re, () => a.replace(/\n/g, eol))
  }
  fs.writeFileSync(fichier, t)
  return original
}

// ── Les entrées ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const L_CARTE = "    'siteAchatPublic': ['route', '/api/site/commander/public', 'POST', 'app/api/site/commander/public/route.ts', 'app/api/site/commander/public/renvoyer/route.ts'],"
const L_PILOTAGE = "    'pilotage': ['route', '/api/controle/pilotage', 'GET', 'app/api/controle/pilotage/route.ts'],"
const ROUTE_PILOTAGE = "// Maquette de la reprise du 27/09 (026-023) : témoin de la règle « debut » de CF-3, jamais livrée.\nimport { NextResponse } from 'next/server'\nimport { actif } from '@/lib/flags'\n\nexport async function GET() {\n  if (!actif('pilotage')) return new NextResponse(null, { status: 404 })\n  return NextResponse.json({ ok: true })\n}\n"
const FLAGS_PILOTAGE = ['lib/flags.ts', [['  siteAchatPublic: false,', '  siteAchatPublic: false,\n  pilotage: false,']]]
const ENTREES = [
  // ── AP-13 : la case L221-28 ─────────────────────────────────────────────────────────────────────────────────────────────
  { juge: 'AP', critere: 'AP-13', attendu: 'rouge', nom: 'route publique : le contrôle serveur de la case retiré',
    mutations: [['app/api/site/commander/public/route.ts', [["  if (donnees.renonciationRetractation !== true) champs.push('renonciationRetractation')", '  // (sabotage) contrôle de la case L221-28 retiré']]]] },
  { juge: 'AP', critere: 'AP-13', attendu: 'rouge', nom: 'route publique : la case présumée (toute valeur « vraie » passe)',
    mutations: [['app/api/site/commander/public/route.ts', [["  if (donnees.renonciationRetractation !== true) champs.push('renonciationRetractation')", "  if (!donnees.renonciationRetractation) champs.push('renonciationRetractation')"]]]] },
  { juge: 'AP', critere: 'AP-13', attendu: 'rouge', nom: 'route avec compte : le contrôle serveur de la case retiré',
    mutations: [['app/api/site/commander/route.ts', [['  if (corps?.renonciationRetractation !== true) {', "  if (corps?.renonciationRetractation === 'jamais') {"]]]] },
  { juge: 'AP', critere: 'AP-13', attendu: 'rouge', nom: 'constructeur : l\'horodatage de l\'accord ne part plus chez Stripe',
    mutations: [['lib/siteCommandeServeur.ts', [['    ...(accord ? { retractation_accord: accord } : {}),', '    ...({}),']]]] },
  // ── AP-14 : automatic_tax jamais forcé ──────────────────────────────────────────────────────────────────────────────────
  { juge: 'AP', critere: 'AP-14', attendu: 'rouge', nom: 'constructeur : automatic_tax forcé',
    mutations: [['lib/siteCommandeServeur.ts', [['    ...(taxeAuto ? { automatic_tax: { enabled: true } } : {}),', '    automatic_tax: { enabled: true },']]]] },
  { juge: 'AP', critere: 'AP-14', attendu: 'rouge', nom: 'constructeur : l\'interrupteur s\'allume sur toute valeur de STRIPE_TAXE_AUTO',
    mutations: [['lib/siteCommandeServeur.ts', [["  const taxeAuto = process.env.STRIPE_TAXE_AUTO === '1'", '  const taxeAuto = !!process.env.STRIPE_TAXE_AUTO']]]] },
  { juge: 'AP', critere: 'AP-14', attendu: 'rouge', nom: 'constructeur : automatic_tax forcé pour l\'achat sans compte seulement',
    mutations: [['lib/siteCommandeServeur.ts', [['    ...(taxeAuto ? { automatic_tax: { enabled: true } } : {}),', '    ...(taxeAuto || p.public ? { automatic_tax: { enabled: true } } : {}),']]]] },
  // ── CF-3 : la liste fermée des lignes des fiches 026 ────────────────────────────────────────────────────────────────────
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'un drapeau hors de la liste fermée ajouté à CARTE',
    mutations: [['scripts/fermeture-e2e.mjs', [[L_CARTE, `${L_CARTE}\n    'drapeauInconnu': ['lu'],`]]]] },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'la ligne siteAchatPublic retouchée (un fichier de route en moins)',
    mutations: [['scripts/fermeture-e2e.mjs', [[L_CARTE, "    'siteAchatPublic': ['route', '/api/site/commander/public', 'POST', 'app/api/site/commander/public/route.ts'],"]]]] },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'la ligne siteAchatPublic en double dans CARTE',
    mutations: [['scripts/fermeture-e2e.mjs', [[L_CARTE, `${L_CARTE}\n${L_CARTE}`]]]] },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'la ligne siteAchatPublic sortie de CARTE (dans un autre objet)',
    mutations: [['scripts/fermeture-e2e.mjs', [[L_CARTE, ''], ['  const CARTE = {', `  const AUTRE_CARTE = {\n${L_CARTE}\n  }\n  void AUTRE_CARTE\n  const CARTE = {`]]]] },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'du code glissé dans la ligne siteAchatPublic (étalement)',
    mutations: [['scripts/fermeture-e2e.mjs', [[L_CARTE, "    'siteAchatPublic': ['route', '/api/site/commander/public', 'POST', 'app/api/site/commander/public/route.ts', 'app/api/site/commander/public/renvoyer/route.ts', ...[]],"]]]] },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'siteAchatPublic retiré de FLAGS (lib/flags.ts), la ligne de CARTE gardée',
    mutations: [['lib/flags.ts', [['  siteAchatPublic: false,', '  // (sabotage) siteAchatPublic retiré de FLAGS']]]] },
  { juge: 'CF', critere: 'CF-3', attendu: 'vert', nom: 'témoin positif de la règle « debut » : ligne pilotage (026-068), route qui lit actif(\'pilotage\'), drapeau dans FLAGS',
    mutations: [FLAGS_PILOTAGE, ['scripts/fermeture-e2e.mjs', [[L_CARTE, `${L_CARTE}\n${L_PILOTAGE}`]]]], creer: { 'app/api/controle/pilotage/route.ts': ROUTE_PILOTAGE } },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'ligne pilotage complétée d\'une route qui ne lit pas actif(\'pilotage\')',
    mutations: [FLAGS_PILOTAGE, ['scripts/fermeture-e2e.mjs', [[L_CARTE, `${L_CARTE}\n    'pilotage': ['route', '/api/controle/pilotage', 'GET', 'app/api/controle/pilotage/route.ts', 'app/api/controle/pilotage/fuite/route.ts'],`]]]],
    creer: { 'app/api/controle/pilotage/route.ts': ROUTE_PILOTAGE, 'app/api/controle/pilotage/fuite/route.ts': "// Maquette (reprise 026-023) : une route qui NE lit PAS son drapeau.\nexport async function GET() { return new Response('ouvert') }\n" } },
  { juge: 'CF', critere: 'CF-3', attendu: 'rouge', nom: 'ligne pilotage complétée d\'un fichier qui n\'est pas une route (lib/flags.ts)',
    mutations: [FLAGS_PILOTAGE, ['scripts/fermeture-e2e.mjs', [[L_CARTE, `${L_CARTE}\n    'pilotage': ['route', '/api/controle/pilotage', 'GET', 'app/api/controle/pilotage/route.ts', 'lib/flags.ts'],`]]]],
    creer: { 'app/api/controle/pilotage/route.ts': ROUTE_PILOTAGE } },
]

// ── Les témoins ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const resultat = { produit_le: new Date().toISOString(), maquette: rel(M), copie_de: COPIER, temoins: {}, entrees: [] }
for (const [j, critere] of [['AP', 'AP-13'], ['CF', 'CF-3']]) {
  const r = lancer(j)
  resultat.temoins[j] = { juge: JUGES[j].nom, code: r.code, duree: r.duree, rouges: rougesDe(r.lignes), ligne: r.lignes.find(JUGES[j].vert(critere)) ?? r.lignes.find(JUGES[j].rouge(critere)) ?? null, derniere: r.lignes.filter(Boolean).at(-1) ?? '' }
  if (j === 'AP') resultat.temoins[j].ligne14 = r.lignes.find(JUGES.AP.vert('AP-14')) ?? r.lignes.find(JUGES.AP.rouge('AP-14')) ?? null
  console.log(`témoin ${JUGES[j].nom} sur la maquette intacte → code ${r.code} (${r.duree} s)${resultat.temoins[j].rouges.length ? ` ; rouges : ${resultat.temoins[j].rouges.join(', ')}` : ''}`)
}

// ── Les entrées ───────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const x of ENTREES) {
  const originaux = [], crees = []
  const e = { juge: JUGES[x.juge].nom, critere: x.critere, attendu: x.attendu, nom: x.nom, fichiers: [...x.mutations.map(([f]) => f), ...Object.keys(x.creer ?? {}).map((f) => `${f} (posé)`)], code: null, rouges: [], ligne: null, tenu: false, restaure: false, duree: null }
  try {
    for (const [f, remp] of x.mutations) { const abs = path.join(M, f); originaux.push([abs, muter(abs, remp)]) }
    for (const [f, contenu] of Object.entries(x.creer ?? {})) { const abs = path.join(M, f); if (fs.existsSync(abs)) throw new Error(`${f} existe déjà dans la maquette`); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, contenu); crees.push(abs) }
    const r = lancer(x.juge)
    e.code = r.code; e.duree = r.duree; e.rouges = rougesDe(r.lignes)
    if (x.attendu === 'rouge') { e.ligne = r.lignes.find(JUGES[x.juge].rouge(x.critere)) ?? null; e.tenu = r.code !== 0 && !!e.ligne }
    else { e.ligne = r.lignes.find(JUGES[x.juge].vert(x.critere)) ?? r.lignes.find(JUGES[x.juge].rouge(x.critere)) ?? null; e.tenu = r.code === 0 && !!e.ligne && JUGES[x.juge].vert(x.critere)(e.ligne) }
    if (!e.ligne) e.ligne = `(aucune ligne ${x.critere} ; dernière ligne : ${court(r.lignes.filter(Boolean).at(-1), 160)})`
  } catch (err) { e.ligne = `(entrée impossible : ${err.message})` } finally {
    let ok = true
    for (const [abs, orig] of originaux.reverse()) { fs.writeFileSync(abs, orig); ok = ok && fs.readFileSync(abs).equals(orig) }
    for (const abs of crees) { fs.rmSync(abs, { force: true }); ok = ok && !fs.existsSync(abs) }
    for (const d of ['app/api/controle/pilotage/fuite', 'app/api/controle/pilotage', 'app/api/controle']) { const abs = path.join(M, d); try { if (fs.existsSync(abs) && !fs.readdirSync(abs).length && !fs.existsSync(path.join(R, d))) fs.rmdirSync(abs) } catch { /* rien */ } }
    e.restaure = ok
  }
  resultat.entrees.push(e)
  console.log(`${x.critere} ${x.attendu} — ${x.nom} : ${e.tenu ? 'TENU' : 'NON TENU'} (code ${e.code}, ${e.duree ?? '?'} s, restauré ${e.restaure}) — ${court(e.ligne, 160)}`)
}

// ── Les preuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const tenus = resultat.entrees.filter((x) => x.tenu).length
const temoinsVerts = Object.values(resultat.temoins).every((t) => t.code === 0 && !t.rouges.length)
const echapper = (t) => String(t).replace(/\|/g, '\\|')
const md = [
  '# Reprise du 27/09 de 026-023 : les critères ajoutés savent échouer',
  '',
  `Produit par \`node ${rel(path.join(ICI, 'sabotages.mjs'))}\` le ${resultat.produit_le}. Maquette : \`${resultat.maquette}/\` (copie de ${COPIER.join(', ')} de l'arbre courant, jamais livrée). Pour chaque ligne : les fichiers cassés ou posés dans la maquette, le juge relancé, la ligne de son critère relevée telle quelle, puis tout restauré et vérifié octet pour octet.`,
  '',
  '## Témoins (maquette intacte)',
  '',
  ...Object.values(resultat.temoins).map((t) => `- ${t.juge} → code ${t.code} (${t.duree} s)${t.rouges.length ? ` ; ROUGES : ${t.rouges.join(', ')}` : ', tout vert'} — ${echapper(court(t.ligne ?? t.derniere, 240))}${t.ligne14 ? ` — ${echapper(court(t.ligne14, 240))}` : ''}`),
  '',
  '## Entrées',
  '',
  '| Juge | Critère | Attendu | Entrée | Fichiers | Code | Critères rouges | Tenu | Restauré | Ligne du critère (extrait réel) |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...resultat.entrees.map((x) => `| ${x.juge} | ${x.critere} | ${x.attendu} | ${echapper(x.nom)} | ${x.fichiers.join(', ')} | ${x.code ?? '—'} | ${x.rouges.join(', ') || '—'} | ${x.tenu ? 'oui' : 'NON'} | ${x.restaure ? 'oui' : 'NON'} | ${echapper(court(x.ligne, 400))} |`),
  '',
  `Bilan : témoins ${temoinsVerts ? 'verts' : 'PAS VERTS'} ; ${tenus} entrée(s) tenue(s) sur ${resultat.entrees.length}${resultat.entrees.every((x) => x.restaure) ? ', tous les originaux restaurés' : ' — ATTENTION : un original n\'est pas restauré'}.`,
  '',
]
fs.writeFileSync(path.join(ICI, 'sabotages.json'), `${JSON.stringify(resultat, null, 1)}\n`)
fs.writeFileSync(path.join(ICI, 'sabotages.md'), `${md.join('\n')}\n`)
console.log(`\nBilan : témoins ${temoinsVerts ? 'verts' : 'PAS VERTS'} ; ${tenus}/${resultat.entrees.length} tenues — ${rel(path.join(ICI, 'sabotages.md'))}`)
process.exit(temoinsVerts && tenus === resultat.entrees.length && resultat.entrees.every((x) => x.restaure) ? 0 : 1)
