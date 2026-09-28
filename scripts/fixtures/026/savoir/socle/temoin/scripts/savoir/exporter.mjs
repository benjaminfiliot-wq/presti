#!/usr/bin/env node
// TÉMOIN (026-229) de scripts/savoir/exporter.mjs : l'implémentation de référence du contrat que juge
// scripts/savoir-socle-qa.mjs (SVS-2 à SVS-6). Ce n'est pas la production (026-230) : elle vit sous
// scripts/fixtures/026/savoir/socle/temoin/ et ne sert qu'à prouver que le juge sait dire vert.
//
//   node scripts/savoir/exporter.mjs --sources=<sources.json> --sortie=<dossier> [--a-sec]
// Codes : 0 exporté (ou calculé à sec) ; 1 plafond dépassé ou panne ; 2 usage ou sortie interdite.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { chercherSecrets } from '../instantane-quotidien.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..')
const SOURCES_DEFAUT = path.join(DEPOT, 'docs', 'savoir', 'sources.json')

export class Arret extends Error {
  constructor(code, message) { super(message); this.code = code }
}

/** Un glob (`**` = zéro ou plusieurs dossiers, `*` et `?` dans un segment) en expression régulière ancrée. */
export function globVersRegex(glob) {
  const segs = glob.split('/')
  let re = '^'
  segs.forEach((seg, i) => {
    const dernier = i === segs.length - 1
    if (seg === '**') { re += dernier ? '.*' : '(?:[^/]*/)*'; return }
    re += seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')
    if (!dernier) re += '/'
  })
  return new RegExp(`${re}$`)
}
function motif(brut) {
  const i = brut.indexOf(':')
  const global = brut.startsWith('**/') || i < 0
  return { brut, racine: global ? null : brut.slice(0, i), re: globVersRegex(global ? brut : brut.slice(i + 1)) }
}
const vaut = (m, racine) => m.racine === null || m.racine === racine
/** Exclusions et prospects : le motif vaut pour le chemin et pour chacun de ses dossiers. */
function couvre(m, racine, rel) {
  if (!vaut(m, racine)) return false
  if (m.re.test(rel)) return true
  const segs = rel.split('/')
  for (let i = 1; i < segs.length; i++) if (m.re.test(segs.slice(0, i).join('/'))) return true
  return false
}
function luhn(chiffres) {
  let t = 0
  for (let i = 0; i < chiffres.length; i++) { let d = Number(chiffres[chiffres.length - 1 - i]); if (i % 2) { d *= 2; if (d > 9) d -= 9 } t += d }
  return chiffres.length > 0 && t % 10 === 0
}

export function lireContrat(fichier) {
  const s = JSON.parse(fs.readFileSync(fichier, 'utf8'))
  const base = path.dirname(path.resolve(fichier))
  return {
    racines: Object.entries(s.racines).map(([nom, chemin]) => ({ nom, chemin: path.resolve(base, chemin) })),
    formats: new Set(s.formats.map((f) => f.toLowerCase())),
    exclusions: s.exclusions.map(motif),
    excl: new RegExp(s.exclusions_memoire.regex),
    prospects: s.prospects.map(motif),
    sources: s.sources.map((e) => ({ ...motif(e.motif), classe: e.classe })),
    min: s.reclassement.coordonnees_min,
    regles: s.caviardage.regles.map((r) => ({ re: new RegExp(r.regex, r.flags || 'g'), par: r.remplace_par, luhn: Boolean(r.luhn) })),
    plafonds: s.plafonds,
  }
}
export function caviarder(C, texte) {
  let n = 0
  let t = texte
  for (const r of C.regles) {
    t = t.replace(r.re, (m) => {
      if (r.luhn && !luhn(m.replace(/\D/g, ''))) return m
      n++
      return r.par
    })
  }
  return { texte: t, n }
}
const exclu = (C, racine, rel) => C.exclusions.some((m) => couvre(m, racine, rel))
const dossierExclu = (C, racine, rel) => exclu(C, racine, rel) || C.exclusions.some((m) => vaut(m, racine) && m.re.test(`${rel}/\u0000`))
function classer(C, racine, rel) {
  if (C.prospects.some((m) => couvre(m, racine, rel))) return 'prospects'
  const s = C.sources.find((m) => vaut(m, racine) && m.re.test(rel))
  return s ? s.classe : null
}
function relatif(parent, enfant) {
  const r = path.relative(parent, enfant)
  if (r === '') return ''
  if (r.startsWith('..') || path.isAbsolute(r)) return null
  return r.split(path.sep).join('/')
}
/** Code 2 si la sortie tombe dans une racine (ou dans le dépôt de ce script) hors d'une exclusion, ou en contient une. */
function verifierSortie(C, sortie) {
  const zones = [...C.racines, { nom: 'presti', chemin: DEPOT }]
  for (const z of zones) {
    for (const cible of [sortie, `${sortie}.part`]) {
      const r = relatif(z.chemin, cible)
      if (r === '') throw new Arret(2, `--sortie est la racine ${z.nom} elle-même`)
      if (r !== null && !exclu(C, z.nom, r)) throw new Arret(2, `--sortie dans la racine ${z.nom} (${r}) : le savoir se relirait lui-même`)
    }
    if (relatif(sortie, z.chemin) !== null) throw new Arret(2, `--sortie contient la racine ${z.nom}`)
  }
}

function parcourir(C) {
  const compteurs = { general: 0, prospects: 0, reclasses: 0, hors_liste: 0, exclus: 0, exclus_memoire: 0, lignes_memoire_retirees: 0, format_non_lu: 0, trop_gros: 0, secrets: 0, caviardages: 0, autres: 0 }
  const fichiers = { general: [], prospects: [] }
  const nonLus = { general: [], prospects: [] }
  const secrets = []
  for (const racine of C.racines) {
    if (!fs.existsSync(racine.chemin)) continue
    const visiter = (relDir) => {
      const abs = relDir ? path.join(racine.chemin, ...relDir.split('/')) : racine.chemin
      const entrees = fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      for (const e of entrees) {
        const rel = relDir ? `${relDir}/${e.name}` : e.name
        if (e.isDirectory()) {
          if (dossierExclu(C, racine.nom, rel)) { compteurs.exclus++; continue }
          visiter(rel)
          continue
        }
        if (!e.isFile()) { compteurs.autres++; continue }
        fichier(racine, rel)
      }
    }
    const fichier = (racine, rel) => {
      if (exclu(C, racine.nom, rel)) { compteurs.exclus++; return }
      const nom = path.posix.basename(rel)
      if (racine.nom === 'memoire' && nom !== 'MEMORY.md' && C.excl.test(nom)) { compteurs.exclus_memoire++; return }
      let classe = classer(C, racine.nom, rel)
      if (!classe) { compteurs.hors_liste++; return }
      const comp = classe === 'prospects' ? 'prospects' : 'general'
      const abs = path.join(racine.chemin, ...rel.split('/'))
      if (!C.formats.has(path.posix.extname(rel).toLowerCase())) { compteurs.format_non_lu++; nonLus[comp].push({ racine: racine.nom, chemin: rel, raison: 'format_non_lu' }); return }
      const taille = fs.lstatSync(abs).size
      if (taille > C.plafonds.octets_par_fichier) { compteurs.trop_gros++; nonLus[comp].push({ racine: racine.nom, chemin: rel, raison: 'trop_gros', octets: taille }); return }
      const brut = fs.readFileSync(abs)
      let texte = brut.toString('utf8')
      const motifs = chercherSecrets(texte)
      if (motifs.length) { compteurs.secrets++; secrets.push({ racine: racine.nom, chemin: rel, motifs }); return }
      let octets = brut
      let caviardages = 0
      let reclasse = false
      if (racine.nom === 'memoire' && rel === 'MEMORY.md') {
        const lignes = texte.split('\n')
        const gardees = lignes.filter((l) => !C.excl.test(l))
        compteurs.lignes_memoire_retirees += lignes.length - gardees.length
        texte = gardees.join('\n')
        octets = Buffer.from(texte)
      }
      if (classe !== 'prospects') {
        const c = caviarder(C, texte)
        if (c.n >= C.min) { classe = 'prospects'; reclasse = true; compteurs.reclasses++ }
        else { octets = Buffer.from(c.texte); caviardages = c.n; compteurs.caviardages += c.n }
      }
      const cible = classe === 'prospects' ? 'prospects' : 'general'
      compteurs[cible]++
      fichiers[cible].push({ entree: { racine: racine.nom, chemin: rel, classe, sha256: crypto.createHash('sha256').update(octets).digest('hex'), octets: octets.length, caviardages, reclasse }, octets })
    }
    visiter('')
  }
  return { compteurs, fichiers, nonLus, secrets }
}

export function exporter({ sources = SOURCES_DEFAUT, sortie, aSec = false }) {
  if (!sortie) throw new Arret(2, 'usage : --sortie=<dossier> attendu')
  const C = lireContrat(sources)
  const sortieAbs = path.resolve(sortie)
  verifierSortie(C, sortieAbs)
  const X = parcourir(C)
  const n = X.fichiers.general.length + X.fichiers.prospects.length
  const total = [...X.fichiers.general, ...X.fichiers.prospects].reduce((s, f) => s + f.octets.length, 0)
  if (n > C.plafonds.fichiers) throw new Arret(1, `plafond : ${n} fichiers (au plus ${C.plafonds.fichiers}) — rien n'est écrit`)
  if (total > C.plafonds.octets_total) throw new Arret(1, `plafond : ${total} octets (au plus ${C.plafonds.octets_total}) — rien n'est écrit`)
  const resume = `general ${X.compteurs.general}, prospects ${X.compteurs.prospects} (reclassés ${X.compteurs.reclasses}), hors liste ${X.compteurs.hors_liste}, exclus ${X.compteurs.exclus} (+${X.compteurs.exclus_memoire} mémoires), non lus ${X.compteurs.format_non_lu}, trop gros ${X.compteurs.trop_gros}, secrets écartés ${X.compteurs.secrets}`
  if (aSec) return { code: 0, message: `à sec : ${resume} — rien d'écrit` }
  const exporteLe = new Date().toISOString()
  const part = `${sortieAbs}.part`
  fs.rmSync(part, { recursive: true, force: true })
  fs.mkdirSync(part, { recursive: true })
  for (const c of ['general', 'prospects']) {
    for (const f of X.fichiers[c]) {
      const p = path.join(part, c, 'fichiers', f.entree.racine, ...f.entree.chemin.split('/'))
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, f.octets)
    }
    const manifeste = { version: 1, compartiment: c, exporte_le: exporteLe, fichiers: X.fichiers[c].map((f) => f.entree), non_lus: X.nonLus[c], ...(c === 'general' ? { prospects_compte: X.fichiers.prospects.length } : {}) }
    fs.mkdirSync(path.join(part, c), { recursive: true })
    fs.writeFileSync(path.join(part, c, 'manifeste.json'), `${JSON.stringify(manifeste, null, 2)}\n`)
  }
  fs.writeFileSync(path.join(part, 'rapport.json'), `${JSON.stringify({ version: 1, exporte_le: exporteLe, compteurs: X.compteurs, secrets: X.secrets }, null, 2)}\n`)
  let ancien = null
  if (fs.existsSync(sortieAbs)) { ancien = `${sortieAbs}.ancien-${process.pid}`; fs.renameSync(sortieAbs, ancien) }
  fs.renameSync(part, sortieAbs)
  if (ancien) fs.rmSync(ancien, { recursive: true, force: true })
  return { code: 0, message: `exporté : ${resume} → ${sortieAbs}` }
}

function options(argv) {
  const o = {}
  for (const a of argv) {
    if (a === '--a-sec') o.aSec = true
    else if (a.startsWith('--sources=') && a.length > 10) o.sources = path.resolve(a.slice(10))
    else if (a.startsWith('--sortie=') && a.length > 9) o.sortie = a.slice(9)
    else throw new Arret(2, `argument inconnu : ${a} (usage : --sources=<fichier> --sortie=<dossier> [--a-sec])`)
  }
  return o
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const r = exporter(options(process.argv.slice(2))); console.log(r.message); process.exitCode = r.code }
  catch (e) { console.error(`✗ export : ${e.message}`); process.exitCode = e instanceof Arret ? e.code : 1 }
}
