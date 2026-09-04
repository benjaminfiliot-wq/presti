// Apparence avancée de la PLATEFORME (/p/[slug]) — sprint J-1 §9 G2.
//
// Même principe que lib/siteStyle.ts, tenu par construction : `plateformeStyleToCss`
// n'émet QUE ce qui s'écarte du défaut. Un artisan qui n'a jamais ouvert le volet
// « Apparence » obtient un objet vide → au pixel près la page qu'il avait avant.
// Tout passe par des variables CSS (`--prad`, `--pgap`, `--pfd`…) que plat.css lit avec
// un repli égal à la valeur d'aujourd'hui, et deux ou trois attributs `data-*`.
//
// Vocabulaire et polices : ceux du site (lib/siteStyle) — les 8 couples sont les mêmes,
// l'artisan n'apprend pas deux systèmes. Ce fichier est PUR (aucun accès serveur) : il
// tourne aussi dans le navigateur, pour l'aperçu en direct du volet Apparence.

import { COUPLES, type CoupleId } from './siteStyle'
import { lisibleSur, luminance } from './contrast'
import { FOND_THEME, fondDuTheme } from './themeFonds'

export type Densite = 'compacte' | 'normale' | 'aeree'
export type Composeur = 'classique' | 'flottant' | 'carre'
/** `theme` = clair/sombre décidé par le thème (comportement d'aujourd'hui). */
export type Schema = 'theme' | 'sombre' | 'auto'

export type PlateformeStyle = {
  v: 1
  couple: CoupleId | null       // null = police du thème
  accent2: string | null        // couleur secondaire (null = dérivée de l'accent)
  fond: string | null           // couleur de fond (null = celle du thème)
  fond2: string | null          // 2e couleur → dégradé (ignorée sans `fond`)
  fond_image: string | null     // image du bucket artisan-media (prime sur les couleurs)
  rayon: number | null          // angles, en px (0 → 24) ; null = ceux du thème
  densite: Densite
  composeur: Composeur
  schema: Schema
  accueil_titre: string | null  // titre de l'écran d'accueil (null = « Bonjour 👋 »)
}

export const STYLE_PLAT_DEFAUT: PlateformeStyle = {
  v: 1, couple: null, accent2: null, fond: null, fond2: null, fond_image: null,
  rayon: null, densite: 'normale', composeur: 'classique', schema: 'theme', accueil_titre: null,
}

export const THEMES_PLAT = ['atelier', 'nuit', 'epure', 'chantier', 'bleu', 'vitrine'] as const
export const ACCENT_DEFAUT = '#D97757'
// L'accent sert de FOND (bulles, boutons, points de la frise) ; le texte, lui, prend une encre
// dérivée qui atteint 4,6:1 (`--pc-ink`, lisibleSur). Ici on garantit seulement que l'accent reste
// VISIBLE sur le fond : sous ce plancher, il est corrigé jusqu'à la cible. Le corail par défaut fait
// 2,5:1 sur Atelier — on ne touche pas à une couleur que le produit lui-même propose.
export const ACCENT_VISIBILITE_MIN = 2.2
export const ACCENT_VISIBILITE_CIBLE = 3

const borne = (v: unknown, min: number, max: number): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null
}
const parmi = <T extends string>(v: unknown, liste: readonly T[], def: T): T => (liste.includes(v as T) ? (v as T) : def)
export const couleurHex = (v: unknown): string | null => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null)
const texteCourt = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim().slice(0, max)
  return t || null
}

/**
 * Seules les images du bucket public `artisan-media` sont acceptées : l'URL finit dans
 * une déclaration CSS `url(...)`, on ne laisse donc entrer que des caractères sûrs.
 */
export function urlMediaSure(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 400) return null
  return /^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/artisan-media\/[A-Za-z0-9._\/-]+$/.test(v) ? v : null
}

/** Lit ce qui est stocké (jsonb) et en fait un style sûr : rien ne sort des bornes. */
export function resolvePlateformeStyle(stored: unknown): PlateformeStyle {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<PlateformeStyle>
  const fond = couleurHex(s.fond)
  return {
    v: 1,
    couple: s.couple ? parmi(s.couple, COUPLES.map((c) => c.id), STYLE_PLAT_DEFAUT.couple as CoupleId) : null,
    accent2: couleurHex(s.accent2),
    fond,
    fond2: fond ? couleurHex(s.fond2) : null,
    fond_image: urlMediaSure(s.fond_image),
    rayon: borne(s.rayon, 0, 24),
    densite: parmi(s.densite, ['compacte', 'normale', 'aeree'] as const, STYLE_PLAT_DEFAUT.densite),
    composeur: parmi(s.composeur, ['classique', 'flottant', 'carre'] as const, STYLE_PLAT_DEFAUT.composeur),
    schema: parmi(s.schema, ['theme', 'sombre', 'auto'] as const, STYLE_PLAT_DEFAUT.schema),
    accueil_titre: texteCourt(s.accueil_titre, 60),
  }
}

/** Ce qu'on ENREGISTRE : uniquement les écarts au défaut. `{}` = rien de réglé. */
export function diffPlateformeStyle(s: PlateformeStyle): Partial<PlateformeStyle> {
  const d: Partial<PlateformeStyle> = {}
  for (const k of Object.keys(STYLE_PLAT_DEFAUT) as (keyof PlateformeStyle)[]) {
    if (k === 'v') continue
    if (s[k] !== STYLE_PLAT_DEFAUT[k]) (d as Record<string, unknown>)[k] = s[k]
  }
  return d
}

/** La page est-elle sombre avec ce style et ce thème ? (pour choisir l'encre lisible) */
export function fondEffectif(s: PlateformeStyle, theme: string | null | undefined): string {
  if (s.fond) return s.fond
  if (s.schema === 'sombre') return FOND_THEME.nuit
  return fondDuTheme(theme)
}

const RAYON_DEFAUT = 16

/**
 * Variables CSS à poser sur `main.plat`. N'émet QUE ce qui s'écarte du défaut.
 * `theme` sert à vérifier la lisibilité de la couleur secondaire sur le vrai fond.
 */
export function plateformeStyleToCss(s: PlateformeStyle, theme: string | null | undefined): Record<string, string> {
  const css: Record<string, string> = {}
  const c = s.couple ? COUPLES.find((x) => x.id === s.couple) : null
  if (c) { css['--pfd'] = c.display; css['--pfb'] = c.texte }
  const fond = fondEffectif(s, theme)
  // La couleur secondaire sert de TEXTE (« X vous répond directement », étiquette Devis) :
  // on la garde la sienne, assombrie ou éclaircie juste ce qu'il faut pour rester lisible.
  if (s.accent2) css['--pc2'] = lisibleSur(s.accent2, fond)
  if (s.fond) {
    css['--pb'] = s.fond
    const sombre = (luminance(s.fond) ?? 1) < 0.25
    // Surfaces (bulles, colonne) dérivées du fond : un peu plus claires sur un fond clair
    // comme sur un fond sombre — le relief reste, quelle que soit la couleur choisie.
    css['--ps'] = sombre ? `color-mix(in srgb, ${s.fond} 86%, #fff)` : `color-mix(in srgb, ${s.fond} 55%, #fff)`
    css['--ps2'] = sombre ? `color-mix(in srgb, ${s.fond} 76%, #fff)` : `color-mix(in srgb, ${s.fond} 88%, #000)`
    if (s.fond2 && !s.fond_image) css['--pbg'] = `linear-gradient(160deg, ${s.fond}, ${s.fond2})`
  }
  if (s.fond_image) css['--pbg'] = `url("${s.fond_image}")`
  if (s.rayon !== null && s.rayon !== RAYON_DEFAUT) {
    css['--prad'] = `${s.rayon}px`
    css['--prad-s'] = `${Math.round(s.rayon * 0.66)}px`
    css['--prad-l'] = `${Math.min(24, s.rayon + 2)}px`
    css['--prad-pill'] = s.rayon >= 12 ? '999px' : `${s.rayon}px`
  }
  if (s.densite === 'compacte') { css['--pgap'] = '.55rem'; css['--pbub-pad'] = '.5rem .8rem'; css['--pfs'] = '.92rem' }
  if (s.densite === 'aeree') { css['--pgap'] = '1.15rem'; css['--pbub-pad'] = '.85rem 1.1rem'; css['--pfs'] = '1rem' }
  return css
}

/** Attributs `data-*` : ce qui ne se règle pas avec un nombre. */
export function plateformeStyleToData(s: PlateformeStyle): Record<string, string> {
  const d: Record<string, string> = {}
  if (s.fond_image) d['data-fond'] = 'image'
  else if (s.fond && s.fond2) d['data-fond'] = 'degrade'
  // Un fond sombre choisi à la main bascule l'encre en clair, comme le thème Nuit.
  const fondSombre = !!s.fond && (luminance(s.fond) ?? 1) < 0.25
  if (s.schema === 'sombre' || (fondSombre && s.schema !== 'auto')) d['data-schema'] = 'sombre'
  else if (s.schema === 'auto') d['data-schema'] = 'auto'
  if (s.composeur !== STYLE_PLAT_DEFAUT.composeur) d['data-composeur'] = s.composeur
  return d
}

// ── Aperçu en direct (volet Apparence) ─────────────────────────────────────────
// La page /p/[slug] applique un style passé en query UNIQUEMENT si `?apercu=1` — jamais
// enregistré, jamais indexé (la plateforme est déjà noindex). Le volet envoie ensuite les
// changements par postMessage, même origine, sans recharger le cadre.

export type ApercuPayload = {
  theme?: string | null
  accent?: string | null
  apparence?: Partial<PlateformeStyle> | null
  avatar_url?: string | null
  amorces?: string[] | null
  message_accueil?: string | null
  nom_assistant?: string | null
}

const versBase64Url = (s: string): string => {
  const b = typeof Buffer !== 'undefined'
    ? Buffer.from(s, 'utf8').toString('base64')
    : btoa(Array.from(new TextEncoder().encode(s), (x) => String.fromCharCode(x)).join(''))
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const depuisBase64Url = (s: string): string => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/')
  if (typeof Buffer !== 'undefined') return Buffer.from(b, 'base64').toString('utf8')
  return new TextDecoder().decode(Uint8Array.from(atob(b), (ch) => ch.charCodeAt(0)))
}

export function encoderApercu(p: ApercuPayload): string { return versBase64Url(JSON.stringify(p)) }

/** Décode et ASSAINIT un aperçu : chaque champ repasse par les mêmes bornes que l'enregistrement. */
export function decoderApercu(b64: string | null | undefined): ApercuPayload | null {
  if (!b64 || b64.length > 6000) return null
  try {
    const o = JSON.parse(depuisBase64Url(b64)) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    return assainirApercu(o)
  } catch { return null }
}

export function assainirApercu(o: Record<string, unknown>): ApercuPayload {
  const p: ApercuPayload = {}
  if (typeof o.theme === 'string' && (THEMES_PLAT as readonly string[]).includes(o.theme)) p.theme = o.theme
  const accent = couleurHex(o.accent); if (accent) p.accent = accent
  if (o.apparence && typeof o.apparence === 'object') p.apparence = diffPlateformeStyle(resolvePlateformeStyle(o.apparence))
  if ('avatar_url' in o) p.avatar_url = urlMediaSure(o.avatar_url)
  if (Array.isArray(o.amorces)) p.amorces = amorcesSures(o.amorces)
  if ('message_accueil' in o) p.message_accueil = texteCourt(o.message_accueil, 200)
  if ('nom_assistant' in o) p.nom_assistant = texteCourt(o.nom_assistant, 40)
  return p
}

/** 4 amorces au plus, 80 caractères chacune, vides retirées. */
export function amorcesSures(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((a) => texteCourt(a, 80)).filter((a): a is string => !!a).slice(0, 4)
}
