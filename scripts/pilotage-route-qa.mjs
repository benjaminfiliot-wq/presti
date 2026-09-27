// scripts/pilotage-route-qa.mjs — le juge de la route de lecture du Pilotage (fiche 026-068), écrit en 026-066 par Claude Code.
//
//   node --import ./scripts/ts-loader.mjs scripts/pilotage-route-qa.mjs [--racine=<d>] [--base=<commit>] [--temoin] [--statique]
//
// Critères RL de 026-068 (RL-1 lu « commence par », bloc `envois`, lecture de 026-066) :
//   statiques (toute racine) : RL-1 drapeau, carte de fermeture-e2e, plus de « lot » ; RL-2 (source) le drapeau d'abord ;
//     RL-5 même logique que lib/pilotage (imports, ni tri, ni réduction, ni Math., aucun seuil hors durée) ; RL-6 ops lu par
//     les seules fonctions pilotage_* ; RL-7 (source) aucune donnée personnelle ; RL-8 (source) l'UUID filtré avant lireBloc ;
//   vivants (racine réelle seulement, sans --racine ni --statique) : RL-2 (arbre réel, drapeau baissé : 404), RL-3, RL-4,
//     RL-7 et RL-8 sur une COPIE où le seul juge lève le drapeau (b/commun.mjs : copieAvecDrapeau, serveurCopie), avec un
//     compte fondateur et un compte artisan d'essai supprimés dans un finally (code 1 si le ménage échoue), et RL-9
//     (`npm run typecheck`). Lit alors .env.local de la vraie racine, sans rien afficher.
//   --racine=<d>  juge l'arbre <d> (référence, témoin, sabotage) : statique seulement, jamais de serveur ni de réseau.
//   --base=<c>    le commit auquel RL-1 compare lib/flags.ts et scripts/fermeture-e2e.mjs (défaut HEAD).
//   --harnais     --temoin, puis le harnais VIVANT (voir plus bas) : PC seulement, lit .env.local, crée et supprime un compte.
//   --temoin      pose le témoin du lot b (b/temoin/) sur app/, lib/ et les fichiers de tête du commit --base
//                 (.orchestre/travail/pilotage-route-qa/temoin-arbre/), le juge en statique, puis prouve le HARNAIS sans
//                 réseau (RL-HARNAIS) : la copie se fait, le drapeau est levé dans la copie et pas dans la source, et
//                 lib/flags.ts réel garde son empreinte sha256.
// Sortie « ✅ ID … » / « ❌ ID … », puis « pilotage-route-qa : PASS|FAIL ». Code 0, 1, ou 2 (appel invalide).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { R, court, premiereLigne, lireOptions, creerSortie, sansCommentaires } from './fixtures/026-pilotage/a/commun.mjs'
import { commitBase, lireBase, arbreTemoin, copieAvecDrapeau, serveurCopie, avecComptes, corpsDeFonction, sha256, lf } from './fixtures/026-pilotage/b/commun.mjs'

const JUGE = 'pilotage-route-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['base', 'statique', 'harnais'] })
// --harnais : --temoin, plus la preuve VIVANTE du harnais (serveur de la copie, compte fondateur d'essai → 200 sur
// /api/controle/chiffres de la copie, compte supprimé puis relu absent). Réseau et .env.local : sur le PC seulement, jamais sous
// la preuve (son piège réseau l'interdit) ; la fiche 026-066 en dépose la sortie dans .orchestre/preuves/026-066/harnais.log.
const HARNAIS = o.drapeaux.has('harnais')
if (HARNAIS) o.temoin = true
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
let BASE
try { BASE = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }
const VIVANT = !o.valeurs.racine && !o.temoin && !o.drapeaux.has('statique')

const ROUTE = 'app/api/controle/pilotage/route.ts', BLOCS = 'lib/pilotage/blocs.ts', FLAGS = 'lib/flags.ts', CARTE = 'scripts/fermeture-e2e.mjs'
const DEBUT_CARTE = "'pilotage': ['route', '/api/controle/pilotage', 'GET', 'app/api/controle/pilotage/route.ts'"
const NOMS_BLOCS = ['decider', 'appeler', 'envois', 'entonnoir', 'agents', 'code']
const IMPORTS = ['cartesDecisions', 'appelsDepuisReponses', 'appelsDepuisCommandes', 'fusionnerAppels', 'envoisDesAgents', 'entonnoir', 'lignesAgents', 'validerSnapshot', 'resumeCode', 'erreursAvantPaiement', 'nettoyerBrouillon', 'pauseGenerale']
const IDS = ['RL-1', 'RL-2', 'RL-5', 'RL-6', 'RL-7', 'RL-8', ...(VIVANT ? ['RL-3', 'RL-4', 'RL-9'] : []), ...(o.temoin ? ['RL-HARNAIS'] : [])]

let RAC = o.racine, TEMOIN = null
if (o.temoin) {
  try { TEMOIN = arbreTemoin(JUGE, { base: BASE, chemins: ['app', 'lib', 'middleware.ts', 'proxy.ts', 'next.config.mjs', 'tsconfig.json', 'package.json', 'next-env.d.ts', 'scripts/fermeture-e2e.mjs'] }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const S = creerSortie(JUGE, [...IDS], `${JUGE} — racine ${RAC}${TEMOIN ? ` — témoin du lot b posé sur ${BASE.slice(0, 7)}` : ''} — base ${BASE.slice(0, 7)} — ${VIVANT ? 'statique puis vivant (copie au drapeau levé, comptes d’essai)' : HARNAIS ? 'statique sur le témoin, puis harnais vivant (copie du témoin, serveur, compte fondateur d’essai)' : 'statique seulement (RL-3, RL-4, RL-9 et les parties vivantes de RL-2, RL-7, RL-8 se jugent sur la racine réelle)'}`)
const lireRac = (rel) => { try { return lf(fs.readFileSync(path.join(RAC, rel), 'utf8')) } catch { return null } }
/** Le code sans commentaires ni chaînes (les chaînes deviennent "") : on y cherche des appels, pas des mots d'un texte. */
const sansChaines = (src) => sansCommentaires(src ?? '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""')
/** Les imports nommés : Map(nom → spécificateur). */
function importsNommes(src) {
  const m = new Map()
  for (const x of sansCommentaires(src ?? '').matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const n of x[1].split(',').map((y) => y.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)) m.set(n, x[2])
  }
  return m
}
/** Les drapeaux de l'objet FLAGS : Map(nom → 'true' | 'false'). */
function drapeaux(src) {
  const s = sansCommentaires(src ?? '')
  const i = s.indexOf('FLAGS = {'), j = s.indexOf('} as const', i)
  return new Map(i >= 0 && j > i ? [...s.slice(i, j).matchAll(/^\s*(\w+)\s*:\s*(true|false)\s*,?\s*$/gm)].map((m) => [m[1], m[2]]) : [])
}
const route = lireRac(ROUTE), blocs = lireRac(BLOCS)

// ── RL-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const e = []
  const flags = lireRac(FLAGS)
  if (flags === null) e.push(`${FLAGS} absent`)
  else {
    const lignes = flags.split('\n')
    const k = lignes.findIndex((l) => /^\s*pilotage\s*:\s*false\s*,\s*$/.test(l))
    if (k < 0) e.push('lib/flags.ts ne porte pas « pilotage: false, »')
    else {
      const com = []
      for (let i = k - 1; i >= 0 && /^\s*(\/\*\*?|\*|\/\/|\*\/)/.test(lignes[i]); i--) com.unshift(lignes[i])
      const c = com.join(' ')
      if (!/Pilotage/.test(c) || !/\b404\b/.test(c)) e.push('le commentaire du drapeau pilotage ne dit pas « Pilotage » et « 404 »')
    }
    const ici = drapeaux(flags), la = drapeaux(lireBase(BASE, FLAGS))
    if (!la.size) e.push(`lib/flags.ts de ${BASE.slice(0, 7)} illisible`)
    for (const [n, v] of la) if (n !== 'pilotage' && ici.get(n) !== v) e.push(`drapeau ${n} : ${ici.get(n) ?? 'absent'}, ${v} dans ${BASE.slice(0, 7)}`)
    for (const n of ici.keys()) if (n !== 'pilotage' && !la.has(n)) e.push(`drapeau ${n} ajouté`)
  }
  const carte = lireRac(CARTE)
  if (carte === null) e.push(`${CARTE} absent`)
  else {
    const lignes = carte.split('\n')
    const pil = lignes.filter((l) => l.trim().startsWith("'pilotage':"))
    if (pil.length !== 1) e.push(`${pil.length} ligne(s) 'pilotage' dans la carte, une attendue`)
    else if (!pil[0].trim().startsWith(DEBUT_CARTE)) e.push(`la ligne 'pilotage' ne commence pas par ${DEBUT_CARTE}`)
    const base = lf(lireBase(BASE, CARTE) ?? '').split('\n')
    const reste = lignes.filter((l) => !l.trim().startsWith("'pilotage':"))
    if (reste.length !== base.length || reste.some((l, i) => l !== base[i])) {
      const i = reste.findIndex((l, n) => l !== base[n])
      e.push(`${CARTE} diffère de ${BASE.slice(0, 7)} ailleurs que sur la ligne 'pilotage' (ligne ${i + 1} : « ${court(reste[i] ?? '(fin)', 60)} »)`)
    }
  }
  if (fs.existsSync(path.join(RAC, 'lib', 'pilotage', 'lot.ts'))) e.push('lib/pilotage/lot.ts existe')
  for (const [rel, src] of [[ROUTE, route], [BLOCS, blocs]]) if (src !== null && /\blot\b|lotDuJour|pilotage_lot_du_jour/.test(sansCommentaires(src))) e.push(`${rel} cite lot, lotDuJour ou pilotage_lot_du_jour`)
  S.juger('RL-1', e, `pilotage: false commenté (Pilotage, 404) ; les autres drapeaux identiques à ${BASE.slice(0, 7)} ; la carte commence par la route de lecture et ne diffère que par cette ligne ; plus de « lot »`)
}

// ── RL-2 (source) ────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const e = []
  if (route === null) e.push(`${ROUTE} absent`)
  else {
    const get = corpsDeFonction(route, 'GET')
    if (get === null) e.push('aucun export async function GET')
    else if (!/^\s*if\s*\(\s*!\s*actif\(\s*['"`]pilotage['"`]\s*\)\s*\)\s*(\{\s*)?return\b[^;]*\b404\b/.test(get)) e.push("la première instruction du GET ne teste pas actif('pilotage') pour répondre 404")
    if (importsNommes(route).get('actif') !== '@/lib/flags') e.push("actif n'est pas importé de @/lib/flags")
  }
  S.juger('RL-2', e, "première instruction du GET : if (!actif('pilotage')) → 404")
}

// ── RL-5 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DUREE = /\bms\b|Ms\b|_000\b|\*\s*1000\b|\*\s*60\b|minute|seconde|heure|jour|ttl|cache|delai|duree/i
function seuils(src) {
  const out = []
  for (const ligne of sansChaines(src).split('\n')) {
    const vus = [...ligne.matchAll(/(?:[<>]=?|[!=]==?)\s*(-?\d+(?:\.\d+)?)\b|\b(\d+(?:\.\d+)?)\s*(?:[<>]=?|[!=]==?)(?!>)/g)].map((m) => Number(m[1] ?? m[2]))
    if (vus.some((n) => n !== 0 && n !== 1) && !DUREE.test(ligne)) out.push(ligne.trim())
  }
  return out
}
{
  const e = []
  if (blocs === null) e.push(`${BLOCS} absent`)
  else {
    const im = importsNommes(blocs)
    const manquent = IMPORTS.filter((n) => !im.has(n))
    if (manquent.length) e.push(`blocs.ts n'importe pas ${manquent.join(', ')}`)
    if (im.has('envoisDesAgents') && !['./envois', '@/lib/pilotage/envois'].includes(im.get('envoisDesAgents'))) e.push(`envoisDesAgents importé de ${im.get('envoisDesAgents')}, ./envois attendu`)
  }
  for (const [rel, src] of [[ROUTE, route], [BLOCS, blocs]]) {
    if (src === null) continue
    const s = sansChaines(src)
    for (const [mot, re] of [['.sort(', /\.sort\(/], ['.reduce(', /\.reduce\(/], ['Math.', /\bMath\./]]) if (re.test(s)) e.push(`${rel} contient ${mot}`)
    const sx = seuils(src)
    if (sx.length) e.push(`${rel} : seuil numérique hors durée « ${court(sx[0], 60)} »`)
  }
  S.juger('RL-5', e, `blocs.ts importe les ${IMPORTS.length} fonctions de lib/pilotage (envoisDesAgents de ./envois) ; ni .sort(, ni .reduce(, ni Math., aucun seuil hors durée`)
}

// ── RL-6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const e = []
  const rpcs = []
  for (const [rel, src] of [[ROUTE, route], [BLOCS, blocs]]) {
    if (src === null) { e.push(`${rel} absent`); continue }
    const s = sansCommentaires(src)
    if (/\.schema\(/.test(s)) e.push(`${rel} : .schema(`)
    if (/\.from\(\s*['"`]ops/.test(s)) e.push(`${rel} : from('ops…`)
    const appels = [...s.matchAll(/\.rpc\(\s*(['"`]?)([\w$.]*)/g)]
    for (const a of appels) {
      if (!a[1]) e.push(`${rel} : rpc( sans nom littéral (${court(a[2] || '?', 30)}) : la fonction appelée ne se lit pas`)
      else if (!a[2].startsWith('pilotage_')) e.push(`${rel} : rpc('${a[2]}')`)
      else rpcs.push(a[2])
    }
  }
  if (blocs !== null && !rpcs.length) e.push('blocs.ts n’appelle aucune fonction pilotage_*')
  S.juger('RL-6', e, `ops lu par ${new Set(rpcs).size} fonctions pilotage_* seulement (${[...new Set(rpcs)].join(', ')}) ; ni .schema(, ni from('ops'`)
}

// ── RL-7 (source) ────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const e = []
  for (const [rel, src] of [[ROUTE, route], [BLOCS, blocs]]) {
    if (src === null) continue
    const s = sansCommentaires(src)
    if (/pilotage_compteurs_boites/.test(s)) e.push(`${rel} cite pilotage_compteurs_boites`)
    for (const m of s.matchAll(/\.from\(\s*['"`](artisans|sites_commandes)['"`]\s*\)\s*\.select\(\s*['"`]([^'"`]*)['"`]/g)) if (/\bemail\b|\*/.test(m[2])) e.push(`${rel} sélectionne ${m[2].includes('*') ? '*' : 'email'} de ${m[1]}`)
    const mot = /\b(destinataire|entreprise|boite)\b/.exec(s)
    if (mot) e.push(`${rel} cite « ${mot[1]} »`)
  }
  S.juger('RL-7', e, 'ni pilotage_compteurs_boites, ni la colonne email d’artisans ou de sites_commandes, ni destinataire, entreprise ou boite')
}

// ── RL-8 (source) ────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const e = []
  if (route === null) e.push(`${ROUTE} absent`)
  else {
    const s = sansCommentaires(route)
    const iUuid = s.search(/\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-/i), iLire = s.indexOf('lireBloc(')
    if (!/searchParams\.get\(\s*['"`]decision['"`]\s*\)/.test(s)) e.push("le paramètre decision n'est pas lu")
    if (iUuid < 0) e.push('aucune expression d’UUID')
    else if (iLire < 0) e.push('lireBloc( absent')
    else if (iLire < iUuid) e.push("lireBloc( précède l'expression d’UUID")
    else if (!/\.test\(/.test(s.slice(iUuid, iLire))) e.push("l'UUID n'est pas testé avant lireBloc(")
  }
  S.juger('RL-8', e, "decision lu, testé par l'expression d’UUID avant d'atteindre lireBloc")
}

// ── RL-HARNAIS (--temoin) : le harnais prouvé sans réseau ────────────────────────────────────────────────────────────────
if (o.temoin) {
  const e = []
  const reel = path.join(R, FLAGS)
  const avant = sha256(fs.readFileSync(reel))
  try {
    const c = copieAvecDrapeau(RAC, { critere: 'RL-HARNAIS' })
    if (!c.leveDansCopie) e.push('le drapeau n’est pas levé dans la copie')
    if (!c.baisseDansReel) e.push('le drapeau a bougé dans la source')
    const source = fs.readFileSync(path.join(RAC, FLAGS), 'utf8'), copie = fs.readFileSync(path.join(c.dest, FLAGS), 'utf8')
    if (copie !== source.replace('pilotage: false,', 'pilotage: true,')) e.push('la copie de lib/flags.ts diffère d’autre chose que du drapeau')
    for (const j of ['node_modules', 'public']) if (!fs.lstatSync(path.join(c.dest, j)).isSymbolicLink()) e.push(`${j} n'est pas une jonction`)
    if (fs.existsSync(path.join(c.dest, '.env.local'))) e.push('.env.local dans la copie')
    if (!fs.existsSync(path.join(c.dest, ROUTE))) e.push('la route n’est pas dans la copie')
    if (sha256(fs.readFileSync(reel)) !== avant) e.push('lib/flags.ts RÉEL a changé')
    S.juger('RL-HARNAIS', e, `copie ${path.relative(R, c.dest)} (${c.tete}, app/, lib/, jonctions node_modules et public, sans .env.local) : drapeau levé dans la copie seulement ; lib/flags.ts réel inchangé (sha256 ${avant.slice(0, 12)}…). Serveur et comptes d’essai : jugés sur la racine réelle (RL-3, RL-4), jamais sous le piège réseau de la preuve`)
  } catch (err) { S.echoue('RL-HARNAIS', `copie impossible : ${premiereLigne(err)}`) }
  if (HARNAIS) await harnaisVivant(avant)
}

/** Le harnais vivant (--harnais) : la copie du témoin sert, le fondateur d'essai y obtient 200, puis disparaît. */
async function harnaisVivant(avant) {
  const e = [], vu = []
  let srv = null
  try {
    const c = copieAvecDrapeau(RAC, { critere: 'RL-HARNAIS' })
    srv = await serveurCopie(c.dest, { critere: 'RL-HARNAIS' })
    vu.push(`serveur de la copie ${srv.base} (PID ${srv.pid}, jamais le port 3400)`)
    const { resultat, menage, erreur } = await avecComptes(['direction'], async ({ direction }) => {
      const r = await fetch(`${srv.base}/api/controle/chiffres`, { headers: { Authorization: `Bearer ${direction.jeton}` } })
      return { status: r.status, id: direction.id }
    })
    if (erreur) throw erreur
    if (resultat.status !== 200) e.push(`GET /api/controle/chiffres de la copie avec le fondateur d'essai → ${resultat.status}, 200 attendu`)
    else vu.push('fondateur d’essai → 200 sur /api/controle/chiffres de la copie')
    if (!menage) e.push('le compte d’essai n’a pas disparu')
    else vu.push('compte supprimé, relu absent par la clé de service (auth et artisans)')
  } catch (err) { e.push(`harnais vivant : ${premiereLigne(err)}`) } finally { if (srv) await srv.arreter() }
  if (sha256(fs.readFileSync(path.join(R, FLAGS))) !== avant) e.push('lib/flags.ts RÉEL a changé')
  S.juger('RL-HARNAIS', e, `harnais vivant : ${vu.join(' ; ')} ; serveur arrêté par son PID ; lib/flags.ts réel inchangé`)
}

// ── Vivant : l'arbre réel, la copie au drapeau levé, les comptes d'essai, le typecheck ──────────────────────────────────
const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const RE_TEL = /(?:\+33|\b0)[1-9](?:[ .-]?\d{2}){4}\b/
const clesProfondes = (v, out = new Set()) => { if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!Array.isArray(v)) out.add(k); clesProfondes(x, out) } return out }
const FORMES = {
  decider: ['cartes', 'autres', 'invalides'], appeler: ['appels', 'partiel'], envois: ['palier', 'parCanal', 'parTechnologie', 'envois', 'rejets', 'anomalies', 'vide'],
  entonnoir: ['j7', 'j30', 'hypotheses'], agents: ['agents', 'pauseGenerale'], code: ['file', 'enCours', 'verrousVieux', 'derniers', 'prs', 'attention', 'perime', 'message', 'publie_le'],
}
async function vivant() {
  const { serveur } = await import('./lib/capture.mjs')
  // RL-2 sur l'arbre réel : drapeau baissé, sans identité → 404.
  let reel = null
  try {
    reel = await serveur(R)
    const r = await fetch(`${reel.base}/api/controle/pilotage?bloc=decider`)
    S.juger('RL-2', r.status === 404 ? [] : [`arbre réel : GET sans identité → ${r.status}, 404 attendu`], `arbre réel (${reel.base}) : 404 sans identité`)
  } catch (err) { S.echoue('RL-2', `arbre réel injoignable : ${premiereLigne(err)}`) } finally { if (reel) await reel.arreter() }
  let srv = null
  try {
    const c = copieAvecDrapeau(R, { critere: 'RL-3' })
    srv = await serveurCopie(c.dest, { critere: 'RL-3' })
    const lire = async (q, jeton) => { const r = await fetch(`${srv.base}/api/controle/pilotage${q}`, { headers: jeton ? { Authorization: `Bearer ${jeton}` } : {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ } return { status: r.status, j, t } }
    const { resultat, menage, erreur } = await avecComptes(['direction', 'artisan'], async ({ direction, artisan }) => {
      const e3 = [], e4 = [], e7 = [], e8 = []
      const a = await lire('?bloc=decider'); if (a.status !== 401) e3.push(`sans jeton → ${a.status}, 401 attendu`)
      const b = await lire('?bloc=decider', artisan.jeton); if (b.status !== 403) e3.push(`artisan → ${b.status}, 403 attendu`)
      const c2 = await lire('?bloc=inconnu', direction.jeton); if (c2.status !== 400) e3.push(`bloc=inconnu → ${c2.status}, 400 attendu`)
      const d = await lire('?bloc=argent', direction.jeton); if (d.status !== 400 || !d.t.includes('/api/controle/tresorerie')) e3.push(`bloc=argent → ${d.status}, 400 avec le renvoi vers /api/controle/tresorerie attendu`)
      for (const bloc of NOMS_BLOCS) {
        const r = await lire(`?bloc=${bloc}`, direction.jeton)
        if (r.status !== 200) { e4.push(`${bloc} → ${r.status}${r.status >= 500 ? ' (500 interdit)' : ''}`); continue }
        const j = r.j ?? {}
        if (j.bloc !== bloc || !j.source || !j.a) e4.push(`${bloc} : bloc, source ou a absent`)
        if (j.valeur === null) { if (!(String(j.erreur ?? '').trim() || String(j.manque ?? '').trim())) e4.push(`${bloc} : valeur nulle sans erreur ni manque`) }
        else if (!j.valeur || typeof j.valeur !== 'object' || FORMES[bloc].some((k) => !(k in j.valeur))) e4.push(`${bloc} : valeur hors contrat (${FORMES[bloc].filter((k) => !(k in (j.valeur ?? {}))).join(', ')} manquant)`)
        if (['code', 'agents', 'entonnoir', 'envois'].includes(bloc)) {
          if (RE_EMAIL.test(r.t)) e7.push(`${bloc} : une adresse e-mail dans la réponse`)
          if (RE_TEL.test(r.t)) e7.push(`${bloc} : un numéro de téléphone dans la réponse`)
        }
        if (bloc === 'envois') { const k = [...clesProfondes(j.valeur)].filter((x) => ['texte', 'destinataire', 'entreprise', 'profil', 'boite'].includes(x)); if (k.length) e7.push(`envois : clé(s) ${k.join(', ')}`) }
      }
      const u = await lire('?bloc=decider&decision=pas-un-uuid', direction.jeton); if (u.status !== 200) e8.push(`decision=pas-un-uuid → ${u.status}, 200 attendu`)
      return { e3, e4, e7, e8 }
    })
    if (erreur) throw erreur
    S.juger('RL-3', [...resultat.e3, ...(menage ? [] : ['ménage des comptes d’essai en échec : un compte n’a pas disparu'])], 'copie au drapeau levé : 401 sans jeton, 403 artisan, 400 bloc inconnu, 400 argent (renvoi trésorerie) ; comptes d’essai supprimés')
    S.juger('RL-4', resultat.e4, 'six blocs → 200 au contrat (bloc, source, a ; valeur à la forme, ou nulle avec erreur ou manque), jamais 500')
    S.juger('RL-7', resultat.e7, 'réponses de code, agents, entonnoir et envois : ni e-mail ni téléphone ; envois sans texte, destinataire, entreprise, profil ni boite')
    S.juger('RL-8', resultat.e8, 'decision=pas-un-uuid ignorée (200)')
  } catch (err) { S.echoue(err.critere ?? 'RL-3', `copie ou serveur : ${premiereLigne(err)}`); S.nonJuges(['RL-4'], 'la copie n’a pas servi') } finally { if (srv) await srv.arreter() }
  const t = spawnSync('npm', ['run', 'typecheck'], { cwd: R, encoding: 'utf8', shell: process.platform === 'win32', timeout: 600_000, windowsHide: true })
  S.juger('RL-9', t.status === 0 ? [] : [`npm run typecheck en code ${t.status} : ${court((t.stdout || '').split('\n').find((l) => /error TS/.test(l)) || t.stderr, 160)}`], 'npm run typecheck vert')
}
if (VIVANT) await vivant()
process.exit(S.finir())
