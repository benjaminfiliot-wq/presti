// scripts/modele/preneur-gardes.mjs — les gardes du modèle maison « presti-preneur » (docs/agents/modele-maison-preneur.md) : ce qui peut ENTRER chez un modèle
// gratuit (aucune donnée de prospect), ce qui peut SORTIR dans les données d'entraînement (aucun nombre absent des sources, aucune promesse non prouvée, du
// français), et la recherche des passages du Savoir rejouée sur une copie locale des documents (même découpe, même classement, même forme que le preneur).
//
// POURQUOI : l'entrée d'une paire part chez un fournisseur gratuit (freellmapi) puis sur Kaggle ; sa sortie finit dans les poids d'un modèle qui écrira les
// textes de l'écosystème. Une garde unique, partagée par le générateur (scripts/modele/donnees-preneur.mjs) et son juge (scripts/modele-preneur-donnees-qa.mjs) :
// le générateur refuse AVANT l'envoi, le juge relit tout ce qui a été envoyé et tout ce qui a été gardé.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { motifProspects } from '../usine/garde-prospects.mjs'
import { nombresNonSources, controlerSortie, passagesDe } from '../usine/preneur.mjs'
import { normaliser, construireIndex, chercherIndex } from '../../lib/savoir/index.ts'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const DEPOT = path.resolve(ICI, '..', '..')
const DOCUMENTS = path.resolve(DEPOT, '..')

// ── 1. ce qui entre chez un modèle gratuit ───────────────────────────────────────────────────────────────────────────────
// Motifs propres (indépendants de garde-prospects) : un faux positif coûte un passage, un faux négatif enverrait une coordonnée chez un fournisseur gratuit.
const COURRIEL = /[\p{L}\p{N}._%+-]+@(?:[\p{L}\p{N}-]+\.)+\p{L}{2,}/u
const TEL = /(?:\+33|0033|(?<![\d,.])0)\s?[1-9](?:[\s.-]?\d{2}){4}(?!\d)/
const SIREN = /(?<![\d.,])(\d{3}[ . ]?\d{3}[ . ]?\d{3})(?:[ . ]?\d{5})?(?![\d.,])/g
const RUE = /\b\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|boulevard|bd|chemin|route|place|all[ée]e|impasse|quai|faubourg|lotissement|lieu-dit)\s+\p{L}/iu
const CP_VILLE = /(?<![\d\s,.])(?:0[1-9]|[1-8]\d|9[0-5])\d{3}\s+(?:[A-ZÉÈÂÎ][a-zàâäéèêëîïôöùûüç'-]+)(?:[\s-](?:[A-ZÉÈ]|sur|en|les|la|le)[\p{L}'-]*)*/u
const MOT_PROSPECT = /prospect|d[ée]marchage|siren|siret/i
const luhn = (s) => { let t = 0; for (let i = 0; i < s.length; i++) { let c = Number(s[s.length - 1 - i]); if (i % 2) { c *= 2; if (c > 9) c -= 9 } t += c } return t % 10 === 0 }

/** Le nom du premier motif d'identité trouvé (jamais le texte), ou null. */
export function motifIdentitePreneur(t) {
  const s = String(t ?? '')
  const g = motifProspects(s)
  if (g) return `garde : ${g}`
  if (COURRIEL.test(s)) return 'courriel'
  if (TEL.test(s)) return 'téléphone'
  for (const m of s.matchAll(SIREN)) if (luhn(m[1].replace(/\D/g, ''))) return 'SIREN'
  if (RUE.test(s)) return 'adresse (rue)'
  if (CP_VILLE.test(s)) return 'code postal et ville'
  if (MOT_PROSPECT.test(s)) return 'prospect'
  return null
}

// Les noms des entreprises prospectées, lus dans les fichiers de prospection (jamais écrits, jamais affichés : seuls leurs jetons servent à la comparaison).
const GENERIQUES = new Set(normaliser('artisan artisans sarl eurl sas sasu ei entreprise entreprises societe plombier plomberie electricien electricite electrique couvreur couverture chauffagiste chauffage menuisier menuiserie peintre peinture maconnerie macon renovation batiment travaux service services multi france nord sud est ouest depannage installation carrelage carreleur charpente charpentier isolation facade jardin paysagiste serrurier serrurerie vitrier climatisation energie solaire habitat maison home pro bat construction general generale fils freres et cie compagnie groupe atelier ateliers concept design deco decoration creation creations garden nature confort solution solutions expert experts ideal harmonie eco style plus top best home'))
const CLES_NOM = /^(?:nom|nom_affiche|name|raison_sociale|denomination|denomination_usuelle|entreprise|enseigne|nom_entreprise|nom_commercial|handle|societe)$/i
export const SOURCES_PROSPECTS = [
  path.join(DOCUMENTS, 'presti-secrets', 'prospection'),
  path.join(DOCUMENTS, 'presti-ops', 'prospection'),
  path.join(DOCUMENTS, 'SaaS', 'Prospection'),
]
let nomsEnCache = null
/** Les noms (listes de jetons normalisés) des prospects connus. Lecture seule, dossiers absents ignorés. */
export function nomsProspects(sources = SOURCES_PROSPECTS) {
  if (nomsEnCache && sources === SOURCES_PROSPECTS) return nomsEnCache
  const vus = new Map()
  const cueillir = (v, cle = '') => {
    if (Array.isArray(v)) { for (const x of v) cueillir(x, cle); return }
    if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) cueillir(x, k); return }
    if (typeof v !== 'string' || !CLES_NOM.test(cle)) return
    const jetons = normaliser(v.replace(/[_@.]/g, ' '))
    const utiles = jetons.filter((j) => !GENERIQUES.has(j) && !/^\d+$/.test(j))
    if (!utiles.length) return
    // un nom d'un seul jeton utile n'est gardé que s'il est assez distinctif (6 signes au moins)
    if (jetons.length === 1 && jetons[0].length < 6) return
    if (utiles.length === 1 && utiles[0].length < 5) return
    vus.set(jetons.join(' '), jetons)
  }
  const marcher = (d, profondeur = 0) => {
    let entrees
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { if (profondeur < 6 && !['node_modules', '.git', 'maquettes', 'site', 'sites'].includes(e.name)) marcher(p, profondeur + 1); continue }
      if (!e.isFile()) continue
      if (e.name.endsWith('.json')) { try { cueillir(JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''))) } catch { /* illisible */ } }
      else if (e.name.endsWith('.jsonl')) { for (const l of fs.readFileSync(p, 'utf8').split('\n')) { try { cueillir(JSON.parse(l)) } catch { /* ligne illisible */ } } }
    }
  }
  for (const s of sources) marcher(s)
  const noms = [...vus.values()]
  if (sources === SOURCES_PROSPECTS) nomsEnCache = noms
  return noms
}
/** Vrai si le texte contient, jeton pour jeton, le nom d'un prospect connu (la règle de refusDonneePersonnelle du Savoir). */
export function contientNomProspect(texte, noms = nomsProspects()) {
  const j = normaliser(String(texte ?? ''))
  if (!j.length) return false
  const present = new Set(j)
  for (const n of noms) {
    if (!present.has(n[0])) continue
    for (let i = 0; i + n.length <= j.length; i++) if (n.every((t, k) => j[i + k] === t)) return true
  }
  return false
}
/** La garde d'ENTRÉE : null si le texte peut partir chez un modèle gratuit, sinon le nom du motif. */
export function fauteEntree(texte, noms = nomsProspects()) {
  return motifIdentitePreneur(texte) || (contientNomProspect(texte, noms) ? 'nom de prospect' : null)
}

// ── 2. le Savoir, rejoué en local ───────────────────────────────────────────────────────────────────────────────────────
// Le preneur demande au Savoir de l'usine (scripts/savoir/chercher.mjs, classe générale) les passages qui répondent à l'objet. Ici : les mêmes fonctions
// (decouper / construireIndex / chercherIndex de lib/savoir/index.ts), la même forme de résultat (8 au plus, extrait de 600 signes, source chemin:début-fin),
// puis passagesDe du preneur (5 au plus, garde prospects). Le corpus est une liste FERMÉE de dossiers du dépôt, documents Markdown seulement.
export const CORPUS = ['docs/ecommerce', 'docs/presti', 'docs/marketing', 'docs/produit']
const FICHIER_EXCLU = /prospect|d[ée]marchage|secret|token|\.env/i
export function fichiersCorpus(racine = DEPOT, dossiers = CORPUS) {
  const out = []
  const marcher = (d) => {
    let entrees
    try { entrees = fs.readdirSync(path.join(racine, d), { withFileTypes: true }) } catch { return }
    for (const e of entrees.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const rel = `${d}/${e.name}`
      if (e.isDirectory()) marcher(rel)
      else if (e.isFile() && e.name.endsWith('.md') && !FICHIER_EXCLU.test(rel)) out.push(rel)
    }
  }
  for (const d of dossiers) marcher(d)
  return out
}
export function indexCorpus(racine = DEPOT, dossiers = CORPUS) {
  const fichiers = fichiersCorpus(racine, dossiers)
  return { fichiers, index: construireIndex(fichiers.map((f) => ({ chemin: `presti:${f}`, classe: 'interne', texte: fs.readFileSync(path.join(racine, f), 'utf8').replace(/\r\n/g, '\n') }))) }
}
/** Les passages que le preneur recevrait pour cet objet. Un passage qui porte une donnée d'identité ou un nom de prospect est écarté (en plus de passagesDe). */
export function passagesLocaux(index, objet, noms = nomsProspects()) {
  const question = String(objet).replace(/\s+/g, ' ').trim().slice(0, 300)
  const trouves = chercherIndex(index, question, { limite: 24 })
  const resultats = trouves.slice(0, 8).map((r) => ({ origine: 'savoir', extrait: r.texte.slice(0, 600), source: { racine: 'presti', chemin: r.chemin.slice(r.chemin.indexOf(':') + 1), debut: r.debut, fin: r.fin, classe: 'interne' } }))
  return passagesDe({ resultats }).filter((p) => !fauteEntree(p.extrait, noms))
}

// ── 3. ce qui sort : la réponse idéale ─────────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s).replace(/[  ]/g, ' ').replace(/(\d)\s+(?=\d{3}\b)/g, '$1').replace(/,/g, '.')
/**
 * Garde stricte des nombres (plus large que nombresNonSources du preneur, qui ne lit que %, €, x et « fois ») : tout nombre de la sortie doit figurer dans les
 * sources, sauf les entiers de 0 à 10 (compter, numéroter), la numérotation en début de ligne, les citations [n] et les repères de minutage d'un script.
 * Rend la liste des nombres absents des sources. Pure.
 */
export function nombresStricts(sortie, sources) {
  const src = norm(sources)
  let t = norm(sortie)
    .replace(/\[\d+\]/g, ' ')
    .replace(/^\s*(?:[-*]\s*)?\d+[.)]\s/gm, ' ')
    .replace(/\b\d{1,2}(?:\.\d)?\s?(?:-|–|à)\s?\d{1,2}(?:\.\d)?\s?s(?:ec(?:onde)?s?)?\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
  const absents = []
  for (const m of t.matchAll(/\d+(?:\.\d+)?/g)) {
    const n = m[0]
    if (/^\d+$/.test(n) && Number(n) <= 10) continue
    if (absents.includes(n)) continue
    if (!new RegExp(`(^|[^\\d.])${n.replace('.', '\\.')}(?![\\d])`).test(src)) absents.push(n)
  }
  return absents
}
/** Les promesses qu'aucune source ne porte. Chaque motif n'est permis que si les sources le contiennent déjà. */
export const PROMESSES = [
  ['garanti(e)', /\bgaranti(?:e|s|es)?\b(?!\s+l[ée]gale)/i],
  ['100 %', /\b100\s?%/],
  ['meilleur', /\bmeilleur(?:e|s|es)?\b/i],
  ['n°1 / leader', /\bn°\s?1\b|num[ée]ro\s+(?:1|un)\b|\bleader\b/i],
  ['sans risque', /sans\s+(?:aucun\s+)?risque/i],
  ['satisfait ou remboursé', /satisfait\s+ou\s+rembours/i],
  ['révolutionnaire / miracle', /r[ée]volution|miracle|magique/i],
  ['imbattable / le moins cher', /imbattable|le\s+moins\s+cher|prix\s+cass/i],
  ['livraison rapide / gratuite / express', /livraison\s+(?:gratuite|express|rapide|offerte|en\s+24)/i],
  ['certifié / homologué', /\bcertifi[ée]|homologu[ée]/i],
  ['puissant / ultra', /\bpuissan(?:t|te|ts|tes|ce)\b|\bultra[- ]?\w+/i],
  ['professionnel', /qualit[ée]\s+pro(?:fessionnelle)?\b|\bprofessionnel(?:le)?s?\b/i],
  ['résultat assuré', /r[ée]sultats?\s+(?:assur|garanti|imm[ée]diat)|en\s+un\s+clin\s+d/i],
]
export function promessesNonProuvees(sortie, sources) {
  return PROMESSES.filter(([, re]) => re.test(sortie) && !re.test(sources)).map(([nom]) => nom)
}
const FR = /\b(?:le|la|les|des|du|et|est|pour|une|dans|avec|vous|sur|pas|qui|au|aux|en|ce|sont)\b/gi
const EN = /\b(?:the|and|is|for|with|you|your|this|that|to|of|are|it|on|be)\b/gi
export function estFrancais(t) {
  const fr = (String(t).match(FR) || []).length, en = (String(t).match(EN) || []).length
  // une liste d’accroches a peu de mots outils : on refuse surtout l’anglais (deux fois moins de mots anglais que de mots français, et des accents)
  return fr >= 3 && en * 2 <= fr && /[éèàêçù]/.test(t)
}
export const SORTIE_MAX = 2500
export const RESUME_MAX = 140
/**
 * Les fautes d'une sortie pour une consigne { systeme, utilisateur } du preneur. `attendu` : 'travail' (le livrable) ou 'impossible' (une seule ligne
 * « IMPOSSIBLE : … »). Rend la liste des fautes (vide = gardée). Pure (les noms de prospects sont passés ou lus une fois).
 */
export function fautesSortie(consigne, sortie, { attendu = 'travail', nPassages = 0, noms = nomsProspects() } = {}) {
  const f = []
  const texte = String(sortie ?? '').trim()
  const sources = `${consigne.systeme}\n${consigne.utilisateur}`
  if (/<think>/.test(texte)) f.push('raisonnement <think> dans la sortie')
  const identite = fauteEntree(texte, noms)
  if (identite) f.push(`identité : ${identite}`)
  if (attendu === 'impossible') {
    if (!/^IMPOSSIBLE : \S.{10,220}$/.test(texte)) f.push('IMPOSSIBLE attendu, en une seule ligne « IMPOSSIBLE : <raison> »')
    return f
  }
  if (/^\s*IMPOSSIBLE\b/i.test(texte)) { f.push('IMPOSSIBLE alors que le travail est faisable'); return f }
  const v = controlerSortie(texte)
  if (!v.ok) f.push(`controlerSortie : ${v.code}`)
  const n = [...texte].length
  if (n < 200) f.push(`trop court (${n} signes)`)
  if (n > SORTIE_MAX) f.push(`trop long (${n} signes > ${SORTIE_MAX})`)
  const premiere = texte.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const resume = premiere.replace(/^[#>*\-\s]+/, '').trim()
  if ([...resume].length > RESUME_MAX || [...resume].length < 8) f.push(`première ligne de ${[...resume].length} signes (8 à ${RESUME_MAX})`)
  const inventes = nombresNonSources(texte, sources)
  if (inventes.length) f.push(`nombresNonSources : ${inventes.slice(0, 4).join(', ')}`)
  const stricts = nombresStricts(texte, sources)
  if (stricts.length) f.push(`nombre absent des sources : ${stricts.slice(0, 4).join(', ')}`)
  const promesses = promessesNonProuvees(texte, sources)
  if (promesses.length) f.push(`promesse non prouvée : ${promesses.join(', ')}`)
  if (!estFrancais(texte)) f.push('pas en français')
  const citees = [...texte.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
  if (citees.some((k) => k < 1 || k > nPassages)) f.push(`citation [n] hors des ${nPassages} passages`)
  if (nPassages > 0 && !citees.length) f.push('aucun passage cité')
  return f
}
