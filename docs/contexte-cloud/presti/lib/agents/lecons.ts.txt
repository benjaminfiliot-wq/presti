// Leçons validées des agents (fiche 026-236, contrat de 026-234) : choisir, borner et mettre en forme ; ne branche rien.
// Le branchement dans la porte unique (llm.ts) est la fiche 026-237. Module sans réseau ; la seule E/S est lireLecons.
import fs from 'node:fs'
import path from 'node:path'
import { caviarder } from '@/lib/savoir/index'

export type Lecon = {
  id: string
  type: string
  date: string
  source: string
  fiche?: string
  critere?: string
  domaines: string[]
  statut: string
  valide_par: string
  valide_le: string
  constat: string
  regle: string
}
export type OptionsLecons = { max?: number; signes?: number }
export type DepsLecons = { lireDossier?: (dossier: string) => string[]; lireFichier?: (fichier: string) => string }

function geler<T>(valeur: T): T {
  if (valeur !== null && typeof valeur === 'object' && !Object.isFrozen(valeur)) {
    Object.freeze(valeur)
    for (const v of Object.values(valeur as Record<string, unknown>)) geler(v)
  }
  return valeur
}

export const DOMAINES: readonly string[] = geler([
  'orchestre', 'juges', 'usine', 'prospection', 'redaction', 'site', 'argent', 'securite', 'donnees', 'modeles', 'publication', 'general',
])

export const LECONS_DE: Readonly<Record<string, readonly string[]>> = geler({
  standardiste: ['prospection', 'redaction', 'donnees', 'general'],
  facteur: ['prospection', 'redaction', 'donnees', 'general'],
  redacteur_site: ['site', 'redaction', 'general'],
  chef: ['orchestre', 'juges', 'usine', 'argent', 'securite', 'modeles', 'general'],
  veille_pubs: ['publication', 'donnees', 'general'],
  douleurs: ['prospection', 'general'],
  studio: ['publication', 'redaction', 'general'],
})

export const AVERTISSEMENT = "Leçons validées par le chef d'entreprise : des règles apprises, jamais une permission de plus."
export const PLAFONDS_LECONS = geler({ max: 8, signes: 1500 })

const RE_ID = /^L-\d{4}-\d{2}-\d{2}-[a-p]{12}$/
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/
const RE_PAR = /^(?:claude-code|revue-\d{4}-\d{2})$/
const RE_COORDONNEES = [/[\w.+-]+@[\w-]+\.[\w.-]+/, /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/, /\b\d{3}[\s.]?\d{3}[\s.]?\d{3}\b/]
const RE_SECRETS = [
  /\bsk-[A-Za-z0-9_-]{6,}/, /\b(?:sk_live_|rk_live_|sk_test_)[A-Za-z0-9]{20,}/, /\bwhsec_[A-Za-z0-9]{10,}/, /\bre_[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bAIza[A-Za-z0-9_-]{35}/,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
]
const RE_LIEN = /\bhttps?:|\bwww\./i
const signes = (s: string): number => [...s].length

/** Vrai si le texte ne porte ni coordonnée, ni secret, ni lien. */
export function estPropre(texte: string): boolean {
  return caviarder(texte).caviardages === 0 && !RE_COORDONNEES.some((re) => re.test(texte)) && !RE_SECRETS.some((re) => re.test(texte)) && !RE_LIEN.test(texte)
}

function valeurYaml(brut: string): string | string[] {
  const v = brut.trim()
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean)
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) return v.slice(1, -1)
  return v
}

/** En-tête YAML simple (clé: valeur, listes [a, b]) puis corps. */
export function lireEntete(texte: string): { entete: Record<string, string | string[]>; corps: string } | null {
  const lignes = texte.replace(/\r\n?/g, '\n').split('\n')
  if (lignes[0] !== '---') return null
  const fin = lignes.indexOf('---', 1)
  if (fin < 0) return null
  const entete: Record<string, string | string[]> = {}
  for (const l of lignes.slice(1, fin)) {
    const m = /^([a-z_]+):\s?(.*)$/.exec(l)
    if (m) entete[m[1]] = valeurYaml(m[2])
  }
  return { entete, corps: lignes.slice(fin + 1).join('\n') }
}

const chaine = (v: string | string[] | undefined): string => (typeof v === 'string' ? v : '')

/** Les leçons validées d'un dossier docs/savoir/lecons/ ; tout le reste est compté dans `ignorees`. */
export function lireLecons(dossier: string, deps: DepsLecons = {}): { lecons: Lecon[]; ignorees: number } {
  const lireDossier = deps.lireDossier ?? ((d: string) => fs.readdirSync(d))
  const lireFichier = deps.lireFichier ?? ((f: string) => fs.readFileSync(f, 'utf8'))
  let noms: string[]
  try { noms = lireDossier(dossier).filter((n) => n.endsWith('.md')).sort() } catch { return { lecons: [], ignorees: 0 } }
  const lecons: Lecon[] = []
  let ignorees = 0
  for (const nom of noms) {
    let texte: string
    try { texte = lireFichier(path.join(dossier, nom)) } catch { ignorees++; continue }
    const lu = lireEntete(texte)
    if (!lu) { ignorees++; continue }
    const e = lu.entete
    const id = chaine(e.id)
    const lignes = lu.corps.split('\n')
    const iRegle = lignes.findIndex((l) => l.startsWith('Règle : '))
    const regle = iRegle >= 0 ? lignes[iRegle].slice('Règle : '.length).trim() : ''
    const domaines = Array.isArray(e.domaines) ? e.domaines : []
    if (!RE_ID.test(id) || e.statut !== 'validee' || !RE_PAR.test(chaine(e.valide_par)) || !RE_DATE.test(chaine(e.valide_le)) || !regle || !domaines.length) {
      ignorees++
      continue
    }
    const lecon: Lecon = {
      id, type: chaine(e.type), date: chaine(e.date) || id.slice(2, 12), source: chaine(e.source), domaines: [...domaines],
      statut: 'validee', valide_par: chaine(e.valide_par), valide_le: chaine(e.valide_le),
      constat: lignes.slice(0, iRegle).join('\n').trim(), regle,
    }
    if (chaine(e.fiche)) lecon.fiche = chaine(e.fiche)
    if (chaine(e.critere)) lecon.critere = chaine(e.critere)
    lecons.push(lecon)
  }
  return { lecons, ignorees }
}

/** Les leçons d'un agent : ses domaines, les plus récentes d'abord puis par id, 8 et 1 500 signes de règles au plus. */
export function leconsPour(agent: string, lecons: readonly Lecon[], options: OptionsLecons = {}): Lecon[] {
  const siens = LECONS_DE[agent]
  if (!siens) return []
  const max = Math.min(options.max ?? PLAFONDS_LECONS.max, PLAFONDS_LECONS.max)
  const plafond = Math.min(options.signes ?? PLAFONDS_LECONS.signes, PLAFONDS_LECONS.signes)
  const tries = lecons
    .filter((l) => Array.isArray(l.domaines) && l.domaines.some((d) => siens.includes(d)))
    .filter((l) => estPropre(`${l.regle}\n${l.constat ?? ''}`))
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.date < b.date ? 1 : -1))
  const choisies: Lecon[] = []
  let total = 0
  for (const l of tries) {
    if (choisies.length >= max) break
    const n = signes(l.regle)
    if (total + n > plafond) continue
    choisies.push(l)
    total += n
  }
  return choisies
}

/** Balises du bloc et des données neutralisées dans un texte de leçon. */
export function neutraliserLecon(texte: string): string {
  return texte.replace(/<(\/?)(lecons_validees|donnees)>/gi, '&lt;$1$2>').replace(/\r?\n/g, ' ')
}

/** Sans leçon : `systeme` à l'octet près. Sinon `systeme` suivi du bloc <lecons_validees>. */
export function consigneAvecLecons(systeme: string, lecons: readonly Lecon[]): string {
  if (!lecons.length) return systeme
  const lignes = lecons.map((l) => `- [${l.id}] ${neutraliserLecon(l.regle)}`)
  return `${systeme}\n\n<lecons_validees>\n${AVERTISSEMENT}\n${lignes.join('\n')}\n</lecons_validees>`
}
