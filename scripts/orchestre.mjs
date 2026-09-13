// scripts/orchestre.mjs — le chef de gare du système Claude Code × Antigravity (prompt v15 §1.0).
//
// Pas de serveur, pas de base : des fichiers. Une tâche est un Markdown à en-tête YAML déposé
// dans .orchestre/file/ ; un exécutant (Antigravity pour le volume, Claude Code pour ce qui exige
// du jugement) la prend avec `prochaine`, travaille dans son périmètre, dépose sa preuve, la passe
// en fait/ et appelle `verifier` : la commande `verifier` de la tâche est EXÉCUTÉE ICI et son code
// de sortie fait le verdict. Personne ne relit un diff — on lit .orchestre/digest.md.
//
// Usage :
//   node scripts/orchestre.mjs prochaine --agent=<nom>    prend la prochaine tâche dont le périmètre ne chevauche rien
//   node scripts/orchestre.mjs verifier <id>              exécute la commande `verifier` de la tâche → PASS/FAIL dans digest.md
//   node scripts/orchestre.mjs digest                     régénère .orchestre/digest.md
//   node scripts/orchestre.mjs contexte                   régénère contexte.md depuis le code (+ Carte-du-code.md du vault,
//                                                         + le bloc « Méthode » de CLAUDE.md et AGENTS.md)
//   node scripts/orchestre.mjs valider <fichier.md>       contrôle l'en-tête d'une tâche avant de la déposer
//   node scripts/orchestre.mjs repondre <id> <n> [ligne]  répond à en-cours/<id>.question.md
//   node scripts/orchestre.mjs liberer <id>               l'exécutant abandonne : retour en file/, verrou levé
//   node scripts/orchestre.mjs rejouer <id>               une tâche refusée retourne en file/
//
// Périmètres : chemins relatifs à la racine du dépôt ; un chemin qui commence par `SaaS/` vise le
// vault voisin (../SaaS). Le chevauchement est jugé sur la partie littérale avant le premier joker —
// volontairement large : deux agents sur les mêmes fichiers, c'est du travail perdu.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, execFileSync } from 'node:child_process'
import { fichiersVides } from './lib/preuves.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VAULT = path.resolve(RACINE, '..', 'SaaS')
const ORCH = path.join(RACINE, '.orchestre')
const D = { file: 'file', enCours: 'en-cours', fait: 'fait', refuse: 'refuse', preuves: 'preuves' }
const VERDICTS = path.join(ORCH, 'verdicts.jsonl')
const DIGEST = path.join(ORCH, 'digest.md')
const CONTEXTE = path.join(ORCH, 'contexte.md')
const CARTE_VAULT = path.join(VAULT, 'Produit', 'Carte-du-code.md')
const TYPES = ['feature', 'test', 'contenu', 'audit', 'boucle-qa']
const CHAMPS = ['id', 'type', 'objectif', 'perimetre', 'interdit', 'verifier', 'budget', 'preuve']
const EXECUTANTS = ['antigravity', 'claude-code']
const MAX_MINUTES = 30
const MAX_LIGNES_DIGEST = 100

const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const rel = (p) => path.relative(RACINE, p).split(path.sep).join('/')
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const echapper = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
const taches = (dossier) => existe(dossier)
  ? fs.readdirSync(dossier).filter((f) => f.endsWith('.md') && !f.endsWith('.question.md') && !f.endsWith('.reponse.md')).sort()
  : []
const preparer = () => { for (const d of Object.values(D)) fs.mkdirSync(path.join(ORCH, d), { recursive: true }) }
const git = (args) => { try { return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } }

// ── L'en-tête YAML : un sous-ensemble volontairement petit (une ligne par champ) ──────────────────
function valeurYaml(brut) {
  const v = brut.trim()
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
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
  return v.replace(/^['"]|['"]$/g, '')
}

function lireTache(fichier) {
  const texte = lire(fichier)
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { fichier, entete: null, corps: texte, erreurs: ['pas d’en-tête YAML (--- … ---) en tête de fichier'] }
  const entete = {}
  for (const ligne of m[1].split(/\r?\n/)) {
    const sansCommentaire = ligne.replace(/\s+#.*$/, '')
    const i = sansCommentaire.indexOf(':')
    if (i < 1 || /^\s/.test(sansCommentaire)) continue
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
  if (entete.executant !== undefined && !EXECUTANTS.includes(entete.executant)) erreurs.push(`executant « ${entete.executant} » : attendu ${EXECUTANTS.join(' | ')}`)
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
1. Dépose ta preuve dans .orchestre/preuves/${id}/ (la sortie de la commande \`verifier\`). Les captures d'écran, c'est le JUGE qui les prend (scripts/lib/capture.mjs) quand le vérificateur le prévoit : ne dépose jamais une image que tu n'as pas vue s'afficher — un fichier fabriqué est un refus.
2. Tant que la tâche est en en-cours/, lance \`node scripts/orchestre.mjs verifier ${id}\` autant de fois que nécessaire.
3. Quand c'est vert : déplace le fichier de en-cours/ vers fait/, puis relance \`node scripts/orchestre.mjs verifier ${id}\` — c'est ce verdict-là qui compte.
Bloqué ? Écris .orchestre/en-cours/${id}.question.md avec deux ou trois options numérotées, puis attends ${id}.reponse.md. Jamais un paragraphe.
Ne touche à rien hors \`perimetre\`. \`interdit\` est interdit même pour aider. Zéro donnée réelle. Identifiants en français.
Le dépôt porte d'autres chantiers non committés : ils ne sont PAS à toi. INTERDIT, sans exception : \`git restore\`, \`git checkout <fichier>\`, \`git stash\`, \`git reset\`, \`git clean\`, \`git revert\`, et supprimer ou vider un fichier hors périmètre (\`del\`, \`remove-item\`, \`rm\`). Le 13/09, un agent a « nettoyé » ainsi trois jours de travail de trois sessions : perte sèche. Si le vérificateur te reproche un fichier que tu n'as pas touché, écris \`.orchestre/en-cours/<id>.question.md\` et attends — n'y touche pas.`

// ── prochaine ─────────────────────────────────────────────────────────────────────────────────────
function prochaine(agent, tacheVoulue = null) {
  preparer()
  // Un agent, une tâche : le registre du pilote (agents.jsonl) dit laquelle. Un agent inscrit n'en reçoit pas d'autre
  // dans la même conversation — le 13/09, un agent a « pris 014-01 dans la foulée » de 014-12 et l'a rendue avec quatre
  // captures identiques ; un autre a ignoré son --tache et pris la première de la file.
  const REGISTRE = path.join(ORCH, 'agents.jsonl')
  const inscrit = fs.existsSync(REGISTRE) ? fs.readFileSync(REGISTRE, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((a) => a && a.agent === agent).at(-1) : null
  if (inscrit?.tache) {
    if (tacheVoulue && tacheVoulue !== inscrit.tache) { console.log(`✗ ${agent} est inscrit sur ${inscrit.tache} : un agent, une tâche. ${tacheVoulue} attendra une autre conversation.`); process.exit(2) }
    tacheVoulue = inscrit.tache
    if (!fs.existsSync(path.join(ORCH, D.file, `${tacheVoulue}.md`))) { console.log(`✗ ${tacheVoulue} n'est plus dans file/ (prise, faite ou refusée) : ${agent} a terminé — rien d'autre dans cette conversation.`); process.exit(2) }
  }
  const enCours = taches(path.join(ORCH, D.enCours)).map((f) => lireTache(path.join(ORCH, D.enCours, f))).filter((t) => t.entete)
  const ignorees = []
  // `--tache=<id>` : le pilote (scripts/antigravity.mjs) attribue une tâche précise à un agent ; sans lui, la première compatible.
  const candidates = taches(path.join(ORCH, D.file)).filter((f) => !tacheVoulue || f === `${tacheVoulue}.md` || f.startsWith(`${tacheVoulue}-`))
  if (tacheVoulue && !candidates.length) { console.log(`Aucune tâche ${tacheVoulue} dans file/ (déjà prise, faite ou inexistante).`); process.exit(2) }
  for (const f of candidates) {
    const t = lireTache(path.join(ORCH, D.file, f))
    if (t.erreurs.length) {
      const dest = path.join(ORCH, D.refuse, f)
      fs.renameSync(t.fichier, dest)
      fs.appendFileSync(VERDICTS, JSON.stringify({ id: t.entete?.id || f.replace(/\.md$/, ''), verdict: 'REFUSÉE', ligne: `en-tête : ${t.erreurs[0]}`, code: null, date: maintenant(), duree_s: 0, agent, executant: t.entete?.executant || 'antigravity', lignes: 0, dossier: D.refuse }) + '\n')
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
  const chemins = perimetre.map(prefixe).filter((p) => p && !p.startsWith('SaaS/') && !p.startsWith('../'))
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
  const minutes = Math.min(Number(t.entete.budget.minutes) || MAX_MINUTES, MAX_MINUTES)
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
  fs.appendFileSync(VERDICTS, JSON.stringify({ id, verdict, ligne, code: r.code, date: maintenant(), duree_s: duree, agent: lock.agent || '?', executant: t.entete.executant || 'antigravity', lignes: production, dossier: ou.dossier }) + '\n')
  if (ou.dossier === D.fait) {
    if (verdict === 'FAIL') fs.renameSync(ou.fichier, path.join(ORCH, D.refuse, path.basename(ou.fichier)))
    for (const suffixe of ['.lock', '.avant.txt', '.question.md', '.reponse.md']) { const q = path.join(ORCH, D.enCours, id + suffixe); if (existe(q)) fs.unlinkSync(q) }
  }
  digest()
  if (verdict === 'PASS') { try { contexte(true) } catch (e) { console.error(`  (contexte non régénéré : ${e.message})`) } }
  console.log(`${verdict === 'PASS' ? '✓' : '✗'} ${id} : ${verdict}${ligne ? ' — ' + ligne : ''} · ${duree}s · ${production} ligne(s) produite(s) · preuve : ${rel(journal)}`)
  process.exit(verdict === 'PASS' ? 0 : 1)
}

// ── digest : le seul fichier qu'on lit ────────────────────────────────────────────────────────────
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
  const mesure = { antigravity: { taches: 0, lignes: 0 }, 'claude-code': { taches: 0, lignes: 0 } }
  for (const v of verdicts.values()) if (v.verdict === 'PASS') { const e = mesure[v.executant] || (mesure[v.executant] = { taches: 0, lignes: 0 }); e.taches++; e.lignes += v.lignes || 0 }
  const n = Object.fromEntries(Object.values(D).map((d) => [d, tout.filter((x) => x.dossier === d).length]))
  const alerte = mesure['claude-code'].lignes > mesure.antigravity.lignes && mesure['claude-code'].lignes > 0
    ? ' ⚠ Claude Code produit plus de lignes qu’Antigravity : le système est mal utilisé (§1.0).' : ''
  const L = [
    `# Digest — ${maintenant()}`, '',
    `> Généré par \`node scripts/orchestre.mjs digest\`. Une ligne par tâche, ${MAX_LIGNES_DIGEST} au plus. C'est le seul fichier à lire pour savoir où en est le chantier.`, '',
    `**Mesure** — déléguées (Antigravity) : ${mesure.antigravity.taches} tâche(s) PASS, ${mesure.antigravity.lignes} ligne(s) · faites par Claude Code : ${mesure['claude-code'].taches} tâche(s) PASS, ${mesure['claude-code'].lignes} ligne(s).${alerte}`,
    `**État** — file : ${n.file} · en cours : ${n['en-cours']} · faites : ${n.fait} · refusées : ${n.refuse}`,
  ]
  if (questions.length) {
    L.push('', `## ⚠ ${questions.length} question(s) en attente`)
    for (const q of questions) L.push(`- \`${rel(path.join(dossierEnCours, q))}\` → \`node scripts/orchestre.mjs repondre ${q.replace(/\.question\.md$/, '')} <n>\``)
  }
  const ordre = { [D.enCours]: 0, [D.file]: 1, [D.fait]: 2, [D.refuse]: 2 }
  tout.sort((a, b) => (ordre[a.dossier] - ordre[b.dossier]) || ((b.verdict?.date || '').localeCompare(a.verdict?.date || '')) || a.id.localeCompare(b.id))
  L.push('', '| id | type | où | exécutant | verdict | détail |', '|---|---|---|---|---|---|')
  for (const x of tout.slice(0, MAX_LIGNES_DIGEST)) {
    const e = x.t.entete || {}
    const executant = x.dossier === D.enCours ? (x.lock.agent || '?') : (x.verdict?.agent && x.verdict.agent !== '?' ? x.verdict.agent : (e.executant || 'antigravity'))
    const verdict = (x.dossier === D.fait || x.dossier === D.refuse) && x.verdict ? x.verdict.verdict : '—'
    const detail = x.dossier === D.enCours ? `depuis ${x.lock.depuis || '?'} · ${e.objectif || ''}`
      : x.dossier === D.file ? (e.objectif || '(en-tête invalide)')
      : x.verdict ? (x.verdict.verdict === 'PASS' ? `${x.verdict.date} · ${x.verdict.duree_s}s · ${x.verdict.lignes} l.` : x.verdict.ligne) : 'sans verdict'
    L.push(`| ${x.id} | ${e.type || '?'} | ${x.dossier} | ${executant} | ${verdict} | ${echapper(detail)} |`)
  }
  if (tout.length > MAX_LIGNES_DIGEST) L.push('', `… ${tout.length - MAX_LIGNES_DIGEST} tâche(s) de plus : voir \`.orchestre/verdicts.jsonl\`.`)
  ecrire(DIGEST, L.join('\n') + '\n')
}

// ── contexte : la carte, tirée du code, jamais de la mémoire ──────────────────────────────────────
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
const urlDe = (f) => '/' + rel(f).replace(/^app\//, '').replace(/\/?(page|route)\.tsx?$/, '').split('/').filter((s) => s && !/^\(.*\)$/.test(s)).join('/')
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
function contexte(silencieux = false) {
  preparer()
  const pages = marcher(path.join(RACINE, 'app'), (p) => /[\\/]page\.tsx?$/.test(p)).map((f) => ({ url: urlDe(f) }))
  const api = marcher(path.join(RACINE, 'app', 'api'), (p) => /[\\/]route\.ts$/.test(p)).map((f) => {
    const src = lire(f)
    const methodes = new Set()
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)) methodes.add(m[1])
    for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(',')) { const v = n.trim().split(/\s+as\s+/).pop(); if (/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(v)) methodes.add(v) }
    return { url: urlDe(f).replace(/^\/api/, ''), suffixe: methodes.size ? ` [${[...methodes].join(' ')}]` : '' }
  })
  const lib = marcher(path.join(RACINE, 'lib'), (p) => /\.tsx?$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p)).map((f) => {
    const noms = [...lire(f).matchAll(/^export\s+(?:async\s+)?(?:const|function|type|interface|class|enum)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
    return `- \`${rel(f)}\` (${noms.length}) : ${noms.slice(0, 8).join(', ')}${noms.length > 8 ? ', …' : ''}`
  })
  const flags = [...bloc(existe(path.join(RACINE, 'lib', 'flags.ts')) ? lire(path.join(RACINE, 'lib', 'flags.ts')) : '', 'export const FLAGS').matchAll(/^\s*([A-Za-z_]\w*):\s*(true|false)\s*,?\s*$/gm)].map((m) => `${m[1]}=${m[2]}`)
  const plansSrc = existe(path.join(RACINE, 'lib', 'plans.ts')) ? lire(path.join(RACINE, 'lib', 'plans.ts')) : ''
  const capacites = [...(plansSrc.match(/export type Capacite =([\s\S]*?)\n\n/) || ['', ''])[1].matchAll(/'([\w.]+)'/g)].map((m) => m[1])
  const plans = [...bloc(plansSrc, 'export const PLANS').matchAll(/^\s*(\w+):\s*\{\s*label:\s*'([^']*)'[^\n]*?prixMois:\s*(\d+)[^\n]*?capacites:\s*(\w+)/gm)].map((m) => `${m[1]} (${m[2]}, ${m[3]} €/mois, ${m[4]})`)
  const grille = [...bloc(plansSrc, 'const GRILLE_COMPLETE').matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1])
  const migrations = existe(path.join(RACINE, 'supabase', 'migrations')) ? fs.readdirSync(path.join(RACINE, 'supabase', 'migrations')).filter((f) => f.endsWith('.sql') && !f.startsWith('_A_COLLER')).sort() : []
  const scripts = existe(path.join(RACINE, 'scripts')) ? fs.readdirSync(path.join(RACINE, 'scripts')).filter((f) => f.endsWith('.mjs')) : []
  const etat = existe(DIGEST) ? (lire(DIGEST).match(/^\*\*État\*\* — (.*)$/m) || [, '?'])[1] : 'pas de digest'
  const L = [
    `# Carte du code — Presti (${maintenant()})`, '',
    '> Générée par `node scripts/orchestre.mjs contexte` depuis le code, jamais à la main. Une page : ce que le code FAIT.',
    '> Pourquoi on l’a décidé vit dans le vault (`../SaaS` : `CLAUDE.md`, `Decisions/`, `Récap-Projet.md`). Où en est le chantier : `.orchestre/digest.md`.', '',
    `## Pages (${pages.length}) — \`app/**/page.tsx\``, ...grouper(pages), '',
    `## API (${api.length}) — \`app/api/**/route.ts\`, préfixe \`/api\``, ...grouper(api), '',
    `## Drapeaux — \`lib/flags.ts\` (${flags.length}) : une fonctionnalité non finie n'apparaît pas`, flags.join(' · ') || '(non extraits)', '',
    `## Formules — \`lib/plans.ts\``,
    `- plans : ${plans.join(' · ') || '(non extraits)'}`,
    `- capacités (${capacites.length}) : ${capacites.join(', ') || '(non extraites)'}`,
    `- grille complète (${grille.length} lignes) : ${grille.join(' · ') || '(non extraite)'}`, '',
    `## Bibliothèque — \`lib/\` (${lib.length} fichiers, exports nommés)`, ...lib, '',
    `## Migrations — \`supabase/migrations\` (${migrations.length})`,
    `- dernières : ${migrations.slice(-5).join(', ')}`,
    '- les `_A_COLLER_sql_editor_NNNN(.NU).sql` sont les versions à coller dans l’éditeur SQL Supabase (CLAUDE.md « Poser une migration ») — une migration n’existe en prod que collée.', '',
    `## Scripts — \`scripts/\` (${scripts.length} .mjs, dont ${scripts.filter((s) => s.endsWith('-e2e.mjs')).length} suites e2e ; l’enchaînement : \`tout-verifier.mjs\`)`, '',
    `## Orchestre — ${etat}`, '',
  ]
  ecrire(CONTEXTE, L.join('\n') + '\n')
  if (existe(VAULT)) ecrire(CARTE_VAULT, L.join('\n') + '\n')
  poserBlocMethode()
  if (!silencieux) console.log(`✓ contexte : ${pages.length} pages · ${api.length} routes API · ${lib.length} fichiers lib · ${flags.length} drapeaux · ${migrations.length} migrations → ${rel(CONTEXTE)}${existe(VAULT) ? ' + ' + path.relative(path.dirname(RACINE), CARTE_VAULT).split(path.sep).join('/') : ''}`)
}

// ── Le bloc « Méthode », identique dans CLAUDE.md et AGENTS.md, tenu à jour ici ──────────────────
const DEBUT_BLOC = '<!-- orchestre:debut — bloc tenu à jour par `node scripts/orchestre.mjs contexte` ; ne pas éditer à la main -->'
const FIN_BLOC = '<!-- orchestre:fin -->'
const BLOC_METHODE = `${DEBUT_BLOC}
## Méthode — Claude Code × Antigravity (prompt v15 §1)

1. **Claude Code pense, Antigravity produit.** Claude Code n'écrit lui-même que ce qui exige du jugement : schéma et migrations, tout ce qui touche à l'argent (Stripe), sécurité/RLS/verrous, les cerveaux (prompts) et les verdicts. Tout le reste — variantes de sites, contenus SEO, tests Playwright, captures, boucles Lighthouse — est une tâche déposée dans \`.orchestre/file/\`.
2. **Le système vit dans \`.orchestre/\`** : \`file/\` (à prendre) → \`en-cours/\` (verrou \`<id>.lock\`) → \`fait/\` ou \`refuse/\`. Une tâche = un Markdown à en-tête YAML (\`id, type, objectif, perimetre, interdit, verifier, budget, preuve\` — tous obligatoires) ; \`node scripts/orchestre.mjs prochaine --agent=<nom>\` la distribue sans chevauchement de périmètre.
3. **La vérification est mécanique** : \`node scripts/orchestre.mjs verifier <id>\` exécute la commande \`verifier\` de la tâche ; son code de sortie fait le verdict, écrit dans \`.orchestre/digest.md\`. Personne ne relit un diff : on lit le digest.
4. **Ce que le code fait vit dans \`.orchestre/contexte.md\`** (régénéré depuis le code, copié dans \`../SaaS/Produit/Carte-du-code.md\`) ; **pourquoi on l'a décidé vit dans le vault** \`../SaaS\` (\`CLAUDE.md\`, \`Decisions/\`, \`Récap-Projet.md\`). Avant toute tâche : lire ces deux cartes, pas le dépôt. On n'écrit dans le vault que par une tâche dont le périmètre est \`SaaS/…\`.
5. **Bloqué = une question à options** : \`.orchestre/en-cours/<id>.question.md\`, deux ou trois options numérotées ; la réponse arrive en \`<id>.reponse.md\` (\`orchestre.mjs repondre\`). Jamais une discussion.

Conventions communes : identifiants et commentaires en français · zéro donnée réelle dans les tests · « une fonctionnalité non finie n'apparaît pas » (drapeau dans \`lib/flags.ts\`) · on ne touche jamais à \`interdit\`, même pour aider · aucun chiffre non sourcé, aucun secret dans un fichier versionné · une preuve est une sortie de commande, pas une paraphrase.
${FIN_BLOC}`
function remplacerBloc(source, insererAvantPremiereSection = false) {
  const i = source.indexOf(DEBUT_BLOC), j = source.indexOf(FIN_BLOC)
  if (i >= 0 && j > i) return source.slice(0, i) + BLOC_METHODE + source.slice(j + FIN_BLOC.length)
  if (insererAvantPremiereSection) {
    const k = source.indexOf('\n## ')
    return k < 0 ? `${source.trimEnd()}\n\n${BLOC_METHODE}\n` : `${source.slice(0, k)}\n${BLOC_METHODE}\n${source.slice(k)}`
  }
  return `${source.trimEnd()}\n\n${BLOC_METHODE}\n`
}
const AGENTS_MD = `# AGENTS.md — règles pour Antigravity (et tout exécutant) dans le dépôt Presti

Presti est un SaaS Next.js + Supabase pour les artisans du bâtiment (plateforme de conversation, devis, factures, site).
Tu n'explores pas le dépôt : tu lis \`.orchestre/contexte.md\` (ce que le code fait) et, dans le vault voisin \`../SaaS\`,
\`CLAUDE.md\` puis \`Produit/Carte-du-code.md\` (pourquoi). Puis tu prends une tâche.

## La boucle d'un exécutant

1. \`node scripts/orchestre.mjs prochaine --agent=<ton-nom>\` — la tâche s'affiche en entier, avec ce qu'il faut faire à la fin.
2. Tu travailles UNIQUEMENT dans \`perimetre\`. \`interdit\` reste intact, même pour « aider ». Le \`budget\` (fichiers, minutes) est une limite, pas une cible.
3. Tu déposes ta preuve dans \`.orchestre/preuves/<id>/\` : la sortie de la commande \`verifier\`. Les captures d'écran sont prises par le juge (\`scripts/lib/capture.mjs\`) quand le vérificateur le prévoit — jamais une image fabriquée, jamais un fichier copié : c'est un refus, et la tâche repart en file.
4. Tu lances \`node scripts/orchestre.mjs verifier <id>\` autant de fois que nécessaire tant que la tâche est en \`en-cours/\`.
5. Vert ? Tu déplaces le fichier de \`en-cours/\` vers \`fait/\` et tu relances \`verifier <id>\` : ce verdict-là compte.
6. Bloqué ? \`.orchestre/en-cours/<id>.question.md\` avec deux ou trois options numérotées. Tu attends \`<id>.reponse.md\`. Jamais un paragraphe.
7. Tu abandonnes ? \`node scripts/orchestre.mjs liberer <id>\`.

Plusieurs agents peuvent tourner en même temps : \`prochaine\` ne donne jamais deux tâches aux périmètres qui se chevauchent.

${BLOC_METHODE}
`
function poserBlocMethode() {
  const claude = path.join(RACINE, 'CLAUDE.md')
  if (existe(claude)) { const s = lire(claude); const n = remplacerBloc(s, true); if (n !== s) fs.writeFileSync(claude, n) }
  const agents = path.join(RACINE, 'AGENTS.md')
  if (!existe(agents)) fs.writeFileSync(agents, AGENTS_MD)
  else { const s = lire(agents); const n = remplacerBloc(s); if (n !== s) fs.writeFileSync(agents, n) }
}

// ── petites commandes ────────────────────────────────────────────────────────────────────────────
function valider(fichier) {
  const t = lireTache(path.resolve(RACINE, fichier))
  if (t.erreurs.length) { console.log(`✗ ${fichier}\n  ${t.erreurs.join('\n  ')}`); process.exit(1) }
  console.log(`✓ ${fichier} : ${t.entete.id} · ${t.entete.type} · ${t.entete.executant || 'antigravity'} · périmètre ${t.entete.perimetre.join(', ')} · budget ${t.entete.budget.fichiers} fichiers / ${t.entete.budget.minutes} min`)
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

const USAGE = lire(fileURLToPath(import.meta.url)).split('\n').filter((l) => l.startsWith('//')).slice(6, 17).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')
const [, , commande, ...args] = process.argv
const option = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null }
switch (commande) {
  case 'prochaine': {
    const agent = option('agent')
    if (!agent) { console.error('✗ --agent=<nom> obligatoire : le verrou porte le nom de qui travaille'); process.exit(1) }
    prochaine(agent, option('tache')); break
  }
  case 'verifier': if (!args[0]) { console.error('✗ verifier <id>'); process.exit(1) } await verifier(args[0]); break
  case 'digest': digest(); console.log(`✓ ${rel(DIGEST)} régénéré`); break
  case 'contexte': contexte(); break
  case 'valider': if (!args[0]) { console.error('✗ valider <fichier.md>'); process.exit(1) } valider(args[0]); break
  case 'repondre': repondre(args[0], args[1], args.slice(2).join(' ')); break
  case 'liberer': deplacer(args[0], D.enCours, D.file, 'rendue à la file, verrou levé'); break
  case 'rejouer': deplacer(args[0], D.refuse, D.file, 'remise en file'); break
  default: console.log(USAGE); process.exit(commande ? 1 : 0)
}
