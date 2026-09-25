#!/usr/bin/env node
// scripts/juges-026-mutations-preuve.mjs — le méta-juge des fiches de mutations de la série 026 (fiche 026-001), écrit par
// Claude Code.
//
// Pourquoi (revue du 24/09, B1) : les fiches de mutations sont exécutées par Codex. Si leur `verifier` était le script que
// Codex écrit, un `process.exit(0)` suivi d'un faux rapport donnerait un PASS. Le `verifier` de chaque fiche de mutations
// est donc ce méta-juge : il lance le script de mutations, relit son rapport, REFAIT LUI-MÊME au moins trois mutations
// tirées au hasard sur sa propre copie, et vérifie que rien n'a bougé dans les dépôts. Il ne croit aucun extrait qu'il
// n'a pas reproduit.
//
//   MP-1  le script sort en code 0 dans son temps (20 min au plus) ; le rapport existe, n'est pas vide, se lit, et chaque
//         entrée porte ses champs { juge, commande, fichier, avant, apres, critere, extrait, duree_s } (`apres` peut être
//         vide ; `extrait` de 20 signes au moins ; `critere` de la forme [A-Z0-9]{1,5}-[A-Z0-9-]+ ; `commande` écrit la
//         copie {racine} ou {source}).
//   MP-2  chaque juge de la liste imposée de la fiche (section « ## Juges contre-vérifiés (liste lue par le méta-juge) »)
//         a au moins une entrée, et chacun de ses critères (ou l'un de ses interchangeables, séparés par `|`) est le
//         `critere` d'au moins une entrée de ce juge.
//   MP-3  au moins trois contre-mutations tirées au hasard (graine affichée, --graine pour rejouer), refaites sur une copie
//         du méta-juge : copie intacte en code 0, copie mutée en code ≠ 0 avec `critere` dans une ligne en échec. Un
//         plantage, un délai ou un autre critère comptent comme une mutation non prise.
//   MP-4  invariant : empreintes des fichiers (suivis et non ignorés) et `git status --porcelain` des deux dépôts
//         identiques avant et après, hors .orchestre/travail/, .orchestre/preuves/, l'état de l'orchestre (digest,
//         verdicts, agents, contexte, file/en-cours/fait/refuse, que les autres sessions écrivent) et les périmètres des
//         fiches de en-cours/ ; aucune jonction laissée sous .orchestre/travail/juges-026-mutations-preuve/.
//   MP-5  .orchestre/preuves/<id>/mutations-contre-verifiees.md est écrit ici, non vide, et chacun de ses extraits se
//         retrouve dans la sortie que le méta-juge vient de produire.
//
// Usage :
//   node scripts/juges-026-mutations-preuve.mjs --fiche=<id> --script=<scripts/juges-026-…-mutations.mjs>
//        --rapport=.orchestre/preuves/<id>/mutations.json [--graine=<n>]
//   node scripts/juges-026-mutations-preuve.mjs --autotest
//        le mini-dépôt de scripts/fixtures/026/mutations-preuve/, copié sous .orchestre/travail/juges-026-mutations-preuve/
//        autotest/<cas>/ : le script honnête → code 0 ; sans rapport → MP-1 ; critère omis → MP-2 ; mutation que le juge
//        n'attrape pas → MP-3 (graine fixée pour la tirer) ; dépôt laissé modifié → MP-4. Écrit
//        .orchestre/preuves/026-001/meta-juge-autotest.md.
//   (--racine=<dossier> et --orchestre=<dossier> remplacent les deux dépôts : l'autotest s'en sert pour ses copies.)
// Code 0 si tout est vert, 1 sinon, 2 si l'appel est invalide. N'écrit que sous .orchestre/travail/ et .orchestre/preuves/.
// Aucun appel réseau. Les jonctions node_modules et public sont retirées par fs.unlinkSync, jamais par une suppression
// récursive : une suppression récursive qui traverse une jonction viderait node_modules ou public.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const CE_SCRIPT = fileURLToPath(import.meta.url)
const PRESTI = path.resolve(path.dirname(CE_SCRIPT), '..')
const NOM = 'juges-026-mutations-preuve'
const FIXTURES = path.join(PRESTI, 'scripts', 'fixtures', '026', 'mutations-preuve')
const CRITERES = ['MP-1', 'MP-2', 'MP-3', 'MP-4', 'MP-5']
const MAX_SCRIPT_MIN = 20
const MAX_MINUTES = 30 // plafond de l'orchestre (maxMinutes) : le budget d'une fiche ne le dépasse jamais
const NB_CONTRE = 3
const RE_CRITERE = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/
const CHAMPS = ['juge', 'commande', 'fichier', 'avant', 'apres', 'critere', 'extrait', 'duree_s']
// La copie du dépôt presti : ces dossiers (fichiers suivis ou non ignorés), ces fichiers de la racine, ces jonctions.
const DOSSIERS_COPIE = ['app', 'lib', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', '.orchestre/brouillons-ecosysteme']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
const JONCTIONS = ['node_modules', 'public']
const FILE_ORCHESTRE = ['file', 'en-cours', 'fait', 'refuse']
const ETAT_ORCHESTRE = ['.orchestre/digest.md', '.orchestre/verdicts.jsonl', '.orchestre/agents.jsonl', '.orchestre/contexte.md']
// L'autotest : un cas par défaut que le méta-juge doit attraper. La graine du cas MP-3 est choisie pour tirer la mutation
// fausse (la 5e entrée du rapport) ; si le tirage change, le cas passe au rouge au lieu de rester vert par hasard.
const CAS_AUTOTEST = [
  { nom: 'honnete', script: 'scripts/mutations-honnete.mjs', attendu: null },
  { nom: 'sans-rapport', script: 'scripts/mutations-sans-rapport.mjs', attendu: 'MP-1', motif: 'rapport absent' },
  { nom: 'critere-omis', script: 'scripts/mutations-critere-omis.mjs', attendu: 'MP-2', motif: 'XQ-2 | XQ-3' },
  { nom: 'mutation-fausse', script: 'scripts/mutations-fausse.mjs', attendu: 'MP-3', graine: 2, motif: "le signe d'un nombre, 1 pour zéro" },
  { nom: 'depot-laisse-modifie', script: 'scripts/mutations-sale.mjs', attendu: 'MP-4', motif: 'lib/module.mjs' },
]

const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const versSlash = (p) => String(p).split(path.sep).join('/')
const court = (t, n = 200) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const normChemin = (p) => versSlash(String(p).trim().replace(/^["'`]|["'`]$/g, '')).replace(/^\.\//, '')
const sous = (enfant, parent) => { const r = path.relative(parent, enfant); return !!r && !r.startsWith('..') && !path.isAbsolute(r) }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

// ── Options ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function refuser(m) { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
function lireOptions(argv) {
  const o = { fiche: null, script: null, rapport: null, graine: null, autotest: false, racine: null, orchestre: null }
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a)
    if (!m) refuser(`argument inattendu : ${a}`)
    const [, cle, val] = m
    if (cle === 'autotest') { if (val !== undefined) refuser('--autotest ne prend pas de valeur'); o.autotest = true }
    else if (['fiche', 'script', 'rapport', 'graine', 'racine', 'orchestre'].includes(cle)) { if (!val) refuser(`--${cle} attend une valeur : --${cle}=<…>`); o[cle] = val }
    else refuser(`option inconnue : --${cle} (connues : --fiche=, --script=, --rapport=, --graine=, --autotest)`)
  }
  if (o.autotest) { if (o.fiche || o.script || o.rapport) refuser('--autotest se lance seul'); return o }
  if (!o.fiche || !o.script || !o.rapport) refuser('--fiche=<id> --script=<chemin> --rapport=<chemin> sont obligatoires (ou --autotest)')
  if (!/^\d{3}-\d{2,3}$/.test(o.fiche)) refuser(`--fiche : id attendu de la forme 026-NNN : ${o.fiche}`)
  if (o.graine !== null && !/^\d{1,10}$/.test(o.graine)) refuser(`--graine : entier attendu : ${o.graine}`)
  o.racine = o.racine ? path.resolve(o.racine) : PRESTI
  if (!existe(o.racine)) refuser(`--racine introuvable : ${o.racine}`)
  // Le dépôt orchestre : ../orchestre à côté de presti ; aucun quand --racine remplace presti sans --orchestre.
  o.orchestre = o.orchestre ? path.resolve(o.orchestre) : (o.racine === PRESTI ? path.resolve(PRESTI, '..', 'orchestre') : null)
  if (o.orchestre && !existe(path.join(o.orchestre, '.git'))) o.orchestre = null
  o.script = normChemin(o.script)
  o.rapport = normChemin(o.rapport)
  if (path.isAbsolute(o.script) || o.script.split('/').includes('..') || !/\.mjs$/.test(o.script)) refuser(`--script : chemin relatif .mjs du dépôt attendu : ${o.script}`)
  if (o.script === 'scripts/juges-026-mutations-preuve.mjs') refuser('--script ne peut pas être le méta-juge lui-même')
  if (!existe(path.join(o.racine, o.script))) refuser(`--script introuvable : ${o.script}`)
  if (!o.rapport.startsWith(`.orchestre/preuves/${o.fiche}/`) || o.rapport.split('/').includes('..')) refuser(`--rapport : attendu sous .orchestre/preuves/${o.fiche}/ : ${o.rapport}`)
  return o
}

// ── La fiche : son budget et sa liste imposée ─────────────────────────────────────────────────────────────────────────────
function trouverFiche(racine, id) {
  const orch = path.join(racine, '.orchestre')
  const serie = id.slice(0, 3)
  const lieux = [...FILE_ORCHESTRE.map((d) => path.join(orch, d, `${id}.md`)), path.join(orch, 'brouillons-ecosysteme', serie, `${id}.md`), path.join(orch, 'brouillons-ecosysteme', `${id}.md`)]
  return lieux.find(existe) || null
}
function budgetMinutes(texte) {
  const m = /^budget:\s*\{[^}\n]*\bminutes:\s*(\d+)/m.exec(texte)
  return Math.min(m ? Number(m[1]) : MAX_MINUTES, MAX_MINUTES)
}
/** La section « ## Juges contre-vérifiés (liste lue par le méta-juge) » : [{ juge, groupes: [[crit, alt…], …], ligne }]. */
function listeImposee(texte) {
  const L = texte.replace(/\r\n/g, '\n').split('\n')
  const i = L.findIndex((l) => /^## Juges contre-vérifiés \(liste lue par le méta-juge\)/.test(l))
  if (i < 0) return { liste: null, fautes: [] }
  const liste = [], fautes = []
  for (let j = i + 1; j < L.length && !/^## /.test(L[j]); j++) {
    if (!/^\s*-\s/.test(L[j])) continue
    const m = /^\s*-\s*`([^`]+)`\s*:\s*(.+?)\s*\.?\s*$/.exec(L[j])
    if (!m) { fautes.push(`ligne illisible : ${court(L[j], 100)}`); continue }
    const groupes = m[2].split(',').map((g) => g.split('|').map((x) => x.trim()).filter(Boolean)).filter((g) => g.length)
    const mauvais = groupes.flat().filter((c) => !RE_CRITERE.test(c))
    if (mauvais.length || !groupes.length) { fautes.push(`critère(s) mal formé(s) dans : ${court(L[j], 100)}`); continue }
    liste.push({ juge: normChemin(m[1]), groupes, ligne: L[j].trim() })
  }
  return { liste, fautes }
}

// ── Les dépôts : empreintes et `git status --porcelain` ─────────────────────────────────────────────────────────────────
function git(racine, args) {
  for (let essai = 0; essai < 4; essai++) {
    const r = spawnSync('git', ['-C', racine, ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 })
    if (r.status === 0) return r.stdout
    dormir(400) // un index.lock d'une autre session : on réessaie
  }
  return null
}
const prefixe = (g) => normChemin(g).split(/[*?{]/)[0]
/** Les préfixes des périmètres des fiches de en-cours/ : l'autre exécutant peut y écrire pendant ce temps (hygiène, point 6). */
function perimetresEnCours(racine) {
  const d = path.join(racine, '.orchestre', 'en-cours')
  if (!existe(d)) return []
  const out = []
  for (const f of fs.readdirSync(d)) {
    if (!/^\d{3}-[\w-]+\.md$/.test(f) || /\.(question|reponse)\.md$/.test(f)) continue
    const m = /^perimetre:\s*\[(.*)\]\s*$/m.exec(lire(path.join(d, f)))
    if (m) for (const g of m[1].split(',')) { const p = prefixe(g); if (p) out.push(p) }
  }
  return out
}
function exclu(rel, ignores, estPresti) {
  if (estPresti) {
    if (rel.startsWith('.orchestre/travail/') || rel.startsWith('.orchestre/preuves/')) return true
    if (ETAT_ORCHESTRE.includes(rel) || FILE_ORCHESTRE.some((d) => rel.startsWith(`.orchestre/${d}/`))) return true
  }
  return ignores.some((p) => rel.startsWith(p) || p.startsWith(rel))
}
function hacher(p) {
  try {
    const st = fs.statSync(p)
    if (!st.isFile()) return `autre:${st.mode}`
    if (st.size > 16 * 1024 * 1024) return `taille:${st.size}:${st.mtimeMs}`
    return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex')
  } catch { return 'absent' }
}
/** L'état d'un dépôt : l'empreinte de chaque fichier suivi ou non ignoré, et `git status --porcelain` (non suivis compris). */
function etatDepot(racine, estPresti) {
  const ignores = estPresti ? perimetresEnCours(racine) : []
  const liste = git(racine, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
  const statut = git(racine, ['status', '--porcelain', '--untracked-files=all'])
  if (liste === null || statut === null) return { racine, erreur: `git illisible dans ${versSlash(racine)}` }
  const empreintes = new Map()
  for (const rel of [...new Set(liste.split('\0').filter(Boolean))].sort()) if (!exclu(rel, ignores, estPresti)) empreintes.set(rel, hacher(path.join(racine, rel)))
  const porcelain = statut.split(/\r?\n/).filter(Boolean).filter((l) => {
    const chemins = l.slice(3).split(' -> ').map((c) => c.trim().replace(/^"|"$/g, ''))
    return !chemins.every((c) => exclu(c, ignores, estPresti))
  }).sort()
  return { racine, empreintes, porcelain, ignores }
}
function comparerEtats(avant, apres, nom) {
  if (avant.erreur || apres.erreur) return [`${nom} : ${avant.erreur || apres.erreur}`]
  const d = []
  for (const k of new Set([...avant.empreintes.keys(), ...apres.empreintes.keys()])) {
    const a = avant.empreintes.get(k), b = apres.empreintes.get(k)
    if (a !== b) d.push(`${nom} : ${k} ${a === undefined ? 'apparu' : b === undefined ? 'disparu de la liste' : b === 'absent' ? 'supprimé' : 'modifié'}`)
  }
  const A = new Set(avant.porcelain), B = new Set(apres.porcelain)
  for (const l of B) if (!A.has(l)) d.push(`${nom} : git status +« ${l} »`)
  for (const l of A) if (!B.has(l)) d.push(`${nom} : git status −« ${l} »`)
  return d
}

// ── Lancer un processus sous délai, arbre tué au besoin ──────────────────────────────────────────────────────────────────
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
const PLAFOND_SORTIE = 16 * 1024 * 1024
function executer({ fichier, args = [], commande = null, cwd, delaiMs }) {
  return new Promise((resoudre) => {
    const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
    const opts = { cwd, windowsHide: true, detached: process.platform !== 'win32', env }
    const enfant = commande ? spawn(commande, { ...opts, shell: true }) : spawn(fichier, args, opts)
    let sortie = '', expire = false
    const prendre = (d) => { if (sortie.length < PLAFOND_SORTIE) sortie += d }
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', prendre); enfant.stderr.on('data', prendre)
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)
    enfant.on('close', (code, signal) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), signal, sortie: sansAnsi(sortie), expire, duree: (Date.now() - t0) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, signal: null, sortie: `${sansAnsi(sortie)}\n${e.message}`, expire, duree: (Date.now() - t0) / 1000 }) })
  })
}

// ── Copies et jonctions ───────────────────────────────────────────────────────────────────────────────────────────────────
/** Retire toute jonction ou lien sous `dir` par fs.unlinkSync, sans jamais les traverser. Rend les chemins qui résistent. */
function retirerJonctions(dir) {
  const restent = []
  const parcourir = (d) => {
    let noms
    try { noms = fs.readdirSync(d) } catch { return }
    for (const n of noms) {
      const p = path.join(d, n)
      let st
      try { st = fs.lstatSync(p) } catch { continue }
      if (st.isSymbolicLink()) {
        try { fs.unlinkSync(p) } catch { /* vérifié ci-dessous */ }
        let encore = true
        try { fs.lstatSync(p) } catch { encore = false }
        if (encore) restent.push(p)
      } else if (st.isDirectory()) parcourir(p)
    }
  }
  if (existe(dir)) parcourir(dir)
  return restent
}
function jonctionsSous(dir) {
  const out = []
  const parcourir = (d) => {
    let noms
    try { noms = fs.readdirSync(d) } catch { return }
    for (const n of noms) {
      const p = path.join(d, n)
      let st
      try { st = fs.lstatSync(p) } catch { continue }
      if (st.isSymbolicLink()) out.push(p)
      else if (st.isDirectory()) parcourir(p)
    }
  }
  if (existe(dir)) parcourir(dir)
  return out
}
/** Supprime une copie : jonctions d'abord (unlink), suppression récursive seulement s'il n'en reste aucune. */
function supprimerCopie(dir, borne) {
  if (!existe(dir)) return []
  if (!sous(dir, borne)) throw new Error(`suppression refusée hors de ${versSlash(borne)} : ${versSlash(dir)}`)
  const restent = retirerJonctions(dir)
  if (restent.length) return restent
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  return []
}
function copierFichiers(source, dest, rels) {
  let n = 0
  for (const rel of rels) {
    const s = path.join(source, rel)
    let st
    try { st = fs.lstatSync(s) } catch { continue } // suivi mais supprimé de l'arbre de travail
    if (!st.isFile()) continue
    const d = path.join(dest, rel)
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.copyFileSync(s, d)
    n++
  }
  return n
}
function jonction(cible, lien, jonctions) {
  if (!existe(cible)) return
  fs.symlinkSync(cible, lien, 'junction')
  jonctions.push(lien)
}
/** La copie du dépôt presti (ou de ce qui le remplace) : dossiers de DOSSIERS_COPIE, fichiers de la racine, jonctions. */
function copierPresti(racine, dest, jonctions) {
  const dossiers = DOSSIERS_COPIE.filter((d) => existe(path.join(racine, d)))
  const rels = dossiers.length ? (git(racine, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...dossiers]) || '').split('\0').filter(Boolean) : []
  const n = copierFichiers(racine, dest, [...rels, ...FICHIERS_RACINE.filter((f) => existe(path.join(racine, f)))])
  for (const j of JONCTIONS) jonction(path.join(racine, j), path.join(dest, j), jonctions)
  return n
}
/** La copie du dépôt orchestre, sans .git. */
function copierOrchestre(orchestre, dest, jonctions) {
  const rels = (git(orchestre, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']) || '').split('\0').filter(Boolean)
  const n = copierFichiers(orchestre, dest, rels)
  jonction(path.join(orchestre, 'node_modules'), path.join(dest, 'node_modules'), jonctions)
  return n
}

// ── Le rapport ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function lireRapport(fichier, debutMs) {
  if (!existe(fichier)) return { erreur: 'rapport absent' }
  const st = fs.statSync(fichier)
  if (!st.size) return { erreur: 'rapport de 0 octet' }
  if (st.mtimeMs < debutMs - 2000) return { erreur: 'rapport plus ancien que le lancement du script (pas écrit par ce lancement)' }
  let j
  try { j = JSON.parse(lire(fichier)) } catch (e) { return { erreur: `rapport illisible : ${e.message}` } }
  if (!j || !Array.isArray(j.mutations)) return { erreur: 'rapport sans liste « mutations »' }
  if (!j.mutations.length) return { erreur: 'rapport sans aucune mutation' }
  const valides = [], fautes = []
  j.mutations.forEach((e, i) => {
    const f = []
    if (!e || typeof e !== 'object') f.push('entrée qui n’est pas un objet')
    else {
      for (const c of CHAMPS) if (!(c in e)) f.push(`champ ${c} absent`)
      for (const c of ['juge', 'commande', 'fichier', 'avant', 'critere', 'extrait']) if (c in e && (typeof e[c] !== 'string' || !e[c].trim())) f.push(`${c} vide ou non texte`)
      if ('apres' in e && typeof e.apres !== 'string') f.push('apres non texte')
      if ('duree_s' in e && !(typeof e.duree_s === 'number' && Number.isFinite(e.duree_s) && e.duree_s >= 0)) f.push('duree_s non numérique')
      if (typeof e.critere === 'string' && !RE_CRITERE.test(e.critere)) f.push(`critere « ${e.critere} » hors forme [A-Z0-9]{1,5}-[A-Z0-9-]+`)
      if (typeof e.extrait === 'string' && e.extrait.trim().length < 20) f.push('extrait de moins de 20 signes')
      if (typeof e.commande === 'string' && !/\{racine\}|\{source\}/.test(e.commande)) f.push('commande qui n’écrit la copie ni {racine} ni {source}')
      if (typeof e.fichier === 'string') {
        const fi = normChemin(e.fichier)
        const reste = fi.startsWith('../orchestre/') ? fi.slice('../orchestre/'.length) : fi
        if (path.isAbsolute(fi) || /^[A-Za-z]:/.test(fi) || reste.split('/').includes('..')) f.push(`fichier hors des deux dépôts : ${fi}`)
      }
    }
    if (f.length) fautes.push(`entrée ${i + 1} : ${f.join(', ')}`)
    else valides.push({ ...e, n: i + 1, juge: normChemin(e.juge), fichier: normChemin(e.fichier) })
  })
  return { total: j.mutations.length, valides, fautes }
}

// ── Les contre-mutations ─────────────────────────────────────────────────────────────────────────────────────────────────
function mulberry32(graine) {
  let a = graine >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Tirage : mélange par la graine, puis celles dont deux passages tiennent dans le temps qui reste d'abord. */
function tirer(entrees, graine, resteS) {
  const alea = mulberry32(graine)
  const idx = entrees.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  const tient = (i) => 2 * (Number(entrees[i].duree_s) || 0) + 30 <= resteS / NB_CONTRE
  return [...idx.filter(tient), ...idx.filter((i) => !tient(i))].slice(0, NB_CONTRE).map((i) => entrees[i])
}
const RE_ECHEC = /FAIL|ÉCHEC|ECHEC|[ée]chec|✗|✘|not ok|\bKO\b|ERREUR/i
/** La première ligne en échec qui porte `critere` comme mot entier (CV-2 ne trouve pas CV-21). */
function ligneEnEchec(sortie, critere) {
  const re = new RegExp(`(?<![A-Za-z0-9])${echapperRe(critere)}(?![A-Za-z0-9])`)
  return String(sortie).split(/\r?\n/).find((l) => re.test(l) && RE_ECHEC.test(l) && !/^\s*(PASS|OK|✓)\b/.test(l)) || null
}
const plantage = (sortie) => /^\s+at .+:\d+:\d+\)?\s*$/m.test(sortie) && /\b\w*Error\b/.test(sortie)

async function contreMuter(e, k, ctx) {
  const dir = path.join(ctx.travail, String(k))
  const jonctions = []
  const res = { entree: e, codeIntact: null, codeMute: null, extraitReel: null, ok: false, raison: '', sortieMute: '' }
  try {
    const restes = supprimerCopie(dir, ctx.travail)
    if (restes.length) { res.raison = `copie précédente non nettoyable (jonction : ${restes.map(versSlash).join(', ')})`; return res }
    const dansOrchestre = e.fichier.startsWith('../orchestre/')
    const veutSource = dansOrchestre || e.commande.includes('{source}')
    const veutRacine = !dansOrchestre || e.commande.includes('{racine}') || !veutSource
    if (veutSource && !ctx.orchestre) { res.raison = 'la mutation vise le dépôt orchestre, introuvable ici'; return res }
    const racineCopie = path.join(dir, 'presti'), sourceCopie = path.join(dir, 'orchestre')
    if (veutRacine) copierPresti(ctx.racine, racineCopie, jonctions)
    if (veutSource) copierOrchestre(ctx.orchestre, sourceCopie, jonctions)
    const commande = e.commande.replaceAll('{racine}', versSlash(racineCopie)).replaceAll('{source}', versSlash(sourceCopie))
    const cwd = veutRacine ? racineCopie : sourceCopie
    const resteMs = Math.max(60_000, ctx.finMs - Date.now())
    const delaiMs = Math.min(resteMs, Math.max(60_000, (3 * (Number(e.duree_s) || 0) + 60) * 1000))
    // 1. La copie intacte : code 0 exigé.
    const intact = await executer({ commande, cwd, delaiMs })
    res.codeIntact = intact.code
    ecrire(path.join(ctx.journaux, `contre-${k}-intact.log`), `$ ${commande}\n# code ${intact.code} · ${intact.duree.toFixed(1)} s\n\n${intact.sortie}`)
    if (intact.code !== 0) { res.raison = `copie intacte en code ${intact.code}${intact.expire ? ' (délai dépassé)' : ''} : ${court(intact.sortie.split(/\r?\n/).filter(Boolean).at(-1) || '', 120)}`; return res }
    // 2. La mutation : `avant` exactement une fois dans `fichier`.
    const cible = dansOrchestre ? path.join(sourceCopie, e.fichier.slice('../orchestre/'.length)) : path.join(racineCopie, e.fichier)
    if (!existe(cible)) { res.raison = `fichier à muter introuvable dans la copie : ${e.fichier}`; return res }
    const texte = lire(cible)
    const n = texte.split(e.avant).length - 1
    if (n !== 1) { res.raison = `« avant » présent ${n} fois dans ${e.fichier} (une seule attendue)`; return res }
    const i = texte.indexOf(e.avant)
    fs.writeFileSync(cible, texte.slice(0, i) + e.apres + texte.slice(i + e.avant.length))
    // 3. La copie mutée : code ≠ 0 exigé, avec `critere` dans une ligne en échec.
    const mute = await executer({ commande, cwd, delaiMs })
    res.codeMute = mute.code
    res.sortieMute = mute.sortie
    ecrire(path.join(ctx.journaux, `contre-${k}-mute.log`), `$ ${commande}\n# ${e.fichier} : « ${e.avant} » → « ${e.apres} »\n# code ${mute.code} · ${mute.duree.toFixed(1)} s\n\n${mute.sortie}`)
    const ligne = ligneEnEchec(mute.sortie, e.critere)
    if (mute.expire) res.raison = `délai dépassé sur la copie mutée (${Math.round(delaiMs / 1000)} s)`
    else if (mute.code === 0) res.raison = 'copie mutée en code 0 : la mutation n’est pas attrapée'
    else if (!ligne) res.raison = `${plantage(mute.sortie) ? 'plantage' : `code ${mute.code}`} sans ligne en échec qui porte ${e.critere} (en échec : ${court(mute.sortie.split(/\r?\n/).filter((l) => RE_ECHEC.test(l))[0] || '—', 100)})`
    else { res.ok = true; res.extraitReel = ligne.trim() }
    return res
  } catch (err) {
    res.raison = `exception du méta-juge : ${err.message}`
    return res
  } finally {
    for (const j of jonctions) { try { fs.unlinkSync(j) } catch { /* relevé par MP-4 */ } }
    try { supprimerCopie(dir, ctx.travail) } catch { /* relevé par MP-4 */ }
  }
}

// ── Le jugement d'une fiche de mutations ─────────────────────────────────────────────────────────────────────────────────
async function juger(o) {
  const debutMs = Date.now()
  const R = o.racine
  const travail = path.join(R, '.orchestre', 'travail', NOM)
  const journaux = path.join(travail, 'journaux', o.fiche)
  const preuves = path.join(R, '.orchestre', 'preuves', o.fiche)
  const D = Object.fromEntries(CRITERES.map((c) => [c, []]))
  const resume = {}
  const nonJuge = {}
  const graine = o.graine !== null ? Number(o.graine) : crypto.randomInt(1, 2 ** 31 - 1)
  console.log(`── ${NOM} : fiche ${o.fiche} · script ${o.script} · graine ${graine}${R !== PRESTI ? ` · dépôt ${versSlash(path.relative(PRESTI, R))}` : ''}`)

  const ficheChemin = trouverFiche(R, o.fiche)
  const ficheTexte = ficheChemin ? lire(ficheChemin) : ''
  const budgetS = budgetMinutes(ficheTexte) * 60

  // Nettoyage d'une copie laissée par un lancement coupé : jonctions retirées d'abord.
  for (const n of existe(travail) ? fs.readdirSync(travail) : []) if (/^\d+$/.test(n)) supprimerCopie(path.join(travail, n), travail)

  // État des deux dépôts AVANT le lancement.
  const avantP = etatDepot(R, true)
  const avantO = o.orchestre ? etatDepot(o.orchestre, false) : null

  // Un rapport d'un lancement précédent ne doit jamais passer pour celui-ci : il est mis de côté.
  const rapport = path.join(R, o.rapport)
  if (existe(rapport)) { const dest = path.join(journaux, 'rapport-precedent.json'); fs.mkdirSync(journaux, { recursive: true }); fs.copyFileSync(rapport, dest); fs.unlinkSync(rapport) }

  // MP-1 — le script de mutations, puis son rapport.
  const x = await executer({ fichier: process.execPath, args: [path.join(R, o.script)], cwd: R, delaiMs: MAX_SCRIPT_MIN * 60_000 })
  ecrire(path.join(journaux, 'script.log'), `$ node ${o.script}\n# code ${x.code} · ${x.duree.toFixed(1)} s\n\n${x.sortie}`)
  for (const l of x.sortie.split(/\r?\n/).filter(Boolean).slice(-8)) console.log(`  │ ${court(l, 180)}`)
  if (x.expire) D['MP-1'].push(`le script dépasse ${MAX_SCRIPT_MIN} min`)
  else if (x.code !== 0) D['MP-1'].push(`le script sort en code ${x.code}`)
  const rap = lireRapport(rapport, debutMs)
  if (rap.erreur) D['MP-1'].push(`${rap.erreur} (${o.rapport})`)
  else for (const f of rap.fautes) D['MP-1'].push(f)
  const entrees = rap.valides || []
  resume['MP-1'] = `script en code ${x.code} en ${x.duree.toFixed(1)} s ; rapport de ${rap.total || 0} entrée(s), ${entrees.length} complète(s)`

  // MP-2 — la liste imposée de la fiche.
  if (!ficheChemin) D['MP-2'].push(`fiche ${o.fiche} introuvable dans .orchestre/{${FILE_ORCHESTRE.join(',')}}/ ni dans les brouillons`)
  else {
    const { liste, fautes } = listeImposee(ficheTexte)
    if (!liste) D['MP-2'].push(`${o.fiche} : pas de section « ## Juges contre-vérifiés (liste lue par le méta-juge) »`)
    else {
      for (const f of fautes) D['MP-2'].push(`${o.fiche} : ${f}`)
      if (!liste.length) D['MP-2'].push(`${o.fiche} : liste imposée vide`)
      if (rap.erreur) nonJuge['MP-2'] = 'rapport illisible (MP-1)'
      else {
        let nCrit = 0
        for (const l of liste) {
          const siennes = entrees.filter((e) => e.juge === l.juge)
          if (!siennes.length) { D['MP-2'].push(`${l.juge} : aucune entrée dans le rapport`); continue }
          const vus = new Set(siennes.map((e) => e.critere))
          for (const g of l.groupes) { nCrit++; if (!g.some((c) => vus.has(c))) D['MP-2'].push(`${l.juge} : aucune entrée pour ${g.join(' | ')} (vus : ${[...vus].join(', ')})`) }
        }
        resume['MP-2'] = `liste imposée de ${o.fiche} : ${liste.length} juge(s), ${nCrit} critère(s) imposé(s), tous couverts par le rapport`
      }
    }
  }

  // MP-3 — les contre-mutations, sur les copies du méta-juge.
  const contre = []
  if (rap.erreur || !entrees.length) nonJuge['MP-3'] = 'aucune entrée lisible (MP-1)'
  else {
    if (entrees.length < NB_CONTRE) D['MP-3'].push(`${entrees.length} entrée(s) complète(s) : il en faut au moins ${NB_CONTRE} pour ${NB_CONTRE} contre-mutations`)
    const resteS = budgetS - (Date.now() - debutMs) / 1000 - 60
    const tirees = tirer(entrees, graine, resteS)
    const ctx = { racine: R, orchestre: o.orchestre, travail, journaux, finMs: debutMs + (budgetS - 30) * 1000 }
    for (let k = 0; k < tirees.length; k++) {
      const r = await contreMuter(tirees[k], k + 1, ctx)
      contre.push(r)
      console.log(`  ${r.ok ? '·' : '✗'} contre-mutation ${k + 1} : entrée ${r.entree.n} · ${r.entree.juge} · ${r.entree.critere} — intact ${r.codeIntact ?? '—'}, muté ${r.codeMute ?? '—'}${r.ok ? ` — « ${court(r.extraitReel, 110)} »` : ` — ${r.raison}`}`)
      if (!r.ok) D['MP-3'].push(`entrée ${r.entree.n} (${r.entree.juge}, ${r.entree.critere}, ${r.entree.fichier} : « ${court(r.entree.avant, 60)} » → « ${court(r.entree.apres, 40)} ») non prise : ${r.raison}`)
    }
    resume['MP-3'] = `${contre.length} contre-mutation(s) tirée(s) (graine ${graine}) : ${contre.filter((r) => r.ok).length} attrapée(s) par leur critère`
  }

  // MP-5 — le rapport du méta-juge, écrit ici, relu ici.
  const md = path.join(preuves, 'mutations-contre-verifiees.md')
  const L = [
    `# Contre-mutations du méta-juge — ${o.fiche}`, '',
    `> Écrit par \`node scripts/${NOM}.mjs --fiche=${o.fiche} --script=${o.script} --rapport=${o.rapport}\` le ${new Date().toISOString()}.`,
    `> Chaque mutation ci-dessous a été refaite par le méta-juge sur sa propre copie ; l'extrait est la ligne en échec qu'il a lue lui-même.`, '',
    `Graine : ${graine} (rejouer : \`--graine=${graine}\`).`, '',
  ]
  if (!contre.length) L.push(`Aucune contre-mutation : ${nonJuge['MP-3'] || 'rien à tirer'}.`)
  for (const [k, r] of contre.entries()) L.push(`- ${k + 1}. entrée ${r.entree.n} · \`${r.entree.juge}\` · ${r.entree.critere} · code intact ${r.codeIntact ?? '—'} · code muté ${r.codeMute ?? '—'} · ${r.ok ? 'attrapée' : `NON PRISE (${r.raison})`} · extrait : « ${r.ok ? r.extraitReel : '—'} »`)
  ecrire(md, L.join('\n') + '\n')
  if (!contre.length) nonJuge['MP-5'] = 'aucune contre-mutation (MP-3 non jugé)'
  else {
    const relu = existe(md) ? lire(md) : ''
    if (!relu.trim()) D['MP-5'].push('mutations-contre-verifiees.md vide ou absent')
    const lignes = relu.split(/\r?\n/).filter((l) => /^- \d+\. /.test(l))
    if (lignes.length !== contre.length) D['MP-5'].push(`${lignes.length} ligne(s) de contre-mutation relue(s) pour ${contre.length} faite(s)`)
    let nExtraits = 0
    lignes.forEach((l, k) => {
      const m = /extrait : « (.*) »$/.exec(l)
      const ex = m ? m[1] : null
      if (!ex || ex === '—') return
      nExtraits++
      if (!contre[k] || !contre[k].sortieMute.includes(ex)) D['MP-5'].push(`ligne ${k + 1} : extrait introuvable dans la sortie produite : « ${court(ex, 80)} »`)
    })
    resume['MP-5'] = `${versSlash(path.relative(R, md))} écrit (${nExtraits} extrait(s), tous retrouvés dans la sortie du méta-juge)`
  }

  // MP-4 — l'invariant, APRÈS tout (script et contre-mutations).
  const apresP = etatDepot(R, true)
  const apresO = o.orchestre ? etatDepot(o.orchestre, false) : null
  D['MP-4'].push(...comparerEtats(avantP, apresP, 'presti'))
  if (avantO) D['MP-4'].push(...comparerEtats(avantO, apresO, 'orchestre'))
  const laissees = jonctionsSous(travail)
  for (const j of laissees) D['MP-4'].push(`jonction laissée : ${versSlash(path.relative(R, j))}`)
  resume['MP-4'] = `empreintes (${avantP.empreintes ? avantP.empreintes.size : 0} fichier(s) presti${avantO && avantO.empreintes ? `, ${avantO.empreintes.size} orchestre` : ''}) et git status identiques avant et après ; aucune jonction laissée`

  // Verdict.
  for (const c of CRITERES) {
    if (D[c].length) {
      console.log(`FAIL ${c} — ${D[c].length} défaut(s) : ${court(D[c][0], 200)}`)
      for (const d of D[c].slice(0, 30)) console.log(`  ✗ ${c} ${court(d, 240)}`)
    } else if (nonJuge[c]) console.log(`---- ${c} — non jugé : ${nonJuge[c]}`)
    else console.log(`PASS ${c} — ${resume[c] || 'vert'}`)
  }
  const rouges = CRITERES.filter((c) => D[c].length)
  const ok = !rouges.length && !Object.keys(nonJuge).length
  console.log(`${NOM} : ${ok ? 'PASS' : `FAIL — ${rouges.join(', ') || 'critères non jugés'}`}`)
  return ok
}

// ── L'autotest ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function porcelainPresti() {
  const s = git(PRESTI, ['status', '--porcelain'])
  if (s === null) return null
  const ignores = perimetresEnCours(PRESTI)
  return s.split(/\r?\n/).filter(Boolean).filter((l) => {
    const chemins = l.slice(3).split(' -> ').map((c) => c.trim().replace(/^"|"$/g, ''))
    return !chemins.every((c) => c.startsWith('.orchestre/travail/') || c.startsWith('.orchestre/preuves/') || ignores.some((p) => c.startsWith(p) || p.startsWith(c)))
  }).sort().join('\n')
}
async function autotest() {
  const base = path.join(PRESTI, '.orchestre', 'travail', NOM, 'autotest')
  const lignes = [], resultats = []
  const depot = path.join(FIXTURES, 'depot'), fiche = path.join(FIXTURES, 'fiche-026-900.md')
  if (!existe(depot) || !existe(fiche)) return { ok: false, lignes: [`FAIL AM-0 — mini-dépôt introuvable : ${versSlash(path.relative(PRESTI, FIXTURES))}/{depot/,fiche-026-900.md}`], resultats }
  for (const k of CAS_AUTOTEST) {
    const copie = path.join(base, k.nom)
    const restes = supprimerCopie(copie, base)
    if (restes.length) { lignes.push(`FAIL AM-${k.nom} — copie précédente non nettoyable (jonction ${restes.map(versSlash).join(', ')})`); resultats.push({ ...k, ok: false, code: null, rouges: [], ligne: 'copie non nettoyable' }); continue }
    fs.cpSync(depot, copie, { recursive: true })
    ecrire(path.join(copie, '.orchestre', 'brouillons-ecosysteme', '026', '026-900.md'), lire(fiche))
    // Un vrai petit dépôt git (index seulement, aucun commit) : le méta-juge y prend ses empreintes comme dans presti.
    spawnSync('git', ['init', '-q'], { cwd: copie, windowsHide: true })
    spawnSync('git', ['-c', 'core.autocrlf=false', 'add', '-A'], { cwd: copie, windowsHide: true })
    const args = [CE_SCRIPT, '--fiche=026-900', `--script=${k.script}`, '--rapport=.orchestre/preuves/026-900/mutations.json', `--racine=${copie}`, ...(k.graine !== undefined ? [`--graine=${k.graine}`] : [])]
    const r = await executer({ fichier: process.execPath, args, cwd: PRESTI, delaiMs: 5 * 60_000 })
    ecrire(path.join(base, `${k.nom}.log`), `# code ${r.code} · ${r.duree.toFixed(1)} s\n\n${r.sortie}`)
    const rouges = [...new Set(r.sortie.split(/\r?\n/).map((l) => /^FAIL (MP-\d)\b/.exec(l)).filter(Boolean).map((m) => m[1]))]
    const lignesAttendu = k.attendu ? r.sortie.split(/\r?\n/).filter((l) => new RegExp(`^(?:FAIL|  ✗) ${k.attendu}\\b`).test(l)) : []
    const jonctionsRestees = jonctionsSous(copie)
    let ok, pourquoi, ligne
    if (!k.attendu) {
      ok = r.code === 0 && !rouges.length && /juges-026-mutations-preuve : PASS/.test(r.sortie) && !jonctionsRestees.length
      ligne = (r.sortie.split(/\r?\n/).find((l) => /^PASS MP-3/.test(l)) || '').trim()
      pourquoi = ok ? 'le script honnête passe (code 0, MP-1 à MP-5 verts)' : `aurait dû passer : code ${r.code}, en échec ${rouges.join(', ') || '—'}${jonctionsRestees.length ? ', jonction laissée' : ''}`
    } else {
      const porte = !k.motif || lignesAttendu.some((l) => l.includes(k.motif))
      const intrus = rouges.filter((c) => c !== k.attendu)
      ok = r.code === 1 && rouges.includes(k.attendu) && !intrus.length && porte && !jonctionsRestees.length
      ligne = court((k.motif ? lignesAttendu.find((l) => l.includes(k.motif)) : null) || lignesAttendu.find((l) => l.startsWith('  ✗')) || lignesAttendu[0] || '', 220)
      pourquoi = ok ? `attrapé par ${k.attendu}`
        : r.code !== 1 ? `code ${r.code} (1 attendu)`
        : !rouges.includes(k.attendu) ? `${k.attendu} n'est pas en échec (en échec : ${rouges.join(', ') || 'aucun'})`
        : intrus.length ? `critère(s) en échec en plus de ${k.attendu} : ${intrus.join(', ')}`
        : !porte ? `aucune ligne ${k.attendu} ne porte « ${k.motif} »`
        : `jonction laissée : ${jonctionsRestees.map(versSlash).join(', ')}`
    }
    resultats.push({ ...k, ok, code: r.code, rouges, ligne })
    lignes.push(`${ok ? 'PASS' : 'FAIL'} AM-${k.nom} — ${pourquoi}${ok && ligne ? ` · « ${court(ligne.trim(), 130)} »` : ''}`)
    if (!ok) for (const l of r.sortie.split(/\r?\n/).filter((x) => /^(FAIL|  ✗|---- )/.test(x)).slice(0, 8)) lignes.push(`    ${court(l, 200)}`)
    if (ok) supprimerCopie(copie, base) // une copie en échec reste pour l'enquête (sans jonction : le méta-juge les a retirées)
  }
  return { ok: resultats.every((x) => x.ok), lignes, resultats }
}

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptions(process.argv.slice(2))
  if (!o.autotest) process.exit((await juger(o)) ? 0 : 1)
  const avant = porcelainPresti()
  const at = await autotest()
  for (const l of at.lignes) console.log(l)
  const md = [
    '# Autotest du méta-juge des mutations', '',
    `> Écrit par \`node scripts/${NOM}.mjs --autotest\` le ${new Date().toISOString()}. Chaque cas tourne sur une copie du mini-dépôt \`scripts/fixtures/026/mutations-preuve/\` sous \`.orchestre/travail/${NOM}/autotest/\`, jamais dans le dépôt.`, '',
    '| cas | script de mutations | critère attendu | code | critère(s) en échec | verdict | ligne qui l’a attrapé |', '|---|---|---|---|---|---|---|',
    ...at.resultats.map((x) => `| ${x.nom} | \`${x.script}\`${x.graine !== undefined ? ` (graine ${x.graine})` : ''} | ${x.attendu || 'aucun (doit passer)'} | ${x.code ?? '—'} | ${x.rouges.join(', ') || '—'} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.ligne || '').replace(/\|/g, '\\|')} |`),
    '',
  ]
  const sortie = path.join(PRESTI, '.orchestre', 'preuves', '026-001', 'meta-juge-autotest.md')
  ecrire(sortie, md.join('\n'))
  console.log(`→ ${versSlash(path.relative(PRESTI, sortie))}`)
  const apres = porcelainPresti()
  let ok = at.ok
  if (avant === null || apres === null) { console.log('FAIL HY-1 — git status illisible'); ok = false }
  else if (avant !== apres) { console.log('FAIL HY-1 — git status --porcelain a changé hors .orchestre/travail/, .orchestre/preuves/ et chantiers en cours'); ok = false }
  else console.log('PASS HY-1 — git status --porcelain identique avant et après (hors travail/, preuves/ et chantiers en cours)')
  console.log(`${NOM} --autotest : ${ok ? 'PASS' : 'FAIL'}`)
  process.exit(ok ? 0 : 1)
}

principal().catch((e) => { console.error(`FAIL ${NOM} — exception : ${e && e.stack ? e.stack : e}`); process.exit(1) })
