#!/usr/bin/env node
// Témoin de scripts/instantane-quotidien.mjs — fiche 026-002, autotest de scripts/instantane-quotidien-qa.mjs.
// Réparation du 27/09 (IQ-13, IQ-14) : l'invariant ne compare plus le dépôt avant et après, il lit ce que CE script a écrit.
// Ce n'est pas le livrable de 026-005 : c'est la preuve que le juge sait passer au vert sur un script juste, puis au rouge
// sur chaque défaut planté. Par prudence, --racine ET --depot sont obligatoires ici : lancé par erreur, il ne pousse rien.
//
//   node instantane-quotidien.temoin.mjs --racine=<dépôt> --depot=<chemin> [--vault=<dossier>] [--pousser | --sans-pousser]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

// Les motifs : aucune source de motif ne se reconnaît elle-même (un « [ » suit toujours le préfixe).
export const MOTIFS_SECRETS = [
  { nom: 'stripe', re: /\b(?:sk_live|rk_live|sk_test)_[A-Za-z0-9]{20,}/ },
  { nom: 'stripe_webhook', re: /\bwhsec_[A-Za-z0-9]{8,}/ },
  { nom: 'anthropic', re: /\bsk-ant-[A-Za-z0-9_-]{8,}/ },
  { nom: 'resend', re: /\bre_[A-Za-z0-9_]{20,}/ },
  { nom: 'supabase_service', re: /\beyJ[A-Za-z0-9_-]{4,}\.(eyJ[A-Za-z0-9_-]{4,})\.[A-Za-z0-9_-]{4,}/g },
  { nom: 'cle_privee', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nom: 'google', re: /\bAIza[0-9A-Za-z_-]{35}/ },
  { nom: 'github', re: /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
]
/** Les noms des motifs trouvés dans le texte — jamais les valeurs. */
export function chercherSecrets(texte) {
  const t = String(texte ?? '')
  const noms = []
  for (const m of MOTIFS_SECRETS) {
    if (m.nom === 'supabase_service') {
      for (const x of t.matchAll(m.re)) {
        let charge = ''
        try { charge = Buffer.from(x[1], 'base64url').toString('utf8') } catch { /* pas un JWT */ }
        if (/"role"\s*:\s*"service_role"/.test(charge)) { noms.push(m.nom); break }
      }
    } else if (m.re.test(t)) noms.push(m.nom)
  }
  return noms
}

const MAX_OCTETS = 90 * 1024 * 1024
const MAX_EXCLUS = 20
function paris(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]))
  return { jour: `${p.year}-${p.month}-${p.day}`, hhmm: `${p.hour}${p.minute}` }
}
function lireOptions(argv) {
  const o = { pousser: false, racine: null, depot: null, vault: null }
  for (const a of argv) {
    if (a === '--pousser') o.pousser = true
    else if (a === '--sans-pousser') o.pousser = false
    else if (a.startsWith('--racine=')) o.racine = path.resolve(a.slice(9))
    else if (a.startsWith('--depot=')) o.depot = a.slice(8)
    else if (a.startsWith('--vault=')) o.vault = path.resolve(a.slice(8))
    else return null
  }
  return o.racine && o.depot ? o : null
}
function prospects(vault) {
  if (!vault || !fs.existsSync(vault)) return { etat: 'absent', entrees: [] }
  const entrees = []
  for (const f of ['deja-contactes-email.txt', 'deja-contactes-instagram.txt']) {
    const p = path.join(vault, 'Prospection', f)
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const e = l.trim().toLowerCase(); if (e.length >= 4) entrees.push(e) }
  }
  return { etat: vault, entrees }
}

function principal(argv) {
  const o = lireOptions(argv)
  if (!o) { console.log('usage : --racine=<dépôt> --depot=<chemin> [--vault=<dossier>] [--pousser | --sans-pousser]'); return 2 }
  const R = o.racine
  // Trace et signature : tout processus git lancé d'ici note ses écritures d'index et son argv (trace2) et signe de ce
  // jeton le reflog de toute référence qu'il déplace. L'invariant lit l'une et l'autre en fin de passage (IQ-13, IQ-14).
  const jeton = crypto.randomBytes(6).toString('hex')
  const fichierTrace = path.join(os.tmpdir(), `instantane-quotidien-${process.pid}-${jeton}.trace2.json`)
  const signature = `instantane-quotidien.${jeton}@presti.invalid`
  const env0 = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TRACE2_EVENT: fichierTrace, GIT_TRACE2_EVENT_NESTING: '100', GIT_COMMITTER_NAME: 'instantane-quotidien', GIT_COMMITTER_EMAIL: signature }
  delete env0.GIT_TRACE2_PARENT_SID // les git lancés d'ici sont les seuls de premier niveau dans la trace
  delete process.env.GIT_TRACE2_PARENT_SID
  const g = (args, env = {}) => execFileSync('git', ['-C', R, '-c', 'core.quotepath=false', ...args], { encoding: 'utf8', env: { ...env0, ...env }, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const cheminIndex = path.resolve(R, g(['rev-parse', '--git-path', 'index']))
  const empreinte = () => ({
    head: g(['rev-parse', 'HEAD']),
    statut: g(['status', '--porcelain']),
    index: fs.existsSync(cheminIndex) ? crypto.createHash('sha256').update(fs.readFileSync(cheminIndex)).digest('hex') : null,
  })
  const avant = empreinte()
  const { jour, hhmm } = paris()
  const index = path.join(os.tmpdir(), `instantane-quotidien-${process.pid}-${Date.now()}.index`)
  const envI = { GIT_INDEX_FILE: index }
  const vault = prospects(o.vault)
  const ligne = { date: new Date().toISOString(), commit: null, branche: null, fichiers: 0, octets: 0, exclus: [], vault: vault.etat, ok: false }
  let code = 1, raison = ''
  try {
    g(['read-tree', 'HEAD'], envI)
    const candidats = [...new Set([
      ...g(['diff', '--name-only', '-z', 'HEAD']).split('\0'),
      ...g(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
    ].filter(Boolean))].filter((c) => !/\.exe$/i.test(c) && fs.existsSync(path.join(R, c)) && fs.statSync(path.join(R, c)).isFile())
    for (const c of candidats) {
      const abs = path.join(R, c)
      const taille = fs.statSync(abs).size
      if (taille > MAX_OCTETS) { ligne.exclus.push({ chemin: c, motif: 'taille' }); continue }
      const nom = path.basename(c)
      if (/^\.env(\..+)?$/.test(nom) && nom !== '.env.local.example') { ligne.exclus.push({ chemin: c, motif: 'env' }); continue }
      const octets = fs.readFileSync(abs)
      if (octets.subarray(0, 8192).includes(0)) continue
      const texte = octets.toString('utf8')
      const noms = chercherSecrets(texte)
      if (noms.length) { ligne.exclus.push({ chemin: c, motif: noms[0] }); continue }
      const bas = texte.toLowerCase()
      if (vault.entrees.some((e) => bas.includes(e))) ligne.exclus.push({ chemin: c, motif: 'prospect' })
    }
    if (ligne.exclus.length > MAX_EXCLUS) throw new Error(`${ligne.exclus.length} fichiers exclus (plus de ${MAX_EXCLUS}) : rien ne part`)
    g(['add', '-A', '--', '.', ':(exclude)*.exe'], envI)
    for (const x of ligne.exclus) g(['rm', '--cached', '-q', '--ignore-unmatch', '--', x.chemin], envI)
    const arbre = g(['write-tree'], envI)
    ligne.commit = g(['commit-tree', arbre, '-p', 'HEAD', '-m', `instantané quotidien ${jour} ${hhmm}`], envI)
    g(['update-ref', `refs/instantanes/quotidien-${jour}-${hhmm}-${process.pid}`, ligne.commit])
    const liste = g(['ls-tree', '-r', '-l', ligne.commit]).split('\n').filter(Boolean)
    ligne.fichiers = liste.length
    ligne.octets = liste.reduce((s, l) => s + (Number(l.split(/\s+/)[3]) || 0), 0)
    if (o.pousser) {
      const existe = (b) => g(['ls-remote', o.depot, `refs/heads/${b}`]).length > 0
      ligne.branche = existe(`instantane-${jour}`) ? `instantane-${jour}-${hhmm}` : `instantane-${jour}`
      g(['push', o.depot, `${ligne.commit}:refs/heads/${ligne.branche}`])
      const relu = g(['ls-remote', o.depot, `refs/heads/${ligne.branche}`]).split(/\s+/)[0]
      if (relu !== ligne.commit) throw new Error(`relecture : ${ligne.branche} porte ${relu || 'rien'}`)
    }
    ligne.ok = true
    code = ligne.exclus.length ? 4 : 0
  } catch (e) {
    raison = String(e.stderr || e.message || e).split(/\r?\n/).filter(Boolean).slice(0, 2).join(' ')
    ligne.ok = false
    code = 1
  } finally {
    fs.rmSync(index, { force: true })
  }
  // Le dépôt peut bouger pendant le passage : d'autres processus y écrivent. Ce n'est pas une panne, seulement une note.
  const apres = empreinte()
  const bouge = ['head', 'statut', 'index'].filter((k) => avant[k] !== apres[k])
  if (bouge.length) console.log(`note : le dépôt a bougé pendant le passage (${bouge.join(', ')}), d'autres processus y écrivent`)
  // L'invariant porte sur ce que CE script a écrit : les index nommés dans sa trace, les reflogs signés de son jeton.
  const violations = []
  const norme = (p) => path.resolve(R, p).toLowerCase()
  const ecrits = [], departs = []
  for (const l of (fs.existsSync(fichierTrace) ? fs.readFileSync(fichierTrace, 'utf8') : '').split(/\r?\n/)) {
    let e = null
    try { e = JSON.parse(l) } catch { if (l.includes('do_write_index') || l.includes('"event":"start"')) violations.push('trace illisible') }
    if (e && e.label === 'do_write_index') ecrits.push(norme(String(e.msg).replace(/\.lock$/, '')))
    if (e && e.event === 'start' && !String(e.sid).includes('/')) departs.push((e.argv || []).map(String))
  }
  // La liste des commandes, relue dans la trace : chaque processus de premier niveau (sid sans « / ») est un appel de CE
  // script, par g() ou non. Un git tag, ou un update-ref hors de refs/instantanes/, ne laisse aucun reflog signé.
  const permises = new Set(['rev-parse', 'status', 'read-tree', 'diff', 'ls-files', 'add', 'rm', 'write-tree', 'commit-tree', 'update-ref', 'ls-tree', 'ls-remote', 'push'])
  const horsListe = departs.map((a) => { let i = 1; while (i < a.length && a[i].startsWith('-')) i += a[i] === '-C' || a[i] === '-c' ? 2 : 1; return a.slice(i) })
    .filter((a) => !permises.has(a[0]) || (a[0] === 'update-ref' && !String(a[1]).startsWith('refs/instantanes/')))
  if (horsListe.length) violations.push('le script a lancé une commande git hors de sa liste')
  if (ligne.commit && !ecrits.includes(norme(index))) violations.push('trace muette')
  if (ecrits.some((p) => p !== norme(index))) violations.push('le script a écrit un autre index que le sien')
  const signes = []
  const parcourir = (d) => { if (fs.existsSync(d)) for (const x of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, x.name); if (x.isDirectory()) parcourir(p); else if (fs.readFileSync(p, 'utf8').includes(signature)) signes.push(path.relative(path.join(R, '.git'), p).split(path.sep).join('/')) } }
  parcourir(path.join(R, '.git', 'logs'))
  if (signes.some((f) => !f.startsWith('logs/refs/instantanes/'))) violations.push('le script a déplacé une référence hors de refs/instantanes/')
  fs.rmSync(fichierTrace, { force: true })
  if (violations.length) { ligne.ok = false; code = 1; raison = `invariant rompu : ${violations.join(', ')}` }
  const journal = path.join(R, '.orchestre', 'travail', 'sauvegardes.jsonl')
  fs.mkdirSync(path.dirname(journal), { recursive: true })
  fs.appendFileSync(journal, JSON.stringify(ligne) + '\n')
  console.log(`instantané ${ligne.commit ? ligne.commit.slice(0, 10) : '—'} · ${ligne.fichiers} fichiers · ${ligne.octets} octets · ${ligne.branche ? `poussé sur ${ligne.branche}` : 'non poussé'}`)
  for (const x of ligne.exclus) console.log(`exclu : ${x.chemin} (${x.motif})`)
  if (code === 1) console.log(`ALERTE BENJ : sauvegarde du code en panne — ${raison}`)
  return code
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exit(principal(process.argv.slice(2)))
