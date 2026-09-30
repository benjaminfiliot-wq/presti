// lib/pilotage/reglages.ts — les réglages de personnalisation de la station : schéma fermé, fusion, application (fiche 026-173).
// Module PUR : le même code au serveur (la route des réglages valide avant d'écrire), à l'écran (aperçu en direct du panneau)
// et dans Habillage.tsx (qui pose le résultat sur le nœud `.mc`). L'habit, jamais les chiffres : rien n'est téléversé, aucun CSS libre.
import { EQUIPAGE, CLES_SALLE } from './equipage'
import { validerDisposition } from './disposition'
import { CLES_THEME, JETONS_PALETTE } from './theme'

/** Le schéma est fermé : toute autre clé est refusée, avec cette liste. */
export const CLES_REGLAGES = ['theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage'] as const
export const MISES_EN_PAGE = ['colonnes', 'flottante'] as const
export const TAILLES_PLAQUES = ['petite', 'normale', 'grande'] as const
export const OCTETS_MAX = 64 * 1024

export type Reglages = {
  theme?: string
  mise_en_page?: string
  nuit?: { actif?: boolean; debut?: number; fin?: number }
  equipage?: Record<string, { nom?: string; avatar?: string; couleur?: string }>
  salles?: Record<string, { emplacement?: string; plaque?: string; teinte?: string }>
  couleurs?: Record<string, string>
  affichage?: { titre?: string; taille_plaques?: string }
}
export type VerdictReglages = { ok: true; reglages: Reglages } | { ok: false; raisons: string[]; clesPermises: string[] }

const estObjet = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x)
const aCle = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k)
const court = (v: unknown, n = 40): string => String(v).slice(0, n)
const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/
const RE_TEXTE = /^[\p{L}\p{N} '’-]+$/u
const DANGEREUSES = ['__proto__', 'constructor', 'prototype']

/** Les clés de `o` hors de `permises` : chacune est une raison de refus, nommée. */
function inconnues(o: Record<string, any>, permises: readonly string[], chemin: string, raisons: string[]): void {
  for (const k of Object.keys(o)) if (!permises.includes(k)) raisons.push(`Clé inconnue « ${court(k)} » dans ${chemin} (permises : ${permises.join(', ')})`)
}
function texteBorne(v: unknown, min: number, max: number): boolean {
  return typeof v === 'string' && Array.from(v).length >= min && Array.from(v).length <= max && RE_TEXTE.test(v)
}
const REGLE_TEXTE = 'lettres, chiffres, espace, tiret, apostrophe'

/**
 * Valide des réglages bruts contre le thème. Ne jette jamais. Un refus rend toutes ses raisons (en français) et `clesPermises`.
 * Les réglages acceptés sont rendus tels quels (le même objet).
 */
export function validerReglages(brut: unknown, theme: unknown): VerdictReglages {
  const raisons: string[] = []
  const refus = (): VerdictReglages => ({ ok: false, raisons, clesPermises: [...CLES_REGLAGES] })
  try {
    if (!estObjet(brut)) { raisons.push('Les réglages doivent être un objet'); return refus() }
    let taille = 0
    try { taille = new TextEncoder().encode(JSON.stringify(brut)).length } catch { raisons.push('Les réglages sont illisibles (référence circulaire ou valeur non sérialisable)'); return refus() }
    if (taille > OCTETS_MAX) raisons.push(`Les réglages sont trop volumineux : ${Math.ceil(taille / 1024)} Ko, 64 Ko au plus`)
    const t: Record<string, any> = estObjet(theme) ? theme : {}
    const jetons: string[] = estObjet(t.palette) ? Object.keys(t.palette) : [...JETONS_PALETTE]
    const avatars: string[] = Array.isArray(t.avatars) ? t.avatars.map((a: any) => a?.cle) : ['defaut']

    inconnues(brut, CLES_REGLAGES, 'les réglages', raisons)

    if (aCle(brut, 'theme') && !(CLES_THEME as readonly string[]).includes(brut.theme)) raisons.push(`Le theme « ${court(brut.theme)} » est inconnu (permis : ${CLES_THEME.join(', ')})`)
    if (aCle(brut, 'mise_en_page') && !(MISES_EN_PAGE as readonly string[]).includes(brut.mise_en_page)) raisons.push(`La mise_en_page « ${court(brut.mise_en_page)} » est inconnue (permises : ${MISES_EN_PAGE.join(', ')})`)

    if (aCle(brut, 'nuit')) {
      const n = brut.nuit
      if (!estObjet(n)) raisons.push('Le réglage nuit doit être un objet (actif, debut, fin)')
      else {
        inconnues(n, ['actif', 'debut', 'fin'], 'nuit', raisons)
        if (aCle(n, 'actif') && typeof n.actif !== 'boolean') raisons.push('nuit.actif doit être vrai ou faux')
        for (const h of ['debut', 'fin']) if (aCle(n, h) && !(Number.isInteger(n[h]) && n[h] >= 0 && n[h] <= 23)) raisons.push(`nuit.${h} doit être une heure entière de 0 à 23`)
      }
    }

    if (aCle(brut, 'equipage')) {
      const e = brut.equipage
      if (!estObjet(e)) raisons.push('Le réglage equipage doit être un objet (un agent → nom, avatar, couleur)')
      else for (const [agent, v] of Object.entries(e)) {
        if (!aCle(EQUIPAGE, agent)) { raisons.push(`L'agent « ${court(agent)} » est inconnu de l'équipage`); continue }
        if (!estObjet(v)) { raisons.push(`Les réglages de l'agent ${agent} doivent être un objet`); continue }
        inconnues(v, ['nom', 'avatar', 'couleur'], `l'agent ${agent}`, raisons)
        if (aCle(v, 'nom') && !texteBorne(v.nom, 2, 16)) raisons.push(`Le nom de l'agent ${agent} doit faire de 2 à 16 signes (${REGLE_TEXTE})`)
        if (aCle(v, 'avatar') && !(typeof v.avatar === 'string' && avatars.includes(v.avatar))) raisons.push(`L'avatar de l'agent ${agent} doit être choisi dans la liste du thème`)
        if (aCle(v, 'couleur') && !(typeof v.couleur === 'string' && RE_COULEUR.test(v.couleur))) raisons.push(`La couleur de l'agent ${agent} doit être au format #RRGGBB`)
      }
    }

    if (aCle(brut, 'couleurs')) {
      const c = brut.couleurs
      if (!estObjet(c)) raisons.push('Le réglage couleurs doit être un objet (un jeton → #RRGGBB)')
      else for (const [jeton, v] of Object.entries(c)) {
        if (!jetons.includes(jeton)) { raisons.push(`Le jeton de couleur « ${court(jeton)} » est inconnu (permis : ${jetons.join(', ')})`); continue }
        if (!(typeof v === 'string' && RE_COULEUR.test(v))) raisons.push(`La couleur du jeton ${jeton} doit être au format #RRGGBB`)
      }
    }

    if (aCle(brut, 'affichage')) {
      const a = brut.affichage
      if (!estObjet(a)) raisons.push('Le réglage affichage doit être un objet (titre, taille_plaques)')
      else {
        inconnues(a, ['titre', 'taille_plaques'], 'affichage', raisons)
        if (aCle(a, 'titre') && !texteBorne(a.titre, 2, 32)) raisons.push(`Le titre doit faire de 2 à 32 signes (${REGLE_TEXTE})`)
        if (aCle(a, 'taille_plaques') && !(TAILLES_PLAQUES as readonly string[]).includes(a.taille_plaques)) raisons.push(`La taille_plaques « ${court(a.taille_plaques)} » est inconnue (permises : ${TAILLES_PLAQUES.join(', ')})`)
      }
    }

    if (aCle(brut, 'salles')) {
      const s = brut.salles
      if (!estObjet(s)) raisons.push('Le réglage salles doit être un objet (une salle → emplacement, plaque, teinte)')
      else {
        const placement: Record<string, string> = {}
        const plaques: Record<string, string> = {}
        for (const d of Array.isArray(t.defauts) ? t.defauts : []) if (typeof d?.salle === 'string' && typeof d?.emplacement === 'string') placement[d.salle] = d.emplacement
        for (const [salle, v] of Object.entries(s)) {
          if (!CLES_SALLE.includes(salle)) { raisons.push(`La salle « ${court(salle)} » est inconnue`); continue }
          if (!estObjet(v)) { raisons.push(`Les réglages de la salle ${salle} doivent être un objet`); continue }
          inconnues(v, ['emplacement', 'plaque', 'teinte'], `la salle ${salle}`, raisons)
          if (aCle(v, 'emplacement')) { if (typeof v.emplacement === 'string') placement[salle] = v.emplacement; else raisons.push(`L'emplacement de la salle ${salle} doit être une clé d'emplacement du thème`) }
          if (aCle(v, 'plaque')) { if (texteBorne(v.plaque, 2, 24)) plaques[salle] = v.plaque; else raisons.push(`La plaque de la salle ${salle} doit faire de 2 à 24 signes (${REGLE_TEXTE})`) }
          if (aCle(v, 'teinte') && !(typeof v.teinte === 'string' && RE_COULEUR.test(v.teinte))) raisons.push(`La teinte de la salle ${salle} doit être une couleur au format #RRGGBB`)
        }
        const verdict = validerDisposition(theme, { salles: placement, plaques })
        if (!verdict.ok) raisons.push(verdict.raison)
      }
    }
    return raisons.length ? refus() : { ok: true, reglages: brut as Reglages }
  } catch (e) {
    raisons.push(`Les réglages sont illisibles (${court((e as Error)?.message ?? e, 60)})`)
    return refus()
  }
}

function copier(v: any): any {
  if (Array.isArray(v)) return v.map(copier)
  if (estObjet(v)) { const o: Record<string, any> = {}; for (const k of Object.keys(v)) if (!DANGEREUSES.includes(k)) o[k] = copier(v[k]); return o }
  return v
}
function injecter(cible: Record<string, any>, source: Record<string, any>): void {
  for (const k of Object.keys(source)) {
    if (DANGEREUSES.includes(k) || source[k] === undefined) continue
    if (estObjet(source[k]) && aCle(cible, k) && estObjet(cible[k])) injecter(cible[k], source[k])
    else cible[k] = copier(source[k])
  }
}

/**
 * Les réglages l'emportent clé par clé, en profondeur ; une clé absente garde le défaut. Rend une copie neuve : les entrées
 * (éventuellement gelées) ne sont pas modifiées, rejouer la fusion ne change rien, `__proto__`, `constructor` et `prototype` sont ignorés.
 */
export function fusionner(defautsDuTheme: unknown, reglages: unknown): Record<string, any> {
  const base = estObjet(defautsDuTheme) ? copier(defautsDuTheme) : {}
  if (estObjet(reglages)) injecter(base, reglages)
  return base
}

/**
 * Pose l'habillage sur le SEUL nœud passé (le `.mc` de la station) : les jetons `--mc-*` (palette du thème, puis couleurs réglées)
 * et `data-mise-en-page`. Jamais sur document.documentElement ni body ; aucun HTML, aucune classe. Ne jette jamais.
 */
export function appliquerReglages(noeud: any, reglages: unknown, theme: unknown): void {
  if (!noeud || typeof noeud.style?.setProperty !== 'function' || typeof noeud.setAttribute !== 'function') return
  const t: Record<string, any> = estObjet(theme) ? theme : {}
  const r: Record<string, any> = estObjet(reglages) ? reglages : {}
  const palette: Record<string, any> = estObjet(t.palette) ? t.palette : {}
  const couleurs: Record<string, any> = estObjet(r.couleurs) ? r.couleurs : {}
  for (const jeton of Object.keys(palette)) {
    const reglee = aCle(couleurs, jeton) ? couleurs[jeton] : undefined
    const valeur = typeof reglee === 'string' && RE_COULEUR.test(reglee) ? reglee : palette[jeton]
    if (typeof valeur === 'string' && RE_COULEUR.test(valeur)) noeud.style.setProperty(jeton, valeur)
  }
  const page = (MISES_EN_PAGE as readonly string[]).includes(r.mise_en_page) ? r.mise_en_page : t.mise_en_page
  if ((MISES_EN_PAGE as readonly string[]).includes(page)) noeud.setAttribute('data-mise-en-page', page)
}
