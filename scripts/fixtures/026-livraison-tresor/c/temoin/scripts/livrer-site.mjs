// TÉMOIN du lot C (fiche 026-029, Claude Code) — une implémentation de référence de scripts/livrer-site.mjs (fiche 026-100),
// écrite pour prouver que scripts/livrer-site-qa.mjs sait être VERT sur une chaîne réelle. Jamais livrée : posée dans la
// maquette de .orchestre/preuves/026-029/outils/, puis cassée critère par critère.
//
//   node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs <commande_id> [--sans-ia] [--ci] [--sans-depot]
//        [--depuis=<fichier.json> --hote-photos=<url>]
//   node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs <commande_id> --usine --entree=<dossier> --sortie=<dossier> [--sans-ia]
// Codes : 0 livré (prêt avec --sans-depot, sortie écrite avec --usine), 2 usage, 3 dossier incomplet ou rédaction bloquée,
// 4 plafond de régénérations, 5 déjà en cours, 6 commande plus payee en --ci, 1 autre.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const CONNUES = ['sans-ia', 'ci', 'sans-depot', 'depuis', 'hote-photos', 'usine', 'entree', 'sortie']
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const drapeau = (n) => args.includes(`--${n}`)
const [id] = args.filter((a) => !a.startsWith('--'))
const usage = (m) => { console.error(`usage : livrer-site.mjs <commande_id> [--sans-ia] [--ci] [--sans-depot] | --usine --entree=<d> --sortie=<d> — ${m}`); process.exit(2) }
for (const a of args.filter((x) => x.startsWith('--'))) if (!CONNUES.includes(a.slice(2).split('=')[0])) usage(`option inconnue ${a.split('=')[0]}`)
if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) usage('identifiant de commande absent ou invalide')
const USINE = drapeau('usine'), CI = drapeau('ci'), SANS_IA = drapeau('sans-ia'), SANS_DEPOT = drapeau('sans-depot')
const dans = (parent, p) => { const r = path.relative(parent, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)) }
if (!USINE && (opt('entree') || opt('sortie'))) usage('--entree et --sortie vont avec --usine seulement ; le dossier de travail est fixe')
let ENTREE = null, SORTIE = null
if (USINE) {
  if (!opt('entree') || !opt('sortie') || !path.isAbsolute(opt('entree')) || !path.isAbsolute(opt('sortie'))) usage('--usine exige --entree et --sortie, deux dossiers absolus')
  ENTREE = path.resolve(opt('entree')); SORTIE = path.resolve(opt('sortie'))
  if (dans(RACINE, ENTREE) || dans(RACINE, SORTIE)) usage('--entree et --sortie sont hors du dépôt')
  if (dans(ENTREE, SORTIE) || dans(SORTIE, ENTREE)) usage('--entree et --sortie sont distincts')
}

const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'livraison', id)
const SOURCE = path.join(TRAVAIL, 'source'), SITE = path.join(TRAVAIL, 'site')
const JOURNAL = path.join(RACINE, '.orchestre', 'travail', 'livraison', 'journal.jsonl')
fs.mkdirSync(TRAVAIL, { recursive: true })

// Le verrou : un seul passage à la fois ; un verrou de plus de 60 min est repris.
const VERROU = path.join(TRAVAIL, '.verrou')
const poser = () => { const fd = fs.openSync(VERROU, 'wx'); fs.writeSync(fd, JSON.stringify({ pid: process.pid, date: new Date().toISOString() })); fs.closeSync(fd) }
try { poser() } catch (e) {
  if (e.code !== 'EEXIST') throw e
  let date = null
  try { date = Date.parse(JSON.parse(fs.readFileSync(VERROU, 'utf8')).date) } catch { /* illisible */ }
  if (!Number.isFinite(date)) date = fs.statSync(VERROU).mtimeMs
  if (Date.now() - date < 60 * 60_000) { console.error(`✗ livraison ${id} déjà en cours (verrou de ${Math.round((Date.now() - date) / 60_000)} min)`); process.exit(5) }
  console.log(`  verrou de ${Math.round((Date.now() - date) / 60_000)} min repris (plus de 60 min)`)
  fs.rmSync(VERROU, { force: true }); poser()
}

const debut = new Date()
const etapes = []
let issue = 'erreur', code = 1
// Chaque étape tourne dans un enfant ASYNCHRONE : en --usine, le serveur des photos vit dans ce processus et doit pouvoir
// répondre à l'exporteur pendant qu'il tourne (un spawnSync bloquerait tout).
const etape = (nom, script, argsEtape, { ts = true, env } = {}) => new Promise((resolve) => {
  const t0 = Date.now()
  const p = spawn(process.execPath, [...(ts ? ['--import', './scripts/ts-loader.mjs'] : []), script, ...argsEtape], { cwd: RACINE, env: env ?? process.env })
  let stdout = '', stderr = ''
  p.stdout.on('data', (d) => { stdout += d })
  p.stderr.on('data', (d) => { stderr += d })
  p.on('close', (status) => { etapes.push({ nom, code: status, duree_s: Math.round((Date.now() - t0) / 100) / 10 }); resolve({ status, stdout, stderr }) })
})
const lireCommande = () => (opt('depuis') ? JSON.parse(fs.readFileSync(path.resolve(opt('depuis')), 'utf8')).commande : null)
const criteresTexte = (sortie) => { try { return JSON.parse(sortie).blocs.flatMap((b) => b.tests.filter((t) => !t.passe).map((t) => t.nom)).filter((n) => /texte|répét|title|description|h1|chapeau|mots/i.test(n)) } catch { return [] } }

let serveur = null
try {
  // Les options de l'exporteur : --depuis/--hote-photos (juge), ou l'entrée de l'usine servie sur 127.0.0.1.
  let depuis = opt('depuis'), hote = opt('hote-photos'), envExport = undefined
  if (USINE) {
    depuis = path.join(ENTREE, 'commande.json')
    if (!fs.existsSync(depuis)) { console.error('✗ entrée sans commande.json'); code = 3; issue = 'incomplet'; throw null }
    const photos = path.join(ENTREE, 'photos')
    serveur = http.createServer((req, res) => { const nom = decodeURIComponent(String(req.url).split('?')[0].split('/').pop() ?? ''); const f = path.join(photos, nom); if (nom && !nom.includes('..') && fs.existsSync(f)) { res.writeHead(200); res.end(fs.readFileSync(f)) } else { res.writeHead(404); res.end() } })
    await new Promise((r) => serveur.listen(0, '127.0.0.1', r))
    hote = `http://127.0.0.1:${serveur.address().port}`
    const urls = (JSON.parse(fs.readFileSync(depuis, 'utf8')).commande?.matiere?.photos ?? []).map((p) => String(p?.url ?? ''))
    const projet = urls.map((u) => /^(https:\/\/[a-z0-9-]+\.supabase\.co)\/storage\/v1\/object\/public\/artisan-media\//.exec(u)?.[1]).find(Boolean)
    envExport = { ...process.env, ...(projet ? { NEXT_PUBLIC_SUPABASE_URL: projet } : {}) }
  }
  fs.rmSync(SOURCE, { recursive: true, force: true }); fs.rmSync(SITE, { recursive: true, force: true })
  const ex = await etape('export', 'scripts/commande-exporter.mjs', [id, `--sortie=${SOURCE}`, ...(depuis ? [`--depuis=${depuis}`] : []), ...(hote ? [`--hote-photos=${hote}`] : [])], { env: envExport })
  if (ex.status !== 0) { code = ex.status === 3 ? 3 : 1; issue = ex.status === 3 ? 'incomplet' : 'export'; console.error(`✗ export : code ${ex.status}`); throw null }
  let regenerations = Number((lireCommande() ?? {}).regenerations ?? 0)
  let consigne = null
  for (;;) {
    const rd = await etape('redaction', 'scripts/commande-rediger.mjs', [SOURCE, ...(SANS_IA || !process.env.CODEX_LANCEUR ? ['--sans-ia'] : [])])
    if (rd.status !== 0) { code = rd.status === 3 ? 3 : 1; issue = rd.status === 3 ? 'redaction bloquee' : 'redaction'; console.error(`✗ rédaction : code ${rd.status}`); throw null }
    const ge = await etape('generation', 'public/sites-demo/generer.mjs', [`--source=${SOURCE}`, `--sortie=${SITE}`], { ts: false })
    if (ge.status !== 0) { code = 1; issue = 'generation'; console.error(`✗ génération : code ${ge.status}`); throw null }
    const qa = await etape('site-qa', 'scripts/site-qa.mjs', [SITE, '--statique', '--json'], { ts: false })
    if (qa.status === 0) break
    const texte = criteresTexte(qa.stdout)
    if (!texte.length) { code = 1; issue = 'site-qa'; console.error('✗ site-qa rouge (hors texte)'); throw null }
    if (regenerations >= 2 || consigne) { code = regenerations >= 2 ? 4 : 1; issue = regenerations >= 2 ? 'plafond' : 'site-qa'; console.error(`✗ site-qa rouge sur ${texte.length} critère(s) de texte ; ${regenerations >= 2 ? 'plafond de 2 régénérations atteint' : 'déjà régénéré une fois'}`); throw null }
    consigne = texte; regenerations++
    fs.writeFileSync(path.join(SOURCE, 'consigne.json'), JSON.stringify({ criteres: texte }))
  }
  if (USINE) {
    fs.rmSync(SORTIE, { recursive: true, force: true })
    fs.cpSync(SITE, path.join(SORTIE, 'site'), { recursive: true })
    const qa = JSON.parse(spawnSync(process.execPath, ['scripts/site-qa.mjs', path.join(SORTIE, 'site'), '--statique', '--json'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 << 20 }).stdout)
    const rapport = { commande: id, verdict: 'vert', criteres: qa.blocs.flatMap((b) => b.tests.map((t) => ({ nom: t.nom, passe: t.passe }))) }
    fs.writeFileSync(path.join(SORTIE, 'rapport-qa.json'), JSON.stringify(rapport, null, 1))
    const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' }
    const fichiers = []
    const rec = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r2 = rel ? path.posix.join(rel, e.name) : e.name; if (e.isDirectory()) rec(path.join(d, e.name), r2); else fichiers.push({ nom: path.posix.join('site', r2), type: TYPES[path.extname(e.name).toLowerCase()] ?? 'application/octet-stream' }) } }
    rec(path.join(SORTIE, 'site'), '')
    fichiers.push({ nom: 'rapport-qa.json', type: 'application/json' })
    fs.writeFileSync(path.join(SORTIE, 'manifeste.json'), JSON.stringify({ fichiers }, null, 1))
    code = 0; issue = 'sortie ecrite'
  } else if (SANS_DEPOT) { code = 0; issue = 'pret' }
  else {
    if (CI) {
      // Juste avant le dépôt : l'état relu (la base, ou le fichier --depuis qui la double).
      let etat = null
      if (opt('depuis')) etat = lireCommande()?.etat
      else {
        const env = path.join(RACINE, '.env.local')
        for (const l of fs.existsSync(env) ? fs.readFileSync(env, 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
        const { createClient } = await import(pathToFileURL(path.join(RACINE, 'node_modules', '@supabase', 'supabase-js', 'dist', 'module', 'index.js')).href)
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
        etat = (await admin.from('sites_commandes').select('etat').eq('id', id).maybeSingle()).data?.etat
      }
      if (etat !== 'payee') { code = 6; issue = 'deja livree'; console.error(`✗ commande en état « ${etat} » : une autre voie l'a livrée, aucun dépôt`); throw null }
    }
    const de = await etape('depot', 'scripts/site-deposer.mjs', [id, SITE])
    if (de.status !== 0) { code = 1; issue = 'depot'; console.error(`✗ dépôt : code ${de.status}`); throw null }
    code = 0; issue = 'livre'
  }
} catch (e) {
  if (e !== null) { console.error(`✗ ${String(e?.message ?? e).slice(0, 200)}`); code = 1 }
} finally {
  if (serveur) serveur.close()
  const fin = new Date()
  fs.mkdirSync(path.dirname(JOURNAL), { recursive: true })
  fs.appendFileSync(JOURNAL, `${JSON.stringify({ commande: id, debut: debut.toISOString(), fin: fin.toISOString(), duree_s: Math.round((fin - debut) / 100) / 10, etapes, issue })}\n`)
  fs.rmSync(VERROU, { force: true })
  console.log(`${code === 0 ? '✓' : '✗'} livraison ${id} : ${issue} (code ${code}) en ${((fin - debut) / 1000).toFixed(1)} s — ${etapes.map((x) => `${x.nom} ${x.code}`).join(', ')}`)
}
process.exit(code)
