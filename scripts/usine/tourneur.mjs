#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { CAPACITES, SCHEMAS } from './capacites.mjs'
import { MOTIFS_SECRETS } from '../instantane-quotidien.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const LIMITES = JSON.parse(fs.readFileSync(path.join(RACINE, 'lib', 'agents', 'usineLimites.json'), 'utf8'))
const UUID = /^[0-9a-f-]{36}$/i
const NOM = /^[a-z0-9][a-z0-9._/-]{0,119}$/
const JETON_AGENT = /\bpa_[a-z0-9_]+_[A-Za-z0-9_-]{20,}\b/g
const MEMOIRE_MIN = 1610612736
const DISQUE_MIN = 2147483648
const VERROU_MAX_MS = 60 * 60_000
const EXT = {
  '.html':['text/html'], '.htm':['text/html'], '.css':['text/css'],
  '.js':['text/javascript','application/javascript'], '.mjs':['text/javascript','application/javascript'],
  '.json':['application/json'], '.webmanifest':['application/json'], '.webp':['image/webp'],
  '.avif':['image/avif'], '.jpg':['image/jpeg'], '.jpeg':['image/jpeg'], '.png':['image/png'],
  '.svg':['image/svg+xml'], '.woff2':['font/woff2'], '.txt':['text/plain'],
  '.xml':['application/xml','text/xml'],
}
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
class ErreurBus extends Error { constructor(code, message) { super(message); this.code = code } }
function options() {
  const o = {}
  for (const a of process.argv.slice(2)) {
    if (a === '--une-passe') { o.unePasse = true; continue }
    const m = /^--([a-z-]+)=(.*)$/.exec(a)
    if (!m || !['capacite','base','travail','max','delai-s','meminfo'].includes(m[1]) || !m[2]) throw new Error('options')
    o[m[1]] = m[2]
  }
  o.capacite ||= ''
  o.base ||= 'https://prestiapp.fr'
  o.travail ||= path.join(process.env.HOME || os.homedir(), 'travail', 'usine')
  o.max = o.max === undefined ? 2 : Number(o.max)
  if (!Number.isSafeInteger(o.max) || o.max < 1 || o.max > 100) throw new Error('max')
  if (o['delai-s'] !== undefined && (!Number.isFinite(Number(o['delai-s'])) || Number(o['delai-s']) <= 0)) throw new Error('delai')
  const urlBase = new URL(o.base)
  if (urlBase.protocol === 'http:' ? !['127.0.0.1', 'localhost'].includes(urlBase.hostname) : urlBase.protocol !== 'https:') throw new Error('base')
  if (urlBase.username || urlBase.password || urlBase.search || urlBase.hash) throw new Error('base')
  return o
}
function memoire(f) {
  if (process.platform !== 'linux' && !f) return os.freemem()
  try {
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(fs.readFileSync(f || '/proc/meminfo', 'utf8'))
    return m ? Number(m[1]) * 1024 : 0
  } catch { return 0 }
}
function disque(lieu) {
  try { const s = fs.statfsSync(lieu); return Number(s.bavail) * Number(s.bsize) }
  catch { return 0 }
}
function nomSur(n) { return typeof n === 'string' && NOM.test(n) && !n.includes('..') && !n.includes('//') && !n.includes('\\') }
function contenuValide(b, type) {
  if (type === 'image/jpeg') return b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b.at(-2) === 0xff && b.at(-1) === 0xd9
  if (type === 'image/png') return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if (type === 'image/webp') return b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP' && b.length >= 12
  if (type === 'image/avif') return b.toString('ascii',4,8) === 'ftyp' && b.toString('ascii',8,16).includes('avif')
  if (type === 'font/woff2') return b.toString('ascii',0,4) === 'wOF2'
  let texte
  try { texte = new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { return false }
  if (type === 'application/json') { try { JSON.parse(texte) } catch { return false } }
  return true
}
function secretDans(b, jeton, env) {
  const t = b.toString('utf8')
  return MOTIFS_SECRETS.some(({ re }) => re.test(t)) || JETON_AGENT.test(t) || t.includes(jeton) ||
    Object.entries(env).some(([k, v]) => /(?:SECRET|TOKEN|JETON|API_KEY|PASSWORD)/i.test(k) && typeof v === 'string' && v.length >= 8 && t.includes(v))
}
function controler(sortieDir, LIM, jeton, env) {
  let man
  try { man = JSON.parse(fs.readFileSync(path.join(sortieDir, 'manifeste.json'), 'utf8')) } catch { return { erreur: 'sortie:manifeste' } }
  if (!man || !Array.isArray(man.fichiers)) return { erreur: 'sortie:manifeste' }
  if (!man.fichiers.length || man.fichiers.length > LIM.fichiers_max) return { erreur: 'sortie:taille' }
  const vus = new Set(), fichiers = []
  let total = 0
  for (const f of man.fichiers) {
    if (!f || !nomSur(f.nom) || vus.has(f.nom) || !(f.nom.startsWith('site/') || f.nom === 'rapport-qa.json')) return { erreur: 'sortie:nom' }
    vus.add(f.nom)
    if (!LIM.types.includes(f.type) || !(EXT[path.extname(f.nom).toLowerCase()] || []).includes(f.type)) return { erreur: 'sortie:type' }
    const chemin = path.join(sortieDir, f.nom)
    let parent = sortieDir
    for (const segment of f.nom.split('/').slice(0, -1)) {
      parent = path.join(parent, segment)
      try { if (!fs.lstatSync(parent).isDirectory()) return { erreur: 'sortie:lien' } }
      catch { return { erreur: 'sortie:nom' } }
    }
    let st
    try { st = fs.lstatSync(chemin) } catch { return { erreur: 'sortie:nom' } }
    if (st.isSymbolicLink() || !st.isFile()) return { erreur: 'sortie:lien' }
    if (!st.size || st.size > LIM.octets_fichier_max) return { erreur: 'sortie:taille' }
    total += st.size
    if (total > LIM.octets_total_max) return { erreur: 'sortie:taille' }
    const b = fs.readFileSync(chemin)
    if (!contenuValide(b, f.type)) return { erreur: 'sortie:type' }
    if (secretDans(b, jeton, env)) return { erreur: 'sortie:secret' }
    const x = { nom: f.nom, type: f.type, chemin }
    x.octets = b.length; x.sha256 = sha256(b)
    fichiers.push(x)
  }
  return { fichiers, total }
}
function tuerArbre(pid) {
  if (!pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio:'ignore', windowsHide:true })
  else { try { process.kill(-pid, 'SIGKILL') } catch { try { process.kill(pid, 'SIGKILL') } catch {} } }
}
function fabriquer(entreeDir, sortieDir, dossier, CAP, delaiMs) {
  const env = {}
  for (const k of ['PATH', 'HOME', 'LANG', 'TZ', 'PLAYWRIGHT_BROWSERS_PATH', ...(CAP.env || [])]) if (process.env[k] !== undefined) env[k] = process.env[k]
  const argv = CAP.commande.map((a) => a.replaceAll('{node}', process.execPath).replaceAll('{entree}', entreeDir).replaceAll('{sortie}', sortieDir))
  return new Promise((resolve) => {
    let enfant, expire = false, sortie = ''
    try { enfant = spawn(argv[0], argv.slice(1), { cwd: RACINE, env, shell: false, detached: process.platform !== 'win32', windowsHide:true, stdio:['ignore','pipe','pipe'] }) }
    catch { resolve({ code: -1, expire:false, env }); return }
    const recueillir = (b) => { sortie += b.toString('utf8'); if (sortie.length > 200_000) sortie = sortie.slice(-200_000) }
    enfant.stdout.on('data', recueillir); enfant.stderr.on('data', recueillir)
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    let termine = false
    const fin = (code) => {
      if (termine) return; termine = true; clearTimeout(minuterie)
      fs.writeFileSync(path.join(dossier, 'fabrication.log'), sortie.split(/\r?\n/).slice(-50).join('\n'))
      resolve({ code: typeof code === 'number' ? code : -1, expire, env })
    }
    enfant.on('error', () => fin(-1)); enfant.on('close', fin)
  })
}
async function principal() {
  let o
  try { o = options() } catch { console.log('options invalides'); return 2 }
  const capacite = o.capacite
  if (!Object.hasOwn(CAPACITES, capacite) || !Object.hasOwn(LIMITES, capacite) || !SCHEMAS[capacite]) { console.log('capacite invalide'); return 2 }
  const CAP = CAPACITES[capacite], LIM = LIMITES[capacite]
  const jeton = process.env[CAP.jeton]
  if (!jeton) { console.log('jeton absent'); return 2 }
  fs.mkdirSync(o.travail, { recursive:true })
  const verrou = path.join(o.travail, `tourneur-${capacite}.verrou`)
  const prendreVerrou = () => {
    try { fs.writeFileSync(verrou, JSON.stringify({ pid:process.pid, date:new Date().toISOString() }), { flag:'wx' }); return true }
    catch {
      let age = 0
      try { age = Date.now() - fs.statSync(verrou).mtimeMs } catch { return false }
      if (age < VERROU_MAX_MS) return false
      console.log('verrou de plus de 60 min repris')
      try { fs.rmSync(verrou); fs.writeFileSync(verrou, JSON.stringify({ pid:process.pid, date:new Date().toISOString() }), { flag:'wx' }); return true } catch { return false }
    }
  }
  if (!prendreVerrou()) { console.log('déjà en cours'); process.exit(0) }
  const debut = Date.now(), journalF = path.join(o.travail, `tourneur-${capacite}.jsonl`)
  const journal = (v) => fs.appendFileSync(journalF, JSON.stringify(v) + '\n')
  let nTaches = 0, code = 0
  async function bus(route, corps = undefined) {
    let r
    try { r = await fetch(new URL(route, o.base), { method:'POST', headers:{ authorization:`Bearer ${jeton}`, 'content-type':'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps), signal:AbortSignal.timeout(30_000) }) }
    catch { throw new ErreurBus(1, 'bus : reseau') }
    if (r.status === 401) throw new ErreurBus(1, 'bus : 401')
    if (r.status === 429) throw new ErreurBus(3, 'bus : 429, passage arrêté')
    if (r.status >= 500 && !(route === '/api/agents/usine/depot' && r.status === 507)) throw new ErreurBus(1, `bus : ${r.status}`)
    let json = null
    try { json = await r.json() } catch {}
    return { status:r.status, json }
  }
  async function deposer(url, chemin, type) {
    const corps = fs.readFileSync(chemin)
    for (let essai = 1; essai <= 3; essai++) {
      try {
        const r = await fetch(url, { method:'PUT', headers: { 'content-type': type }, body: corps, signal:AbortSignal.timeout(30_000) })
        if (r.ok) return true
        if (r.status < 500) return false
      } catch {}
    }
    return false
  }
  async function traiter(t) {
    const id = t?.id, debutTache = Date.now()
    const dossier = path.join(o.travail, id)
    let octets = 0, etape = 'capacite'
    const finir = async (resultat, erreur = '') => {
      const corps = resultat === 'faite' ? { resultat, preuve_url: `supabase://usine/${id}/sortie/` } : { resultat, erreur }
      await bus(`/api/agents/taches/${id}/rendre`, corps)
      journal({ le: new Date().toISOString(), tache: id, code: resultat, etape: erreur || 'faite', octets, duree_s: Math.round((Date.now()-debutTache)/1000) })
      console.log(`${id} ${resultat}${erreur ? ` ${erreur}` : ''}`)
      if (resultat === 'faite') fs.rmSync(dossier, { recursive: true, force: true })
    }
    if (!UUID.test(id) || t.type !== CAP.type || t.capacite !== capacite) return finir('echec', 'capacite')
    if (SCHEMAS[capacite](t.charge)) return finir('echec', 'charge')
    fs.mkdirSync(dossier, { recursive:true })
    const entreeDir = path.join(dossier, 'entree'), sortieDir = path.join(dossier, 'sortie')
    fs.mkdirSync(entreeDir); fs.mkdirSync(sortieDir)
    etape = 'entree'
    try {
      const e = await bus('/api/agents/usine/entree', { tache:id })
      if (e.status !== 200 || !Array.isArray(e.json?.entrees) || e.json.entrees.length > LIM.entrees_max) return finir('echec', 'entree')
      for (const x of e.json.entrees) {
        if (!nomSur(x.nom) || x.nom.includes('/') || !Number.isSafeInteger(x.octets) || x.octets < 0) return finir('echec', 'entree')
        const r = await fetch(x.url, { signal:AbortSignal.timeout(30_000) })
        if (!r.ok) return finir('echec', 'entree')
        const b = Buffer.from(await r.arrayBuffer())
        octets += b.length
        if (b.length !== x.octets || octets > LIM.octets_total_max) return finir('echec', 'entree')
        const f = path.join(entreeDir, x.nom)
        fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b)
      }
      fs.writeFileSync(path.join(entreeDir, 'charge.json'), JSON.stringify(t.charge))
    } catch (err) { if (err instanceof ErreurBus) throw err; return finir('echec', 'entree') }
    etape = 'fabrication'
    const f = await fabriquer(entreeDir, sortieDir, dossier, CAP, o['delai-s'] ? Number(o['delai-s'])*1000 : CAP.minutes*60_000)
    if (f.expire) return finir('echec', 'fabrication:delai')
    if (f.code !== 0) return finir('echec', `fabrication:code ${f.code}`)
    etape = 'sortie'
    const sortie = controler(sortieDir, LIM, jeton, f.env)
    if (sortie.erreur) return finir('echec', sortie.erreur)
    octets += sortie.total
    etape = 'depot'
    const d = await bus('/api/agents/usine/depot', { tache:id, fichiers: sortie.fichiers.map(({ nom, octets, type, sha256 }) => ({ nom, octets, type, sha256 })) })
    if (d.status === 507) return finir('echec', 'depot:stockage')
    if (d.status !== 200 || !Array.isArray(d.json?.depots)) return finir('echec', 'depot')
    for (const x of sortie.fichiers) {
      const u = d.json.depots.find((v) => v.nom === x.nom)
      if (!u || typeof u.url !== 'string' || !(await deposer(u.url, x.chemin, x.type))) return finir('echec', 'depot')
    }
    return finir('faite')
  }
  try {
    for (const d of fs.readdirSync(o.travail, { withFileTypes:true })) {
      if (d.isDirectory() && UUID.test(d.name)) {
        const f = path.join(o.travail, d.name)
        if (Date.now() - fs.statSync(f).mtimeMs > 24*60*60_000) fs.rmSync(f, { recursive:true, force:true })
      }
    }
    await bus('/api/agents/battement')
    const mem = memoire(o.meminfo), disqueLibre = disque(o.travail)
    if (mem < MEMOIRE_MIN || disqueLibre < DISQUE_MIN) console.log('ressources insuffisantes')
    else while (nTaches < o.max && Date.now() - debut < 50*60_000) {
      const p = await bus('/api/agents/taches/prendre')
      if (p.status === 423 && p.json?.code === 'agent_en_pause') { console.log('en_pause'); break }
      if (p.status !== 200) throw new ErreurBus(1, `bus : ${p.status}`)
      if (!p.json?.tache) break
      await traiter(p.json.tache); nTaches++
    }
  } catch (err) { code = err instanceof ErreurBus ? err.code : 1; console.log(err instanceof ErreurBus ? err.message : 'erreur de passage') }
  finally {
    journal({ le: new Date().toISOString(), capacite, taches: nTaches, duree_s: Math.round((Date.now()-debut)/1000) })
    fs.rmSync(verrou, { force:true })
  }
  return code
}
process.exitCode = await principal()
