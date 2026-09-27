// scripts/fixtures/026-pilotage/s/commun.mjs — l'aide du lot s des juges du Pilotage (fiche 026-067, écrite par Claude Code) :
// station-logique-qa, station-route-qa et station-reunion-qa. Elle importe les aides des lots a (026-012) et b (026-066)
// sans les recopier, et porte ce que les trois juges du lot s partagent :
//   · les listes fermées de la station, recopiées des fiches jugées (026-070 point 2, 026-092 « Contrat des vues »), pour
//     que le juge ne lise jamais sa vérité dans le module qu'il juge ;
//   · jeuS(nom) : un jeu d'essai de s/, relu à chaque appel (copie neuve) ;
//   · arbreTemoinS(juge, { base, chemins }) : l'arbre du mode --temoin (les `chemins` du commit `base`, puis le témoin du
//     lot s posé dessus, suffixe .temoin ôté) sous .orchestre/travail/<juge>/temoin-arbre/ ;
//   · CROCHET : le crochet de résolution qu'un juge enregistre par `register` : `@/x` se résout sous la RACINE JUGÉE (et non
//     sous le dépôt, comme le fait scripts/ts-loader.mjs), et les chemins de la table `doubles` vers un module de doublures ;
//   · alea(graine) : un générateur pseudo-aléatoire reproductible (la graine est affichée par le juge) ;
//   · esp(t) : un texte aux espaces normalisées (Intl écrit 1 000 avec une espace fine insécable).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, TRAVAIL, court, premiereLigne, git, exigerSousTravail, listerFichiers, extraireTar, lireOuNull } from '../a/commun.mjs'
import { cheminsBase } from '../b/commun.mjs'

export { R, TRAVAIL, court, premiereLigne, git, lireOuNull }
export const S = path.dirname(fileURLToPath(import.meta.url))
export const TEMOIN_S = path.join(S, 'temoin')
export const SUFFIXE_TEMOIN = '.temoin'
export const posix = (p) => p.split(path.sep).join('/')
export const lf = (t) => String(t ?? '').replace(/\r\n?/g, '\n')
export const esp = (t) => String(t ?? '').replace(/[\s  ]+/g, ' ').trim()
export const sansAccents = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
export const jeuS = (nom) => JSON.parse(fs.readFileSync(path.join(S, nom), 'utf8'))
export const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v))
export const egal = (a, b) => canon(a) === canon(b)

// ── Listes fermées, recopiées des fiches jugées ──────────────────────────────────────────────────────────────────────────
/** 026-070 point 2 : les vingt salles, dans cet ordre, avec leur plaque et leur genre (décision Claw3D du 25/09, §3.2). */
export const SALLES_ATTENDUES = [
  ['commandement', 'Commandement', 'decision'], ['reunion', 'Salle de réunion', 'decision'], ['radar', 'Radar', 'veille'],
  ['redaction', 'Rédaction', 'travail'], ['envois', 'Salle des envois', 'travail'], ['standard', 'Standard', 'travail'],
  ['atelier', 'Atelier des maquettes', 'travail'], ['usine', 'Usine à sites', 'travail'], ['recettes', 'Recettes', 'argent'],
  ['tresorerie', 'Trésorerie', 'argent'], ['crieur', 'Tour du Crieur', 'travail'], ['studio', 'Studio pubs', 'travail'],
  ['experience', 'Salle Expérience', 'travail'], ['machines', 'Salle des machines', 'veille'], ['chantier', 'Chantier du code', 'travail'],
  ['audience', 'Audience', 'veille'], ['securite', 'Sécurité', 'veille'], ['presti', 'Presti', 'argent'],
  ['observatoire', 'Observatoire', 'veille'], ['repos', 'Salle de repos', 'repos'],
].map(([cle, plaque, genre]) => ({ cle, plaque, genre }))
export const CLES_SALLES = SALLES_ATTENDUES.map((s) => s.cle)
export const RESERVEE = 'ecommerce'
export const CLES_SALLE_ATTENDUES = [...CLES_SALLES, RESERVEE]
/** 026-070 point 2 : les dix-huit titulaires et leur salle. */
export const EQUIPAGE_ATTENDU = {
  chef: 'commandement', vigie_meta: 'radar', recenseur: 'radar', juge_faits: 'redaction', redacteur: 'redaction', garde: 'redaction',
  facteur: 'envois', standardiste: 'standard', repondeur: 'standard', atelier_maquettes: 'atelier', redacteur_site: 'usine',
  livreur: 'usine', tresorier: 'tresorerie', crieur: 'crieur', a0: 'machines', systeme: 'machines', pont: 'chantier', experience: 'experience',
}
/** 026-092 : les dix salles qui ont un lecteur dès 026-092 ; les dix autres rendent « arrive avec sa fiche » jusqu'à 026-178. */
export const SALLES_PANNEAU = ['recettes', 'tresorerie', 'usine', 'atelier', 'reunion', 'envois', 'experience', 'standard', 'redaction', 'machines']
export const SANS_LECTEUR = ['commandement', 'radar', 'crieur', 'studio', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']
export const ARRIVE = 'arrive avec sa fiche'
export const MANQUE_RESERVEE = 'Branche e-commerce réservée : rien n’est construit.'
export const HORS = Object.freeze({ valeur: null, nonMesure: true, raison: 'hors périmètre' })
export const VIDE_ATTENTION = 'Rien pour toi. L’équipage tourne.'
export const DOMAINES = ['sante', 'comptabilite', 'clients', 'securite', 'audience', 'support']

// ── L'arbre du mode --temoin ─────────────────────────────────────────────────────────────────────────────────────────────
/** Les fichiers du témoin du lot s : Map(chemin du dépôt → Buffer). */
export function fichiersTemoinS() {
  const m = new Map()
  for (const f of listerFichiers(TEMOIN_S)) {
    const p = posix(f)
    if (!p.endsWith(SUFFIXE_TEMOIN)) throw new Error(`témoin du lot s : ${p} sans le suffixe ${SUFFIXE_TEMOIN}`)
    m.set(p.slice(0, -SUFFIXE_TEMOIN.length), fs.readFileSync(path.join(TEMOIN_S, f)))
  }
  return m
}
/** Les `chemins` du commit `base` (git archive, rien n'est écrit dans .git), puis le témoin du lot s posé dessus. */
export function arbreTemoinS(juge, { base, chemins }) {
  const dest = exigerSousTravail(path.join(TRAVAIL, juge, 'temoin-arbre'))
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const tar = path.join(TRAVAIL, juge, 'temoin-arbre.tar')
  const existants = chemins.filter((c) => cheminsBase(base, c).length)
  if (existants.length) {
    const r = git(['-c', 'core.autocrlf=false', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, base, '--', ...existants])
    if (r.code !== 0) throw new Error(`git archive ${base.slice(0, 7)} : ${court(r.stderr)}`)
    extraireTar(tar, dest)
    fs.rmSync(tar, { force: true })
  }
  const poses = []
  for (const [rel, buf] of fichiersTemoinS()) {
    const f = path.join(dest, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.rmSync(f, { force: true })
    fs.writeFileSync(f, buf)
    poses.push(rel)
  }
  return { dest, poses }
}

// ── Le crochet de résolution des juges du lot s ──────────────────────────────────────────────────────────────────────────
// data : { racine: URL de la racine jugée (terminée par /), depot: URL du dépôt, doublures: URL du module de doublures ou '',
//          doubles: { '<chemin sans extension sous la racine>': '<nom>' }, prefixes: { '<préfixe de chemin>': '<nom>' },
//          paquets: { '<spécificateur>': '<nom>' } }.
// Un chemin doublé part vers `<doublures>?m=<nom>` (une instance par nom, un état partagé par globalThis). Un paquet npm
// demandé depuis un fichier hors du dépôt (l'arbre témoin vit sous .orchestre/travail/, donc DANS le dépôt : sans objet
// en général) se résout depuis le node_modules du dépôt.
export const CROCHET = String.raw`
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
let D = { racine: '', depot: '', doublures: '', doubles: {}, prefixes: {}, paquets: {} }
export async function initialize(d) { D = { ...D, ...d } }
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
const double = (m) => ({ url: D.doublures + '?m=' + encodeURIComponent(m), shortCircuit: true, format: 'module' })
const bas = (u) => u.toLowerCase()
export async function resolve(spec, ctx, next) {
  if (D.doublures && D.paquets[spec]) return double(D.paquets[spec])
  let s = spec
  if (s.startsWith('@/')) s = new URL(s.slice(2), D.racine).href
  if (s.startsWith('.') || s.startsWith('file:')) {
    const brut = s.startsWith('file:') ? s.split('?')[0] : new URL(s, ctx.parentURL).href
    if (D.doublures && bas(brut).startsWith(bas(D.racine))) {
      const rel = decodeURIComponent(brut.slice(D.racine.length)).replace(/\.(ts|tsx|js|mjs)$/, '').replace(/\/index$/, '')
      if (D.doubles[rel]) return double(D.doubles[rel])
      for (const [p, m] of Object.entries(D.prefixes)) if (rel === p || rel.startsWith(p + '/')) return double(m)
    }
    if (!s.startsWith('file:') || !s.includes('?')) for (const c of [brut, brut + '.ts', brut + '.tsx', brut + '/index.ts']) if (estFichier(c)) return next(c, ctx)
  }
  if (!s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:') && ctx.parentURL && !bas(ctx.parentURL).startsWith(bas(D.depot))) {
    return next(s, { ...ctx, parentURL: D.depot + 'package.json' })
  }
  return next(s, ctx)
}`
export const urlDossier = (d) => pathToFileURL(path.resolve(d) + path.sep).href

// ── Hasard reproductible ─────────────────────────────────────────────────────────────────────────────────────────────────
export function alea(graine) {
  let a = graine >>> 0
  const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  f.entier = (n) => Math.floor(f() * n)
  f.choix = (l) => l[f.entier(l.length)]
  return f
}

/** Les chaînes d'une valeur, en profondeur (pour y chercher des pièges). */
export const chaines = (x, out = []) => { if (typeof x === 'string') out.push(x); else if (x && typeof x === 'object') for (const v of Object.values(x)) chaines(v, out); return out }
export const lireRacine = (racine, rel) => { const t = lireOuNull(path.join(racine, rel)); return t === null ? null : lf(t) }
export { exigerSousTravail, premiereLigne as premiere }
