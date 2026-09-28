#!/usr/bin/env node
// Témoin de 026-121 : une implémentation de référence de scripts/chef/chantier.mjs (fiche 026-146), écrite par Claude
// Code pour prouver que scripts/chantier-qa.mjs passe sur un code conforme. Jamais déployée : le juge la copie dans une
// racine d'essai (scripts/chef/chantier.mjs), à côté du vrai scripts/chef/commun.mjs.
//
//   node scripts/chef/chantier.mjs idees --depuis=<ISO> [--base=…] [--sortie=<f>]
//   node scripts/chef/chantier.mjs verifier-fiche <fichier> [--racine=…]
//   node scripts/chef/chantier.mjs fusion-permise <base> <tete> [--racine=…]
//   node scripts/chef/chantier.mjs deposer <fichier> [--racine=…] [--base=…]
//
// Aucune commande git d'écriture : ce script lit un diff, rien d'autre.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { option, positionnels, lireJeton, baseSure, appeler, principal, Arret, RACINE as RACINE_SCRIPT } from './commun.mjs'

const ZONES = ['supabase/**', 'lib/plans.ts', 'lib/stripe*', 'app/api/stripe/**', 'proxy.ts', 'middleware.ts', 'lib/ai.ts',
  'lib/agents/llm.ts', 'app/api/agents/**', 'vercel.json', 'scripts/*-qa.mjs', 'scripts/juges/**', 'scripts/fixtures/**',
  '.claude/**', '.github/**']
const CLE_IDEE = /^chef:\d{4}-\d{2}-\d{2}:idee-[a-z0-9-]+$/
const CRITERE = /\b[A-Z]{2,5}-\d+\b/
const LIGNE_ECHEC = /(^|[^A-Za-z])(FAIL|ÉCHEC|ECHEC)([^A-Za-z]|$)|✗|not ok/i
const DOSSIERS = ['file', 'en-cours', 'fait', 'refuse']

const racine = () => path.resolve(typeof option('racine') === 'string' ? option('racine') : RACINE_SCRIPT)
const versSlash = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '')

// ── globs, comme orchestre.mjs : ** = tout, * = tout sauf « / » ──────────────────────────────────────────────────
function globVersRegex(motif) {
  const m = versSlash(motif)
  let re = ''
  for (let i = 0; i < m.length; i++) {
    const c = m[i]
    if (c === '*') {
      if (m[i + 1] === '*') { if (m[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 } } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}
const joker = (g) => /[*?{[]/.test(g)
const prefixe = (g) => versSlash(g).split(/[*?{[]/)[0]
// Deux motifs se touchent-ils ? Chemin littéral contre motif : le motif le couvre. Deux motifs : préfixes littéraux.
function touche(a, b) {
  a = versSlash(a); b = versSlash(b)
  if (!joker(a) && !joker(b)) return a === b || a.startsWith(b.endsWith('/') ? b : `${b}/`) || b.startsWith(a.endsWith('/') ? a : `${a}/`)
  if (!joker(a)) return globVersRegex(b).test(a)
  if (!joker(b)) return globVersRegex(a).test(b)
  const pa = prefixe(a), pb = prefixe(b)
  return pa.startsWith(pb) || pb.startsWith(pa)
}
const horsDepot = (p) => { const s = versSlash(p); return s.startsWith('../') || s.includes('/../') || s === '..' || path.isAbsolute(s) || /^[A-Za-z]:/.test(s) }

// ── en-tête d'une fiche (le même sous-ensemble YAML qu'orchestre.mjs) ─────────────────────────────────────────────
function valeur(brut) {
  const v = brut.trim()
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => x.trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean)
  if (/^\{.*\}$/.test(v)) return Object.fromEntries(v.slice(1, -1).split(',').map((p) => p.split(':').map((x) => x.trim())).filter((p) => p.length === 2).map(([k, x]) => [k, Number.isFinite(Number(x)) ? Number(x) : x]))
  return v.replace(/^(['"])(.*)\1$/, '$2')
}
function lireFiche(fichier) {
  const texte = fs.readFileSync(fichier, 'utf8')
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const entete = {}
  if (m) for (const l of m[1].split(/\r?\n/)) { const i = l.indexOf(':'); if (i > 0 && !/^\s/.test(l)) entete[l.slice(0, i).trim()] = valeur(l.slice(i + 1)) }
  return { texte, entete, corps: m ? texte.slice(m[0].length) : texte }
}
const cleDecision = (corps) => { const m = corps.match(/^\s*D[ée]cision\s*:\s*(\S+)\s*$/m); return m ? m[1] : null }
// Les scripts que lance `verifier` : l'argument qui suit chaque `node`.
const scriptsDuVerifier = (cmd) => [...String(cmd).matchAll(/(?:^|[;&|]\s*|\s)node\s+(?:--\S+\s+)*("[^"]+"|'[^']+'|\S+)/g)].map((m) => versSlash(m[1].replace(/^["']|["']$/g, '')))

function lancer(commande, cwd, minutes) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, { cwd, shell: true, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
    let sortie = ''
    enfant.stdout.on('data', (d) => { sortie += d })
    enfant.stderr.on('data', (d) => { sortie += d })
    const minuterie = setTimeout(() => {
      try {
        if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' })
        else process.kill(enfant.pid, 'SIGKILL')
      } catch { /* déjà mort */ }
    }, minutes * 60_000)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: code ?? 1, sortie }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}` }) })
  })
}

// ── verifier-fiche ────────────────────────────────────────────────────────────────────────────────────────────────
async function examiner(fichier, R) {
  const raisons = []
  const abs = path.resolve(fichier)
  if (!fs.existsSync(abs)) return { raisons: [`${fichier} introuvable`], fiche: null }
  const v = spawnSync(process.execPath, [path.join(R, 'scripts', 'orchestre.mjs'), 'valider', abs], { cwd: R, encoding: 'utf8' })
  if (v.status !== 0) raisons.push(`en-tête refusé par orchestre valider : ${String(v.stdout + v.stderr).trim().split(/\r?\n/).slice(-1)[0]}`)
  const fiche = lireFiche(abs)
  const e = fiche.entete
  const id = String(e.id ?? '')
  const perimetre = Array.isArray(e.perimetre) ? e.perimetre : []

  const cle = cleDecision(fiche.corps)
  if (!cle) raisons.push('aucune ligne « Décision : <clé> » sous le titre')
  else if (!CLE_IDEE.test(cle)) raisons.push(`clé de décision « ${cle} » : attendu chef:<AAAA-MM-JJ>:idee-…`)

  if (e.executant !== 'claude-code') {
    for (const p of perimetre) {
      if (horsDepot(p)) { raisons.push(`périmètre hors du dépôt (${p}) pour ${e.executant || 'un exécutant'}`); continue }
      const z = ZONES.find((zone) => touche(p, zone))
      if (z) raisons.push(`périmètre sur une zone protégée (${p} ↔ ${z}) pour ${e.executant || 'un exécutant'} : réservé à claude-code`)
    }
  }

  const scripts = scriptsDuVerifier(e.verifier)
  if (!scripts.length) raisons.push('verifier ne lance aucun script node')
  for (const s of scripts) {
    if (!fs.existsSync(path.join(R, s))) raisons.push(`le script de verifier ${s} n'existe pas`)
    const p = perimetre.find((x) => touche(s, x))
    if (p) raisons.push(`le script de verifier ${s} est dans le périmètre (${p}) : un juge n'est jamais écrit par son exécutant`)
  }

  if (id) for (const d of DOSSIERS) if (fs.existsSync(path.join(R, '.orchestre', d, `${id}.md`))) raisons.push(`l'id ${id} existe déjà dans .orchestre/${d}/`)

  // Le juge proposé doit échouer aujourd'hui, sur un critère identifié (revue du 24/09, B2) : lancé ici, sur l'arbre.
  if (!raisons.length) {
    const minutes = Math.max(1, Math.min(Number(e.budget?.minutes) || 5, 30))
    const r = await lancer(String(e.verifier), R, minutes)
    const lignes = r.sortie.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const echec = lignes.find((l) => LIGNE_ECHEC.test(l) && CRITERE.test(l))
    if (r.code === 0) raisons.push(`le juge proposé est vert avant la fabrication (code 0) : il ne prouve rien`)
    else if (!echec) raisons.push(`le juge proposé échoue (code ${r.code}) sans ligne en échec qui porte un identifiant de critère`)
    else fiche.echec = echec
  }
  return { raisons, fiche, id, cle }
}

async function verifierFiche() {
  const [, fichier] = positionnels()
  if (!fichier) throw new Arret(2, 'verifier-fiche <fichier>')
  const x = await examiner(fichier, racine())
  if (x.raisons.length) { for (const r of x.raisons) console.log(`✗ ${r}`); return 1 }
  console.log(`✓ ${x.id} recevable : juge rouge aujourd'hui (« ${x.fiche.echec.slice(0, 120)} »)`)
  return 0
}

// ── fusion-permise ────────────────────────────────────────────────────────────────────────────────────────────────
function fusionPermise() {
  const [, base, tete] = positionnels()
  if (!base || !tete) throw new Arret(2, 'fusion-permise <base> <tete>')
  const r = spawnSync('git', ['diff', '--name-status', '--no-renames', base, tete], { cwd: racine(), encoding: 'utf8' })
  if (r.status !== 0) { console.log(`✗ git diff illisible : ${String(r.stderr).trim()}`); return 1 }
  const refuses = []
  const lignes = r.stdout.split(/\r?\n/).filter(Boolean)
  for (const l of lignes) {
    const [statut, chemin] = l.split('\t')
    const p = versSlash(chemin)
    const permis = p.startsWith('docs/') || /^plans\/[^/]+\.md$/.test(p) || (statut === 'A' && /^scripts\/[^/]+-e2e\.mjs$/.test(p))
    if (!permis) refuses.push(`${statut} ${p}`)
  }
  if (refuses.length) { console.log(`✗ fusion refusée (Benj fusionne) : ${refuses.join(', ')}`); return 1 }
  console.log(`✓ fusion permise : ${lignes.length} fichier(s), textes et tests e2e nouveaux seulement`)
  return 0
}

// ── lecture des décisions tranchées ───────────────────────────────────────────────────────────────────────────────
async function decisionsTranchees(depuis) {
  const jeton = lireJeton()
  const base = baseSure(option('base'))
  const r = await appeler(base, jeton, 'GET', `/api/agents/decisions?tranchees=1&depuis=${encodeURIComponent(depuis)}`)
  if (r.statut !== 200) return { erreur: `HTTP ${r.statut || r.erreur || 'réseau'}` }
  const liste = Array.isArray(r.json) ? r.json : Array.isArray(r.json?.decisions) ? r.json.decisions : null
  return liste ? { liste } : { erreur: 'réponse illisible' }
}

async function idees() {
  const depuis = option('depuis')
  if (typeof depuis !== 'string' || !Number.isFinite(Date.parse(depuis))) throw new Arret(2, '--depuis=<date ISO> obligatoire')
  const d = await decisionsTranchees(depuis)
  if (d.erreur) { console.log(`✗ décisions tranchées illisibles (${d.erreur})`); return 1 }
  const garde = d.liste
    .filter((x) => x && typeof x.cle_idempotence === 'string' && CLE_IDEE.test(x.cle_idempotence) && x.choix === 'lancer')
    .map((x) => ({ id: x.id, cle_idempotence: x.cle_idempotence, tranchee_le: x.tranchee_le }))
  const texte = JSON.stringify(garde, null, 2) + '\n'
  const cible = option('sortie')
  if (typeof cible === 'string') fs.writeFileSync(path.resolve(cible), texte)
  else process.stdout.write(texte)
  console.error(`✓ ${garde.length} idée(s) tranchée(s) « lancer » sur ${d.liste.length} décision(s)`)
  return 0
}

// ── deposer ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function deposer() {
  const [, fichier] = positionnels()
  if (!fichier) throw new Arret(2, 'deposer <fichier>')
  const R = racine()
  const x = await examiner(fichier, R)
  if (x.raisons.length) { for (const r of x.raisons) console.log(`✗ ${r}`); return 1 }
  const depuis = new Date(Date.now() - 29 * 86_400_000).toISOString()
  const d = await decisionsTranchees(depuis)
  if (d.erreur) { console.log(`✗ décision illisible (${d.erreur}) : rien n'est déposé`); return 1 }
  const decision = d.liste.find((y) => y && y.cle_idempotence === x.cle)
  if (!decision) { console.log(`✗ la décision ${x.cle} n'est pas tranchée : rien n'est déposé`); return 1 }
  if (decision.choix !== 'lancer') { console.log(`✗ la décision ${x.cle} est tranchée « ${decision.choix} » : rien n'est déposé`); return 1 }
  const cible = path.join(R, '.orchestre', 'file', `${x.id}.md`)
  fs.mkdirSync(path.dirname(cible), { recursive: true })
  fs.copyFileSync(path.resolve(fichier), cible, fs.constants.COPYFILE_EXCL)
  console.log(`✓ ${x.id} déposée dans .orchestre/file/ (décision ${x.cle} tranchée « lancer »)`)
  return 0
}

principal(async () => {
  const [commande] = positionnels()
  if (commande === 'idees') return idees()
  if (commande === 'verifier-fiche') return verifierFiche()
  if (commande === 'fusion-permise') return fusionPermise()
  if (commande === 'deposer') return deposer()
  throw new Arret(2, 'commande : idees | verifier-fiche | fusion-permise | deposer')
})
