#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const DEPOT_DEFAUT = 'https://github.com/benjaminfiliot-wq/presti-sauvegarde.git'
const LIMITE = 90 * 1024 * 1024

function jwtService(texte) {
  const candidats = texte.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []
  return candidats.some((jeton) => {
    try { return JSON.parse(Buffer.from(jeton.split('.')[1], 'base64url').toString('utf8')).role === 'service_role' }
    catch { return false }
  })
}

export const MOTIFS_SECRETS = [
  { nom: 'stripe', re: /\b(?:sk_live_|rk_live_|sk_test_)[A-Za-z0-9]{20,}/ },
  { nom: 'stripe_webhook', re: /\bwhsec_[A-Za-z0-9]{10,}/ },
  { nom: 'anthropic', re: /\bsk-ant-[A-Za-z0-9_-]{10,}/ },
  { nom: 'resend', re: /\bre_[A-Za-z0-9]{20,}/ },
  { nom: 'supabase_service', re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { nom: 'cle_privee', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nom: 'google', re: /\bAIza[A-Za-z0-9_-]{35}/ },
  { nom: 'github', re: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/ },
]

export function chercherSecrets(texte) {
  const trouves = []
  for (const { nom, re } of MOTIFS_SECRETS) {
    if (nom === 'supabase_service' ? jwtService(texte) : re.test(texte)) trouves.push(nom)
  }
  return trouves
}

function options(argv) {
  const o = { racine: RACINE, depot: process.env.PRESTI_SAUVEGARDE_DEPOT || DEPOT_DEFAUT, pousser: false, vault: undefined }
  let mode = false
  for (const a of argv) {
    if (a === '--pousser' || a === '--sans-pousser') {
      if (mode) throw new Error('usage')
      o.pousser = a === '--pousser'; mode = true
    } else if (a.startsWith('--racine=') && a.length > 9) o.racine = path.resolve(a.slice(9))
    else if (a.startsWith('--depot=') && a.length > 8) o.depot = a.slice(8)
    else if (a.startsWith('--vault=') && a.length > 8) o.vault = path.resolve(a.slice(8))
    else throw new Error('usage')
  }
  if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) throw new Error('usage')
  if (o.vault === undefined) {
    let valeur = '../SaaS'
    try { valeur = JSON.parse(fs.readFileSync(path.join(o.racine, '.orchestre/orchestre.json'), 'utf8')).vault || valeur } catch { /* dépôt d'essai */ }
    o.vault = path.resolve(o.racine, valeur)
  }
  return o
}

function git(racine, args, env = {}, brut = false) {
  return execFileSync('git', ['-C', racine, ...args], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', ...env },
    encoding: brut ? 'buffer' : 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  })
}
function texteGit(racine, args, env) { return git(racine, args, env).trim() }
function empreinteIndex(racine) {
  const nom = texteGit(racine, ['rev-parse', '--git-path', 'index'])
  const fichier = path.isAbsolute(nom) ? nom : path.resolve(racine, nom)
  return fs.existsSync(fichier) ? crypto.createHash('sha256').update(fs.readFileSync(fichier)).digest('hex') : null
}
function etat(racine) {
  return { head: texteGit(racine, ['rev-parse', 'HEAD']), statut: texteGit(racine, ['status', '--porcelain', '-uall']), index: empreinteIndex(racine) }
}
function identique(a, b) { return a.head === b.head && a.statut === b.statut && a.index === b.index }
function paris(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]))
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}${p.minute}` }
}
function nomsNuls(sortie) { return sortie.toString('utf8').split('\0').filter(Boolean) }
function nomEnv(chemin) { const n = path.posix.basename(chemin); return /^\.env(?:\..+)?$/.test(n) && n !== '.env.local.example' }
function lireProspects(vault) {
  if (!fs.existsSync(vault)) return { vault: 'absent', valeurs: [] }
  const valeurs = new Set()
  const ajouter = (valeur) => { const v = valeur.trim().toLocaleLowerCase(); if (v.length >= 4) valeurs.add(v) }
  for (const nom of ['Prospection/deja-contactes-email.txt', 'Prospection/deja-contactes-instagram.txt']) {
    const fichier = path.join(vault, nom)
    if (fs.existsSync(fichier)) fs.readFileSync(fichier, 'utf8').split(/\r?\n/).forEach(ajouter)
  }
  const csv = path.join(vault, 'Prospection/phase0/suivi.csv')
  if (fs.existsSync(csv)) {
    const lignes = fs.readFileSync(csv, 'utf8').split(/\r?\n/)
    const separateur = lignes[0]?.includes(';') ? ';' : ','
    const colonnes = (lignes.shift() || '').split(separateur).map((h, i) => /prospect/i.test(h) ? i : -1).filter((i) => i >= 0)
    for (const ligne of lignes) {
      const cellules = ligne.split(separateur)
      for (const i of colonnes) if (cellules[i]) ajouter(cellules[i].replace(/^"|"$/g, ''))
    }
  }
  return { vault: 'present', valeurs: [...valeurs] }
}
function motifExclusion(racine, chemin, prospects) {
  if (chemin.toLowerCase().endsWith('.exe')) return 'exe'
  if (nomEnv(chemin)) return 'env'
  const fichier = path.join(racine, chemin)
  if (!fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) return null
  const taille = fs.statSync(fichier).size
  if (taille > LIMITE) return 'taille'
  const contenu = fs.readFileSync(fichier)
  if (contenu.subarray(0, 8192).includes(0)) return null
  const texte = contenu.toString('utf8')
  const secret = chercherSecrets(texte)[0]
  if (secret) return secret
  const minuscule = texte.toLocaleLowerCase()
  if (prospects.some((valeur) => minuscule.includes(valeur))) return 'prospect'
  return null
}
function compteArbre(racine, arbre, env) {
  const sortie = git(racine, ['ls-tree', '-r', '-l', '-z', arbre], env, true)
  let fichiers = 0, octets = 0
  for (const ligne of nomsNuls(sortie)) {
    const m = /^[0-9]+ blob [0-9a-f]+\s+([0-9]+)\t/.exec(ligne)
    if (m) { fichiers++; octets += Number(m[1]) }
  }
  return { fichiers, octets }
}
function brancheDisponible(racine, depot, jour, heure) {
  const existe = (nom) => Boolean(texteGit(racine, ['ls-remote', '--heads', depot, `refs/heads/${nom}`]))
  const base = `instantane-${jour}`
  if (!existe(base)) return base
  const minutes = Number(heure.slice(0, 2)) * 60 + Number(heure.slice(2))
  for (let pas = 0; pas < 1440; pas++) {
    const n = (minutes + pas) % 1440
    const nom = `${base}-${String(Math.floor(n / 60)).padStart(2, '0')}${String(n % 60).padStart(2, '0')}`
    if (!existe(nom)) return nom
  }
  throw new Error('aucune branche disponible')
}

function executer(o) {
  const journal = { date: new Date().toISOString(), commit: null, branche: null, fichiers: 0, octets: 0, exclus: [], vault: 'absent', ok: false }
  let code = 1, erreur = null, avant = null
  const index = path.join(os.tmpdir(), `presti-quotidien-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.index`)
  const env = { GIT_INDEX_FILE: index }
  try {
    avant = etat(o.racine)
    const prospects = lireProspects(o.vault)
    journal.vault = prospects.vault
    git(o.racine, ['read-tree', 'HEAD'], env)
    git(o.racine, ['add', '-A', '--', '.', ':(exclude)*.exe'], env)
    const modifies = nomsNuls(git(o.racine, ['diff', '--cached', '--name-only', '-z', 'HEAD'], env, true))
    for (const chemin of modifies) {
      const motif = motifExclusion(o.racine, chemin, prospects.valeurs)
      if (!motif) continue
      git(o.racine, ['rm', '--cached', '-q', '--ignore-unmatch', '--', chemin], env)
      journal.exclus.push({ chemin, motif })
      console.log(`Exclu : ${chemin} (${motif})`)
    }
    const arbre = texteGit(o.racine, ['write-tree'], env)
    const commit = texteGit(o.racine, ['commit-tree', arbre, '-p', avant.head, '-m', `instantané quotidien ${journal.date}`], env)
    journal.commit = commit
    Object.assign(journal, compteArbre(o.racine, arbre, env))
    const ref = `refs/instantanes/quotidien-${journal.date.replace(/[-:.TZ]/g, '')}-${crypto.randomBytes(3).toString('hex')}`
    git(o.racine, ['update-ref', ref, commit], env)
    if (journal.exclus.length > 20) throw new Error('plus de 20 exclusions')
    if (o.pousser) {
      const { jour, heure } = paris()
      const branche = brancheDisponible(o.racine, o.depot, jour, heure)
      journal.branche = branche
      git(o.racine, ['push', o.depot, `${commit}:refs/heads/${branche}`])
      const distant = texteGit(o.racine, ['ls-remote', o.depot, `refs/heads/${branche}`]).split(/\s+/)[0]
      if (distant !== commit) throw new Error('relecture distante différente')
    }
    if (!identique(avant, etat(o.racine))) throw new Error('invariant local modifié')
    journal.ok = true
    code = journal.exclus.length ? 4 : 0
  } catch (e) { erreur = e }
  finally {
    try { fs.rmSync(index, { force: true }) } catch { erreur = new Error('index temporaire non supprimé') }
    try {
      if (avant && !identique(avant, etat(o.racine))) { erreur = new Error('invariant local modifié'); journal.ok = false }
    } catch { erreur = new Error('invariant local illisible'); journal.ok = false }
    if (erreur) { journal.ok = false; code = 1 }
    try {
      const fichier = path.join(o.racine, '.orchestre', 'travail', 'sauvegardes.jsonl')
      fs.mkdirSync(path.dirname(fichier), { recursive: true })
      fs.appendFileSync(fichier, JSON.stringify(journal) + '\n')
    } catch { erreur = new Error('journal impossible'); code = 1 }
  }
  if (code === 1) console.log(`ALERTE BENJ : instantané quotidien échoué (${erreur?.message === 'plus de 20 exclusions' ? 'plus de 20 exclusions' : 'vérifier le dépôt et le journal'}).`)
  else console.log(`Instantané ${journal.commit} ${journal.branche || 'local'} ; ${journal.exclus.length} exclusion(s).`)
  return code
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = executer(options(process.argv.slice(2))) }
  catch { console.log('Usage : node scripts/instantane-quotidien.mjs [--pousser | --sans-pousser] [--racine=<dépôt>] [--depot=<url ou chemin>] [--vault=<dossier>]'); process.exitCode = 2 }
}
