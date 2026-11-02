// lib/sms/encodage.ts — GSM-7, septets, segments, et le contrôle du texte (STOP, lien, montant, menace).
//
// GSM 03.38 : l'alphabet de base compte un septet par caractère ; l'extension (€ ^ { } \ [ ] ~ | et saut de page) en compte
// deux. Piège français : parmi les lettres accentuées, seules é è ù à ì ò (et Ç en MAJUSCULE) sont dans la table. Les minuscules « ç ê î ô û â œ »
// n'y sont pas : un seul d'entre eux fait passer tout le SMS en UCS-2 (70 caractères par segment, 67 chaînés). Pour Presti,
// « GSM-7 pur » = alphabet de base seul, sans l'extension (un « € » n'a rien à faire dans un SMS sans montant).

const BASE =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const EXTENSION = '\f^{}\\[~]|€'
const SET_BASE = new Set(Array.from(BASE))
const SET_EXTENSION = new Set(Array.from(EXTENSION))

export type Encodage = 'gsm7' | 'ucs2'

export type Mesure = { encodage: Encodage; unites: number; segments: number; horsAlphabet: string[] }

/** Septets (GSM-7) ou unités UTF-16 (UCS-2), segments, et les caractères qui ont fait perdre le GSM-7. */
export function mesurer(texte: string): Mesure {
  const caracteres = Array.from(texte)
  const horsAlphabet = caracteres.filter((c) => !SET_BASE.has(c) && !SET_EXTENSION.has(c))
  if (horsAlphabet.length === 0) {
    const unites = caracteres.reduce((n, c) => n + (SET_EXTENSION.has(c) ? 2 : 1), 0)
    const segments = unites === 0 ? 0 : unites <= 160 ? 1 : Math.ceil(unites / 153)
    return { encodage: 'gsm7', unites, segments, horsAlphabet: [] }
  }
  const unites = texte.length // unités UTF-16 : un emoji en vaut deux, comme chez l'opérateur
  const segments = unites === 0 ? 0 : unites <= 70 ? 1 : Math.ceil(unites / 67)
  return { encodage: 'ucs2', unites, segments, horsAlphabet: Array.from(new Set(horsAlphabet)) }
}

/** GSM-7 « pur » : alphabet de base seulement (l'extension, dont « € », est refusée). */
export const estGsm7Pur = (texte: string): boolean => Array.from(texte).every((c) => SET_BASE.has(c))

/** Aide à la rédaction : ramène un texte à l'alphabet de base (ç→c, ê→e, œ→oe, apostrophe typographique→'). Ne sert jamais à « réparer » un SMS refusé. */
export function versGsm7(texte: string): string {
  return Array.from(texte.replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-'))
    .map((c) => {
      if (SET_BASE.has(c)) return c
      const nu = c.normalize('NFD').replace(/[̀-ͯ]/g, '')
      return nu !== c && SET_BASE.has(nu) ? nu : '?'
    })
    .join('')
}

/** STOP : le mot entier, sans tenir compte de la casse (« STOP », « Stop »). Pas « stoppé ». */
export const porteStop = (texte: string): boolean => /(^|[^A-Za-z0-9])stop($|[^A-Za-z0-9])/i.test(texte)

/** Un lien : schéma, « www. », ou un nom de domaine usuel. Le plan interdit tout lien (porte 5). */
export const contientLien = (texte: string): boolean =>
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(fr|com|net|org|io|app|me|ly|co|eu|info|biz)\b|\bbit\.ly\b)/i.test(texte)

/** Un montant (chiffre + € / euro / eur, ou « € » seul) ; le plan interdit tout montant dans un SMS. */
export const contientMontant = (texte: string): boolean => /(\d\s*(€|eur\b|euros?\b)|€\s*\d|€)/i.test(texte)

/** Menace ou pression : le rappel de paiement reste courtois (R5 §7.3). Liste volontairement large, fermée vers le refus. */
const MENACES = /(huissier|contentieux|poursuite|mise en demeure|recouvrement|tribunal|justice|saisie|p[ée]nalit[ée]|majoration|derni[eè]re chance|sans r[ée]ponse de votre part|urgent|sous 24|avocat|plainte)/i
export const contientMenace = (texte: string): boolean => MENACES.test(texte)

export type RefusTexte = 'stop_absent' | 'non_gsm7' | 'trop_long' | 'vide' | 'lien' | 'montant' | 'menace'

/** Le contrôle complet du texte, dans l'ordre : STOP, lien, montant, menace (le refus le plus parlant d'abord), alphabet, longueur. `null` = le texte passe. */
export function controlerTexte(texte: unknown, segmentsMax: number): RefusTexte | null {
  if (typeof texte !== 'string' || texte.trim() === '') return 'vide'
  if (!porteStop(texte)) return 'stop_absent'
  if (contientLien(texte)) return 'lien'
  if (contientMontant(texte)) return 'montant'
  if (contientMenace(texte)) return 'menace'
  if (!estGsm7Pur(texte)) return 'non_gsm7'
  if (mesurer(texte).segments > segmentsMax) return 'trop_long'
  return null
}
