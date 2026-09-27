#!/usr/bin/env node
// TÉMOIN de chef-qa (026-102) — le modèle du chef sous le compte chef-modele (le vrai : 026-129, revue du 25/09).
//   demander [--echange=<d>] [--delai=<s>] <argv de codex exec…>   (côté agents : c'est le « Codex » des scripts)
//   servir   [--echange=<d>] [--codex=<binaire>]                    (côté chef-modele : lancé par le service .path)
// Les options de chef-modele viennent avant l'argv de Codex. Il ne lit que le dossier d'échange et les fichiers que
// l'argv nomme ; jamais le coffre du compte agents.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

const ECHANGE_DEFAUT = '/srv/presti-chef/echange'
const CODEX_DEFAUT = '/opt/codex/bin/codex'
const INTERDITS = [/danger-full-access/, /^--add-dir(=|$)/, /network_access\s*=\s*["']?true/i, /dangerously-bypass-approvals-and-sandbox/, /^--yolo$/]
const MAX_SORTIE = 64 * 1024
const WIN = process.platform === 'win32'

const [sous, ...reste] = process.argv.slice(2)
const opts = {}
let i = 0
for (; i < reste.length; i++) {
  const m = /^--(echange|delai|codex)=(.*)$/.exec(reste[i])
  if (!m) break
  opts[m[1]] = m[2]
}
const argvCodex = reste.slice(i)
const echange = path.resolve(opts.echange || ECHANGE_DEFAUT)
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }

// Les chemins absolus que l'argv nomme (dans une option ou dans la phrase d'instruction).
const CHEMIN = /(?:[A-Za-z]:[\\/]|\/)[^\s"'`]+/g
function cheminsNommes(argv) {
  const vus = new Set()
  for (const a of argv) for (const m of a.matchAll(CHEMIN)) vus.add(m[0].replace(/[.,;:)]+$/, ''))
  return [...vus]
}

async function demander() {
  if (!argvCodex.length) { console.error('✗ demander : argv de codex exec manquant'); return 2 }
  const delai = Number(opts.delai || 1200) * 1000
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`
  const d = path.join(echange, id)
  fs.mkdirSync(d, { recursive: true, mode: 0o2770 })
  const entrees = []
  const sorties = []
  let n = 0
  const remplacer = new Map()
  for (const p of cheminsNommes(argvCodex)) {
    let st = null
    try { st = fs.statSync(p) } catch { st = null }
    if (st?.isFile()) {
      const copie = path.join(d, `entree-${++n}-${path.basename(p)}`)
      fs.copyFileSync(p, copie)
      entrees.push({ origine: p, copie })
      remplacer.set(p, copie)
    } else if (!st && fs.existsSync(path.dirname(p))) {
      const copie = path.join(d, `sortie-${++n}-${path.basename(p)}`)
      sorties.push({ origine: p, copie })
      remplacer.set(p, copie)
    }
  }
  const argv = argvCodex.map((a) => { let s = a; for (const [de, vers] of remplacer) s = s.split(de).join(vers); return s })
  let stdin = false
  if (!process.stdin.isTTY) {
    let texte = ''
    try { texte = fs.readFileSync(0, 'utf8') } catch { texte = '' }
    if (texte) { fs.writeFileSync(path.join(d, 'entree.txt'), texte.slice(0, 1024 * 1024)); stdin = true }
  }
  fs.writeFileSync(path.join(d, 'demande.json'), JSON.stringify({ argv, entrees, sorties, stdin, delai_s: delai / 1000, le: new Date().toISOString() }, null, 2))
  fs.writeFileSync(path.join(d, 'demande.pret'), '')
  const fin = Date.now() + delai
  while (Date.now() < fin) {
    const r = lireJson(path.join(d, 'reponse.json'))
    if (r) {
      for (const s of sorties) if (fs.existsSync(s.copie)) fs.copyFileSync(s.copie, s.origine)
      process.stdout.write(String(r.sortie || '').slice(0, MAX_SORTIE))
      return Number.isInteger(r.code) ? r.code : 1
    }
    await dormir(200)
  }
  fs.rmSync(d, { recursive: true, force: true })
  console.error('✗ délai dépassé : demande retirée')
  return 3
}

function lancerCodex(d, argv, stdin, delaiMs) {
  const bin = opts.codex || CODEX_DEFAUT
  const [commande, avant] = /\.m?js$/.test(bin) ? [process.execPath, [bin]] : [bin, []]
  const env = { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', HOME: '/home/chef-modele', LANG: process.env.LANG || 'C.UTF-8', TZ: process.env.TZ || 'Europe/Paris' }
  return new Promise((resoudre) => {
    const enfant = spawn(commande, [...avant, ...argv], { cwd: d, env, windowsHide: true, detached: !WIN, stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'] })
    let sortie = ''
    enfant.stdout.on('data', (x) => { if (sortie.length < MAX_SORTIE) sortie += x })
    enfant.stderr.on('data', (x) => { if (sortie.length < MAX_SORTIE) sortie += x })
    if (stdin) { enfant.stdin.end(fs.readFileSync(path.join(d, 'entree.txt'))) }
    const minuterie = setTimeout(() => {
      try { if (WIN) spawn('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(-enfant.pid, 'SIGKILL') } catch { /* mort */ }
    }, delaiMs)
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: String(e.message) }) })
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: code ?? 1, sortie: sortie.slice(0, MAX_SORTIE) }) })
  })
}

async function servir() {
  if (!fs.existsSync(echange)) return 0
  const pretes = fs.readdirSync(echange).filter((x) => fs.existsSync(path.join(echange, x, 'demande.pret'))).sort()
  for (const id of pretes) {
    const d = path.join(echange, id)
    try { fs.renameSync(path.join(d, 'demande.pret'), path.join(d, 'demande.prise')) } catch { continue } // prise par un autre
    const demande = lireJson(path.join(d, 'demande.json'))
    const argv = Array.isArray(demande?.argv) ? demande.argv.map(String) : []
    const repondre = (r) => fs.writeFileSync(path.join(d, 'reponse.json'), JSON.stringify({ ...r, compte: 'chef-modele', le: new Date().toISOString() }))
    const refus = argv[0] !== 'exec' ? 'seule la sous-commande exec est permise' : (argv.find((a) => INTERDITS.some((re) => re.test(a))) ? 'argv refusé (réseau, disque ou bac à sable ouverts)' : null)
    if (refus) { repondre({ code: 2, sortie: `✗ ${refus}\n` }); continue }
    const r = await lancerCodex(d, argv, Boolean(demande.stdin) && fs.existsSync(path.join(d, 'entree.txt')), Number(demande.delai_s || 1200) * 1000)
    repondre({ code: r.code, sortie: r.sortie })
  }
  return 0
}

const faire = sous === 'demander' ? demander : sous === 'servir' ? servir : null
if (!faire) { console.error('usage : chef-modele.mjs demander|servir [--echange=<d>] …'); process.exit(2) }
faire().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1 })
