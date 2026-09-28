#!/usr/bin/env node
// bin/orchestre.mjs — le chef de gare « Claude Code pense, les exécutants produisent » (prompt v16 §1).
//
// Pas de serveur, pas de base : des fichiers. Une tâche est un Markdown à en-tête YAML déposé dans
// .orchestre/file/ ; un exécutant la prend avec `prochaine`, travaille dans son périmètre, dépose sa
// preuve, la passe en fait/ et appelle `verifier` : la commande `verifier` de la tâche est EXÉCUTÉE ICI
// et son code de sortie fait le verdict. Personne ne relit un diff — on lit .orchestre/digest.md.
//
// Ce fichier est vendorisé : `init` le copie dans <projet>/scripts/orchestre.mjs (une copie, pas un lien
// symbolique : Windows) ; `maj` le recopie depuis le dépôt `orchestre` (clé `source` de la configuration).
// La RACINE d'un projet est le dossier qui contient .orchestre/, trouvé en remontant depuis le cwd —
// jamais « le dossier du script, un cran au-dessus ». Tout ce qui est propre au projet (description, pile,
// vault, globs de la carte, juges, exécutants) vit dans .orchestre/orchestre.json.
//
// Usage :
//   node scripts/orchestre.mjs init [dossier] [--projet=nom] [--pile=…] [--vault=chemin] [--description=…]
//                                                         installe l'orchestre dans un projet (config, bin, hooks, gabarits)
//   node scripts/orchestre.mjs maj                        recopie bin, bin/lib et hooks depuis `source`
//   node scripts/orchestre.mjs prochaine --agent=<nom> [--tache=<id>]
//                                                         prend la prochaine tâche dont le périmètre ne chevauche rien
//   node scripts/orchestre.mjs verifier <id>              exécute la commande `verifier` de la tâche → PASS/FAIL dans digest.md
//   node scripts/orchestre.mjs digest                     régénère .orchestre/digest.md
//   node scripts/orchestre.mjs contexte [--silencieux]    régénère contexte.md depuis le code (+ carte du vault si configuré,
//                                                         + le bloc « Méthode » de CLAUDE.md et AGENTS.md)
//   node scripts/orchestre.mjs budget [--tous] [--transcripts=<dossier>]  jetons lus/produits par Claude Code (transcripts), en tête de digest.md
//   node scripts/orchestre.mjs valider <fichier.md>       contrôle l'en-tête d'une tâche avant de la déposer
//   node scripts/orchestre.mjs repondre <id> <n> [ligne]  répond à en-cours/<id>.question.md
//   node scripts/orchestre.mjs liberer <id>               l'exécutant abandonne : retour en file/, verrou levé
//   node scripts/orchestre.mjs rejouer <id>               une tâche refusée retourne en file/
//
// Périmètres : chemins relatifs à la racine du projet ; un chemin qui commence par `<nom du vault>/` vise le
// vault configuré. Le chevauchement est jugé sur la partie littérale avant le premier joker — volontairement
// large : deux agents sur les mêmes fichiers, c'est du travail perdu.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, execFileSync } from 'node:child_process'
import { fichiersVides } from './lib/preuves.mjs'

// ── constantes indépendantes du projet ────────────────────────────────────────────────────────────
const CE_FICHIER = fileURLToPath(import.meta.url)
const CMD = 'node scripts/orchestre.mjs' // la commande telle que le projet la tape (copie vendorisée)
const D = { file: 'file', enCours: 'en-cours', fait: 'fait', refuse: 'refuse', preuves: 'preuves' }
const TYPES = ['feature', 'test', 'contenu', 'audit', 'boucle-qa']
const CHAMPS = ['id', 'type', 'objectif', 'perimetre', 'interdit', 'verifier', 'budget', 'preuve']
const MAX_LIGNES_DIGEST = 100
const SEUIL_PART_LUE = 60 // au-delà de ce pourcentage, Claude Code lit trop au lieu de faire lire
const DEFAUTS = {
  projet: null, description: '', pile: '', source: null, vault: null, carteVault: 'Produit/Carte-du-code.md',
  carte: {}, juges: {}, executants: ['antigravity', 'codex', 'claude-code'], maxMinutes: 30,
  lectureLibre: ['.orchestre/**', 'plans/**'], methodeSupplement: [],
}

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const echapper = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
const nombre = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const versSlash = (p) => p.split(path.sep).join('/')
const taches = (dossier) => existe(dossier)
  ? fs.readdirSync(dossier).filter((f) => f.endsWith('.md') && !f.endsWith('.question.md') && !f.endsWith('.reponse.md')).sort()
  : []
function trouverRacine(depart) {
  let d = path.resolve(depart)
  for (;;) {
    if (existe(path.join(d, '.orchestre')) && fs.statSync(path.join(d, '.orchestre')).isDirectory()) return d
    const parent = path.dirname(d)
    if (parent === d) return null
    d = parent
  }
}
// Le dépôt `orchestre` lui-même, quand ce fichier tourne depuis bin/ (et non depuis la copie vendorisée).
const DEPOT_OUTIL = (() => {
  const d = path.dirname(CE_FICHIER)
  return path.basename(d) === 'bin' && existe(path.join(d, '..', 'gabarits')) ? path.resolve(d, '..') : null
})()

// ── l'état du projet : RACINE, configuration, chemins — posés par `ouvrir()` ───────────────────────
let RACINE = null, ORCH = null, CONFIG = null, VAULT = null, CARTE_VAULT = null
let VERDICTS = null, DIGEST = null, CONTEXTE = null
const rel = (p) => versSlash(path.relative(RACINE, p))
function lireConfig(racine) {
  const fichier = path.join(racine, '.orchestre', 'orchestre.json')
  let brut = {}
  if (existe(fichier)) {
    try { brut = JSON.parse(lire(fichier)) } catch (e) { console.error(`✗ ${versSlash(path.relative(racine, fichier))} illisible : ${e.message}`); process.exit(1) }
  }
  const c = { ...DEFAUTS, ...brut }
  c.projet = c.projet || path.basename(racine)
  c.carte = c.carte && typeof c.carte === 'object' ? c.carte : {}
  c.juges = c.juges && typeof c.juges === 'object' ? c.juges : {}
  c.executants = Array.isArray(c.executants) && c.executants.length ? c.executants : DEFAUTS.executants
  c.maxMinutes = Number(c.maxMinutes) > 0 ? Number(c.maxMinutes) : DEFAUTS.maxMinutes
  c.methodeSupplement = Array.isArray(c.methodeSupplement) ? c.methodeSupplement.filter((s) => typeof s === 'string' && s.trim()) : []
  return c
}
function ouvrir(racine) {
  RACINE = racine
  ORCH = path.join(RACINE, '.orchestre')
  CONFIG = lireConfig(RACINE)
  VAULT = CONFIG.vault ? path.resolve(RACINE, CONFIG.vault) : null
  CARTE_VAULT = VAULT && CONFIG.carteVault ? path.join(VAULT, CONFIG.carteVault) : null
  VERDICTS = path.join(ORCH, 'verdicts.jsonl')
  DIGEST = path.join(ORCH, 'digest.md')
  CONTEXTE = path.join(ORCH, 'contexte.md')
}
const preparer = () => { for (const d of Object.values(D)) fs.mkdirSync(path.join(ORCH, d), { recursive: true }) }
const git = (args) => { try { return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } }
const prefixeVault = () => (VAULT ? `${path.basename(VAULT)}/` : null)

// ── globs maison : ** = tout, y compris les « / » ; * = tout sauf « / » ; ? = un caractère ───────────
function globVersRegex(motif) {
  const m = motif.replace(/\\/g, '/').replace(/^\.\//, '')
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
const prefixeLitteral = (motif) => String(motif).replace(/\\/g, '/').replace(/^\.\//, '').split(/[*?{[]/)[0]
function marcher(dossier, garder) {
  const out = []
  const rec = (d) => {
    if (!existe(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) rec(p) } else if (garder(p)) out.push(p)
    }
  }
  rec(dossier)
  return out.sort()
}
/** Les fichiers de RACINE qui répondent au motif (relatif à la racine). */
function glober(motif) {
  const lit = prefixeLitteral(motif)
  const base = lit.endsWith('/') ? lit : path.posix.dirname(lit)
  const re = globVersRegex(motif)
  return marcher(path.join(RACINE, base), (p) => re.test(rel(p)))
}

// ── L'en-tête YAML : un sous-ensemble volontairement petit (une ligne par champ) ──────────────────
const sansGuillemets = (v) => (/^'.*'$/.test(v) || /^".*"$/.test(v)) && v.length >= 2 ? v.slice(1, -1) : v
function valeurYaml(brut) {
  const v = brut.trim()
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => sansGuillemets(x.trim())).filter(Boolean)
  if (/^\{.*\}$/.test(v)) {
    const o = {}
    for (const part of v.slice(1, -1).split(',')) {
      const i = part.indexOf(':')
      if (i > 0) o[part.slice(0, i).trim()] = valeurYaml(part.slice(i + 1))
    }
    return o
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if (v === 'true' || v === 'false') return v === 'true'
  return sansGuillemets(v) // un guillemet n'est retiré que par paire : `node -e "…"` garde le sien
}
function lireTache(fichier) {
  const texte = lire(fichier)
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { fichier, entete: null, corps: texte, erreurs: ['pas d’en-tête YAML (--- … ---) en tête de fichier'] }
  const entete = {}
  for (const ligne of m[1].split(/\r?\n/)) {
    const sansCommentaire = ligne.replace(/\s+#.*$/, '')
    const i = sansCommentaire.indexOf(':')
    if (i < 1 || /^\s/.test(sansCommentaire) || sansCommentaire.startsWith('#')) continue
    entete[sansCommentaire.slice(0, i).trim()] = valeurYaml(sansCommentaire.slice(i + 1))
  }
  const erreurs = []
  for (const c of CHAMPS) {
    const v = entete[c]
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) erreurs.push(`champ obligatoire absent ou vide : ${c}`)
  }
  if (entete.id !== undefined && !/^\d{3}-[\w-]+$/.test(String(entete.id))) erreurs.push(`id « ${entete.id} » : attendu NNN-slug (ex. 014-03)`)
  if (entete.type !== undefined && !TYPES.includes(entete.type)) erreurs.push(`type « ${entete.type} » : attendu ${TYPES.join(' | ')}`)
  if (entete.perimetre !== undefined && !Array.isArray(entete.perimetre)) erreurs.push('perimetre : attendu une liste [a, b]')
  if (entete.interdit !== undefined && !Array.isArray(entete.interdit)) erreurs.push('interdit : attendu une liste [a, b]')
  const b = entete.budget
  if (b !== undefined && (typeof b !== 'object' || typeof b.fichiers !== 'number' || typeof b.minutes !== 'number')) erreurs.push('budget : attendu { fichiers: N, minutes: N }')
  if (entete.executant !== undefined && !CONFIG.executants.includes(entete.executant)) erreurs.push(`executant « ${entete.executant} » : attendu ${CONFIG.executants.join(' | ')}`)
  return { fichier, entete, corps: texte.slice(m[0].length).trim(), erreurs }
}

// ── Chevauchement de périmètres : la partie littérale avant le premier joker ──────────────────────
const prefixe = (g) => String(g).replace(/\\/g, '/').split(/[*?{]/)[0]
const chevauche = (a, b) => { const pa = prefixe(a), pb = prefixe(b); return pa.startsWith(pb) || pb.startsWith(pa) }
function conflit(t, enCours) {
  for (const autre of enCours) for (const p of t.entete.perimetre) for (const q of autre.entete.perimetre) {
    if (chevauche(p, q)) return `${autre.entete.id} (${q} ↔ ${p})`
  }
  return null
}

const cheminLock = (id) => path.join(ORCH, D.enCours, `${id}.lock`)
function lireLock(id) {
  const o = {}
  if (existe(cheminLock(id))) for (const l of lire(cheminLock(id)).split(/\r?\n/)) { const i = l.indexOf(':'); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim() }
  return o
}
function trouver(id, dossiers = [D.enCours, D.fait, D.refuse, D.file]) {
  for (const d of dossiers) {
    const liste = taches(path.join(ORCH, d))
    const f = liste.find((x) => x === `${id}.md`) || liste.find((x) => x.startsWith(`${id}-`) || x.startsWith(`${id}.`))
    if (f) return { dossier: d, fichier: path.join(ORCH, d, f) }
  }
  return null
}

const PIED_DE_TACHE = (id) => `Quand tu as fini :
1. Dépose ta preuve dans .orchestre/preuves/${id}/ (la sortie de la commande \`verifier\`). Les captures d'écran, c'est le JUGE qui les prend quand le vérificateur le prévoit : ne dépose jamais une image que tu n'as pas vue s'afficher — un fichier fabriqué ou de 0 octet est un refus.
2. Tant que la tâche est en en-cours/, lance \`${CMD} verifier ${id}\` autant de fois que nécessaire.
3. Quand c'est vert : déplace le fichier de en-cours/ vers fait/, puis relance \`${CMD} verifier ${id}\` — c'est ce verdict-là qui compte.
Bloqué ? Écris .orchestre/en-cours/${id}.question.md avec deux ou trois options numérotées, puis attends ${id}.reponse.md. Jamais un paragraphe. Un choix courant est déjà tranché dans .orchestre/decisions.md : applique le défaut.
Ne touche à rien hors \`perimetre\`. \`interdit\` est interdit même pour aider. Zéro donnée réelle. Identifiants en français.
Le dépôt porte d'autres chantiers non committés : ils ne sont PAS à toi. INTERDIT, sans exception : \`git restore\`, \`git checkout <fichier>\`, \`git stash\`, \`git reset\`, \`git clean\`, \`git revert\`, et supprimer ou vider un fichier hors périmètre (\`del\`, \`remove-item\`, \`rm\`). Le 13/09, un agent a « nettoyé » ainsi trois jours de travail de trois sessions : perte sèche. Si le vérificateur te reproche un fichier que tu n'as pas touché, écris \`.orchestre/en-cours/<id>.question.md\` et attends — n'y touche pas.`

// ── prochaine ─────────────────────────────────────────────────────────────────────────────────────
function prochaine(agent, tacheVoulue = null) {
  preparer()
  // Un agent, une tâche : le registre du pilote (agents.jsonl) dit laquelle. Un agent inscrit n'en reçoit pas d'autre
  // dans la même conversation — le 13/09, un agent a « pris 014-01 dans la foulée » de 014-12 et l'a rendue avec quatre
  // captures identiques ; un autre a ignoré son --tache et pris la première de la file.
  const REGISTRE = path.join(ORCH, 'agents.jsonl')
  const inscrit = existe(REGISTRE) ? lire(REGISTRE).split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((a) => a && a.agent === agent).at(-1) : null
  if (inscrit?.tache) {
    if (tacheVoulue && tacheVoulue !== inscrit.tache) { console.log(`✗ ${agent} est inscrit sur ${inscrit.tache} : un agent, une tâche. ${tacheVoulue} attendra une autre conversation.`); process.exit(2) }
    tacheVoulue = inscrit.tache
    if (!existe(path.join(ORCH, D.file, `${tacheVoulue}.md`))) { console.log(`✗ ${tacheVoulue} n'est plus dans file/ (prise, faite ou refusée) : ${agent} a terminé — rien d'autre dans cette conversation.`); process.exit(2) }
  }
  const enCours = taches(path.join(ORCH, D.enCours)).map((f) => lireTache(path.join(ORCH, D.enCours, f))).filter((t) => t.entete)
  const ignorees = []
  // `--tache=<id>` : le pilote attribue une tâche précise à un agent ; sans lui, la première compatible.
  const candidates = taches(path.join(ORCH, D.file)).filter((f) => !tacheVoulue || f === `${tacheVoulue}.md` || f.startsWith(`${tacheVoulue}-`))
  if (tacheVoulue && !candidates.length) { console.log(`Aucune tâche ${tacheVoulue} dans file/ (déjà prise, faite ou inexistante).`); process.exit(2) }
  for (const f of candidates) {
    const t = lireTache(path.join(ORCH, D.file, f))
    if (t.erreurs.length) {
      const dest = path.join(ORCH, D.refuse, f)
      fs.renameSync(t.fichier, dest)
      fs.appendFileSync(VERDICTS, JSON.stringify({ id: t.entete?.id || f.replace(/\.md$/, ''), verdict: 'REFUSÉE', ligne: `en-tête : ${t.erreurs[0]}`, code: null, date: maintenant(), duree_s: 0, agent, executant: t.entete?.executant || CONFIG.executants[0], lignes: 0, dossier: D.refuse }) + '\n')
      ignorees.push(`${f} : en-tête refusé → refuse/ (${t.erreurs[0]})`)
      continue
    }
    if (t.entete.executant === 'claude-code' && agent !== 'claude-code') { ignorees.push(`${t.entete.id} : réservée à claude-code`); continue }
    const c = conflit(t, enCours)
    if (c) { ignorees.push(`${t.entete.id} : chevauche ${c}`); continue }
    const dest = path.join(ORCH, D.enCours, f)
    fs.renameSync(t.fichier, dest)
    ecrire(cheminLock(t.entete.id), `agent: ${agent}\ndepuis: ${maintenant()}\nsha: ${git(['rev-parse', 'HEAD']) || '(hors git)'}\n`)
    // L'état de l'arbre à la prise : un vérificateur ne reproche à la tâche que ce qui a changé DEPUIS — le dépôt
    // porte souvent d'autres chantiers non committés, qui ne sont pas de son fait.
    const avant = `${git(['status', '--porcelain'])}\n`
    ecrire(path.join(ORCH, D.enCours, `${t.entete.id}.avant.txt`), avant)
    // La copie dans preuves/ survit au déplacement de la tâche (fait/, refuse/) : un verdict rejoué plus tard compare au même « avant ».
    fs.mkdirSync(path.join(ORCH, D.preuves, t.entete.id), { recursive: true })
    ecrire(path.join(ORCH, D.preuves, t.entete.id, 'avant.txt'), avant)
    digest()
    console.log(`# Tâche ${t.entete.id} prise par ${agent} — ${rel(dest)}\n`)
    console.log(lire(dest).trim())
    console.log(`\n---\n${PIED_DE_TACHE(t.entete.id)}`)
    return
  }
  digest()
  console.log(`Aucune tâche disponible pour ${agent}.${ignorees.length ? '\n  ' + ignorees.join('\n  ') : ''}`)
  process.exit(2)
}

// ── verifier : la commande de la tâche est exécutée ici, son code de sortie fait le verdict ───────
function executer(commande, minutes) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, { cwd: RACINE, shell: true, windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } })
    let sortie = ''
    let expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d })
    enfant.stderr.on('data', (d) => { sortie += d })
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, minutes * 60_000)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 1), sortie, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, expire }) })
  })
}
// spawnSync `timeout` tue le shell, pas ses enfants (vu avec ffmpeg et le juge vidéo) : on tue l'arbre.
function tuerArbre(pid) {
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* déjà mort */ }
}
function compterLignes(perimetre, sha) {
  if (!sha || sha.startsWith('(')) return 0
  const pv = prefixeVault()
  const chemins = perimetre.map(prefixe).filter((p) => p && !(pv && p.startsWith(pv)) && !p.startsWith('../'))
  if (!chemins.length) return 0
  let total = 0
  for (const l of git(['diff', '--numstat', sha, '--', ...chemins]).split('\n')) {
    const m = l.match(/^(\d+)\t(\d+)\t/)
    if (m) total += Number(m[1]) + Number(m[2])
  }
  for (const f of git(['ls-files', '--others', '--exclude-standard', '--', ...chemins]).split('\n').filter(Boolean)) {
    try { total += lire(path.join(RACINE, f)).split('\n').length } catch { /* binaire ou disparu */ }
  }
  return total
}
async function verifier(id) {
  preparer()
  const ou = trouver(id, [D.fait, D.enCours])
  if (!ou) { console.error(`✗ ${id} : ni dans fait/ ni dans en-cours/`); process.exit(3) }
  const t = lireTache(ou.fichier)
  if (t.erreurs.length) { console.error(`✗ ${id} : en-tête invalide — ${t.erreurs.join(' ; ')}`); process.exit(3) }
  const minutes = Math.min(Number(t.entete.budget.minutes) || CONFIG.maxMinutes, CONFIG.maxMinutes)
  const debut = Date.now()
  const r = await executer(t.entete.verifier, minutes)
  const duree = Math.round((Date.now() - debut) / 1000)
  const sortie = r.sortie.replace(/\x1b\[[0-9;]*m/g, '')
  const journal = path.join(ORCH, D.preuves, id, 'verifier.log')
  ecrire(journal, `$ ${t.entete.verifier}\n# ${maintenant()} · code ${r.code} · ${duree}s\n\n${sortie}`)
  const lignes = sortie.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  // Une preuve de 0 octet est un mensonge, pas une preuve (quatre « captures » vides livrées le 13/09) : refus, même si la
  // commande est verte. Le vérificateur d'une tâche ne peut pas être plus indulgent que le chef de gare.
  const vides = fichiersVides(path.join(ORCH, D.preuves, id)).map((v) => path.basename(v))
  const verdict = r.code === 0 && !vides.length ? 'PASS' : 'FAIL'
  const ligne = verdict === 'PASS' ? '' : vides.length ? `preuve vide : ${vides.slice(0, 4).join(', ')}` : (r.expire
    ? `délai dépassé (${minutes} min)`
    : (lignes.find((l) => /ÉCHEC|ECHEC|FAIL|✗|Error|Erreur|not ok|AssertionError/i.test(l)) || lignes.at(-1) || `code ${r.code}`)).slice(0, 160)
  const lock = lireLock(id)
  const production = compterLignes(t.entete.perimetre, lock.sha)
  fs.appendFileSync(VERDICTS, JSON.stringify({ id, verdict, ligne, code: r.code, date: maintenant(), duree_s: duree, agent: lock.agent || '?', executant: t.entete.executant || CONFIG.executants[0], lignes: production, dossier: ou.dossier }) + '\n')
  if (ou.dossier === D.fait) {
    if (verdict === 'FAIL') fs.renameSync(ou.fichier, path.join(ORCH, D.refuse, path.basename(ou.fichier)))
    for (const suffixe of ['.lock', '.avant.txt', '.question.md', '.reponse.md']) { const q = path.join(ORCH, D.enCours, id + suffixe); if (existe(q)) fs.unlinkSync(q) }
  }
  digest()
  if (verdict === 'PASS') { try { contexte(true) } catch (e) { console.error(`  (contexte non régénéré : ${e.message})`) } }
  console.log(`${verdict === 'PASS' ? '✓' : '✗'} ${id} : ${verdict}${ligne ? ' — ' + ligne : ''} · ${duree}s · ${production} ligne(s) produite(s) · preuve : ${rel(journal)}`)
  if (verdict === 'PASS') console.log('→ bloc terminé : /compact conseillé (et /clear entre deux chantiers)')
  process.exit(verdict === 'PASS' ? 0 : 1)
}

// ── digest : le seul fichier qu'on lit ────────────────────────────────────────────────────────────
const DEBUT_BUDGET = '<!-- budget:debut -->'
const FIN_BUDGET = '<!-- budget:fin -->'
function blocBudgetExistant() {
  if (!existe(DIGEST)) return ''
  const s = lire(DIGEST)
  const i = s.indexOf(DEBUT_BUDGET), j = s.indexOf(FIN_BUDGET)
  return i >= 0 && j > i ? s.slice(i, j + FIN_BUDGET.length) : ''
}
function derniersVerdicts() {
  const m = new Map()
  if (existe(VERDICTS)) for (const l of lire(VERDICTS).split('\n').filter(Boolean)) { try { const v = JSON.parse(l); m.set(v.id, v) } catch { /* ligne abîmée */ } }
  return m
}
function digest() {
  preparer()
  const verdicts = derniersVerdicts()
  const tout = []
  for (const d of [D.enCours, D.file, D.fait, D.refuse]) for (const f of taches(path.join(ORCH, d))) {
    const t = lireTache(path.join(ORCH, d, f))
    const id = t.entete?.id || f.replace(/\.md$/, '')
    tout.push({ dossier: d, id, t, verdict: verdicts.get(id), lock: d === D.enCours ? lireLock(id) : {} })
  }
  const dossierEnCours = path.join(ORCH, D.enCours)
  const questions = fs.readdirSync(dossierEnCours).filter((f) => f.endsWith('.question.md') && !existe(path.join(dossierEnCours, f.replace(/\.question\.md$/, '.reponse.md'))))
  // La mesure oppose ce que Claude Code a fait lui-même à ce qu'il a délégué (tous les autres exécutants).
  const mesure = { deleguees: { taches: 0, lignes: 0 }, 'claude-code': { taches: 0, lignes: 0 } }
  for (const v of verdicts.values()) if (v.verdict === 'PASS') { const e = v.executant === 'claude-code' ? mesure['claude-code'] : mesure.deleguees; e.taches++; e.lignes += v.lignes || 0 }
  const n = Object.fromEntries(Object.values(D).map((d) => [d, tout.filter((x) => x.dossier === d).length]))
  const alerte = mesure['claude-code'].lignes > mesure.deleguees.lignes && mesure['claude-code'].lignes > 0
    ? ' ⚠ Claude Code produit plus de lignes que les exécutants : le système est mal utilisé (§1.0).' : ''
  const budget = blocBudgetExistant()
  const L = [
    ...(budget ? [budget, ''] : []),
    `# Digest — ${maintenant()}`, '',
    `> Généré par \`${CMD} digest\`. Une ligne par tâche, ${MAX_LIGNES_DIGEST} au plus. C'est le seul fichier à lire pour savoir où en est le chantier.`, '',
    `**Mesure** — déléguées (${CONFIG.executants.filter((e) => e !== 'claude-code').join(', ')}) : ${mesure.deleguees.taches} tâche(s) PASS, ${mesure.deleguees.lignes} ligne(s) · faites par Claude Code : ${mesure['claude-code'].taches} tâche(s) PASS, ${mesure['claude-code'].lignes} ligne(s).${alerte}`,
    `**État** — file : ${n.file} · en cours : ${n['en-cours']} · faites : ${n.fait} · refusées : ${n.refuse}`,
  ]
  if (questions.length) {
    L.push('', `## ⚠ ${questions.length} question(s) en attente`)
    for (const q of questions) L.push(`- \`${rel(path.join(dossierEnCours, q))}\` → \`${CMD} repondre ${q.replace(/\.question\.md$/, '')} <n>\``)
  }
  const ordre = { [D.enCours]: 0, [D.file]: 1, [D.fait]: 2, [D.refuse]: 2 }
  tout.sort((a, b) => (ordre[a.dossier] - ordre[b.dossier]) || ((b.verdict?.date || '').localeCompare(a.verdict?.date || '')) || a.id.localeCompare(b.id))
  L.push('', '| id | type | où | exécutant | verdict | détail |', '|---|---|---|---|---|---|')
  for (const x of tout.slice(0, MAX_LIGNES_DIGEST)) {
    const e = x.t.entete || {}
    const executant = x.dossier === D.enCours ? (x.lock.agent || '?') : (x.verdict?.agent && x.verdict.agent !== '?' ? x.verdict.agent : (e.executant || CONFIG.executants[0]))
    const verdict = (x.dossier === D.fait || x.dossier === D.refuse) && x.verdict ? x.verdict.verdict : '—'
    const detail = x.dossier === D.enCours ? `depuis ${x.lock.depuis || '?'} · ${e.objectif || ''}`
      : x.dossier === D.file ? (e.objectif || '(en-tête invalide)')
      : x.verdict ? (x.verdict.verdict === 'PASS' ? `${x.verdict.date} · ${x.verdict.duree_s}s · ${x.verdict.lignes} l.` : x.verdict.ligne) : 'sans verdict'
    L.push(`| ${x.id} | ${e.type || '?'} | ${x.dossier} | ${executant} | ${verdict} | ${echapper(detail)} |`)
  }
  if (tout.length > MAX_LIGNES_DIGEST) L.push('', `… ${tout.length - MAX_LIGNES_DIGEST} tâche(s) de plus : voir \`.orchestre/verdicts.jsonl\`.`)
  ecrire(DIGEST, L.join('\n') + '\n')
}

// ── budget : ce que Claude Code lit et produit, d'après ses transcripts ───────────────────────────
// Les transcripts vivent dans ~/.claude/projects/<slug>/ (slug = chemin absolu de la racine, tout caractère hors
// [A-Za-z0-9] remplacé par « - »). Une ligne JSON par événement ; seules celles dont message.role === 'assistant'
// et qui portent message.usage comptent. Aucun prix : on ne connaît pas le tarif, on ne l'invente pas.
const slugDe = (p) => path.resolve(p).replace(/[^A-Za-z0-9]/g, '-')
const DOSSIER_PROJETS_DEFAUT = path.join(os.homedir(), '.claude', 'projects')
function transcripts(dossier) {
  const out = []
  const rec = (d) => {
    if (!existe(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) rec(p)
      else if (e.name.endsWith('.jsonl')) { try { out.push({ fichier: p, mtime: fs.statSync(p).mtimeMs }) } catch { /* disparu */ } }
    }
  }
  rec(dossier)
  return out
}
function lireUsage(fichier) {
  const out = []
  let texte = ''
  try { texte = lire(fichier) } catch { return out }
  for (const l of texte.split('\n')) {
    if (!l.includes('"usage"') || !l.includes('"assistant"')) continue
    let v
    try { v = JSON.parse(l) } catch { continue }
    const m = v && v.message
    if (!m || m.role !== 'assistant' || !m.usage || typeof m.usage !== 'object') continue
    const u = m.usage
    out.push({
      date: typeof v.timestamp === 'string' ? Date.parse(v.timestamp) : NaN,
      entree: Number(u.input_tokens) || 0, creation: Number(u.cache_creation_input_tokens) || 0,
      lecture: Number(u.cache_read_input_tokens) || 0, sortie: Number(u.output_tokens) || 0,
    })
  }
  return out
}
function sommer(messages) {
  const s = { messages: 0, entree: 0, creation: 0, lecture: 0, sortie: 0 }
  for (const m of messages) { s.messages++; s.entree += m.entree; s.creation += m.creation; s.lecture += m.lecture; s.sortie += m.sortie }
  s.lu = s.entree + s.creation + s.lecture
  // La part lue ne compte que ce qui est NOUVEAU dans le contexte (entrée + création de cache) face à ce qui est produit.
  // La relecture du cache est la conversation elle-même, relue à chaque tour : la compter donnait 100 % en permanence
  // (constaté sur Presti le 14/09 : 4,6 milliards relus pour 15,7 millions produits) — une alerte toujours rouge n'alerte plus.
  s.nouveau = s.entree + s.creation
  s.partLue = s.nouveau + s.sortie > 0 ? Math.round(100 * s.nouveau / (s.nouveau + s.sortie)) : 0
  return s
}
const decrire = (s) => s.messages ? `lu (nouveau) ${nombre(s.nouveau)} · relu depuis le cache ${nombre(s.lecture)} · produit ${nombre(s.sortie)} · part lue ${s.partLue} % · ${nombre(s.messages)} réponse(s)` : 'aucune donnée'
// `--transcripts=<dossier>` remplace ~/.claude/projects (utile pour tester sans y écrire) ; si <dossier>/<slug> n'existe pas,
// le dossier passé est lu tel quel.
function budget(tous = false, dossierProjets = DOSSIER_PROJETS_DEFAUT) {
  const avecSlug = tous ? null : path.join(dossierProjets, slugDe(RACINE))
  const dossiers = tous
    ? (existe(dossierProjets) ? fs.readdirSync(dossierProjets, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(dossierProjets, e.name)) : [])
    : [dossierProjets !== DOSSIER_PROJETS_DEFAUT && !existe(avecSlug) ? dossierProjets : avecSlug]
  const fichiers = dossiers.flatMap(transcripts)
  const etiquette = tous ? 'tous les projets' : `projet ${CONFIG.projet}`
  let bloc
  if (!fichiers.length) {
    bloc = `${DEBUT_BUDGET}\n**Budget jetons** (${etiquette}, ${maintenant()}) — aucune donnée : pas de transcript dans ${versSlash(dossiers[0] || dossierProjets)}.\n${FIN_BUDGET}`
    console.log(`aucune donnée : pas de transcript Claude Code dans ${versSlash(dossiers[0] || dossierProjets)}`)
  } else {
    // La session courante : le .jsonl de premier niveau modifié le plus récemment, avec les sous-agents qu'il a lancés
    // (rangés dans <session>/subagents/). Les jsonl de sous-agents seuls ne sont pas une session.
    const premierNiveau = fichiers.filter((f) => dossiers.some((d) => path.dirname(f.fichier) === d))
    const session = (premierNiveau.length ? premierNiveau : fichiers).reduce((a, b) => (b.mtime > a.mtime ? b : a))
    const idSession = path.basename(session.fichier, '.jsonl')
    const dossierSession = path.join(path.dirname(session.fichier), idSession)
    const deSession = (f) => f.fichier === session.fichier || f.fichier.startsWith(dossierSession + path.sep)
    const tout = fichiers.map((f) => ({ f, messages: lireUsage(f.fichier) }))
    const now = Date.now()
    const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0)
    const sSession = sommer(tout.filter((x) => deSession(x.f)).flatMap((x) => x.messages))
    const sJour = sommer(tout.flatMap((x) => x.messages).filter((m) => m.date >= debutJour.getTime()))
    const sSemaine = sommer(tout.flatMap((x) => x.messages).filter((m) => m.date >= now - 7 * 86_400_000))
    const reference = sSession.messages ? sSession : sJour.messages ? sJour : sSemaine
    const alerte = reference.partLue > SEUIL_PART_LUE
    const tete = `${alerte ? `🔴 Claude Code lit trop au lieu de faire lire (part lue ${reference.partLue} % > ${SEUIL_PART_LUE} %) — ` : ''}**Budget jetons** (${etiquette}, ${maintenant()}, \`${CMD} budget${tous ? ' --tous' : ''}\`)`
    bloc = [
      DEBUT_BUDGET, tete,
      `- session courante (\`${idSession}\`) : ${decrire(sSession)}`,
      `- aujourd'hui : ${decrire(sJour)}`,
      `- sept derniers jours : ${decrire(sSemaine)}`,
      '- part lue = (entrée + création de cache) / (entrée + création de cache + produit) : ce qui entre de neuf dans le contexte (fichiers, sorties d’outils) face à ce que Claude Code écrit ; la relecture du cache (la conversation relue à chaque tour) est montrée à part — elle baisse avec /compact et /clear. Pas de prix : le tarif n’est pas connu.',
      FIN_BUDGET,
    ].join('\n')
    console.log(bloc.split('\n').slice(1, -1).join('\n'))
  }
  if (!RACINE) return
  // Le bloc va EN TÊTE de digest.md ; digest() le préserve quand il régénère.
  preparer()
  if (!existe(DIGEST)) digest()
  const s = lire(DIGEST)
  const i = s.indexOf(DEBUT_BUDGET), j = s.indexOf(FIN_BUDGET)
  const sans = i >= 0 && j > i ? (s.slice(0, i) + s.slice(j + FIN_BUDGET.length)).replace(/^\s+/, '') : s
  ecrire(DIGEST, `${bloc}\n\n${sans}`)
  console.log(`✓ bloc budget en tête de ${rel(DIGEST)}`)
}

// ── contexte : la carte, tirée du code, jamais de la mémoire ──────────────────────────────────────
function urlDe(fichier, motif) {
  const lit = prefixeLitteral(motif)
  let r = rel(fichier)
  if (r.startsWith(lit)) r = r.slice(lit.length)
  r = r.replace(/\/?(page|route)\.[jt]sx?$/, '')
  return '/' + r.split('/').filter((s) => s && !/^\(.*\)$/.test(s)).join('/')
}
function grouper(entrees) {
  const g = new Map()
  for (const { url, suffixe } of entrees) {
    const segs = url.split('/').filter(Boolean)
    const tete = segs.length ? '/' + segs[0] : '/'
    const reste = (segs.slice(1).join('/') || '·') + (suffixe || '')
    if (!g.has(tete)) g.set(tete, [])
    g.get(tete).push(reste)
  }
  return [...g.entries()].map(([tete, l]) => `- \`${tete}\` : ${l.join(', ')}`)
}
function bloc(source, debut) {
  const i = source.indexOf(debut)
  if (i < 0) return ''
  const fin = source.indexOf('\n}', i)
  return source.slice(i, fin < 0 ? undefined : fin)
}
const exportsDe = (src) => [...src.matchAll(/^export\s+(?:async\s+)?(?:const|function|type|interface|class|enum|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
function contexte(silencieux = false) {
  preparer()
  const carte = CONFIG.carte
  const L = [`# Carte du code — ${CONFIG.projet} (${maintenant()})`, '',
    `> Générée par \`${CMD} contexte\` depuis le code, jamais à la main. Une page : ce que le code FAIT.`]
  if (VAULT) L.push(`> Pourquoi on l’a décidé vit dans le vault (\`${CONFIG.vault}\` : \`CLAUDE.md\`, \`Decisions/\`, \`Récap-Projet.md\`). Où en est le chantier : \`.orchestre/digest.md\`.`)
  else L.push('> Où en est le chantier : `.orchestre/digest.md`. Les choix que les agents prennent seuls : `.orchestre/decisions.md`.')
  if (CONFIG.description) L.push('', CONFIG.description + (CONFIG.pile ? ` Pile : ${CONFIG.pile}.` : ''))
  L.push('')
  const compte = []
  const connues = new Set(['pages', 'api', 'lib', 'migrations', 'drapeaux', 'formules'])
  if (carte.pages) {
    const pages = glober(carte.pages).map((f) => ({ url: urlDe(f, carte.pages) }))
    L.push(`## Pages (${pages.length}) — \`${carte.pages}\``, ...grouper(pages), '')
    compte.push(`${pages.length} pages`)
  }
  if (carte.api) {
    const litPages = carte.pages ? prefixeLitteral(carte.pages) : ''
    const litApi = prefixeLitteral(carte.api)
    const prefixeUrl = '/' + (litApi.startsWith(litPages) ? litApi.slice(litPages.length) : litApi).replace(/^\/|\/$/g, '')
    const api = glober(carte.api).map((f) => {
      const src = lire(f)
      const methodes = new Set()
      for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)) methodes.add(m[1])
      for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(',')) { const v = n.trim().split(/\s+as\s+/).pop(); if (/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(v)) methodes.add(v) }
      return { url: urlDe(f, carte.api), suffixe: methodes.size ? ` [${[...methodes].join(' ')}]` : '' }
    })
    L.push(`## API (${api.length}) — \`${carte.api}\`, préfixe \`${prefixeUrl}\``, ...grouper(api), '')
    compte.push(`${api.length} routes API`)
  }
  if (carte.drapeaux) {
    const f = path.join(RACINE, carte.drapeaux)
    // Toute paire `nom: true|false` du fichier — sur une ligne chacune (Presti) ou en un seul objet en ligne.
    const flags = existe(f) ? [...lire(f).matchAll(/\b([A-Za-z_]\w*)\s*:\s*(true|false)\b/g)].map((m) => `${m[1]}=${m[2]}`) : []
    L.push(`## Drapeaux — \`${carte.drapeaux}\` (${flags.length}) : une fonctionnalité non finie n'apparaît pas`, flags.join(' · ') || (existe(f) ? '(non extraits)' : '(fichier absent)'), '')
    compte.push(`${flags.length} drapeaux`)
  }
  if (carte.formules) {
    const f = path.join(RACINE, carte.formules)
    const src = existe(f) ? lire(f) : ''
    const capacites = [...(src.match(/export type Capacite =([\s\S]*?)\n\n/) || ['', ''])[1].matchAll(/'([\w.]+)'/g)].map((m) => m[1])
    const plans = [...bloc(src, 'export const PLANS').matchAll(/^\s*(\w+):\s*\{\s*label:\s*'([^']*)'[^\n]*?prixMois:\s*(\d+)[^\n]*?capacites:\s*(\w+)/gm)].map((m) => `${m[1]} (${m[2]}, ${m[3]} €/mois, ${m[4]})`)
    const grille = [...bloc(src, 'const GRILLE_COMPLETE').matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1])
    const noms = exportsDe(src)
    L.push(`## Formules — \`${carte.formules}\``)
    if (plans.length) L.push(`- plans : ${plans.join(' · ')}`)
    if (capacites.length) L.push(`- capacités (${capacites.length}) : ${capacites.join(', ')}`)
    if (grille.length) L.push(`- grille complète (${grille.length} lignes) : ${grille.join(' · ')}`)
    if (!plans.length && !capacites.length && !grille.length) L.push(`- exports (${noms.length}) : ${noms.slice(0, 12).join(', ') || (existe(f) ? '(aucun)' : '(fichier absent)')}`)
    L.push('')
  }
  if (carte.lib) {
    const lib = glober(carte.lib).filter((p) => !/\.(test|spec)\.[jt]sx?$/.test(p)).map((f) => {
      const noms = exportsDe(lire(f))
      return `- \`${rel(f)}\` (${noms.length}) : ${noms.slice(0, 8).join(', ')}${noms.length > 8 ? ', …' : ''}`
    })
    L.push(`## Bibliothèque — \`${carte.lib}\` (${lib.length} fichiers, exports nommés)`, ...lib, '')
    compte.push(`${lib.length} fichiers lib`)
  }
  if (carte.migrations) {
    // Un dossier (liste de .sql, sans les fichiers en `_` : brouillons, versions à coller) ou un motif glob.
    const d = path.join(RACINE, carte.migrations)
    const migrations = /[*?]/.test(carte.migrations) ? glober(carte.migrations).map((f) => path.basename(f))
      : existe(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.sql') && !f.startsWith('_')).sort() : []
    L.push(`## Migrations — \`${carte.migrations}\` (${migrations.length})`, `- dernières : ${migrations.slice(-5).join(', ') || '(aucune)'}`, '')
    compte.push(`${migrations.length} migrations`)
  }
  for (const [cle, motif] of Object.entries(carte)) {
    if (connues.has(cle) || typeof motif !== 'string') continue
    const fichiers = glober(motif).map(rel)
    L.push(`## ${cle} — \`${motif}\` (${fichiers.length})`, ...fichiers.slice(0, 40).map((f) => `- \`${f}\``), ...(fichiers.length > 40 ? [`- … ${fichiers.length - 40} de plus`] : []), '')
    compte.push(`${fichiers.length} ${cle}`)
  }
  const scripts = existe(path.join(RACINE, 'scripts')) ? fs.readdirSync(path.join(RACINE, 'scripts')).filter((f) => f.endsWith('.mjs')) : []
  if (scripts.length) L.push(`## Scripts — \`scripts/\` (${scripts.length} .mjs${scripts.some((s) => s.endsWith('-e2e.mjs')) ? `, dont ${scripts.filter((s) => s.endsWith('-e2e.mjs')).length} suites e2e` : ''})`, '')
  const etat = existe(DIGEST) ? (lire(DIGEST).match(/^\*\*État\*\* — (.*)$/m) || [, '?'])[1] : 'pas de digest'
  L.push(`## Orchestre — ${etat}`, '')
  ecrire(CONTEXTE, L.join('\n') + '\n')
  if (CARTE_VAULT && existe(VAULT)) ecrire(CARTE_VAULT, L.join('\n') + '\n')
  poserBlocMethode()
  if (!silencieux) console.log(`✓ contexte : ${compte.join(' · ') || 'aucune carte configurée (clé « carte » de orchestre.json)'} → ${rel(CONTEXTE)}${CARTE_VAULT && existe(VAULT) ? ' + ' + versSlash(path.relative(path.dirname(RACINE), CARTE_VAULT)) : ''}`)
}

// ── Le bloc « Méthode », identique dans CLAUDE.md et AGENTS.md, tenu à jour ici ──────────────────
const DEBUT_BLOC = `<!-- orchestre:debut — bloc tenu à jour par \`${CMD} contexte\` ; ne pas éditer à la main -->`
const FIN_BLOC = '<!-- orchestre:fin -->'
function blocMethode() {
  const executants = CONFIG.executants.filter((e) => e !== 'claude-code')
  const qui = executants.length ? executants.join(', ') : 'les exécutants'
  const points = [
    `1. **Claude Code pense, les exécutants produisent** (${qui}). Claude Code n'écrit lui-même que ce qui exige du jugement : schéma et migrations, tout ce qui touche à l'argent, sécurité et droits, les cerveaux (prompts) et les verdicts. Tout le reste — variantes, contenus, tests, captures, boucles QA — est une tâche déposée dans \`.orchestre/file/\`.`,
    `2. **Le système vit dans \`.orchestre/\`** : \`file/\` (à prendre) → \`en-cours/\` (verrou \`<id>.lock\`) → \`fait/\` ou \`refuse/\`. Une tâche = un Markdown à en-tête YAML (\`id, type, objectif, perimetre, interdit, verifier, budget, preuve\` — tous obligatoires) ; \`${CMD} prochaine --agent=<nom>\` la distribue sans chevauchement de périmètre.`,
    `3. **La vérification est mécanique** : \`${CMD} verifier <id>\` exécute la commande \`verifier\` de la tâche ; son code de sortie fait le verdict, écrit dans \`.orchestre/digest.md\`. Personne ne relit un diff : on lit le digest.`,
    VAULT
      ? `4. **Ce que le code fait vit dans \`.orchestre/contexte.md\`** (régénéré depuis le code, copié dans \`${versSlash(path.join(CONFIG.vault, CONFIG.carteVault || ''))}\`) ; **pourquoi on l'a décidé vit dans le vault** \`${CONFIG.vault}\` (\`CLAUDE.md\`, \`Decisions/\`, \`Récap-Projet.md\`). Avant toute tâche : lire ces deux cartes, pas le dépôt. On n'écrit dans le vault que par une tâche dont le périmètre est \`${prefixeVault()}…\`.`
      : `4. **Ce que le code fait vit dans \`.orchestre/contexte.md\`** (régénéré depuis le code) ; **les choix que les agents prennent seuls vivent dans \`.orchestre/decisions.md\`**. Avant toute tâche : lire ces deux fichiers, pas le dépôt.`,
    `5. **Bloqué = une question à options** : \`.orchestre/en-cours/<id>.question.md\`, deux ou trois options numérotées ; la réponse arrive en \`<id>.reponse.md\` (\`orchestre.mjs repondre\`). Jamais une discussion.`,
    ...CONFIG.methodeSupplement.map((s, i) => `${6 + i}. ${s.trim()}`),
  ]
  const drapeau = CONFIG.carte.drapeaux ? ` (drapeau dans \`${CONFIG.carte.drapeaux}\`)` : ''
  return `${DEBUT_BLOC}
## Méthode — Claude Code × exécutants (prompt v16 §1)

${points.join('\n')}

Conventions communes : identifiants et commentaires en français · zéro donnée réelle dans les tests · « une fonctionnalité non finie n'apparaît pas »${drapeau} · on ne touche jamais à \`interdit\`, même pour aider · aucun chiffre non sourcé, aucun secret dans un fichier versionné · une preuve est une sortie de commande, pas une paraphrase.
${FIN_BLOC}`
}
function remplacerBloc(source, insererAvantPremiereSection = false) {
  const nouveau = blocMethode()
  const i = source.indexOf('<!-- orchestre:debut'), j = source.indexOf(FIN_BLOC)
  if (i >= 0 && j > i) return source.slice(0, i) + nouveau + source.slice(j + FIN_BLOC.length)
  if (insererAvantPremiereSection) {
    const k = source.indexOf('\n## ')
    return k < 0 ? `${source.trimEnd()}\n\n${nouveau}\n` : `${source.slice(0, k)}\n${nouveau}\n${source.slice(k)}`
  }
  return `${source.trimEnd()}\n\n${nouveau}\n`
}
// Les gabarits viennent du dépôt orchestre (bin/.. ou `source`) ; sans lui, une version embarquée minimale.
const GABARITS_EMBARQUES = {
  'CLAUDE.md': `# {{projet}} — contexte du dépôt\n\n{{description}}\n\nPile : {{pile}}.\n\nCe dépôt est piloté par l'orchestre (\`scripts/orchestre.mjs\`, configuration dans \`.orchestre/orchestre.json\`). Claude Code ne lit que \`.orchestre/digest.md\` et \`.orchestre/contexte.md\` ; il délègue le volume.\n\n${DEBUT_BLOC}\n${FIN_BLOC}\n`,
  'AGENTS.md': `# AGENTS.md — règles pour tout exécutant dans le dépôt {{projet}}\n\n{{description}}\nTu n'explores pas le dépôt : tu lis \`.orchestre/contexte.md\` (ce que le code fait){{#vault}} et, dans le vault configuré, \`CLAUDE.md\` puis la carte du code (le pourquoi){{/vault}}. Puis tu prends une tâche.\n\n## La boucle d'un exécutant\n\n1. \`${CMD} prochaine --agent=<ton-nom>\` — la tâche s'affiche en entier, avec ce qu'il faut faire à la fin.\n2. Tu travailles UNIQUEMENT dans \`perimetre\`. \`interdit\` reste intact, même pour « aider ». Le \`budget\` est une limite, pas une cible.\n3. Tu déposes ta preuve dans \`.orchestre/preuves/<id>/\` : la sortie de la commande \`verifier\`. Jamais une image fabriquée, jamais un fichier de 0 octet.\n4. Tu lances \`${CMD} verifier <id>\` autant de fois que nécessaire tant que la tâche est en \`en-cours/\`.\n5. Vert ? Tu déplaces le fichier de \`en-cours/\` vers \`fait/\` et tu relances \`verifier <id>\` : ce verdict-là compte.\n6. Bloqué ? \`.orchestre/en-cours/<id>.question.md\` avec deux ou trois options numérotées. Tu attends \`<id>.reponse.md\`.\n7. Tu abandonnes ? \`${CMD} liberer <id>\`.\n\nUn agent, une tâche. Interdit, sans exception : \`git restore\`, \`git checkout <fichier>\`, \`git stash\`, \`git reset\`, \`git clean\`, \`git revert\`, et supprimer ou vider un fichier hors périmètre.\n{{#vault}}Tu n'écris dans le vault que par une tâche dont le périmètre le vise explicitement.\n{{/vault}}\n${DEBUT_BLOC}\n${FIN_BLOC}\n`,
  'tache.md': `---\nid: 000-exemple\ntype: feature\nobjectif: Une phrase qui dit ce qui doit exister à la fin\nperimetre: [app/exemple/**]\ninterdit: [supabase/**]\nverifier: node scripts/verifier-exemple.mjs\nbudget: { fichiers: 4, minutes: 20 }\npreuve: sortie de \`verifier\` dans .orchestre/preuves/000-exemple/verifier.log\n---\n\n# 000-exemple — titre lisible de la tâche\n\n## Contexte\n\n## Ce qu'il faut faire\n\n## C'est fini quand\n\n- \`verifier\` est vert depuis \`fait/\`.\n`,
  'decisions.md': `# Décisions — les choix que les agents prennent seuls\n\n| Question | Défaut retenu | Réversible ? |\n|---|---|---|\n\n## Décisions ajoutées par les agents\n\n`,
  'settings.json': JSON.stringify({ hooks: {
    PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'node scripts/hooks/read-garde.mjs' }] }],
    PostToolUse: [{ matcher: 'Edit|Write|MultiEdit', hooks: [{ type: 'command', command: 'node scripts/hooks/contexte-fond.mjs' }] }],
  } }, null, 2) + '\n',
}
function dossierOutil() {
  if (DEPOT_OUTIL) return DEPOT_OUTIL
  if (CONFIG?.source && existe(path.join(CONFIG.source, 'bin', 'orchestre.mjs'))) return path.resolve(RACINE, CONFIG.source)
  return null
}
function gabarit(nom) {
  const outil = dossierOutil()
  const f = outil && path.join(outil, 'gabarits', nom)
  return f && existe(f) ? lire(f) : GABARITS_EMBARQUES[nom]
}
function rendre(texte) {
  const valeurs = { projet: CONFIG.projet, description: CONFIG.description || `Projet ${CONFIG.projet}.`, pile: CONFIG.pile || '(à renseigner dans .orchestre/orchestre.json)' }
  let s = texte.replace(/^<!--\s*Gabarit[\s\S]*?-->\r?\n?/, '') // le commentaire d'en-tête du gabarit n'a rien à faire dans le projet
  s = s.replace(/\{\{#vault\}\}([\s\S]*?)\{\{\/vault\}\}/g, (_, corps) => (VAULT ? corps : ''))
  s = s.replace(/\{\{(projet|description|pile)\}\}/g, (_, k) => valeurs[k])
  return remplacerBloc(s)
}
function poserBlocMethode() {
  const claude = path.join(RACINE, 'CLAUDE.md')
  if (existe(claude)) { const s = lire(claude); const n = remplacerBloc(s, true); if (n !== s) fs.writeFileSync(claude, n) }
  const agents = path.join(RACINE, 'AGENTS.md')
  if (!existe(agents)) fs.writeFileSync(agents, rendre(gabarit('AGENTS.md')))
  else { const s = lire(agents); const n = remplacerBloc(s); if (n !== s) fs.writeFileSync(agents, n) }
}

// ── init : installer l'orchestre dans un projet ───────────────────────────────────────────────────
function copier(source, cible) {
  const avant = existe(cible) ? lire(cible) : null
  const contenu = lire(source)
  if (avant === contenu) return 'identique'
  ecrire(cible, contenu)
  return avant === null ? 'créé' : 'mis à jour'
}
function fusionnerSettings(cible, gabaritJson) {
  let actuel = {}
  if (existe(cible)) { try { actuel = JSON.parse(lire(cible)) } catch (e) { console.log(`  ✗ ${rel(cible)} illisible (${e.message}) : hooks non fusionnés`); return 'illisible' } }
  const voulu = JSON.parse(gabaritJson)
  let ajoutes = 0
  actuel.hooks = actuel.hooks && typeof actuel.hooks === 'object' ? actuel.hooks : {}
  for (const [evenement, entrees] of Object.entries(voulu.hooks || {})) {
    const liste = Array.isArray(actuel.hooks[evenement]) ? actuel.hooks[evenement] : (actuel.hooks[evenement] = [])
    const commandes = new Set(liste.flatMap((e) => (e.hooks || []).map((h) => h.command)))
    for (const e of entrees) if (!(e.hooks || []).every((h) => commandes.has(h.command))) { liste.push(e); ajoutes++ }
  }
  if (ajoutes) ecrire(cible, JSON.stringify(actuel, null, 2) + '\n')
  return ajoutes ? `${ajoutes} hook(s) ajouté(s)` : 'hooks déjà présents'
}
const TACHES_FACTICES = {
  '000-test.md': `---
id: 000-test
type: test
objectif: Prouver l'aller-retour du système — une tâche dont le vérificateur passe
perimetre: [.orchestre/preuves/000-test/**]
interdit: [scripts/**]
verifier: node -e "process.exit(0)"
budget: { fichiers: 1, minutes: 2 }
preuve: sortie de \`verifier\` dans .orchestre/preuves/000-test/verifier.log (écrite par orchestre.mjs)
---

# 000-test — la tâche témoin qui doit passer

Rien à produire : cette tâche existe pour prouver que la chaîne prochaine → en-cours/ → fait/ → verifier → digest
fonctionne de bout en bout. Prends-la, déplace-la dans fait/, lance \`verifier 000-test\` : PASS attendu.
`,
  '001-test-echec.md': `---
id: 001-test-echec
type: test
objectif: Prouver qu'un vérificateur rouge donne FAIL et que sa première ligne d'erreur remonte dans digest.md
perimetre: [.orchestre/preuves/001-test-echec/**]
interdit: [scripts/**]
verifier: node -e "console.log('ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md'); process.exit(1)"
budget: { fichiers: 1, minutes: 2 }
preuve: sortie de \`verifier\` dans .orchestre/preuves/001-test-echec/verifier.log (écrite par orchestre.mjs)
---

# 001-test-echec — la tâche témoin qui doit échouer

Rien à produire : le vérificateur sort 1 exprès. Depuis fait/, \`verifier 001-test-echec\` doit renvoyer la tâche en
refuse/ et le digest doit porter la ligne « ÉCHEC voulu : … » telle quelle.
`,
}
function init(dossier, options) {
  const racine = path.resolve(process.cwd(), dossier || '.')
  fs.mkdirSync(path.join(racine, '.orchestre'), { recursive: true })
  const fichierConfig = path.join(racine, '.orchestre', 'orchestre.json')
  let config = {}
  if (existe(fichierConfig)) { try { config = JSON.parse(lire(fichierConfig)) } catch (e) { console.error(`✗ ${fichierConfig} illisible : ${e.message}`); process.exit(1) } }
  const neuf = !existe(fichierConfig)
  const ex = (p) => existe(path.join(racine, p))
  if (neuf) {
    config = {
      projet: options.projet || path.basename(racine),
      description: options.description || '',
      pile: options.pile || (ex('next.config.js') || ex('next.config.mjs') || ex('next.config.ts') ? 'Next.js' : '') + (ex('supabase') ? ' + Supabase' : '') || '',
      source: DEPOT_OUTIL ? versSlash(DEPOT_OUTIL) : null,
      carte: {},
      juges: {},
      executants: DEFAUTS.executants,
      maxMinutes: DEFAUTS.maxMinutes,
      lectureLibre: DEFAUTS.lectureLibre,
    }
    config.pile = config.pile.replace(/^\s*\+\s*/, '')
    if (options.vault) { config.vault = options.vault; config.carteVault = DEFAUTS.carteVault }
    if (ex('app')) { config.carte.pages = 'app/**/page.tsx'; if (ex('app/api')) config.carte.api = 'app/api/**/route.ts' }
    if (ex('lib')) config.carte.lib = 'lib/**/*.ts'
    if (ex('supabase/migrations')) config.carte.migrations = 'supabase/migrations'
    if (ex('lib/flags.ts')) config.carte.drapeaux = 'lib/flags.ts'
    if (ex('lib/plans.ts')) config.carte.formules = 'lib/plans.ts'
    if (ex('package.json')) {
      try {
        const scripts = JSON.parse(lire(path.join(racine, 'package.json'))).scripts || {}
        const code = {}
        if (scripts.lint) code.lint = 'npm run lint'
        if (scripts.typecheck) code.typecheck = 'npm run typecheck'
        if (scripts.test) code.tests = 'npm test'
        if (Object.keys(code).length) config.juges.code = code
      } catch { /* package.json abîmé : pas de juge code */ }
    }
  } else {
    for (const k of ['projet', 'pile', 'vault', 'description']) if (options[k]) config[k] = options[k]
    if (!config.source && DEPOT_OUTIL) config.source = versSlash(DEPOT_OUTIL)
  }
  ecrire(fichierConfig, JSON.stringify(config, null, 2) + '\n')
  ouvrir(racine)
  preparer()
  const lignes = [`${neuf ? '✓' : '·'} .orchestre/orchestre.json ${neuf ? 'écrit' : 'conservé'} (projet ${CONFIG.projet}${CONFIG.source ? `, source ${CONFIG.source}` : ', sans source : « maj » ne saura pas d’où recopier'})`]
  // Le bin et sa bibliothèque : une copie (pas de lien symbolique : Windows). Le bin, c'est ce fichier-ci.
  lignes.push(`✓ scripts/orchestre.mjs ${copier(CE_FICHIER, path.join(racine, 'scripts', 'orchestre.mjs'))}`)
  lignes.push(`✓ scripts/lib/preuves.mjs ${copier(path.join(path.dirname(CE_FICHIER), 'lib', 'preuves.mjs'), path.join(racine, 'scripts', 'lib', 'preuves.mjs'))}`)
  // Les deux pilotes (executant.mjs, antigravity.mjs) : présents seulement quand CE_FICHIER est le bin/ du dépôt
  // outil (pas une copie vendorisée qui relancerait « init » sur elle-même).
  for (const p of ['executant.mjs', 'antigravity.mjs']) {
    const src = path.join(path.dirname(CE_FICHIER), p)
    if (existe(src)) lignes.push(`✓ scripts/${p} ${copier(src, path.join(racine, 'scripts', p))}`)
  }
  // CLAUDE.md : s'il existe, on n'y insère que le bloc Méthode ; sinon le gabarit rendu.
  const claude = path.join(racine, 'CLAUDE.md')
  if (existe(claude)) { const s = lire(claude); const n = remplacerBloc(s, true); if (n !== s) fs.writeFileSync(claude, n); lignes.push(`✓ CLAUDE.md existant : bloc Méthode ${n !== s ? 'posé' : 'déjà à jour'}`) }
  else { ecrire(claude, rendre(gabarit('CLAUDE.md'))); lignes.push('✓ CLAUDE.md créé depuis le gabarit') }
  const agents = path.join(racine, 'AGENTS.md')
  if (existe(agents)) { const s = lire(agents); const n = remplacerBloc(s); if (n !== s) fs.writeFileSync(agents, n); lignes.push(`✓ AGENTS.md existant : bloc Méthode ${n !== s ? 'posé' : 'déjà à jour'}`) }
  else { ecrire(agents, rendre(gabarit('AGENTS.md'))); lignes.push('✓ AGENTS.md créé depuis le gabarit') }
  for (const [nom, cible] of [['tache.md', path.join(ORCH, 'gabarit-tache.md')], ['decisions.md', path.join(ORCH, 'decisions.md')]]) {
    if (existe(cible)) lignes.push(`· ${rel(cible)} conservé`)
    else { ecrire(cible, gabarit(nom)); lignes.push(`✓ ${rel(cible)} créé`) }
  }
  // Hooks (toujours recopiés : c'est du code vendorisé) et leur branchement dans .claude/settings.json (fusion).
  const outil = dossierOutil()
  const hooks = outil && existe(path.join(outil, 'hooks')) ? fs.readdirSync(path.join(outil, 'hooks')).filter((f) => f.endsWith('.mjs')) : []
  for (const h of hooks) lignes.push(`✓ scripts/hooks/${h} ${copier(path.join(outil, 'hooks', h), path.join(racine, 'scripts', 'hooks', h))}`)
  if (!hooks.length) lignes.push('✗ hooks introuvables (pas de dépôt orchestre joignable) : scripts/hooks/ non posé')
  else lignes.push(`✓ .claude/settings.json : ${fusionnerSettings(path.join(racine, '.claude', 'settings.json'), gabarit('settings.json'))}`)
  // Juges : seulement s'ils manquent (le projet peut avoir adapté les siens).
  const juges = outil && existe(path.join(outil, 'juges')) ? fs.readdirSync(path.join(outil, 'juges')).filter((f) => f.endsWith('.mjs')) : []
  for (const j of juges) {
    const cible = path.join(racine, 'scripts', 'juges', j)
    if (existe(cible)) lignes.push(`· scripts/juges/${j} conservé`)
    else { copier(path.join(outil, 'juges', j), cible); lignes.push(`✓ scripts/juges/${j} créé`) }
  }
  // Les deux tâches témoins, si rien n'a encore circulé.
  if (![D.file, D.fait, D.refuse].some((d) => taches(path.join(ORCH, d)).length)) {
    for (const [nom, contenu] of Object.entries(TACHES_FACTICES)) ecrire(path.join(ORCH, D.file, nom), contenu)
    lignes.push('✓ tâches témoins déposées : file/000-test.md (doit passer) et file/001-test-echec.md (doit échouer)')
  }
  digest()
  try { contexte(true); lignes.push(`✓ ${rel(CONTEXTE)} et ${rel(DIGEST)} générés`) } catch (e) { lignes.push(`✗ contexte non généré : ${e.message}`) }
  console.log(lignes.join('\n'))
  console.log(`\nProjet prêt — ${versSlash(racine)}\nLes trois commandes à connaître :\n  ${CMD} prochaine --agent=<nom>    prendre une tâche\n  ${CMD} verifier <id>              juger une tâche\n  ${CMD} digest                     relire l'état (.orchestre/digest.md)`)
}

// ── maj : recopier le bin, sa bibliothèque et les hooks depuis `source` ───────────────────────────
function maj() {
  const source = CONFIG.source ? path.resolve(RACINE, CONFIG.source) : null
  if (!source || !existe(path.join(source, 'bin', 'orchestre.mjs'))) { console.error(`✗ « source » absente ou sans bin/orchestre.mjs : ${source ? versSlash(source) : '(non configurée dans .orchestre/orchestre.json)'}`); process.exit(1) }
  const lignes = []
  const paires = [
    ['bin/orchestre.mjs', 'scripts/orchestre.mjs'],
    ['bin/lib/preuves.mjs', 'scripts/lib/preuves.mjs'],
    ['bin/executant.mjs', 'scripts/executant.mjs'],
    ['bin/antigravity.mjs', 'scripts/antigravity.mjs'],
    ...(existe(path.join(source, 'hooks')) ? fs.readdirSync(path.join(source, 'hooks')).filter((f) => f.endsWith('.mjs')).map((h) => [`hooks/${h}`, `scripts/hooks/${h}`]) : []),
    // Les juges déjà installés se rafraîchissent ; un juge que le projet n'a pas n'est pas ajouté ici (c'est le rôle d'init).
    ...(existe(path.join(source, 'juges')) ? fs.readdirSync(path.join(source, 'juges')).filter((f) => f.endsWith('.mjs') && existe(path.join(RACINE, 'scripts', 'juges', f))).map((j) => [`juges/${j}`, `scripts/juges/${j}`]) : []),
  ]
  let changes = 0
  for (const [de, vers] of paires) {
    const etat = copier(path.join(source, de), path.join(RACINE, vers))
    if (etat !== 'identique') changes++
    lignes.push(`${etat === 'identique' ? '·' : '✓'} ${vers} ${etat}`)
  }
  console.log(lignes.join('\n'))
  console.log(changes ? `✓ maj : ${changes} fichier(s) changé(s) depuis ${versSlash(source)}` : `· maj : déjà à jour (${versSlash(source)})`)
}

// ── petites commandes ────────────────────────────────────────────────────────────────────────────
function valider(fichier) {
  const chemin = existe(path.resolve(process.cwd(), fichier)) ? path.resolve(process.cwd(), fichier) : path.resolve(RACINE, fichier)
  if (!existe(chemin)) { console.error(`✗ ${fichier} introuvable`); process.exit(1) }
  const t = lireTache(chemin)
  if (t.erreurs.length) { console.log(`✗ ${fichier}\n  ${t.erreurs.join('\n  ')}`); process.exit(1) }
  console.log(`✓ ${fichier} : ${t.entete.id} · ${t.entete.type} · ${t.entete.executant || CONFIG.executants[0]} · périmètre ${t.entete.perimetre.join(', ')} · budget ${t.entete.budget.fichiers} fichiers / ${t.entete.budget.minutes} min`)
}
function repondre(id, choix, ligne) {
  const q = path.join(ORCH, D.enCours, `${id}.question.md`)
  if (!existe(q)) { console.error(`✗ pas de question en attente pour ${id}`); process.exit(3) }
  if (!/^\d+$/.test(String(choix))) { console.error('✗ la réponse est un chiffre (le numéro de l’option), suivi au besoin d’une ligne'); process.exit(3) }
  ecrire(path.join(ORCH, D.enCours, `${id}.reponse.md`), `option: ${choix}\n${ligne ? `note: ${ligne}\n` : ''}date: ${maintenant()}\n`)
  digest()
  console.log(`✓ réponse ${choix} déposée pour ${id}`)
}
function deplacer(id, de, vers, etiquette) {
  const ou = trouver(id, [de])
  if (!ou) { console.error(`✗ ${id} n'est pas dans ${de}/`); process.exit(3) }
  fs.renameSync(ou.fichier, path.join(ORCH, vers, path.basename(ou.fichier)))
  for (const suffixe of ['.lock', '.avant.txt', '.question.md', '.reponse.md']) { const p = path.join(ORCH, de, `${id}${suffixe}`); if (existe(p)) fs.unlinkSync(p) }
  digest()
  console.log(`✓ ${id} : ${etiquette}`)
}

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────
const USAGE = lire(CE_FICHIER).split('\n').filter((l) => l.startsWith('//')).slice(13, 29).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')
const [, , commande, ...args] = process.argv
const option = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null }
const drapeau = (nom) => args.includes(`--${nom}`)
const positionnels = args.filter((a) => !a.startsWith('--'))
const dossierTranscripts = () => (option('transcripts') ? path.resolve(process.cwd(), option('transcripts')) : DOSSIER_PROJETS_DEFAUT)
if (commande === 'init') {
  init(positionnels[0], { projet: option('projet'), pile: option('pile'), vault: option('vault'), description: option('description') })
} else if (!commande || commande === '--help' || commande === '-h') {
  console.log(USAGE)
} else {
  const racine = trouverRacine(process.cwd())
  if (!racine) {
    if (commande === 'budget' && drapeau('tous')) { CONFIG = { ...DEFAUTS, projet: '(hors projet)' }; budget(true, dossierTranscripts()); process.exit(0) }
    console.error(`✗ aucun dossier .orchestre/ en remontant depuis ${versSlash(process.cwd())} — lancez « ${CMD} init » dans le projet`)
    process.exit(1)
  }
  ouvrir(racine)
  switch (commande) {
    case 'maj': maj(); break
    case 'prochaine': {
      const agent = option('agent')
      if (!agent) { console.error('✗ --agent=<nom> obligatoire : le verrou porte le nom de qui travaille'); process.exit(1) }
      prochaine(agent, option('tache')); break
    }
    case 'verifier': if (!positionnels[0]) { console.error('✗ verifier <id>'); process.exit(1) } await verifier(positionnels[0]); break
    case 'digest': digest(); console.log(`✓ ${rel(DIGEST)} régénéré`); break
    case 'contexte': contexte(drapeau('silencieux')); break
    case 'budget': budget(drapeau('tous'), dossierTranscripts()); break
    case 'valider': if (!positionnels[0]) { console.error('✗ valider <fichier.md>'); process.exit(1) } valider(positionnels[0]); break
    case 'repondre': repondre(positionnels[0], positionnels[1], positionnels.slice(2).join(' ')); break
    case 'liberer': deplacer(positionnels[0], D.enCours, D.file, 'rendue à la file, verrou levé'); break
    case 'rejouer': deplacer(positionnels[0], D.refuse, D.file, 'remise en file'); break
    default: console.log(USAGE); process.exit(1)
  }
}
