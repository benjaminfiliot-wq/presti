// scripts/station-themes-qa.mjs — le juge des modules purs de la personnalisation et des thèmes de la station (fiche 026-171, N1b),
// écrit par Claude Code AVANT les modules (026-173) et les thèmes (026-185, 026-190) qu'il juge. L'exécutant qui le lance n'y touche
// jamais (CLAUDE.md:23). Hors ligne : ni compte, ni clé, ni serveur, ni navigateur ; tourne aussi sur l'usine.
//
//   node scripts/station-themes-qa.mjs --partie=modules            [--racine=<arbre>] [--temoin]
//   node scripts/station-themes-qa.mjs --theme=station|vaisseau   [--racine=<arbre>] [--temoin]
//
//   --partie=modules    TH-1 à TH-6 : lib/pilotage/{theme,disposition,reglages}.ts, importés par ts-loader (026-173) ;
//   --theme=<clé>       TH-7 à TH-12 : public/station/themes/<clé>/ (theme.json, atlas, fond, licence.json ; 026-185, 026-190) ;
//   --racine=<arbre>    juge cet arbre (référence, témoin ou sabotage de la preuve 026-012) au lieu du dépôt ;
//   --temoin            juge le TÉMOIN du lot t (scripts/fixtures/026-pilotage/t/temoin/ : modules d'essai et thèmes station et
//                       vaisseau minimaux, écrits par Claude Code) posé sur les fichiers de lib/pilotage/ du dépôt.
//
// Critères (le cahier de 026-171) :
//   TH-1 les trois modules existent, n'importent que lib/pilotage/, ni Date.now, ni Math.random, ni fetch, ni supabaseAdmin
//   TH-2 validerTheme suit theme.schema.json (026-170) : ~200 fautes du schéma refusées, le thème d'essai accepté
//   TH-3 validerDisposition : une salle par emplacement, graphe connexe, tapis continu, réservée fixe, bureau ET portrait
//   TH-4 validerReglages : schéma fermé (clés permises rendues), couleurs, bornes des noms, plaques, titre, avatars, 64 Ko, pièges
//   TH-5 fusionner : les réglages l'emportent clé par clé, entrées gelées intactes, rejouer ne change rien
//   TH-6 appliquerReglages : rien hors du nœud passé, jetons --mc-* seulement, jamais du HTML
//   TH-7 theme.json conforme au schéma ; 20 emplacements et UN réservé sans poste ; bloc portrait
//   TH-8 graphe connexe depuis le Commandement, tapis continu (validerDisposition sur les defauts, puis le calcul du juge)
//   TH-9 poids : 700 Kio le thème, 1,5 Mio les deux ; le fond 200 Kio ; un atlas et un fond
//   TH-10 licence.json : un pack du lot A par entrée (CC0, auteur, adresse, date), rien hors du lot A, aucune feuille brute
//   TH-11 chaque piège de t/themes-pieges/ est refusé avec sa raison (le juge se prouve refuser)
//   TH-12 aucun champ de code, aucune adresse http, aucun « starnet », aucun fichier exécutable dans le thème
//
// Où il tourne : la relecture des modules se fait dans un ENFANT (`node --import scripts/ts-loader.mjs`, t/juge-modules.mjs), si bien
// que le `verifier` d'une fiche peut l'appeler avec ou sans loader. Les feuilles brutes du lot A (TH-10) se comparent par empreinte :
// ~/station-assets relu s'il existe (l'usine), sinon le fichier des empreintes de station-planche-qa ; sur l'arbre réel sans l'un ni
// l'autre, code 2 (un préalable manque), jamais un vert.
// Sortie : « ✅ TH-n … » ou « ❌ TH-n … » par critère, puis « station-themes-qa … : PASS|FAIL ». Code 0 seulement si tout est vert,
// 1 si un critère est rouge, 2 si l'appel est invalide ou si un préalable manque. N'écrit que sous
// .orchestre/travail/station-themes-qa/ ; aucun réseau ; ne lit ni .env.local ni aucune clé.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, LOADER, lireOptions, creerSortie, premiereLigne, court, sansCommentaires, importsDe, exportsNommes, exigerSousTravail, lireOuNull, listerFichiers } from './fixtures/026-pilotage/a/commun.mjs'
import { T, EXT_IMAGES, LOT_A_DOSSIERS, lireEmpreintes, sha256, poidsDossier, jeuT } from './fixtures/026-pilotage/t/outils.mjs'

const JUGE = 'station-themes-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'theme'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const PARTIE = o.valeurs.partie, THEME = o.valeurs.theme
if ((PARTIE === undefined) === (THEME === undefined)) refuser('--partie=modules ou --theme=station|vaisseau, l\'un des deux et un seul')
if (PARTIE !== undefined && PARTIE !== 'modules') refuser(`--partie=${PARTIE} : « modules » seulement (les thèmes se jugent par --theme=)`)
if (THEME !== undefined && !['station', 'vaisseau'].includes(THEME)) refuser(`--theme=${THEME} : « station » ou « vaisseau » (la liste fermée ; « essai » n'existe que dans le juge)`)

const NOM = `${JUGE} ${PARTIE ? `--partie=${PARTIE}` : `--theme=${THEME}`}${o.temoin ? ' --temoin' : ''}`
const TRAV = path.join(TRAVAIL, JUGE)
const posix = (p) => p.split(path.sep).join('/')
const KIO = 1024, MIO = 1024 * 1024
const MODULES = ['lib/pilotage/theme.ts', 'lib/pilotage/disposition.ts', 'lib/pilotage/reglages.ts']
const EXPORTS = { 'lib/pilotage/theme.ts': ['validerTheme', 'CLES_THEME'], 'lib/pilotage/disposition.ts': ['validerDisposition'], 'lib/pilotage/reglages.ts': ['validerReglages', 'fusionner', 'appliquerReglages', 'CLES_REGLAGES'] }

// ── La racine jugée : le dépôt, un arbre donné, ou le témoin posé sur les fichiers de lib/pilotage/ ─────────────────────────
let racine = o.racine
let entete = `${NOM} — racine ${posix(path.relative(R, racine)) || '.'}`
if (o.temoin) {
  try {
    const dest = exigerSousTravail(path.join(TRAV, PARTIE ? 'temoin-modules' : `temoin-${THEME}`))
    fs.rmSync(dest, { recursive: true, force: true })
    for (const f of ['equipage', 'barre', 'fil']) { fs.mkdirSync(path.join(dest, 'lib', 'pilotage'), { recursive: true }); fs.copyFileSync(path.join(R, 'lib', 'pilotage', `${f}.ts`), path.join(dest, 'lib', 'pilotage', `${f}.ts`)) }
    const src = path.join(T, 'temoin')
    let poses = 0
    for (const f of [...listerFichiers(src)].sort()) {
      const chemin = f.endsWith('.temoin') ? f.slice(0, -'.temoin'.length) : null
      if (!chemin || !/^(lib\/pilotage|public\/station)\//.test(chemin)) continue
      fs.mkdirSync(path.dirname(path.join(dest, chemin)), { recursive: true })
      fs.copyFileSync(path.join(src, f), path.join(dest, chemin)); poses++
    }
    racine = dest
    entete = `${NOM} — le témoin du lot t (${poses} fichiers de scripts/fixtures/026-pilotage/t/temoin/) posé sur lib/pilotage/ du dépôt, sous ${posix(path.relative(R, dest))}`
  } catch (e) { console.log(`${NOM} : préalable — le témoin ne se pose pas (${premiereLigne(e)})`); process.exit(2) }
}
const IDS = PARTIE ? ['TH-1', 'TH-2', 'TH-3', 'TH-4', 'TH-5', 'TH-6'] : ['TH-7', 'TH-8', 'TH-9', 'TH-10', 'TH-11', 'TH-12']
const s = creerSortie(NOM, IDS, entete)
let prealable = false
const nonJuges = (ids, raison) => s.nonJuges(ids, raison)
const finir = () => { const c = s.finir(); process.exit(c === 0 ? 0 : prealable ? 2 : 1) }

// ── L'enfant qui rejoue les modules (TH-2 à TH-6, TH-8) ─────────────────────────────────────────────────────────────────
function enfant(critere, extra = []) {
  const env = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', LANG: process.env.LANG ?? 'C.UTF-8', TZ: 'UTC', NODE_OPTIONS: process.env.NODE_OPTIONS ?? '' }
  if (process.env.PIEGE_RESEAU_JOURNAL) env.PIEGE_RESEAU_JOURNAL = process.env.PIEGE_RESEAU_JOURNAL
  const r = spawnSync(process.execPath, ['--no-warnings', '--import', pathToFileURL(LOADER).href, path.join(T, 'juge-modules.mjs'), `--racine=${racine}`, `--critere=${critere}`, ...extra], { cwd: R, encoding: 'utf8', timeout: 180_000, env, maxBuffer: 64 * 1024 * 1024 })
  const l = (r.stdout ?? '').split(/\r?\n/).find((x) => x.startsWith('@@ '))
  if (!l) return { echecs: [`l'enfant n'a rien rendu (code ${r.status}${r.error ? `, ${premiereLigne(r.error)}` : ''}${r.signal ? `, ${r.signal}` : ''}) : ${court(r.stderr, 220)}`], detail: '' }
  try { return JSON.parse(l.slice(3)) } catch { return { echecs: ['l\'enfant a rendu une ligne illisible'], detail: '' } }
}
async function critereEnfant(id, extra) {
  const r = enfant(id, extra)
  if (r.prealable) { prealable = true; s.echoue(id, `préalable manquant : ${r.prealable}`); return }
  s.juger(id, r.echecs, r.detail)
}

// ═══ --partie=modules ═════════════════════════════════════════════════════════════════════════════════════════════════════
async function modules() {
  await s.critere('TH-1', () => {
    const e = [], lus = []
    for (const f of MODULES) {
      const src = lireOuNull(path.join(racine, f))
      if (!src || !src.trim()) { e.push(`${f} n'existe pas (ou est vide)`); continue }
      lus.push(f)
      const code = sansCommentaires(src)
      for (const i of importsDe(src)) {
        if (i.spec === null) e.push(`${f} : un import dynamique non littéral`)
        else if (i.genre === 'dynamique' || i.genre === 'require') e.push(`${f} : ${i.genre === 'require' ? 'require' : 'import dynamique'} de « ${i.spec} » (des imports statiques seulement)`)
        else if (!(/^\.\/[\w-]+$/.test(i.spec) || /^@\/lib\/pilotage\/[\w-]+$/.test(i.spec))) e.push(`${f} importe « ${i.spec} » : rien hors de lib/pilotage/ (ni supabaseAdmin, ni next/*, ni node:*)`)
      }
      for (const [re, quoi] of [[/\bfetch\s*\(/, 'fetch('], [/\bDate\.now\s*\(/, 'Date.now('], [/\bMath\.random\b/, 'Math.random'], [/\bsupabaseAdmin\b/, 'supabaseAdmin'], [/\bXMLHttpRequest\b/, 'XMLHttpRequest'], [/\bprocess\.env\b/, 'process.env'], [/\bnew\s+Date\s*\(\s*\)/, 'new Date()'], [/\b(?:setTimeout|setInterval)\s*\(/, 'une minuterie']]) if (re.test(code)) e.push(`${f} contient ${quoi}`)
      const ex = exportsNommes(src)
      for (const n of EXPORTS[f]) if (!ex.includes(n)) e.push(`${f} n'exporte pas ${n}`)
    }
    return { echecs: e, detail: `${lus.join(', ')} : aucun import hors de lib/pilotage/, ni fetch, ni Date.now, ni Math.random, ni supabaseAdmin ; les exports attendus (${Object.values(EXPORTS).flat().join(', ')}) présents` }
  })
  if (s.enEchec('TH-1')) return nonJuges(['TH-2', 'TH-3', 'TH-4', 'TH-5', 'TH-6'], 'TH-1 est en échec (les modules ne sont pas là ou ne sont pas purs) : rien à rejouer')
  // TH-2 : les champs du schéma ont leur type dans theme.ts (lu), puis le comportement (rejoué).
  const champs = new Set()
  const marche = (n) => { if (n && typeof n === 'object') { for (const [k, v] of Object.entries(n.properties ?? {})) { champs.add(k); marche(v) } if (n.items) marche(n.items) } }
  marche(JSON.parse(fs.readFileSync(path.join(T, '..', 'k', 'theme.schema.json'), 'utf8')))
  const srcTheme = sansCommentaires(lireOuNull(path.join(racine, MODULES[0])) ?? '')
  const sansType = [...champs].filter((c) => !new RegExp(`(?:^|[\\s{,;])['"]?${c.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}['"]?\\??\\s*:`).test(srcTheme))
  if (sansType.length) s.echoue('TH-2', `theme.ts ne donne pas de type à ${sansType.length} champ(s) du schéma : ${sansType.slice(0, 6).join(', ')}`)
  else await critereEnfant('TH-2')
  if (!s.enEchec('TH-2') && s.evalue('TH-2')) { /* le détail du champ par champ est dans l'enfant */ }
  await critereEnfant('TH-3')
  await critereEnfant('TH-4')
  await critereEnfant('TH-5')
  await critereEnfant('TH-6')
}

// ═══ --theme=<clé> ════════════════════════════════════════════════════════════════════════════════════════════════════════
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/
const FICHIERS_PERMIS = /\.(json|png|webp|avif|jpe?g)$/i
const JETONS_DE_CODE = /^(?:on\w+|script|scripts|code|html|css|js|javascript|eval|fonction|function|url|href|src|style|import|require)$/i
let V = null
try { V = await import('./fixtures/026-pilotage/k/validateur.mjs') } catch (e) { V = { erreur: premiereLigne(e) } }
const schema = JSON.parse(fs.readFileSync(path.join(T, '..', 'k', 'theme.schema.json'), 'utf8'))

/** Les empreintes connues des feuilles brutes : le lot A (relu ou gardé) et, en essai, les feuilles synthétiques du jeu. */
function empreintesDeReference(reelle) {
  const synth = jeuT('themes-pieges/empreintes-feuilles.json')
  const lot = lireEmpreintes(reelle)
  const tout = { ...(lot.empreintes ?? {}), ...synth }
  return { shas: new Set(Object.values(tout).map((v) => String(v).split(':')[1]).filter(Boolean)), reelles: lot.empreintes !== null, source: lot.source ?? 'feuilles synthétiques du jeu d\'essai seulement', tout }
}

/**
 * Le contrôle d'un dossier de thème (le même pour le thème jugé et pour chaque piège de TH-11).
 * → { 'TH-7': [raisons], 'TH-9': […], 'TH-10': […], 'TH-12': […], notes: {...} }
 */
function controlerDossier(dossier, { cle, autre = null, emp, live = true }) {
  const d = { 'TH-7': [], 'TH-9': [], 'TH-10': [], 'TH-12': [], notes: {} }
  const lire = (f) => lireOuNull(path.join(dossier, f))
  // TH-7
  let theme = null
  const brut = lire('theme.json')
  if (brut === null) d['TH-7'].push(`theme.json absent de ${posix(path.relative(R, dossier))}`)
  else {
    try { theme = JSON.parse(brut) } catch (e) { d['TH-7'].push(`theme.json illisible : ${premiereLigne(e)}`) }
  }
  if (theme) {
    for (const m of [...V.validerSchema(theme, schema), ...V.contraintesTheme(theme)]) d['TH-7'].push(m)
    if (theme.cle !== cle) d['TH-7'].push(`cle « ${theme.cle} », « ${cle} » attendue`)
    const emp21 = Array.isArray(theme.emplacements) ? theme.emplacements : []
    if (emp21.length !== 21) d['TH-7'].push(`${emp21.length} emplacements, 21 attendus (20 salles et l'emplacement réservé E-commerce)`)
    const r = emp21.filter((e) => e?.reservee === true)
    if (r.length !== 1 || r[0]?.cle !== 'ecommerce') d['TH-7'].push(`emplacement réservé : ${r.map((e) => e.cle).join(', ') || 'aucun'}, un seul, « ecommerce », attendu`)
    if (emp21.filter((e) => e?.reservee !== true && e?.poste).length !== 20) d['TH-7'].push(`${emp21.filter((e) => e?.reservee !== true && e?.poste).length} emplacements ordinaires avec un poste, 20 attendus`)
    if (!theme.portrait) d['TH-7'].push('le bloc « portrait » manque (le téléphone)')
    else if ((theme.portrait.emplacements ?? []).length !== 21) d['TH-7'].push(`portrait : ${(theme.portrait.emplacements ?? []).length} emplacements, 21 attendus`)
  }
  // TH-9 : le poids
  const p = fs.existsSync(dossier) ? poidsDossier(dossier) : { fichiers: [], total: 0 }
  const fond = p.fichiers.filter((x) => /^fond\.(webp|avif)$/i.test(x.f)), atlas = p.fichiers.filter((x) => /^atlas[\w-]*\.(png|webp)$/i.test(x.f))
  if (!atlas.length) d['TH-9'].push('aucun atlas (atlas*.png ou atlas*.webp) : l\'atlas composite manque')
  if (!fond.length) d['TH-9'].push('aucun fond (fond.webp ou fond.avif) : la nébuleuse manque')
  for (const f of fond) if (f.octets > 200 * KIO) d['TH-9'].push(`le fond ${f.f} pèse ${Math.round(f.octets / KIO)} Kio, 200 Kio au plus`)
  if (p.total > 700 * KIO) d['TH-9'].push(`le thème pèse ${Math.round(p.total / KIO)} Kio, 700 Kio au plus (le plus lourd : ${p.fichiers.slice().sort((a, b) => b.octets - a.octets)[0]?.f})`)
  if (autre && p.total + autre.total > 1.5 * MIO) d['TH-9'].push(`les deux thèmes pèsent ${(((p.total + autre.total) / MIO)).toFixed(2)} Mio, 1,5 Mio au plus`)
  d.notes.poids = `${p.fichiers.length} fichiers, ${Math.round(p.total / KIO)} Kio${autre ? `, ${(((p.total + autre.total) / MIO)).toFixed(2)} Mio avec l'autre thème` : ''}${fond[0] ? `, fond ${Math.round(fond[0].octets / KIO)} Kio` : ''}`
  // TH-10 : la licence, le lot A, les feuilles brutes
  const lic = lire('licence.json')
  let packs = []
  if (lic === null) d['TH-10'].push('licence.json absent : chaque pack du lot A utilisé y est cité (nom, auteur, adresse, CC0, date)')
  else {
    let L = null
    try { L = JSON.parse(lic) } catch (e) { d['TH-10'].push(`licence.json illisible : ${premiereLigne(e)}`) }
    if (L) {
      packs = Array.isArray(L?.packs) ? L.packs : []
      if (!packs.length) d['TH-10'].push('licence.json : « packs » vide ou absent')
      const vus = new Set()
      for (const [i, k] of packs.entries()) {
        const dos = k?.dossier
        if (typeof dos !== 'string' || !LOT_A_DOSSIERS.includes(dos)) { d['TH-10'].push(`pack ${i + 1} : « ${court(dos, 40)} » est hors du lot A (${LOT_A_DOSSIERS.length} dossiers de ~/station-assets)`); continue }
        if (vus.has(dos)) d['TH-10'].push(`pack ${dos} cité deux fois`)
        vus.add(dos)
        for (const c of ['titre', 'auteur', 'adresse']) if (typeof k[c] !== 'string' || !k[c].trim()) d['TH-10'].push(`pack ${dos} : « ${c} » absent`)
        if (typeof k.adresse === 'string' && !/^https:\/\/\S+$/.test(k.adresse.split(' ; ')[0])) d['TH-10'].push(`pack ${dos} : adresse « ${court(k.adresse, 40)} » (une adresse https attendue)`)
        if (!/\bCC0\b/.test(String(k.licence))) d['TH-10'].push(`pack ${dos} : licence « ${court(k.licence, 30)} », CC0 attendu`)
        if (typeof k.date !== 'string' || !RE_DATE.test(k.date) || Number.isNaN(Date.parse(k.date))) d['TH-10'].push(`pack ${dos} : date « ${court(k.date, 20)} » (AAAA-MM-JJ attendu)`)
        if (live) {
          const lj = lireOuNull(path.join(process.env.HOME ?? '', 'station-assets', dos, 'licence.json'))
          if (lj) { try { const j = JSON.parse(lj); for (const [c, src] of [['titre', 'titre'], ['auteur', 'auteur'], ['adresse', 'page'], ['licence', 'licence'], ['date', 'date']]) if (k[c] !== j[src]) d['TH-10'].push(`pack ${dos} : ${c} « ${court(k[c], 40)} », le licence.json du pack dit « ${court(j[src], 40)} »`) } catch { /* illisible : la relecture du lot A est un autre juge */ } }
        }
      }
    }
  }
  const images = p.fichiers.filter((x) => EXT_IMAGES.test(x.f))
  const brutes = images.filter((x) => emp.shas.has(sha256(fs.readFileSync(path.join(dossier, x.f)))))
  for (const x of brutes) d['TH-10'].push(`${x.f} est une feuille brute d'un pack du lot A (même empreinte) : l'atlas doit être une planche composite`)
  d.notes.licence = `${packs.length} pack(s) du lot A, ${images.length} image(s) comparée(s) aux empreintes des feuilles (${emp.source})`
  // TH-12 : aucun code, aucune adresse, aucun « starnet »
  for (const x of p.fichiers) if (!FICHIERS_PERMIS.test(x.f)) d['TH-12'].push(`${x.f} : un fichier qui n'est ni json ni image (svg, js, html, css… : jamais dans un thème)`)
  const cherche = (v, chemin) => {
    if (typeof v === 'string') { if (/(?:^|[^\w])(?:https?:|javascript:|data:|\/\/)/i.test(v)) d['TH-12'].push(`theme.json ${chemin} : adresse « ${court(v, 30)} »`); if (/<\s*\w|on\w+\s*=/i.test(v)) d['TH-12'].push(`theme.json ${chemin} : du balisage « ${court(v, 30)} »`) }
    else if (Array.isArray(v)) v.forEach((x, i) => cherche(x, `${chemin}[${i}]`))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (JETONS_DE_CODE.test(k)) d['TH-12'].push(`theme.json ${chemin}.${k} : un champ de code`); cherche(x, `${chemin}.${k}`) }
  }
  if (theme) cherche(theme, '$')
  for (const x of p.fichiers) if (/star\s*net/i.test(x.f)) d['TH-12'].push(`${x.f} : « starnet » dans un nom de fichier`)
  for (const f of ['theme.json', 'licence.json']) { const t = lire(f); if (t && /star\s*net/i.test(t)) d['TH-12'].push(`${f} contient « starnet »`) }
  return d
}

async function themes() {
  if (V.erreur) { prealable = true; for (const id of IDS) s.echoue(id, `préalable manquant : k/validateur.mjs illisible (${V.erreur})`); return }
  const dossier = path.join(racine, 'public', 'station', 'themes', THEME)
  const autre = path.join(racine, 'public', 'station', 'themes', THEME === 'station' ? 'vaisseau' : 'station')
  const reelle = o.racineParDefaut && !o.temoin
  const emp = empreintesDeReference(reelle)
  const autrePoids = fs.existsSync(autre) ? poidsDossier(autre) : null
  if (reelle && !emp.reelles && fs.existsSync(path.join(dossier, 'theme.json'))) { prealable = true; for (const id of ['TH-7', 'TH-8', 'TH-9', 'TH-10', 'TH-11', 'TH-12']) s.echoue(id, 'préalable manquant : ni ~/station-assets ni empreintes-lot-a.json (station-planche-qa) : sans les empreintes des feuilles du lot A, « aucune feuille brute » ne se juge pas (sur l\'usine)'); return }
  const d = controlerDossier(dossier, { cle: THEME, autre: autrePoids, emp })
  s.juger('TH-7', d['TH-7'], `public/station/themes/${THEME}/theme.json conforme au schéma de 026-170 (schéma et contraintes hors schéma), 21 emplacements dont l'unique réservé « ecommerce » sans poste, 20 avec un poste, bloc portrait de 21 emplacements`)
  if (d['TH-7'].some((m) => /absent|illisible/.test(m)) && !fs.existsSync(path.join(dossier, 'theme.json'))) nonJuges(['TH-8', 'TH-9', 'TH-10', 'TH-12'], 'le thème n\'existe pas (TH-7)')
  else {
    await critereEnfant('TH-8', [`--theme=${THEME}`])
    s.juger('TH-9', d['TH-9'], `poids : ${d.notes.poids} (700 Kio le thème, 1,5 Mio les deux, 200 Kio le fond) ; un atlas et un fond présents`)
    s.juger('TH-10', d['TH-10'], `licence.json : ${d.notes.licence}, toutes du lot A, CC0, avec auteur, adresse et date, aucune feuille brute`)
    s.juger('TH-12', d['TH-12'], 'aucun champ de code, aucune adresse (http, data, //), aucun balisage, aucun « starnet », aucun fichier hors json et images')
  }
  // TH-11 : le juge se prouve refuser chaque piège (le jeu d'essai, pas le thème jugé).
  const P = jeuT('themes-pieges/pieges.json')
  const e = []
  const boiteS = empreintesDeReference(false)
  let vus = 0
  for (const p of P.pieges) {
    const dp = path.join(T, 'themes-pieges', p.dossier)
    if (!fs.existsSync(dp)) { e.push(`piège « ${p.dossier} » : dossier absent du jeu d'essai`); continue }
    const r = controlerDossier(dp, { cle: p.cle ?? 'station', autre: null, emp: boiteS, live: false })
    const lignes = r[p.critere] ?? []
    if (!lignes.length) e.push(`le piège « ${p.dossier} » n'est pas refusé par ${p.critere}`)
    else if (!new RegExp(p.raison, 'i').test(lignes.join(' | '))) e.push(`le piège « ${p.dossier} » est refusé pour une autre raison : « ${court(lignes.join(' | '), 100)} » (attendu : /${p.raison}/)`)
    else vus++
  }
  s.juger('TH-11', e, `${vus} pièges refusés avec leur raison (${P.pieges.map((p) => `${p.dossier} → ${p.critere}`).join(', ')})`)
}

if (PARTIE) await modules(); else await themes()
finir()
