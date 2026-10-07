// lib/agents/acquisition/scoreDouleur.ts — le score de douleur B2B d'une entreprise prospectée (07/10/2026).
//
// Demande de Benj (07/10) : contacter d'abord « des personnes qui ont des problèmes qu'on peut résoudre ». Le score (0 à
// 100) mesure, à partir de SIGNAUX PUBLICS sur l'entreprise elle-même, à quel point elle souffre de ce que Presti résout :
// pas de site ou site obsolète (faits site_copyright, site_http, site_mobile relevés par le recenseur), formulaire de
// contact absent ou cassé, avis publics qui se plaignent de devis ou de rappels absents (COMPTÉS, jamais stockés), et nos
// propres messages restés sans réponse. Les files du recenseur et du premier contact passent par ordre de score
// décroissant (migration 0135).
//
// Module PUR : aucun import de valeur, aucun réseau, aucune base. Le détail rendu ne contient QUE des codes et des
// nombres : jamais un texte d'avis, un nom d'auteur ou une donnée personnelle (le juge scripts/score-douleur-qa.mjs le
// vérifie). Les textes d'avis éventuels passent par compterAvis, en mémoire, et seul le décompte sort.
//
// Syntaxe effaçable seulement (le juge importe ce fichier par scripts/ts-loader.mjs).
import type { ThemePlainte } from './plaintes'

export const VERSION_SCORE = 'sd-1'

export type CodeSignal =
  | 'pas_de_site'
  | 'site_obsolete'
  | 'site_sans_https'
  | 'site_pas_mobile'
  | 'formulaire_absent'
  | 'formulaire_casse'
  | 'avis_devis_sans_reponse'
  | 'avis_injoignable'
  | 'avis_sans_reponse'
  | 'nos_messages_sans_reponse'

export interface SignalDouleur {
  code: CodeSignal
  /** Les points apportés au score (déjà plafonnés pour ce signal). */
  poids: number
  theme: ThemePlainte
  /** Pour un signal compté (avis, messages) : le nombre. */
  n?: number
}

/** Les avis publics de l'entreprise, AGRÉGÉS : des nombres seulement. */
export interface AvisAgreges {
  total: number
  devis_sans_reponse: number
  injoignable: number
  sans_reponse: number
}

export interface EntreeScore {
  domaine?: string | null
  faits?: readonly { type: string }[] | null
  /** Le formulaire lu sur le site (ops.prospects.formulaire), ou null s'il n'y en a pas. */
  formulaire?: { url_page?: string; url_action?: string; champs?: readonly unknown[] } | null
  /** Le verdict du lecteur de site, quand il est connu (LectureSite.verdict_formulaire). */
  verdict_formulaire?: { eligible: boolean; raison?: string } | null
  /** Les pages lues (LectureSite.pages) : une page de formulaire en erreur rend le formulaire « cassé ». */
  pages?: readonly { url: string; statut: number }[] | null
  /** Vrai quand le site a été lu (sinon l'absence de formulaire n'est pas un signal : on ne sait pas). */
  site_lu?: boolean
  avis?: AvisAgreges | null
  /** Nos envois partis vers cette entreprise et restés sans réponse depuis 7 jours au moins. */
  messages_sans_reponse?: number
}

export interface ScoreDouleur {
  version: typeof VERSION_SCORE
  score: number
  signaux: SignalDouleur[]
}

/** Les poids (points) de chaque signal ; un signal compté prend `parUnite` par occurrence, jusqu'à `max`. */
export const POIDS: Readonly<Record<CodeSignal, { theme: ThemePlainte; parUnite: number; max: number }>> = Object.freeze({
  pas_de_site: { theme: 'site_absent', parUnite: 35, max: 35 },
  site_obsolete: { theme: 'site_absent', parUnite: 20, max: 20 },
  site_pas_mobile: { theme: 'site_absent', parUnite: 15, max: 15 },
  site_sans_https: { theme: 'site_absent', parUnite: 10, max: 10 },
  formulaire_absent: { theme: 'appels_manques', parUnite: 15, max: 15 },
  formulaire_casse: { theme: 'appels_manques', parUnite: 15, max: 15 },
  avis_devis_sans_reponse: { theme: 'devis_sans_suite', parUnite: 10, max: 25 },
  avis_injoignable: { theme: 'appels_manques', parUnite: 10, max: 25 },
  avis_sans_reponse: { theme: 'appels_manques', parUnite: 8, max: 20 },
  nos_messages_sans_reponse: { theme: 'appels_manques', parUnite: 5, max: 5 },
})

const entierPositif = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0)

/** Le score de douleur d'une entreprise. Déterministe, sans effet ; 0 si rien n'est connu. */
export function scoreDouleur(e: EntreeScore): ScoreDouleur {
  const signaux: SignalDouleur[] = []
  const ajouter = (code: CodeSignal, n = 1) => {
    const p = POIDS[code]
    const k = entierPositif(n)
    if (!k) return
    const poids = Math.min(p.max, p.parUnite * k)
    signaux.push(p.parUnite === p.max ? { code, poids, theme: p.theme } : { code, poids, theme: p.theme, n: k })
  }
  const domaine = typeof e.domaine === 'string' ? e.domaine.trim() : ''
  const types = new Set((e.faits ?? []).map((f) => f?.type))

  if (!domaine) ajouter('pas_de_site')
  else {
    if (types.has('site_copyright')) ajouter('site_obsolete')
    if (types.has('site_mobile')) ajouter('site_pas_mobile')
    if (types.has('site_http')) ajouter('site_sans_https')
    const lu = e.site_lu === true || !!e.formulaire || !!e.verdict_formulaire || (e.pages?.length ?? 0) > 0 || types.has('site_titre')
    if (lu) {
      const sansFormulaire = e.verdict_formulaire?.eligible === false && e.verdict_formulaire.raison === 'sans_formulaire'
      if (!e.formulaire || sansFormulaire) ajouter('formulaire_absent')
      else if (formulaireCasse(e.formulaire, e.pages ?? [])) ajouter('formulaire_casse')
    }
  }
  const a = e.avis
  if (a && entierPositif(a.total)) {
    ajouter('avis_devis_sans_reponse', Math.min(entierPositif(a.devis_sans_reponse), entierPositif(a.total)))
    ajouter('avis_injoignable', Math.min(entierPositif(a.injoignable), entierPositif(a.total)))
    ajouter('avis_sans_reponse', Math.min(entierPositif(a.sans_reponse), entierPositif(a.total)))
  }
  ajouter('nos_messages_sans_reponse', Math.min(entierPositif(e.messages_sans_reponse), 1))

  const score = Math.max(0, Math.min(100, signaux.reduce((s, x) => s + x.poids, 0)))
  return { version: VERSION_SCORE, score, signaux }
}

/** Un formulaire est « cassé » quand sa page a répondu en erreur ou que son action ne mène nulle part. */
export function formulaireCasse(f: NonNullable<EntreeScore['formulaire']>, pages: readonly { url: string; statut: number }[]): boolean {
  const action = String(f.url_action ?? '').trim()
  if (!action || /^(#|javascript:)/i.test(action)) return true
  if (Array.isArray(f.champs) && f.champs.length === 0) return true
  const page = pages.find((p) => p.url === f.url_page)
  return !!page && page.statut >= 400
}

/**
 * Le décompte des avis publics qui se plaignent de devis ou de rappels absents. Les textes ne sont lus qu'ici, en
 * mémoire : seul le décompte sort (jamais un texte, un nom ou une date d'avis). Un même avis peut compter dans plusieurs
 * catégories.
 */
export function compterAvis(textes: readonly string[]): AvisAgreges {
  const r: AvisAgreges = { total: 0, devis_sans_reponse: 0, injoignable: 0, sans_reponse: 0 }
  for (const brut of textes) {
    if (typeof brut !== 'string' || !brut.trim()) continue
    const t = brut.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'")
    r.total++
    if (/\bdevis\b/.test(t) && (/(jamais|pas|aucun)[^.!?]{0,40}(recu|envoye|eu|nouvelles?|retour|reponse|arrive)/.test(t) || /(attends?|attendons|attendu)[^.!?]{0,15}(toujours|encore)/.test(t) || /devis (promis|jamais|toujours pas)/.test(t))) r.devis_sans_reponse++
    if (/(injoignable|jamais rappel|pas rappel|aucun rappel|ne rappelle|ne decroche|messagerie|repondeur|ne repond (pas|jamais) au (telephone|tel))/.test(t)) r.injoignable++
    if (/(aucune reponse|jamais repondu|sans reponse|pas de reponse|ne repond (pas|jamais|plus)|n'a (jamais|pas) repondu)/.test(t)) r.sans_reponse++
  }
  return r
}

/** Le détail stocké avec le score (ops.prospects.score_douleur_detail) : codes, poids et nombres seulement. */
export function detailStockable(s: ScoreDouleur): { version: string; signaux: { code: CodeSignal; poids: number; n?: number }[] } {
  return { version: s.version, signaux: s.signaux.map((x) => (x.n === undefined ? { code: x.code, poids: x.poids } : { code: x.code, poids: x.poids, n: x.n })) }
}
