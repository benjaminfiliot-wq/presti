#!/usr/bin/env node
// Relais du modèle sous le compte chef-modele.
//   demander [--echange=<d>] [--delai=<s>] <argv de codex exec…>   (côté agents : c'est le « Codex » des scripts)
//   servir   [--echange=<d>] [--codex=<binaire>]                    (côté chef-modele : lancé par le service .path)
// Les options de chef-modele viennent avant l'argv de Codex. Il ne lit que le dossier d'échange et les fichiers que
// l'argv nomme ; jamais le coffre du compte agents.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { appelDirect, chaineAvecBases, drapeauLeve, journalFichier, magasinFichier, preparerPromptDirect, relayer } from './relais-chef.mjs'

const ECHANGE_DEFAUT = '/srv/presti-chef/echange'
const CODEX_DEFAUT = '/opt/codex/bin/codex'
const INTERDITS = [/danger-full-access/, /^--add-dir(=|$)/, /network_access\s*=\s*["']?true/i, /dangerously-bypass-approvals-and-sandbox/, /^--yolo$/]
const MAX_SORTIE = 64 * 1024
const WIN = process.platform === 'win32'

const [sous, ...reste] = process.argv.slice(2)
const opts = {}
let i = 0
for (; i < reste.length; i++) {
  const m = /^--(echange|delai|codex|relais|relais-dossier|freellmapi|ollama)=(.*)$/.exec(reste[i])
  if (!m) break
  opts[m[1]] = m[2]
}
const argvCodex = reste.slice(i)
const echange = path.resolve(opts.echange || ECHANGE_DEFAUT)
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }

/** La file des agents (les données de prospect passent ici) : jamais un autre fournisseur, jamais un secours. */
function estFileIA() {
  return path.resolve(echange) === path.resolve('/srv/presti-ia/echange') || echange.includes('echange-ia')
}

function fournisseurRefuse(argv) {
  let modele = null
  let fournisseur = false
  for (let j = 0; j < argv.length; j++) {
    const a = argv[j]
    if (a === '-m' || a === '--model') modele = argv[++j]
    else if (a.startsWith('--model=')) modele = a.slice('--model='.length)
    else if (a === '-c' || a === '--config') fournisseur ||= /^model_provider\s*=/.test(argv[++j] || '')
    else if (/^(?:-c|--config)=model_provider\s*=/.test(a)) fournisseur = true
    if (a === '--oss' || a.startsWith('--oss=') || a === '--local-provider' || a.startsWith('--local-provider=')) return true
  }
  const fileIA = estFileIA()
  if (fileIA) return fournisseur || !/^gpt-6-[a-z0-9-]+$/.test(modele || '')
  return fournisseur && modele !== 'gpt-oss:120b-cloud'
}

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
  // L'umask du service (0022) ôtait l'écriture au groupe : chef-modele ne pouvait ni prendre la demande ni écrire sa réponse.
  fs.chmodSync(d, 0o2770)
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
      if (r.moteur && r.moteur !== 'codex') process.stderr.write(`\n[relais] moteur=${r.moteur}\n`)
      return Number.isInteger(r.code) ? r.code : 1
    }
    await dormir(200)
  }
  fs.rmSync(d, { recursive: true, force: true })
  console.error('✗ délai dépassé : demande retirée')
  return 3
}

function lancerCodex(d, argv, stdin, delaiMs, envExtra = {}) {
  const bin = opts.codex || CODEX_DEFAUT
  const [commande, avant] = /\.m?js$/.test(bin) ? [process.execPath, [bin]] : [bin, []]
  const env = { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', HOME: '/home/chef-modele', LANG: process.env.LANG || 'C.UTF-8', TZ: process.env.TZ || 'Europe/Paris', ...envExtra }
  return new Promise((resoudre) => {
    const enfant = spawn(commande, [...avant, ...argv], { cwd: d, env, windowsHide: true, detached: !WIN, stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'] })
    let sortie = ''
    enfant.stdout.on('data', (x) => { if (sortie.length < MAX_SORTIE) sortie += x })
    enfant.stderr.on('data', (x) => { if (sortie.length < MAX_SORTIE) sortie += x })
    if (stdin) { enfant.stdin.on('error', () => { /* le modèle a fermé son entrée avant d'avoir tout lu */ }); enfant.stdin.end(fs.readFileSync(path.join(d, 'entree.txt'))) }
    let delai = false
    const minuterie = setTimeout(() => {
      delai = true
      try { if (WIN) spawn('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(-enfant.pid, 'SIGKILL') } catch { /* mort */ }
    }, delaiMs)
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: String(e.message), delai: false }) })
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: code ?? 1, sortie: sortie.slice(0, MAX_SORTIE), delai }) })
  })
}

// Le relais de moteurs (relais-chef.mjs) ne sert que la file du chef, et par défaut avec le vrai binaire de Codex : un banc d'essai qui
// désigne son faux binaire (--codex=) garde le comportement d'avant, sauf --relais=oui.
function relaisActif() { return !estFileIA() && (!opts.codex || opts.relais === 'oui') }

async function servirAvecRelais(d, argv, stdin, delaiMs, demande) {
  const home = process.env.HOME || os.homedir()
  const dossier = opts['relais-dossier'] || path.join(home, '.relais')
  let texteEntree = ''
  for (const e of Array.isArray(demande?.entrees) ? demande.entrees : []) { try { texteEntree += fs.readFileSync(e.copie, 'utf8').slice(0, 2 * 1024 * 1024) } catch { /* illisible : sans effet */ } }
  let cle = null
  try { cle = fs.readFileSync(path.join(home, '.config', 'presti', 'freellmapi.key'), 'utf8').trim() || null } catch { cle = null }
  let texteStdin = ''
  if (stdin) { try { texteStdin = fs.readFileSync(path.join(d, 'entree.txt'), 'utf8').slice(0, 2 * 1024 * 1024) } catch { texteStdin = '' } }
  // Le validateur du plan du chef (scripts/chef/commun.mjs, le même que celui du cycle) : un plan refusé en bloc perdrait le cycle.
  let valider = null
  try {
    const { validerPlan } = await import('../chef/commun.mjs')
    const cycle = /cycle (plein|leger)/.exec(argv.at(-1) ?? '')?.[1] ?? null
    const sortiePlan = String((demande?.sorties ?? []).map((s) => s.copie).find((c) => !/dernier-message/.test(c)) ?? '')
    if (cycle && /plan/.test(path.basename(sortiePlan))) valider = (objet) => validerPlan(objet, cycle)
  } catch { valider = null }
  // La réunion d'équipage (reunion.mjs demande « reunion.json ») : mêmes aides qu'au cycle — limites exactes et exemple dans le message, écarts rendus au modèle
  // pour correction (validerReunion, le miroir des contrôles de reunion.mjs), et en dernier recours une réduction déterministe sûre (reduireReunion).
  let reduire = null
  let complement = null
  try {
    const sortieReunion = String((demande?.sorties ?? []).map((s) => s.copie).find((c) => !/dernier-message/.test(c)) ?? '')
    if (/(^|-)reunion\.json$/.test(path.basename(sortieReunion))) {
      const RC = await import('../chef/reunion-controle.mjs')
      const maintenant = () => new Date()
      const jour = RC.jourDeParis(maintenant())
      const interdits = RC.textesDeLExemple(jour, Date.now())
      valider = (objet) => RC.validerReunion(objet, { jour: RC.jourDeParis(maintenant()), maintenant: maintenant(), interdits })
      reduire = (objet) => RC.reduireReunion(objet, { jour: RC.jourDeParis(maintenant()), maintenant: maintenant(), interdits })
      complement = RC.limitesReunion(jour, Date.now())
    }
  } catch { reduire = null; complement = null }
  return relayer({
    texteEntree: texteEntree + texteStdin, delaiMs, cle,
    chaine: chaineAvecBases({ freellmapi: opts.freellmapi, ollama: opts.ollama }),
    // Le travail attendu : chaque fichier de sortie déclaré (le plan), hors le dernier message de Codex, existe et n'est pas vide.
    verifier: () => {
      const o = argv.findIndex((a) => a === '-o' || a === '--output-last-message')
      const dernier = o >= 0 ? argv[o + 1] : null
      const attendus = (Array.isArray(demande?.sorties) ? demande.sorties : []).map((s) => s.copie).filter((c) => c !== dernier)
      // La réunion n'a qu'un fichier de sortie : le « -o » lui-même (reunion.json). Sans cette ligne, la liste serait vide et un moteur libre qui répond en prose
      // (code 0, rien d'écrit) passerait pour avoir réussi : le suivant ne prendrait jamais la demande.
      if (!attendus.length && dernier) attendus.push(dernier)
      return attendus.every((c) => { try { return fs.statSync(c).size > 0 } catch { return false } })
    },
    drapeau: drapeauLeve(process.env.IA_LOCALE_PROSPECTS_OUI, Date.now()),
    etat: magasinFichier(dossier), journal: journalFichier(dossier),
    // Entre deux moteurs, les fichiers de sortie du précédent (un plan à moitié écrit) sont retirés : le suivant repart d'une page blanche.
    // Codex lui-même (abonnement) : l'argv de la demande, tel quel. Un moteur de secours : un appel direct (relais-chef.mjs) — les fichiers que la
    // consigne cite sont recopiés dans la requête, le JSON rendu est écrit à la place du fichier de sortie.
    executer: async (m, budgetMs) => {
      for (const s of Array.isArray(demande?.sorties) ? demande.sorties : []) { try { fs.rmSync(s.copie, { force: true }) } catch { /* déjà absent */ } }
      if (m.id === 'codex') return lancerCodex(d, argv, stdin, budgetMs)
      const prompt = preparerPromptDirect({ argv, sorties: demande?.sorties, stdin: texteStdin || undefined, lireFichier: (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }, dossiersPermis: [d, echange], dateDuJour: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date()), complement })
      if (!prompt) return { code: 1, sortie: 'ERROR: demande hors de la forme « lis puis écris » : aucun secours possible' }
      return appelDirect({ moteur: m, prompt, cle, delaiMs: budgetMs, valider, reduire })
    },
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
    const refus = argv[0] !== 'exec' ? 'seule la sous-commande exec est permise' : (argv.find((a) => INTERDITS.some((re) => re.test(a))) || fournisseurRefuse(argv) ? 'argv refusé (réseau, disque, fournisseur ou bac à sable ouverts)' : null)
    if (refus) { repondre({ code: 2, sortie: `✗ ${refus}\n` }); continue }
    const stdin = Boolean(demande.stdin) && fs.existsSync(path.join(d, 'entree.txt'))
    const delaiMs = Number(demande.delai_s || 1200) * 1000
    let r
    if (relaisActif()) r = await servirAvecRelais(d, argv, stdin, delaiMs, demande)
    else r = await lancerCodex(d, argv, stdin, delaiMs)
    repondre({ code: r.code, sortie: r.sortie, ...(r.moteur ? { moteur: r.moteur } : {}) })
  }
  return 0
}

const faire = sous === 'demander' ? demander : sous === 'servir' ? servir : null
if (!faire) { console.error('usage : chef-modele.mjs demander|servir [--echange=<d>] …'); process.exit(2) }
faire().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1 })
