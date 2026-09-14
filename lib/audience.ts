// La mesure d'audience de la vitrine (migrations 0090 à 0092) — ce qui est compté, où, et ce qui ne l'est jamais.
//
// Ce module est lu des DEUX côtés : par le composant qui envoie la vue (app/Audience.tsx) et par la route
// qui l'écrit (app/api/audience). Il n'importe donc rien de Node — les empreintes, qui ont besoin d'un secret,
// vivent dans lib/audienceServeur.ts.
//
// Les trois règles qui font que la mesure reste exemptée de consentement (CNIL) et que nos pages disent vrai :
//   · LISTE FERMÉE de pages : les pages publiques de Presti, rien d'autre. Ni l'espace de l'artisan, ni le
//     Poste de contrôle, ni surtout le site et la plateforme d'un artisan, dont la page légale promet
//     « ne vous suit sur aucun autre site ». Une page absente de la liste n'envoie rien et n'est pas écrite.
//   · RIEN QUI IDENTIFIE : ni cookie, ni identifiant stocké dans le navigateur, ni IP, ni adresse complète
//     du référent (son hôte seul : une adresse de moteur de recherche porte la requête tapée), ni texte libre
//     venu d'un lien : utm_source et utm_campaign ne sont retenus que s'ils sont dans NOS listes.
//   · UN REFUS SE RESPECTE : Global Privacy Control, Do Not Track, et le bouton de /confidentialite.

/** Les pages mesurées, avec le nom que leur donne l'écran. La clé est le chemin EXACT. */
export const PAGES_MESUREES: Record<string, string> = {
  '/': 'Accueil',
  '/faq': 'FAQ',
  '/contact': 'Contact',
  '/login': 'Connexion',
  '/signup': 'Inscription',
  '/cgu': 'Conditions générales',
  '/confidentialite': 'Confidentialité',
  '/mentions-legales': 'Mentions légales',
}

/**
 * Les pages où une vue précède souvent un compte. Les campagnes sur 7 jours ne comptent pas les arrivées sur ces
 * pages (0092) : une campagne à une seule arrivée sur /signup désignerait l'inscrit du jour. (Le flux du Poste, lui,
 * ne montre plus aucun attribut sur aucune page : 0091 les masquait ici seulement, ce qui déplaçait le recoupement
 * sur la ligne voisine — contre-revue du 14/09.)
 */
export const CHEMINS_DISCRETS: readonly string[] = ['/login', '/signup']

/** Les seuls hôtes mesurés. Pas qg. (la console), pas *.vercel.app (les aperçus), pas localhost (le dev écrit en prod). */
export const HOTES_MESURES: readonly string[] = ['prestiapp.fr', 'www.prestiapp.fr']

/** Durée de conservation du DÉTAIL des vues (la politique l'annonce ; audience_cloturer l'applique). Les totaux par jour restent. */
export const MOIS_AUDIENCE = 13

/** Clé de stockage local : `non` = ce navigateur n'est pas compté ; `oui` = choix explicite de l'être (tests du Poste). */
export const CLE_NE_PAS_COMPTER = 'presti.audience'

/**
 * Les campagnes que Presti écrit dans SES liens (utm_campaign), éventuellement suivies d'une date (-2026, -2026-09,
 * -2026-09-14). Toute autre valeur n'est pas enregistrée : un filtre de numéros de téléphone laissait passer les formats
 * belges, suisses, « (0) », et tous les noms propres (« relance-jean-dupont ») — contre-revue du 14/09. Ajouter une
 * campagne ici AVANT de diffuser le lien. `essai-e2e` : écrite par scripts/audience-e2e.mjs, et effacée aussitôt.
 */
export const CAMPAGNES: readonly string[] = [
  'lot-20x20', 'demarchage-instagram', 'demarchage-facebook', 'demarchage-linkedin',
  'bio-instagram', 'page-facebook', 'signature-email', 'salon', 'flyer', 'essai-e2e',
]

export const cheminMesurable = (chemin: string): boolean => Object.prototype.hasOwnProperty.call(PAGES_MESUREES, chemin)
export const hoteMesure = (hote: string): boolean => HOTES_MESURES.includes(hote.toLowerCase())
export const libellePage = (chemin: string): string => PAGES_MESUREES[chemin] ?? chemin

// Robots, sondes, aperçus de liens et nos propres suites (user-agent `presti-…`) : un robot ne regarde pas.
// `(?<!cu)bot` : les téléphones CUBOT sont des téléphones ; `telegrambot` et non `telegram` : le navigateur
// intégré de Telegram porte « Telegram-Android » et c'est un vrai lecteur. Les outils de rendu de Google
// (inspection d'URL, lecture à voix haute) et les agents des assistants exécutent le JavaScript sans « bot ».
const ROBOTS = /(?<!cu)bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|whatsapp\/|telegrambot|google-(inspectiontool|read-aloud|extended|site-verification)|googleother|chatgpt-user|perplexity-user|curl\/|wget|python|node-fetch|undici|axios|go-http|java\/|okhttp|playwright|puppeteer|phantom|selenium|presti-/i
export const estRobot = (ua: string): boolean => !ua || ua.length < 20 || ROBOTS.test(ua)

export type Appareil = 'mobile' | 'tablette' | 'ordinateur'
/**
 * `tactile` vient du navigateur (plus d'un point de contact) : Safari sur iPad et Chrome sur les grandes tablettes
 * Android se présentent comme un Mac ou un Linux de bureau — sans cet indice, aucune tablette n'était vue.
 */
export function appareilDe(ua: string, tactile = false): Appareil {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablette'
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return 'mobile'
  if (tactile && /Macintosh|X11; Linux/.test(ua)) return 'tablette'
  return 'ordinateur'
}

/** La FAMILLE du navigateur, jamais sa version : une version précise aide à distinguer une personne. */
export function navigateurDe(ua: string): string {
  if (/Instagram/i.test(ua)) return 'Instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook'
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn'
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser/.test(ua)) return 'Samsung'
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox'
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Autre'
}

// L'ordre compte : Gmail avant Google.
const SOURCES: [RegExp, string][] = [
  [/^mail\.google\.com$/, 'gmail'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)qwant\.com$/, 'qwant'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'yahoo'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(facebook\.com|fb\.me|fb\.com|messenger\.com)$/, 'facebook'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
]
const APPLIS: [RegExp, string][] = [
  [/\.gm$/, 'gmail'], [/instagram/, 'instagram'], [/facebook|orca/, 'facebook'], [/linkedin/, 'linkedin'], [/google/, 'google'], [/whatsapp/, 'whatsapp'],
]

const hoteDe = (url: string): string | null => { try { return new URL(url).hostname.toLowerCase() } catch { return null } }
/** Un hôte de Presti, quel qu'il soit (vitrine, console) : venir de là n'est pas « arriver ». */
export const estHotePresti = (h: string | null): boolean => !!h && (h === 'prestiapp.fr' || h.endsWith('.prestiapp.fr'))

/** Nom de la source d'après le référent : un nom connu, ou l'hôte seul. `null` = accès direct ou navigation interne. */
export function hoteSource(referent: string): string | null {
  if (!referent) return null
  let u: URL
  try { u = new URL(referent) } catch { return null }
  if (u.protocol === 'android-app:') {
    const app = u.hostname.toLowerCase()
    for (const [re, nom] of APPLIS) if (re.test(app)) return nom
    return 'application'
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const h = u.hostname.toLowerCase().replace(/^(www|m|l|lm|mobile)\./, '')
  if (!h || estHotePresti(h)) return null
  for (const [re, nom] of SOURCES) if (re.test(h)) return nom
  return /^[a-z0-9.-]{1,80}$/.test(h) ? h : null
}

/** Minuscules, accents retirés (« Démarchage » → « demarchage », pas « d-marchage »), tout le reste en tirets. */
const nettoyer = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max)
  return s || null
}

/** utm_source n'est retenu que s'il NOMME une source connue : en texte libre, il porte une adresse email ou un nom. */
export function sourceUtm(v: unknown): string | null {
  const s = nettoyer(v, 40)
  return s && s !== 'direct' && Object.prototype.hasOwnProperty.call(LIBELLES_SOURCE, s) ? s : null
}

const SUFFIXE_DATE = /^-(19|20)\d{2}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/

/** utm_campaign n'est retenu que s'il est une campagne de CAMPAGNES, éventuellement datée. */
export function campagneUtm(v: unknown): string | null {
  const s = nettoyer(v, 60)
  if (!s) return null
  return CAMPAGNES.some((c) => s === c || (s.startsWith(c) && SUFFIXE_DATE.test(s.slice(c.length)))) ? s : null
}

export type Vue = { chemin: string; entree: boolean; source: string | null; campagne: string | null; tactile: boolean }

/**
 * Le corps envoyé par le navigateur, relu comme une entrée hostile : `{ c: chemin, e: entrée, t: tactile, r: référent,
 * s: utm_source, k: utm_campaign }`. `null` = rien à écrire. La source et la campagne ne valent que pour la page
 * d'ENTRÉE ; et un référent de Presti n'est jamais une entrée, quoi qu'en dise le corps (filet pour un ancien
 * bundle en cache, qui comptait chaque page ouverte comme une arrivée directe).
 */
export function lireVue(corps: unknown): Vue | null {
  if (!corps || typeof corps !== 'object') return null
  const o = corps as Record<string, unknown>
  const chemin = typeof o.c === 'string' ? o.c.split(/[?#]/)[0] : ''
  if (!cheminMesurable(chemin)) return null
  const tactile = o.t === 1 || o.t === true
  const referent = typeof o.r === 'string' ? o.r.slice(0, 300) : ''
  const entree = o.e === true && !estHotePresti(hoteDe(referent))
  if (!entree) return { chemin, entree: false, source: null, campagne: null, tactile }
  return { chemin, entree, source: sourceUtm(o.s) ?? hoteSource(referent), campagne: campagneUtm(o.k), tactile }
}

/** L'en-tête pays de l'hébergeur (deux lettres), ou rien. Jamais la ville ni la région. */
export const paysDe = (v: string | null | undefined): string | null => (v && /^[A-Z]{2}$/.test(v) && v !== 'XX' ? v : null)

/** La requête vient-elle d'une page de Presti ? Un filtre de bruit (l'en-tête se falsifie), pas une sécurité : le plafond l'est. */
export function origineMaison(origin: string | null, referer: string | null): boolean {
  const h = (origin ? hoteDe(origin) : null) ?? (referer ? hoteDe(referer) : null)
  return !!h && hoteMesure(h)
}

export const LIBELLES_SOURCE: Record<string, string> = {
  direct: 'Accès direct', google: 'Google', gmail: 'Gmail', bing: 'Bing', duckduckgo: 'DuckDuckGo', qwant: 'Qwant', ecosia: 'Ecosia',
  yahoo: 'Yahoo', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X (Twitter)', youtube: 'YouTube',
  tiktok: 'TikTok', chatgpt: 'ChatGPT', perplexity: 'Perplexity', whatsapp: 'WhatsApp', application: 'Une application',
  // Des sources qu'on ne voit que par un lien marqué (utm_source) : un email, un SMS, un QR code imprimé.
  email: 'Email', sms: 'SMS', qr: 'QR code', affiche: 'Affiche ou flyer',
}
export const libelleSource = (s: string | null): string => (s ? LIBELLES_SOURCE[s] ?? s : 'Accès direct')
