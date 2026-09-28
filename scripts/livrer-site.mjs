// Assemble une livraison dans .orchestre/travail/livraison, sans écrire sous public/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const livraison = path.join(racine, '.orchestre', 'travail', 'livraison')
const debut = new Date()
const t0 = Date.now()
const etapes = []
const options = process.argv.slice(2)
const commande = options.shift()
const valeur = (nom) => options.find((o) => o.startsWith(`--${nom}=`))?.slice(nom.length + 3)
const usine = options.includes('--usine')
const ci = options.includes('--ci')
const sansDepot = options.includes('--sans-depot')
const sansIa = options.includes('--sans-ia')
const entreeArg = valeur('entree'), sortieArg = valeur('sortie')
const depuisArg = valeur('depuis'), hoteArg = valeur('hote-photos')
const connues = ['--usine', '--ci', '--sans-depot', '--sans-ia']
const estDans = (parent, cible) => cible === parent || (path.relative(parent, cible) !== '..' && !path.relative(parent, cible).startsWith(`..${path.sep}`) && !path.isAbsolute(path.relative(parent, cible)))
const usage = !/^[0-9a-f-]{36}$/i.test(commande || '') || options.some((o) => !connues.includes(o) && !/^--(?:entree|sortie|depuis|hote-photos)=.+$/.test(o)) ||
  (usine ? (!entreeArg || !sortieArg || !path.isAbsolute(entreeArg) || !path.isAbsolute(sortieArg) || ci || sansDepot || depuisArg || hoteArg || estDans(racine, path.resolve(entreeArg)) || estDans(racine, path.resolve(sortieArg)) || estDans(path.resolve(entreeArg), path.resolve(sortieArg)) || estDans(path.resolve(sortieArg), path.resolve(entreeArg))) : !!(entreeArg || sortieArg || (hoteArg && !depuisArg)))
if (usage) { console.error('Usage : livrer-site <commande_id> [--sans-ia] [--ci] [--sans-depot] [--depuis=fichier --hote-photos=url] ou --usine --entree=dossier --sortie=dossier'); process.exit(2) }

const travail = path.join(livraison, commande)
const source = path.join(travail, 'source')
const site = path.join(travail, 'site')
const verrou = path.join(travail, '.verrou')
const journal = path.join(livraison, 'journal.jsonl')
fs.mkdirSync(travail, { recursive: true })
let repris = false
try {
  fs.writeFileSync(verrou, JSON.stringify({ pid: process.pid, date: debut.toISOString() }), { flag: 'wx' })
} catch (erreur) {
  if (erreur.code !== 'EEXIST') throw erreur
  let age = 0
  try { age = Date.now() - Math.min(fs.statSync(verrou).mtimeMs, Date.parse(JSON.parse(fs.readFileSync(verrou, 'utf8')).date) || Infinity) } catch { age = Date.now() - fs.statSync(verrou).mtimeMs }
  if (age <= 60 * 60_000) { console.error(ci ? `${commande} 5` : 'Déjà en cours.'); process.exit(5) }
  fs.unlinkSync(verrou)
  fs.writeFileSync(verrou, JSON.stringify({ pid: process.pid, date: debut.toISOString() }), { flag: 'wx' })
  repris = true
  console.log(ci ? `${commande} 0` : 'Verrou ancien repris.')
}

let serveur = null
let issue = 1
function etape(nom, fichier, args, env = process.env) {
  const depart = Date.now()
  // --import veut une URL de module : un chemin Windows brut (« C:\… ») est lu comme un schéma d'URL « c: » par le
  // chargeur ESM de Node et casse chaque étape sur le poste (jamais sous Linux, sans lettre de lecteur).
  const resultat = spawnSync(process.execPath, ['--import', pathToFileURL(path.join(racine, 'scripts', 'ts-loader.mjs')).href, fichier, ...args], { cwd: racine, env, encoding: 'utf8', maxBuffer: 64 << 20 })
  const code = resultat.status ?? 1
  etapes.push({ nom, code, duree_s: Math.round((Date.now() - depart) / 1000) })
  if (!ci && code !== 0) console.error(`${nom} : code ${code}`)
  return { code, sortie: resultat.stdout || '', erreur: resultat.stderr || '' }
}
function lireJson(fichier) { try { return JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch { return null } }
function pause(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) }
function lancerPhotos(dossier) {
  const signal = path.join(travail, '.photos-port')
  fs.rmSync(signal, { force: true })
  const programme = `const fs=require('node:fs'),path=require('node:path'),http=require('node:http');const dossier=process.argv[1],signal=process.argv[2];const serveur=http.createServer((req,res)=>{let nom;try{nom=path.basename(decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname))}catch{res.writeHead(400).end();return}if(!nom||nom==='.'||nom==='..'){res.writeHead(400).end();return}const fichier=path.join(dossier,nom);fs.createReadStream(fichier).on('error',()=>res.writeHead(404).end()).pipe(res)});serveur.listen(0,'127.0.0.1',()=>fs.writeFileSync(signal,String(serveur.address().port)))`
  serveur = spawn(process.execPath, ['-e', programme, dossier, signal], { cwd: racine, stdio: 'ignore' })
  for (let i = 0; i < 100 && !fs.existsSync(signal); i++) pause(50)
  if (!fs.existsSync(signal)) throw new Error('Serveur de photos indisponible')
  return `http://127.0.0.1:${fs.readFileSync(signal, 'utf8')}`
}
function typeFichier(nom) {
  return ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' })[path.extname(nom).toLowerCase()]
}
function fichiersDe(dossier, prefixe = '') {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const nom = prefixe ? path.posix.join(prefixe, entree.name) : entree.name
    return entree.isDirectory() ? fichiersDe(path.join(dossier, entree.name), nom) : [{ nom: path.posix.join('site', nom), type: typeFichier(nom) }]
  })
}
function chargerConfigurationNormale() {
  try {
    for (const ligne of fs.readFileSync(path.join(racine, '.env.local'), 'utf8').split(/\r?\n/)) {
      const trouve = /^\s*([A-Z0-9_]+)=(.*)$/.exec(ligne)
      if (trouve && !process.env[trouve[1]]) process.env[trouve[1]] = trouve[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch (erreur) { if (erreur.code !== 'ENOENT') throw erreur }
}
async function adminNormal() {
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) return null
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}
async function etatActuel(depuis) {
  if (depuis) return lireJson(depuis)?.commande?.etat
  const admin = await adminNormal()
  if (!admin) return null
  const { data, error } = await admin.from('sites_commandes').select('etat').eq('id', commande).maybeSingle()
  if (error) throw error
  return data?.etat
}
async function regenerationsActuelles(depuis) {
  if (depuis) return Number(lireJson(depuis)?.commande?.regenerations ?? 0)
  const admin = await adminNormal()
  if (!admin) return 0
  const { data, error } = await admin.from('sites_commandes').select('regenerations').eq('id', commande).maybeSingle()
  if (error) throw error
  return Number(data?.regenerations ?? 0)
}
async function dureeCommande() {
  if (depuisArg) return
  const admin = await adminNormal()
  if (!admin) return
  await admin.from('sites_commandes').update({ generation_duree_s: Math.round((Date.now() - t0) / 1000) }).eq('id', commande)
}
try {
  const entree = usine ? path.resolve(entreeArg) : null
  const sortie = usine ? path.resolve(sortieArg) : null
  const depuis = usine ? path.join(entree, 'commande.json') : depuisArg
  if (usine && !fs.existsSync(depuis)) { issue = 3; throw new Error('Entrée incomplète') }
  if (!usine) chargerConfigurationNormale()
  let env = process.env
  let hote = hoteArg
  if (usine) {
    const donnees = lireJson(depuis)
    const photo = donnees?.commande?.matiere?.photos?.[0]?.url
    let projet
    try { projet = new URL(photo).origin } catch { issue = 3; throw new Error('Photos absentes') }
    hote = lancerPhotos(path.join(entree, 'photos'))
    env = Object.fromEntries(Object.entries(process.env).filter(([cle]) => !cle.includes('SUPABASE')))
    env.NEXT_PUBLIC_SUPABASE_URL = projet
  }
  fs.mkdirSync(source, { recursive: true })
  const exporte = etape('export', path.join(racine, 'scripts', 'commande-exporter.mjs'), [commande, `--sortie=${source}`, ...(depuis ? [`--depuis=${depuis}`] : []), ...(hote ? [`--hote-photos=${hote}`] : [])], env)
  if (exporte.code) { issue = exporte.code === 3 ? 3 : 1; throw new Error('Export échoué') } // 28/09 : commande-exporter.mjs ne rend jamais 4 (0/2/3 seulement, CH-6 attend 3 pour « dossier incomplet »)
  const maxReprises = await regenerationsActuelles(depuis)
  let reprises = 0, consignes = ''
  while (true) {
    const redige = etape('redaction', path.join(racine, 'scripts', 'commande-rediger.mjs'), [source, ...(sansIa ? ['--sans-ia'] : [])], { ...env, PRESTI_CONSIGNES_SITE: consignes })
    if (redige.code) { issue = redige.code === 3 ? 3 : 1; throw new Error('Rédaction échouée') }
    const genere = etape('generation', path.join(racine, 'public', 'sites-demo', 'generer.mjs'), [`--source=${source}`, `--sortie=${site}`], env)
    if (genere.code) { issue = 1; throw new Error('Génération échouée') }
    const qa = etape('site-qa', path.join(racine, 'scripts', 'site-qa.mjs'), [site, '--statique', '--json'], env)
    const rapport = (() => { try { return JSON.parse(qa.sortie) } catch { return null } })()
    const echecs = rapport?.blocs?.flatMap((bloc) => bloc.tests.filter((test) => !test.passe).map((test) => test.nom)) || []
    if (qa.code) {
      if (!echecs.length) { issue = 1; throw new Error('QA échouée') }
      if (maxReprises + reprises >= 2) { issue = 4; throw new Error('Plafond de régénérations') }
      reprises++
      consignes = echecs.join(' ; ')
      continue
    }
    if (usine) {
      fs.mkdirSync(sortie, { recursive: true })
      fs.cpSync(site, path.join(sortie, 'site'), { recursive: true, force: true })
      const criteres = rapport?.blocs?.flatMap((bloc) => bloc.tests.map((test) => ({ nom: test.nom, passe: test.passe }))) || []
      fs.writeFileSync(path.join(sortie, 'rapport-qa.json'), JSON.stringify({ commande, verdict: 'PASS', criteres }))
      fs.writeFileSync(path.join(sortie, 'manifeste.json'), JSON.stringify({ fichiers: [...fichiersDe(path.join(sortie, 'site')), { nom: 'rapport-qa.json', type: 'application/json' }] }))
    } else if (!sansDepot) {
      if (ci && await etatActuel(depuis) !== 'payee') { issue = 6; throw new Error('Commande déjà livrée') }
      const depose = etape('depot', path.join(racine, 'scripts', 'site-deposer.mjs'), [commande, site], env)
      if (depose.code) { issue = 1; throw new Error('Dépôt échoué') }
      if (ci) await dureeCommande()
    }
    issue = 0
    break
  }
} catch (erreur) {
  if (!ci) console.error(erreur.message)
} finally {
  if (serveur) serveur.kill()
  fs.rmSync(verrou, { force: true })
  const fin = new Date()
  fs.appendFileSync(journal, JSON.stringify({ commande, debut: debut.toISOString(), fin: fin.toISOString(), duree_s: Math.round((Date.now() - t0) / 1000), etapes, issue }) + '\n')
  if (ci) console.log(`${commande} ${issue}`)
}
process.exit(issue)
