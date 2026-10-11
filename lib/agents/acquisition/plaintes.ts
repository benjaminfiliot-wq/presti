// lib/agents/acquisition/plaintes.ts — la veille agrégée des plaintes publiques d'artisans, par thème (07/10/2026).
//
// Demande de Benj (07/10) : « il faut vraiment des personnes qui ont des problèmes qu'on peut résoudre, et le mieux serait
// qu'elles s'en plaignent ». Ce module est la partie PURE de la veille : les cinq thèmes que Presti résout, le classement
// d'une phrase dans ces thèmes, le découpage d'une page en phrases candidates et le contrôle « aucune donnée personnelle ».
// Les citations retenues (relues, mot pour mot) vivent dans plaintesParTheme.ts ; l'outil qui lit les pages est
// scripts/veille-plaintes.mjs ; le juge est scripts/veille-plaintes-qa.mjs ; la méthode est docs/agents/plaintes-par-theme.md.
//
// RGPD : on garde la phrase, la page du fil et la date de la relève, JAMAIS l'auteur (pseudo, nom, profil, ville, photo).
// On ne contacte jamais un auteur de forum (un particulier : aucune base légale). Reddit et Google Maps ne sont PAS lus
// automatiquement (robots.txt « Disallow: / » pour Reddit ; conditions de Google Maps) : voir la doc.
//
// Syntaxe effaçable seulement (le juge importe ce fichier par scripts/ts-loader.mjs) : ni enum, ni namespace.

export type ThemePlainte = 'devis_sans_suite' | 'appels_manques' | 'site_absent' | 'impayes' | 'administratif'

export interface Theme {
  id: ThemePlainte
  libelle: string
  /** Ce que Presti fait contre cette douleur (une phrase, pour la doc et la maquette). */
  reponse_presti: string
  /** Toutes les familles doivent être présentes dans la phrase (ET entre familles, OU dans une famille). */
  familles: readonly (readonly RegExp[])[]
}

const f = (...r: RegExp[]) => Object.freeze(r)

export const THEMES: readonly Theme[] = Object.freeze([
  {
    id: 'devis_sans_suite',
    libelle: 'Devis non relancés, sans réponse ou jamais signés',
    reponse_presti: 'Presti relance automatiquement les devis restés sans réponse.',
    familles: Object.freeze([
      f(/\bdevis\b/),
      f(/sans (suite|reponse|retour|nouvelles?)/, /pas (de|d'un|un) (retour|reponse|nouvelles?|appel|signe)/, /(aucun|aucune|jamais de) (retour|reponse|nouvelles?|suite)/,
        /reviennent? pas/, /donne(nt)? (pas )?suite/, /relanc/, /pas signe/, /ne repond(ent)? (pas|plus|jamais)/, /plus de nouvelles/, /n'ai (jamais )?(eu|recu) (de )?(reponse|retour|nouvelles)/),
    ]),
  },
  {
    id: 'appels_manques',
    libelle: 'Appels manqués, téléphone impossible à tenir sur le chantier',
    reponse_presti: 'Chaque demande arrive dans Presti et la réponse est prête en moins d’une minute, même pendant le chantier.',
    familles: Object.freeze([
      f(/telephone/, /\bappels?\b/, /\bappelle/, /repondeur/, /decroch/, /rappel(er|le|e)/, /\btel\b/, /portable/),
      f(/manque/, /rate/, /pas le temps/, /sur (le|les|un) chantiers?/, /en chantier/, /impossible/, /sonne/, /toute la journee/, /pas (pu|eu le temps de) repondre/, /repondre/, /messages?/),
    ]),
  },
  {
    id: 'site_absent',
    libelle: 'Pas de site, site obsolète, invisible sur internet',
    reponse_presti: 'Presti livre un site d’artisan à jour et lisible sur téléphone, d’où chaque demande arrive dans Presti.',
    familles: Object.freeze([
      f(/site (internet|web)/, /\bsite\b/, /internet/, /google/, /referencement/, /en ligne/, /visibilite/, /\bweb\b/),
      f(/pas de site/, /n'ai (pas|aucun) (de )?site/, /sans site/, /(vieux|ancien|obsolete|date|depasse)/, /personne ne (me |nous )?trouve/, /(invisible|pas visible|introuvable)/,
        /pas le temps/, /(cher|coute|payer)/, /(clients?|demandes?|appels?)/, /trouver/),
    ]),
  },
  {
    id: 'impayes',
    libelle: 'Impayés, retards de paiement, relances de factures',
    reponse_presti: 'Presti fait la facture depuis le devis et relance automatiquement (« Relances automatiques » des offres).',
    familles: Object.freeze([
      f(/impaye/, /pas (ete )?paye/, /(me|nous) payer/, /payent pas/, /paie pas/, /paye pas/, /reglement/, /regler/, /\bsolde\b/, /retard de paiement/, /recouvrement/, /facture/, /tresorerie/, /creances?/),
      f(/impaye/, /pas (ete )?paye/, /retard/, /attend/, /toujours pas/, /refuse/, /relanc/, /mois/, /injonction/, /huissier/, /tresorerie/, /\bdoit\b/, /jamais/, /poirot/, /traine/),
    ]),
  },
  {
    id: 'administratif',
    libelle: 'Temps perdu en administratif : devis, factures, paperasse le soir',
    reponse_presti: 'Presti prépare le devis puis la facture à partir de la demande du client.',
    familles: Object.freeze([
      f(/paperasse/, /administrati/, /compta/, /bureaucrat/, /papiers?\b/, /facturation/, /factures?\b/, /devis/, /secretariat/, /gestion/),
      f(/\bsoir/, /week-?end/, /dimanche/, /samedi/, /nuit/, /heures?\b/, /temps/, /journee/, /cher/, /lourd/, /galere/, /usant/, /epuis/, /marre/, /plus de temps/),
    ]),
  },
] as Theme[])

export const IDS_THEMES: readonly ThemePlainte[] = Object.freeze(THEMES.map((t) => t.id))

/** Minuscules, sans accents, apostrophes droites, espaces fusionnés : la forme sur laquelle les motifs s'appliquent. */
export function plier(s: string): string {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/[‘’‚‛′ʼ]/g, "'")
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Les thèmes dont TOUTES les familles se retrouvent dans la phrase (une phrase peut relever de plusieurs thèmes). */
export function classerPhrase(phrase: string): ThemePlainte[] {
  const p = plier(phrase)
  return THEMES.filter((t) => t.familles.every((fam) => fam.some((re) => re.test(p)))).map((t) => t.id)
}

// ── Données personnelles ─────────────────────────────────────────────────────────────────────────────────────────────────
const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const RE_TEL = /(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/
const RE_PSEUDO_U = /(^|[^\w])u\/[\w-]{2,}/i
const RE_ARROBASE = /(^|[\s(«"'.,;:!?])@[A-Za-z][\w.-]{1,}/
const RE_URL = /\bhttps?:\/\/|\bwww\./i
const RE_SIGNATURE = /\b(cordialement|bien a vous|salutations|merci d'avance|merci par avance|bonjour a tous|bonsoir a tous)\b/
/** Une page de profil, de membre ou d'utilisateur : jamais une source. */
export const RE_PAGE_PROFIL = /\/(?:user|users|u|profil|profile|membre|membres|member|memberlist)(?:[\/.?#_-]|$)|[?&](?:mode=viewprofile|u=\d)/i
/** Les hôtes jamais lus automatiquement (raison dans docs/agents/plaintes-par-theme.md). */
export const HOTES_INTERDITS: readonly string[] = Object.freeze(['reddit.com', 'redd.it', 'google.com', 'google.fr', 'maps.google.com', 'goo.gl', 'facebook.com', 'instagram.com', 'linkedin.com', 'x.com', 'twitter.com', 'tiktok.com', 'pagesjaunes.fr', 'trustpilot.com'])

/** Les raisons pour lesquelles un texte porte une donnée personnelle (liste vide = rien trouvé). */
export function donneesPersonnelles(texte: string): string[] {
  const t = String(texte ?? '')
  const r: string[] = []
  if (RE_EMAIL.test(t)) r.push('adresse e-mail')
  if (RE_TEL.test(t)) r.push('numéro de téléphone')
  if (RE_PSEUDO_U.test(t)) r.push('pseudo u/…')
  if (RE_ARROBASE.test(t)) r.push('pseudo @…')
  if (RE_URL.test(t)) r.push('lien')
  return r
}

export function hoteInterdit(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return HOTES_INTERDITS.some((d) => h === d || h.endsWith(`.${d}`))
  } catch { return true }
}

// ── Découpage d'une page en phrases candidates ───────────────────────────────────────────────────────────────────────────
const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', icirc: 'î', hellip: '…', euro: '€' }
function decoder(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m }
    return ENTITES[e.toLowerCase()] ?? m
  })
}

/** Les blocs de texte d'une page (un bloc par paragraphe, message ou ligne), sans script, style, citation de message ni signature. */
export function blocsDeTexte(html: string): string[] {
  const propre = String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|nav|header|footer|form|select)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    // Les citations d'un autre message (blockquote) et les signatures ne sont pas la parole de l'auteur du message.
    .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote\s*>/gi, ' ')
    .replace(/<div\b[^>]*class="[^"]*\bsignature\b[^"]*"[^>]*>[\s\S]*?<\/div\s*>/gi, ' ')
  return decoder(propre.replace(/<(br|p|div|li|tr|td|h\d|dd|dt|article|section)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split(/\n+/)
    .map((b) => b.replace(/[ \t ]+/g, ' ').trim())
    // Les en-têtes de message (« 4 Réponse de <pseudo> <date> », « Sujet de … », « Posté par … ») portent un pseudo : écartés.
    .filter((b) => b.length >= 20 && !/^(\d+\s+)?(r[ée]ponse|sujet|message|post[ée]|[ée]crit|publi[ée])\s+(de|par)\s/i.test(b) && !/^(de|par)\s+\S+\s+(le\s+)?\d/i.test(b))
}

/** Une phrase où l'artisan parle de lui (je, j', on, nous, mes, mon, ma, nos) : sinon ce n'est pas une plainte vécue. */
export function premierePersonne(phrase: string): boolean {
  return /(^|[^\w'])(je|j'|on|nous|mes|mon|ma|nos|m'|me)([^\w]|$)/.test(plier(phrase))
}

export interface Candidate {
  citation: string
  themes: ThemePlainte[]
}

/**
 * Les phrases candidates d'une page : 30 à 200 signes, à la première personne, rangées dans au moins un thème, sans
 * donnée personnelle ni lien ni formule de politesse. Chaque citation est un morceau EXACT du texte visible (jamais
 * reformulé) : la relecture du juge la retrouve mot pour mot.
 */
export function phrasesCandidates(html: string): Candidate[] {
  const vues = new Set<string>()
  const r: Candidate[] = []
  for (const bloc of blocsDeTexte(html)) {
    const morceaux = bloc.match(/[^.!?…]+[.!?…]*/g) ?? []
    for (const brut of morceaux) {
      const citation = brut.trim()
      if (citation.length < 30 || citation.length > 200) continue
      if (vues.has(citation)) continue
      if (donneesPersonnelles(citation).length) continue
      if (RE_SIGNATURE.test(plier(citation))) continue
      if (!premierePersonne(citation)) continue
      const themes = classerPhrase(citation)
      if (!themes.length) continue
      vues.add(citation)
      r.push({ citation, themes })
    }
  }
  return r
}
