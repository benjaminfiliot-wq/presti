// scripts/fixtures/landing-v2-qa/regles.mjs — les 19 règles LV-1 à LV-19 de scripts/landing-v2-qa.mjs (tâche 033-002), et leurs détecteurs.
//
// Une règle reçoit l'ARTEFACT (le HTML rendu de chaque page, ses feuilles, ses sources, les drapeaux) et rend { id, fautes: [...], vu: '…' } :
// aucune faute = PASS. Aucune règle ne passe sur du vide : une page, un bloc, une feuille, une ancre introuvable est une faute qui le dit.
// Les détecteurs textuels (DETECTEURS) sont des fonctions pures, éprouvées isolément par les sondes (sondes.mjs, S4).
//
// Pages jugées « partout » : / (la v2), /offres, /comparatif et le bloc de démo Entreprise de /contact (seul, le reste de /contact n'est pas jugé).
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import {
  normaliser, decoderEntites, nettoyer, court, elements, descendants, classesDe, ancetres, texteVisible, analyserCss, sansCommentaires, ligneDe,
} from './harnais.mjs'
import { unitesDeTexte, phrasesDe as phrasesDeMorceaux } from '../../promesses-qa.mjs'

export const PAGES = ['/', '/offres', '/comparatif', '/contact']

// ── Les textes imposés (les seuls comparés mot pour mot : tout le reste est le texte de 033-001) ──────────────────────────
export const LIBELLES = {
  essayer: 'Essayer Presti', entreprise: 'Presti pour l’entreprise', demo: 'Demander une démo', compte: 'Créer mon compte', demoEntreprise: 'Demander une démo entreprise',
}
// plans/011-cadrage-01-11/prompts-benj/p4-landing.md:92-93
export const BLOC6 = nettoyer('Vous avez plusieurs collaborateurs, un CRM, un inventaire ou des processus internes à automatiser ? Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils.')
export const BLOC6_PHRASE_2 = nettoyer('Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils.')
// Plan du chantier 4, « Ce qui se passe ensuite » (l.187-193), repris mot pour mot par la page.
export const TITRE_ENSUITE = nettoyer('Ce qui se passe ensuite')
export const ETAPES = [
  'Un premier échange : nous vous posons quelques questions sur votre équipe, vos outils et les tâches qui vous prennent du temps.',
  'Un second rendez-vous : une démonstration sur vos propres cas, puis une proposition sur devis.',
  'Vous décidez librement.',
].map(nettoyer)
export const EMPREINTE_ANCIENNE = nettoyer('Le premier qui répond décroche le chantier.') // app/page.tsx:183 à 1c6a6af6

/** Les classes de bouton connues, chacune citée au fichier:ligne de sa feuille (relevé du 02/11 sur app/globals.css) ; un bouton de classe inconnue rougit. */
export const CLASSES_BOUTONS = {
  'lp-btn': { genre: 'base', source: 'app/globals.css:970' },
  'lp-btn--p': { genre: 'plein', source: 'app/globals.css:974' },
  'lp-btn--g': { genre: 'contour', source: 'app/globals.css:976' },
  'lp-btn--lg': { genre: 'taille', source: 'app/globals.css:978' },
  'btn': { genre: 'base', source: 'app/globals.css:95' },
  'btn--primary': { genre: 'plein', source: 'app/globals.css:97' },
  'btn--ghost': { genre: 'contour', source: 'app/globals.css:99' },
  // La famille de boutons propre à la v2 de 033-003 (relevé de son instantané du 02/11 : app/landing/landing-v2.css ; lignes à rejouer à la livraison).
  'lp3-btn': { genre: 'base', source: 'app/landing/landing-v2.css:38' },
  'lp3-btn--grand': { genre: 'taille', source: 'app/landing/landing-v2.css:43' },
  'lp3-btn--petit': { genre: 'taille', source: 'app/landing/landing-v2.css:44' },
  'lp3-btn--plein': { genre: 'plein', source: 'app/landing/landing-v2.css:45' },
  'lp3-btn--contour': { genre: 'contour', source: 'app/landing/landing-v2.css:46' },
  'lp3-btn--encre': { genre: 'plein', source: 'app/landing/landing-v2.css:47 (plein sur fond ivoire)' },
  'lp3-btn--contour-encre': { genre: 'contour', source: 'app/landing/landing-v2.css:48 (contour sur fond ivoire)' },
  'lp3-btn--valide': { genre: 'etat', source: 'app/landing/landing-v2.css:49 (l’étape validée, au clic)' },
}
const EST_BOUTON = /^(?:lp3?-)?btn(?:--|$)/

// ── Aides ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const pl = (src, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`, flags)
export const plier = (t) => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const extrait = (t, m, n = 90) => {
  const i = m?.index ?? 0
  return court(String(t).slice(Math.max(0, i - 25), i + n), n + 25)
}
const nombre = (s) => parseFloat(String(s).replace(/[\s  .]/g, '').replace(',', '.'))
const negue = (t, i) => /(?:^|[^\p{L}])(?:ne|n’|jamais|pas de|aucun[e]?|sans)\s*(?:\S+\s+){0,3}$/iu.test(t.slice(Math.max(0, i - 40), i))

// ── Les détecteurs textuels (purs : texte → { motif, extrait } | null) ─────────────────────────────────────────────────────
const trouve = (t, defs) => {
  for (const [re, nom, opts] of defs) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    let m
    while ((m = g.exec(t))) {
      if (opts?.nie && negue(t, m.index)) continue
      return { motif: nom, extrait: extrait(t, m) }
    }
  }
  return null
}

const URGENCE = [
  [/places?\s+limit[ée]es?/iu, 'places limitées'], [/offre\s+(?:qui\s+)?expire/iu, 'offre qui expire'], [/derni[èe]re\s+chance/iu, 'dernière chance'],
  [/avant\s+(?:vos|les)\s+concurrents/iu, 'avant vos concurrents'], [/remplac[ée]e?s?\s+par\s+(?:l[’']\s*ia|une?\s+ia|des?\s+robots?)/iu, 'remplacé par l’IA'],
  [/la\s+fen[êe]tre\s+se\s+ferme/iu, 'la fenêtre se ferme'], [/plus\s+que\s+\d+/iu, 'plus que N'], [/d[ée]p[êe]chez[-\s]vous/iu, 'dépêchez-vous'],
  [/\b\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}\b/u, 'compte à rebours hh:mm:ss'],
]
const GAIN = [
  [pl('de\\s+CA', 'u'), '« de CA »'], [/chiffre\s+d[’']affaires/iu, 'chiffre d’affaires'],
  [/\d[\d\s  .,]*\s?(?:€|euros?)\s+(?:de\s+plus|en\s+plus|gagn[ée]s?|suppl[ée]mentaires)/iu, 'montant gagné / en plus'],
  [/(?:gagn(?:e|ez|ent|er|[ée]s?)|empoch\w*|rapport(?:e|ent|era|erait|er|[ée]s?))[^.!?]{0,25}\d[\d\s  .,]*\s?(?:€|euros?)/iu, 'gagné + montant'],
  [pl('rapport(?:e|ent|era|erait|er)'), '« rapporte »'], [pl('b[ée]n[ée]fices?'), 'bénéfice'],
]
const GARANTIE = [
  [/r[ée]sultats?[^.!?]{0,30}garanti/iu, 'résultats garantis'],
  [/garanti(?:e|es|s|t|ssons|ssez|r)?\b[^.!?]{0,30}\b(?:r[ée]sultats?|gains?|croissance|clients?|chantiers?|devis\s+sign|ventes?|retour|rentabilit\w*|succ[èe]s|commandes?|[ée]conomies?)/iu, 'garanti + résultat'],
]
const GARANTIE_LEGITIME = /garanties?\s+(?:d[ée]cennales?|biennales?|l[ée]gales?|de\s+parfait\s+ach[èe]vement|constructeur|financi[èe]res?|obligatoires?|des\s+vices)/giu
const REMISE = [
  [/(?<![\p{L}\p{N}])[-−–]\s?\d{1,3}\s?%/u, '« -N % »'], [/\d{1,3}\s?%\s+de\s+(?:remise|r[ée]duction)/iu, 'N % de remise'],
  [/(?<![\p{L}])remises?(?![\p{L}])[^.!?]{0,25}(?:\d|%)|(?:\d|%)[^.!?]{0,25}(?<![\p{L}])remises?(?![\p{L}])/iu, 'remise chiffrée'], [pl('promo(?:tions?)?s?'), 'promo'], [pl('coupons?'), 'coupon'], [/code\s+[A-Z]{3,}\d{2,}/u, 'code promo'],
]
const DUREE = pl('seconde|secondes|minute|minutes|heure|heures|jour|jours|semaine|semaines|instantan\\p{L}*|en\\s+quelques|quelques\\s+(?:secondes|minutes)')
const NOMBRE_LETTRES = pl('deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille|million')
const MOINS_UNE_MINUTE = /moins\s+(?:d[’']\s*(?:une?|1)|de\s+(?:une?|1|60|soixante))\s*(?:minutes?|min\b|secondes?|s\b)/iu
const MARQUES = ['n8n', 'supabase', 'eu-central-1', 'anthropic', 'claude', 'opus', 'sonnet', 'haiku', 'openai', 'gpt', 'codex', 'hermes', 'orca', 'mcp', 'react', 'workflows?', 'llms?', 'prompts?', 'agents?']
const RE_MARQUES = new RegExp(`(?<![a-z0-9])(?:${MARQUES.join('|')})(?![a-z0-9])`, 'g')
const DELAIS = [
  [/sous\s+\d+\s*(?:h|heures?|jours?)\b/iu, 'sous N h'], [/\b(?:24|48|72)\s*(?:h|heures?)\b/iu, '24 h / 48 h'], [/dans\s+la\s+journ[ée]e/iu, 'dans la journée'],
  [pl('rapidement'), 'rapidement'], [/dans\s+les\s+plus\s+brefs\s+d[ée]lais/iu, 'dans les plus brefs délais'],
]
const MARQUES_TIERS = ['capeb', 'ffb', 'qualibat', 'qualifelec', 'google', 'facebook', 'instagram', 'tiktok', 'linkedin', 'whatsapp', 'qonto', 'batigest', 'obat', 'tolteo', 'henrri', 'stripe', 'microsoft', 'apple', 'meta', 'leroy', 'point p', 'castorama', 'edf', 'engie']
const SEUL = '(?:tout(?:e)?\\s+)?seul(?:e|es|s)?'
const VERBES_ENVOI = '(?:part|partent|partir|partira|partiront|envoi\\w*|envoy\\w*|r[ée]pond\\w*|relanc\\w*)'
const RE_SEUL = new RegExp(`(?<![\\p{L}])${VERBES_ENVOI}(?:\\s+[\\p{L}’']+){0,2}?\\s+(${SEUL})(?![\\p{L}])`, 'giu')
const ARTICLES = /(?:^|[^\p{L}])(?:un|une|le|la|les|l’|du|des|cette|ce|sa|son|votre|ma|mon|plus|si|trop)$/iu

const DET = {}
DET.urgence = (t) => trouve(t, URGENCE)
DET.gain = (t) => trouve(t.replace(/marge sur mat[ée]riaux,? estim[ée]e/giu, ''), GAIN)
DET.garantie = (t) => trouve(t.replace(GARANTIE_LEGITIME, ' '), GARANTIE)
DET.remise = (t) => trouve(t, REMISE)
DET.moinsUneMinute = (t) => trouve(normaliser(t), [[MOINS_UNE_MINUTE, 'moins d’une minute']])
DET.delai = (t) => trouve(t, DELAIS)
DET.marque = (t) => {
  let s = nettoyer(t)
  s = s.split(BLOC6).join(' ').split(BLOC6_PHRASE_2).join(' ')
  const f = plier(s)
  RE_MARQUES.lastIndex = 0
  const m = RE_MARQUES.exec(f)
  return m ? { motif: m[0], extrait: extrait(f, m) } : null
}
DET.dureeOuChiffre = (t) => {
  const s = nettoyer(t)
  let m = /\d/.exec(s)
  if (m) return { motif: 'chiffre', extrait: extrait(s, m) }
  m = new RegExp(NOMBRE_LETTRES.source, NOMBRE_LETTRES.flags).exec(s)
  if (m) return { motif: `nombre en lettres « ${m[0]} »`, extrait: extrait(s, m) }
  m = new RegExp(DUREE.source, DUREE.flags).exec(s)
  if (m) return { motif: `durée « ${m[0]} »`, extrait: extrait(s, m) }
  return null
}
/** LV-16 sur une PHRASE : relance prévue/planifiée/programmée, « part seul », « rien ne part sans vous » ; « Signature » dans la phrase permet les deux premiers. */
DET.autoSansSignature = (phrase) => {
  const t = nettoyer(phrase)
  if (/rien\s+ne\s+part\s+sans\s+(?:vous|votre\s+(?:clic|validation|accord|feu\s+vert))/iu.test(t)) return { motif: '« rien ne part sans vous »', extrait: court(t) }
  if (/(?<![\p{L}])Signature(?![\p{L}])/u.test(t)) return null
  if (/relances?/iu.test(t)) {
    const m = /(?<![\p{L}])(?:pr[ée]vue?s?|planifi[ée]e?s?|programm[ée]e?s?)(?![\p{L}])/iu.exec(t)
    if (m) return { motif: `relance « ${m[0]} » sans « Signature »`, extrait: extrait(t, m) }
  }
  const re = new RegExp(RE_SEUL.source, RE_SEUL.flags)
  let m
  while ((m = re.exec(t))) {
    const avant = t.slice(0, m.index + m[0].length - m[1].length)
    if (ARTICLES.test(avant.trimEnd())) continue
    if (negue(t, m.index)) continue
    return { motif: `« ${m[0]} » sans « Signature »`, extrait: extrait(t, m) }
  }
  return null
}
const APPELS = [
  [/(?:r[ée]pond\w*|g[èe]r\w*|prend\w*|d[ée]croch\w*|traite\w*|passe\w*)[^.!?]{0,40}(?<![\p{L}])appels?(?![\p{L}])/iu, 'appels gérés', { nie: true }],
  [/(?<![\p{L}])appels?\s+(?:t[ée]l[ée]phoniques?|entrants?)(?![\p{L}])/iu, 'appels téléphoniques', { nie: true }],
  [/standard(?:iste)?\s+t[ée]l[ée]phonique|r[ée]pondeur/iu, 'standard téléphonique', { nie: true }],
]
const RDV = [
  [/(?:presti|l[’']assistant|l[’']ia|il|elle)[^.!?]{0,30}(?:prend|prennent|fixe|pose|planifie|cale|r[ée]serve)\w*[^.!?]{0,30}(?:rendez-vous|rdv)/iu, 'rendez-vous pris seuls', { nie: true }],
  [/prise\s+de\s+rendez-vous\s+automatique/iu, 'rendez-vous pris seuls', { nie: true }],
]
const NOTIF = [[/notifi\w*[^.!?]{0,40}(?:client\s+(?:ouvre|lit|consulte|a\s+(?:ouvert|lu|vu))|devis\s+(?:ouvert|lu|vu))/iu, 'notification inventée', { nie: true }]]
const DEVIS_SEUL = [
  [/devis[^.!?;:,]{0,30}(?:part|partent|envoy\w+|envoie)\w*[^.!?;:,]{0,20}(?:seule?s?|tout\s+seule?s?|automatiquement)/iu, 'devis envoyé seul', { nie: true }],
  [/(?:envoie|envoient|envoyer|envoyez)[^.!?]{0,20}devis[^.!?]{0,30}(?:seule?s?|automatiquement)/iu, 'devis envoyé seul', { nie: true }],
]
const PAIEMENT = [
  [/(?:presti|l[’']ia|l[’']assistant)[^.!?]{0,30}(?:encaisse|pr[ée]l[èe]ve|paie|r[èe]gle|rembourse)\w*/iu, 'paiement par l’IA', { nie: true }],
  [/(?:encaiss\w+|pr[ée]l[èe]v\w+)[^.!?]{0,40}(?:automatiquement|tout\s+seule?s?|par\s+l[’']ia|par\s+presti)/iu, 'paiement encaissé seul', { nie: true }],
]
/** Mots qui n'existent que derrière un drapeau baissé (lib/flags.ts) : le mot n'est permis que si le drapeau est levé. */
export const MOTS_DRAPEAUX = [
  { drapeau: 'canauxWhatsapp', nom: 'WhatsApp', re: /whats\s?app/iu },
  { drapeau: 'canauxReseaux', nom: 'messages des réseaux sociaux',
    re: /(?:messages?|messagerie|conversations?)[^.!?]{0,30}(?:r[ée]seaux\s+sociaux|instagram|facebook|tiktok|messenger|linkedin)|(?:r[ée]seaux\s+sociaux|instagram|facebook|messenger)[^.!?]{0,30}messages?/iu },
  { drapeau: 'inventaireOcr', nom: 'OCR / facture lue en photo',
    re: /(?<![\p{L}])ocr(?![\p{L}])|(?:lit|lire|lecture|scann\w+|reconna\w+)[^.!?]{0,30}(?:factures?|tickets?|re[cç]us?)[^.!?]{0,20}(?:photo|image)|factures?\s+(?:lues?\s+)?en\s+photo/iu },
]
DET.promesseInterdite = (t, drapeaux = {}) => {
  const r = trouve(t, [...APPELS, ...RDV, ...NOTIF, ...DEVIS_SEUL, ...PAIEMENT])
  if (r) return r
  for (const d of MOTS_DRAPEAUX) {
    const m = d.re.exec(t)
    if (m && drapeaux[d.drapeau] !== true) return { motif: `${d.nom} (drapeau ${d.drapeau} baissé)`, extrait: extrait(t, m) }
  }
  return null
}
const PREUVE = [
  [/[★☆⭐]/u, 'étoiles'], [/\b[1-5][.,]\d\s?\/\s?5\b|\b[1-5]\s?\/\s?5\b/u, 'note sur 5'],
  [/t[ée]moignages?|t[ée]moignent/iu, 'témoignage'], [/ils\s+nous\s+(?:ont\s+)?fait\s+confiance|ils\s+nous\s+font\s+confiance/iu, 'ils nous font confiance'],
  [/\bavis\s+(?:de|des|clients?|v[ée]rifi[ée]s)/iu, 'avis'], [/ce\s+que\s+disent|ce\s+qu[’']ils\s+en\s+disent|clients?\s+satisfaits?/iu, 'avis clients'],
  [/(?<![\p{L}\p{N}])(\d[\d\s  .,]*)\+?\s+(?:artisans?|clients?|entreprises?|utilisateurs?|professionnels?|ind[ée]pendants?)(?![\p{L}])/iu, 'compteur de clients'],
]
/** LV-9 : la seule exception est la ligne chiffrée de l'étude HBR (2 241 entreprises), source affichée (question 11, plans/promesses.md:30). */
DET.preuve = (t) => {
  const r = trouve(t, PREUVE)
  if (!r) return null
  if (r.motif === 'compteur de clients') {
    const m = /(\d[\d\s  .,]*)\+?\s+(?:artisans?|clients?|entreprises?|utilisateurs?|professionnels?|ind[ée]pendants?)/iu.exec(t)
    if (m && nombre(m[1]) === 2241 && /harvard|hbr|short life of online|[ée]tude/iu.test(t)) return null
  }
  return r
}
export const DETECTEURS = DET

// ── Les couleurs ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const NOMMEES = { blue: [0, 0, 255], cyan: [0, 255, 255], aqua: [0, 255, 255], indigo: [75, 0, 130], violet: [238, 130, 238], purple: [128, 0, 128], magenta: [255, 0, 255], fuchsia: [255, 0, 255], navy: [0, 0, 128], teal: [0, 128, 128], dodgerblue: [30, 144, 255], royalblue: [65, 105, 225], deepskyblue: [0, 191, 255], slateblue: [106, 90, 205], mediumpurple: [147, 112, 219], blueviolet: [138, 43, 226], steelblue: [70, 130, 180], skyblue: [135, 206, 235], cornflowerblue: [100, 149, 237], turquoise: [64, 224, 208], orchid: [218, 112, 214], rebeccapurple: [102, 51, 153], green: [0, 128, 0], lime: [0, 255, 0], red: [255, 0, 0], orange: [255, 165, 0], gold: [255, 215, 0], yellow: [255, 255, 0] }
const hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  return { h, s, l }
}
/** Les couleurs littérales d'une valeur CSS : [{ brut, h, s, l }]. */
export function couleursDe(valeur) {
  const res = []
  const v = String(valeur).replace(/url\([^)]*\)/gi, ' ')
  for (const m of v.matchAll(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z])/gi)) {
    let h = m[1]; if (h.length <= 4) h = [...h].map((c) => c + c).join('')
    res.push({ brut: m[0], ...hsl(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)) })
  }
  for (const m of v.matchAll(/rgba?\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/gi)) res.push({ brut: m[0] + ')', ...hsl(+m[1], +m[2], +m[3]) })
  for (const m of v.matchAll(/hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/gi)) res.push({ brut: m[0] + ')', h: ((+m[1] % 360) + 360) % 360, s: +m[2] / 100, l: +m[3] / 100 })
  for (const m of v.toLowerCase().matchAll(/(?<![\w#-])([a-z]+)(?![\w(-])/g)) if (NOMMEES[m[1]]) res.push({ brut: m[1], ...hsl(...NOMMEES[m[1]]) })
  return res
}
/** 'froid' (bleu, cyan, violet : teinte 170°–300°, saturation ≥ 25 %, luminosité 15–90 %), 'corail', 'vert', 'autre' (saturé ailleurs) ou 'neutre'. */
export function classeCouleur(c) {
  if (c.s < 0.25 || c.l < 0.15 || c.l > 0.9) return 'neutre'
  if (c.h >= 170 && c.h <= 300) return 'froid'
  if (c.h <= 35 || c.h >= 345) return 'corail'
  if (c.h >= 90 && c.h < 170) return 'vert'
  return 'autre'
}
const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '')
export const VERT_RESERVE = '#38cd8c'

// ── Les feuilles ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FEUILLES_PARTAGEES = ['app/globals.css', 'app/accueil.css', 'app/base.css']
const retirerNot = (s) => s.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '')
export function selecteurConcerne(sel, classes, ids) {
  const s = sel.trim()
  if (/^(?::root|html|body)(?:\s*,\s*(?::root|html|body))*(?::[\w-]+(?:\([^)]*\))?)*$/.test(s)) return true
  const nu = retirerNot(s)
  const cl = [...nu.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])
  const id = [...nu.matchAll(/#([_a-zA-Z][\w-]*)/g)].map((m) => m[1])
  if (!cl.length && !id.length) return false
  return cl.every((c) => classes.has(c)) && id.every((i) => ids.has(i))
}
const MEMO_CSS = new Map()
export function reglesDe(texte, rel) {
  const cle = `${rel}:${texte.length}:${texte.slice(0, 80)}:${texte.slice(-80)}`
  if (!MEMO_CSS.has(cle)) MEMO_CSS.set(cle, analyserCss(texte, rel))
  return MEMO_CSS.get(cle)
}
/** Les règles concernées par une page : toutes celles de ses feuilles propres, et celles des feuilles partagées dont un sélecteur ne nomme que des classes présentes. */
export function reglesConcernees(A, Pg) {
  const res = []
  const rels = [...new Set([...(A.css['app/base.css'] != null ? ['app/base.css'] : []), ...(Pg.feuilles ?? [])])]
  rels.forEach((rel, idx) => {
    const texte = A.css[rel]
    if (texte == null) return
    const partagee = FEUILLES_PARTAGEES.includes(rel)
    for (const r of reglesDe(texte, rel)) {
      const o = idx * 1e6 + r.ordre
      if (!partagee) { res.push({ ...r, ordre: o, propre: true }); continue }
      const ok = r.selecteurs.filter((s) => selecteurConcerne(s, Pg.a.classes, Pg.a.ids))
      if (ok.length) res.push({ ...r, ordre: o, propre: false, selecteurs: ok })
    }
  })
  return res
}
function resoudreVar(valeur, tokens, profondeur = 0) {
  if (profondeur > 6) return valeur
  return String(valeur).replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (m, nom, repli) => (tokens.has(nom) ? resoudreVar(tokens.get(nom), tokens, profondeur + 1) : (repli ?? '')))
}
const SEMANTIQUES = /^--(?:warn|crit|hi)(?:-tint)?$/
/** Tous les emplois de couleur d'une page (règles concernées, style en ligne, attributs SVG). */
export function emploisCouleur(A, Pg) {
  const regles = reglesConcernees(A, Pg)
  const tokens = new Map()
  for (const r of [...regles].sort((a, b) => a.ordre - b.ordre)) for (const d of r.decls) if (d.prop.startsWith('--')) tokens.set(d.prop, d.valeur)
  const emplois = []
  const utilises = new Set()
  const noterVars = (v) => { for (const m of String(v).matchAll(/var\(\s*(--[\w-]+)/g)) utilises.add(m[1]) }
  for (const r of regles) for (const d of r.decls) if (!d.prop.startsWith('--')) noterVars(d.valeur)
  for (const e of elements(Pg.a.portee)) if (e.attrs.style) noterVars(e.attrs.style)
  for (let tour = 0; tour < 5; tour++) for (const nom of [...utilises]) if (tokens.has(nom)) noterVars(tokens.get(nom))
  for (const r of regles) {
    for (const d of r.decls) {
      const custom = d.prop.startsWith('--')
      if (custom && !r.propre && !utilises.has(d.prop)) continue
      const brut = d.valeur
      const val = resoudreVar(brut, tokens)
      const parNom = /var\(\s*--(?:warn|crit|hi)(?:-tint)?/.test(brut) || (custom && SEMANTIQUES.test(d.prop))
      const emploiVar = /var\(\s*--ok(?:-tint)?\b/.test(brut)
      const cs = couleursDe(val)
      for (const c of cs) emplois.push({ ou: `${r.fichier}:${d.ligne}`, sel: r.selecteurs.join(', '), prop: d.prop, valeur: court(brut, 70), brut: c.brut, classe: classeCouleur(c), h: Math.round(c.h), semantique: parNom, custom, propre: r.propre, regle: r })
      if (emploiVar && !cs.length) emplois.push({ ou: `${r.fichier}:${d.ligne}`, sel: r.selecteurs.join(', '), prop: d.prop, valeur: court(brut, 70), brut: 'var(--ok)', classe: 'vert', h: 150, semantique: false, custom, propre: r.propre, regle: r })
    }
  }
  for (const e of elements(Pg.a.portee)) {
    if (e.attrs.style) {
      for (const dec of e.attrs.style.split(';')) {
        const i = dec.indexOf(':'); if (i < 0) continue
        const prop = dec.slice(0, i).trim(); const val = resoudreVar(dec.slice(i + 1), tokens)
        for (const c of couleursDe(val)) emplois.push({ ou: `style en ligne <${e.tag}>`, sel: `<${e.tag}>`, prop, valeur: court(dec.slice(i + 1), 70), brut: c.brut, classe: classeCouleur(c), h: Math.round(c.h), semantique: /var\(\s*--(?:warn|crit|hi)/.test(dec), custom: false, propre: true, regle: null })
      }
    }
    for (const a of ['fill', 'stroke', 'stop-color', 'flood-color', 'color']) if (e.attrs[a]) for (const c of couleursDe(resoudreVar(e.attrs[a], tokens))) emplois.push({ ou: `attribut ${a} <${e.tag}>`, sel: `<${e.tag}>`, prop: a, valeur: e.attrs[a], brut: c.brut, classe: classeCouleur(c), h: Math.round(c.h), semantique: false, custom: false, propre: true, regle: null })
  }
  return { emplois, regles, tokens }
}

// ── Les liens et les routes ───────────────────────────────────────────────────────────────────────────────────────────────
function motifsRoutes(arbre) {
  const fichiers = arbre.lister('app', /^(page|route)\.(tsx?|jsx?)$|^(sitemap|robots|manifest)\.(ts|js)$/)
  const motifs = []
  for (const f of fichiers) {
    const segs = path.posix.dirname(f).split('/').slice(1).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'))
    const base = path.posix.basename(f)
    if (/^sitemap/.test(base)) motifs.push({ segs: [], fixe: '/sitemap.xml' })
    else if (/^robots/.test(base)) motifs.push({ segs: [], fixe: '/robots.txt' })
    else if (/^manifest/.test(base)) { motifs.push({ segs: [], fixe: '/manifest.webmanifest' }); motifs.push({ segs: [], fixe: '/manifest.json' }) }
    else motifs.push({ segs })
  }
  return motifs
}
const MEMO_ROUTES = new WeakMap()
export function routeExiste(A, chemin) {
  let motifs = MEMO_ROUTES.get(A.arbre)
  if (!motifs) { motifs = motifsRoutes(A.arbre); MEMO_ROUTES.set(A.arbre, motifs) }
  const p = chemin.replace(/\/+$/, '') || '/'
  if (p !== '/' && (A.arbre.chemin(path.posix.join('public', p)) || (A.publicSecours && fs.existsSync(path.join(A.publicSecours, p))))) return true
  const segs = p.split('/').filter(Boolean)
  for (const m of motifs) {
    if (m.fixe) { if (m.fixe === p) return true; continue }
    let i = 0, ok = true
    for (let k = 0; k < m.segs.length && ok; k++) {
      const s = m.segs[k]
      if (/^\[\[\.\.\./.test(s)) { i = segs.length; break }
      if (/^\[\.\.\./.test(s)) { if (i >= segs.length) ok = false; i = segs.length; break }
      if (/^\[.*\]$/.test(s)) { if (i >= segs.length) ok = false; i++ } else { if (segs[i] !== s) ok = false; i++ }
    }
    if (ok && i === segs.length) return true
  }
  return false
}

// ── L'accès aux pages ─────────────────────────────────────────────────────────────────────────────────────────────────────
function lirePages(A, ids = A.jugees ?? PAGES, source = 'pages') {
  const liste = []
  for (const id of ids) {
    const Pg = A[source][id]
    let manque = null
    if (!Pg) manque = `${id} : page non rendue`
    else if (Pg.notFound) manque = `${id} : notFound() au rendu (page absente de l’arbre ou drapeau baissé)`
    else if (Pg.erreur) manque = `${id} : le rendu échoue — ${Pg.erreur}`
    else if (!Pg.a) manque = `${id} : page non analysée`
    else if (id === '/contact' && !Pg.a.bloc) manque = '/contact : bloc de démo Entreprise introuvable (aucun « Ce qui se passe ensuite » rendu, ni composant qui le porte)'
    if (manque) { (A.__manques ??= []).push(manque); continue }
    liste.push([id, Pg])
  }
  // Une page manquante est une faute de plus pour la règle, jamais une raison de ne pas juger les pages présentes (le retour des fautes est complété par l'enveloppe en bas).
  return { liste, manques: [] }
}
const corpusDe = (Pg, inlines = false) => [
  ...Pg.a.blocs.map((b) => ({ t: b.t, origine: 'visible' })),
  ...(inlines ? Pg.a.inlines.map((b) => ({ t: b.t, origine: 'visible' })) : []),
  ...Pg.a.unites.filter((u) => u.origine !== 'visible'),
]
const resultat = (id, fautes, vu) => ({ id, fautes, vu })
const echec = (id, manques) => ({ id, fautes: manques, vu: '' })
function parcours(A, ids, id, f) {
  ids = ids ?? A.jugees ?? PAGES
  const { liste, manques } = lirePages(A, ids)
  if (manques.length) return echec(id, manques)
  const fautes = []; let n = 0
  for (const [pid, Pg] of liste) { const r = f(pid, Pg); n += r.n ?? 0; fautes.push(...(r.fautes ?? [])) }
  if (n === 0) fautes.push('aucune unité examinée : la règle ne passe pas sur du vide')
  return resultat(id, fautes, `${n} unités sur ${liste.map(([i]) => i).join(' ')}`)
}
/** Détecteur appliqué au corpus de chaque page : une faute par motif trouvé. */
function banque(A, id, det, ids = null) {
  return parcours(A, ids, id, (pid, Pg) => {
    const fautes = []; let n = 0
    for (const u of corpusDe(Pg, true)) {
      n++
      const r = det(u.t, u, Pg, A)
      if (r) fautes.push(`${pid} [${u.origine}] ${r.motif} : « ${r.extrait} »`)
    }
    return { n, fautes: unique(fautes) }
  })
}
const phrasesDe = (t) => t.split(/(?<=[.!?…])["»”’)]*\s+(?=\S)/u).map((p) => p.trim()).filter(Boolean)
const unique = (l) => [...new Set(l)]

// ── Les 19 règles ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const REGLES = {}

REGLES['LV-1'] = (A) => {
  const { liste, manques } = lirePages(A, ['/'])
  if (!liste.length) return resultat('LV-1', [], '')
  const Pg = liste[0][1]
  const main = elements(Pg.a.racine, (e) => e.tag === 'main')[0]
  if (!main) return echec('LV-1', ['/ : aucun <main>'])
  // Une <section> imbriquée dans une autre (le fragment d'une démo) n'est pas une section de la page : on compte celles de premier niveau.
  const sections = elements(main, (e) => e.tag === 'section' && !ancetres(e).some((a) => a.tag === 'section'))
  const h1 = elements(Pg.a.racine, (e) => e.tag === 'h1')
  const fautes = []
  if (!sections.length) fautes.push('/ : aucune <section> dans <main> (la règle ne passe pas sur du vide)')
  if (sections.length > 7) fautes.push(`/ : ${sections.length} <section> dans <main>, 7 au plus (${sections.map((s) => (s.attrs.id ? '#' + s.attrs.id : classesDe(s)[0] ?? 'section')).join(', ')})`)
  if (h1.length !== 1) fautes.push(`/ : ${h1.length} <h1> (un seul attendu)${h1.length ? ' — ' + h1.map((h) => `« ${court(nettoyer(texteVisible(h)), 50)} »`).join(' / ') : ''}`)
  return resultat('LV-1', fautes, `${sections.length} section(s), ${h1.length} h1`)
}

REGLES['LV-2'] = (A) => {
  const fautes = []
  const prix = new Set([...A.prixPresti])
  let nSources = 0
  for (const [pid, Pg] of Object.entries(A.pages)) {
    if (!Pg.sources) continue
    for (const [rel, src] of Object.entries(Pg.sources)) {
      if (A.horsSources.includes(rel)) continue
      nSources++
      const t = decoderEntites(normaliser(src.sansCommentaires))
      for (const m of t.matchAll(/(\d[\d\s  .]*(?:,\d{1,2})?)\s*(?:€|euros?(?![\p{L}]))/giu)) {
        const suite = t.slice(m.index + m[0].length, m.index + m[0].length + 16)
        if (prix.has(nombre(m[1])) || /^\s*(?:par\s+mois|\/\s*mois|HT\b|TTC\b|\/\s*an)/iu.test(suite)) fautes.push(`(a) ${rel}:${ligneDe(t, m.index)} prix tapé « ${court(m[0] + suite, 40)} » (page ${pid})`)
      }
    }
  }
  if (!nSources) fautes.push('(a) aucune source de page lue')
  const acc = lirePages(A, ['/'])
  for (const u of acc.liste.length ? corpusDe(acc.liste[0][1]) : []) {
    for (const m of u.t.matchAll(/(\d[\d\s  .]*(?:,\d{1,2})?)\s*(?:€|euros?(?![\p{L}]))/giu)) {
      const suite = u.t.slice(m.index + m[0].length, m.index + m[0].length + 16)
      if (prix.has(nombre(m[1])) || /^\s*(?:par\s+mois|\/\s*mois|HT\b)/iu.test(suite)) fautes.push(`(a) / [${u.origine}] prix d’offre à l’accueil : « ${court(m[0] + suite, 40)} »`)
    }
  }
  const r = banque(A, 'LV-2', (t) => DET.promesseInterdite(t, A.drapeaux))
  fautes.push(...r.fautes.map((f) => (/^\(a\)/.test(f) ? f : `(b) ${f}`)))
  return resultat('LV-2', unique(fautes), `${nSources} source(s) ; ${r.vu}`)
}

REGLES['LV-3'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []; let n = 0
  for (const [pid, Pg] of liste) {
    const { emplois, regles } = emploisCouleur(A, Pg)
    if (!regles.length) fautes.push(`${pid} : aucune feuille concernée lue (la règle ne passe pas sur du vide)`)
    n += emplois.length
    for (const e of emplois) if (e.classe === 'froid') fautes.push(`${pid} ${e.ou} ${e.sel} { ${e.prop}: ${e.valeur} } → ${e.brut} (teinte ${e.h}°, bleu/cyan/violet)`)
  }
  return resultat('LV-3', unique(fautes), `${n} emplois de couleur`)
}

REGLES['LV-4'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []; let n = 0, externes = 0
  const ancres = {}
  for (const [pid, Pg] of liste) ancres[pid] = new Set([...Pg.a.ids, ...elements(Pg.a.racine).map((e) => e.attrs.name).filter(Boolean)])
  for (const [pid, Pg] of liste) {
    const cibles = []
    for (const e of elements(Pg.a.portee)) {
      if (e.tag === 'a' && 'href' in e.attrs) cibles.push([e, e.attrs.href, 'a'])
      if (e.tag === 'form' && 'action' in e.attrs) cibles.push([e, e.attrs.action, 'form'])
      if (e.tag === 'button' && 'formaction' in e.attrs) cibles.push([e, e.attrs.formaction, 'button'])
    }
    for (const [e, href, genre] of cibles) {
      n++
      const nom = court(nettoyer(texteVisible(e)) || e.attrs['aria-label'] || genre, 40)
      const h = href.trim()
      if (!h || h === '#' || /^javascript:/i.test(h)) { fautes.push(`${pid} <${genre}> « ${nom} » : cible vide ou factice (« ${h} »)`); continue }
      if (/^(?:https?:|mailto:|tel:|\/\/)/i.test(h)) { externes++; continue }
      if (h.startsWith('#')) { if (!ancres[pid].has(decodeURIComponent(h.slice(1)))) fautes.push(`${pid} « ${nom} » : ancre ${h} absente de la page`); continue }
      const m = /^([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/.exec(h)
      const chemin = m[1].startsWith('/') ? m[1] : '/' + m[1]
      if (!routeExiste(A, chemin)) { fautes.push(`${pid} « ${nom} » : route ${chemin} introuvable (ni page, ni route, ni fichier de public/)`); continue }
      if (m[2]) {
        const cible = ancres[chemin.replace(/\/$/, '') || '/']
        if (cible && !cible.has(decodeURIComponent(m[2]))) fautes.push(`${pid} « ${nom} » : ancre #${m[2]} absente de ${chemin}`)
      }
    }
    for (const e of elements(Pg.a.portee)) {
      if (!classesDe(e).some((c) => c === 'lp-btn' || c === 'lp3-btn')) continue
      const dansForm = ancetres(e).some((a) => a.tag === 'form')
      const ok = (e.tag === 'a' && 'href' in e.attrs) || (e.tag === 'button' && (e.attrs.formaction != null || (dansForm && (e.attrs.type ?? 'submit') === 'submit')))
      if (!ok) fautes.push(`${pid} <${e.tag} class="${e.attrs.class}"> « ${court(nettoyer(texteVisible(e)), 40)} » : un lp-btn n’est ni un lien ni un bouton de formulaire`)
    }
  }
  if (!n) fautes.push('aucun lien, formulaire ni bouton à juger : la règle ne passe pas sur du vide')
  return resultat('LV-4', unique(fautes), `${n} cible(s) dont ${externes} externe(s) listée(s), non jugée(s)`)
}

export function drapeauLandingV2(source) {
  if (!source) return null
  const sf = ts.createSourceFile('flags.ts', source, ts.ScriptTarget.ES2022, true)
  let valeur = null
  const v = (n) => {
    if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && n.name.text === 'landingV2') {
      valeur = n.initializer.kind === ts.SyntaxKind.FalseKeyword ? false : n.initializer.kind === ts.SyntaxKind.TrueKeyword ? true : 'autre'
    }
    ts.forEachChild(n, v)
  }
  v(sf)
  return valeur
}
REGLES['LV-5'] = (A) => {
  const fautes = []
  const etat = drapeauLandingV2(A.flagsSource)
  if (etat !== false) fautes.push(`(a) lib/flags.ts : landingV2 vaut ${etat === null ? 'introuvable' : String(etat)}, pas « false »`)
  const accueil = A.prod['/']
  if (!accueil || accueil.erreur) fautes.push(`(b) / en production, drapeau baissé : ${accueil?.erreur ?? 'non rendu'}`)
  else if (accueil.notFound) fautes.push('(b) / en production, drapeau baissé : notFound() — l’accueil doit rester l’ancienne page')
  else {
    const main = elements(accueil.a.racine, (e) => e.tag === 'main')[0]
    const nSections = main ? elements(main, (e) => e.tag === 'section').length : 0
    const h1 = elements(accueil.a.racine, (e) => e.tag === 'h1').map((h) => nettoyer(texteVisible(h)))
    if (!h1.some((t) => t === EMPREINTE_ANCIENNE)) fautes.push(`(b) / en production, drapeau baissé : le h1 n’est plus celui de l’ancienne page (« ${court(h1[0] ?? '', 70)} » au lieu de « ${EMPREINTE_ANCIENNE} »)`)
    if (nSections <= 7) fautes.push(`(b) / en production, drapeau baissé : ${nSections} sections seulement (l’ancienne page en a plus de 7)`)
    for (const t of [LIBELLES.entreprise, LIBELLES.demoEntreprise]) if (accueil.a.texteVisible.includes(t)) fautes.push(`(b) / en production, drapeau baissé : « ${t} » est servi`)
  }
  for (const id of ['/offres', '/comparatif']) {
    const Pg = A.prod[id]
    if (!Pg) fautes.push(`(b) ${id} : non rendu en production`)
    else if (!Pg.notFound) fautes.push(`(b) ${id} en production, drapeau baissé : ${Pg.erreur ? 'erreur de rendu — ' + Pg.erreur : 'la page est servie, notFound() attendu'}`)
  }
  const contact = A.prod['/contact']
  if (!contact || contact.erreur) fautes.push(`(b) /contact en production : ${contact?.erreur ?? 'non rendu'}`)
  else if (!contact.notFound) {
    const t = nettoyer(texteVisible(contact.a.racine))
    for (const x of [TITRE_ENSUITE, LIBELLES.demoEntreprise, LIBELLES.entreprise]) if (t.includes(x)) fautes.push(`(b) /contact en production, drapeau baissé, motif « entreprise » : « ${x} » est servi`)
  }
  const lit = Object.values(A.pages['/contact']?.sources ?? {}).some((s) => /landingV2/.test(s.sansCommentaires))
  if (!lit) fautes.push('(c) aucun module de /contact ne lit le drapeau landingV2 : le bloc de démo n’est pas derrière lui')
  return resultat('LV-5', fautes, 'drapeau, production, bloc de /contact')
}

REGLES['LV-6'] = (A) => {
  const r = banque(A, 'LV-6', (t) => DET.urgence(t))
  if (!/^\d+ unités/.test(r.vu)) return r
  for (const [pid, Pg] of lirePages(A).liste) {
    for (const e of elements(Pg.a.portee)) if (classesDe(e).some((c) => /countdown|rebours|minuteur/i.test(c))) r.fautes.push(`${pid} classe de compte à rebours « ${e.attrs.class} »`)
    for (const [rel, src] of Object.entries(Pg.sources ?? {})) if (/countdown|compteARebours|CompteARebours|minuteur/i.test(src.sansCommentaires)) r.fautes.push(`${pid} ${rel} : composant ou identifiant de compte à rebours`)
  }
  return { ...r, fautes: unique(r.fautes) }
}
REGLES['LV-7'] = (A) => banque(A, 'LV-7', (t) => DET.gain(t))
REGLES['LV-8'] = (A) => banque(A, 'LV-8', (t) => DET.garantie(t))

REGLES['LV-9'] = (A) => {
  const r = banque(A, 'LV-9', (t) => DET.preuve(t))
  if (!/^\d+ unités/.test(r.vu)) return r
  for (const [pid, Pg] of lirePages(A).liste) {
    const dansHbr = (e) => ancetres(e).some((a) => a.tag === 'section' && /Harvard Business Review/i.test(texteVisible(a)))
    for (const e of elements(Pg.a.portee)) {
      if (e.attrs['data-to'] != null && !dansHbr(e)) r.fautes.push(`${pid} compteur animé (data-to="${e.attrs['data-to']}") hors de la ligne de l’étude HBR`)
      if (e.tag === 'img') {
        const s = `${e.attrs.src ?? ''} ${e.attrs.alt ?? ''}`
        const f = plier(s)
        if (/(^|[\/\s_-])logos?([\/\s_.-]|$)/.test(f) && !/presti/.test(f)) r.fautes.push(`${pid} image de logo tiers : ${court(s, 70)}`)
        else if (MARQUES_TIERS.some((m) => new RegExp(`(?<![a-z0-9])${m}(?![a-z0-9])`).test(f)) && !/presti/.test(f)) r.fautes.push(`${pid} image qui nomme une marque tierce : ${court(s, 70)}`)
        // Une image de personne ou une image générée : son nom de fichier ou son alt le dit (le mot « équipe » d'un alt de CRM n'en est pas une).
        const src = plier(e.attrs.src ?? ''), alt = plier(e.attrs.alt ?? '')
        if (/portrait|visage|photo-?profil|avatar|midjourney|dall-?e|genere|generated|stock-?photo|(^|\/)(people|personnes?|equipe|team|clients?)\//.test(src) || /portrait|visage|photo de profil|avatar|souriant|image generee|generee par|midjourney|un homme|une femme/.test(alt)) r.fautes.push(`${pid} image de personne ou image générée : ${court(`${e.attrs.src ?? ''} ${e.attrs.alt ?? ''}`, 70)}`)
      }
    }
    for (const j of Pg.a.jsonld) {
      const cles = []
      ;(function v(o) { if (Array.isArray(o)) o.forEach(v); else if (o && typeof o === 'object') for (const [k, x] of Object.entries(o)) { cles.push(k); if (k === '@type' && typeof x === 'string') cles.push(x); v(x) } })(j.obj ?? {})
      for (const k of cles) if (/^(aggregateRating|review|reviews|Review|AggregateRating|Rating|ratingValue)$/.test(k)) r.fautes.push(`${pid} JSON-LD : « ${k} » (avis ou note)`)
    }
  }
  return { ...r, fautes: unique(r.fautes) }
}

REGLES['LV-10'] = (A) => {
  const r = banque(A, 'LV-10', (t) => DET.remise(t))
  if (!/^\d+ unités/.test(r.vu)) return r
  for (const [pid, Pg] of lirePages(A).liste) {
    const montant = (e) => /\d/.test(texteVisible(e))
    for (const e of elements(Pg.a.portee)) {
      if (['s', 'del', 'strike'].includes(e.tag) && montant(e)) r.fautes.push(`${pid} <${e.tag}> autour d’un montant : « ${court(nettoyer(texteVisible(e)), 40)} »`)
      if (/line-through/.test(e.attrs.style ?? '') && montant(e)) r.fautes.push(`${pid} line-through en ligne sur un montant : « ${court(nettoyer(texteVisible(e)), 40)} »`)
    }
    for (const rg of reglesConcernees(A, Pg)) {
      if (!rg.decls.some((d) => /^text-decoration/.test(d.prop) && /line-through/.test(d.valeur))) continue
      for (const sel of rg.selecteurs) {
        const dernier = retirerNot(sel).split(/[\s>+~]+/).pop()
        const cl = [...dernier.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])
        if (!cl.length) continue
        for (const e of elements(Pg.a.portee)) if (cl.every((c) => classesDe(e).includes(c)) && montant(e)) r.fautes.push(`${pid} ${rg.fichier}:${rg.ligne} ${sel} { text-decoration: line-through } sur un montant : « ${court(nettoyer(texteVisible(e)), 40)} »`)
      }
    }
  }
  return { ...r, fautes: unique(r.fautes) }
}

REGLES['LV-11'] = (A) => banque(A, 'LV-11', (t) => DET.marque(t))

// LV-12 : « Exemple » sur toute donnée fictive. Règle écrite : un BLOC est l'ancêtre le plus proche d'une donnée fictive qui est une <figure>, un
// role="img", ou dont une classe dit une fenêtre, une démo, une scène ou une capture (win, demo, scene, capture) ; à défaut, la <section>.
// Le mot « Exemple » doit se lire dans le texte visible du bloc : ni dans un seul title, ni dans un seul aria-label (« lisible sans survol »).
const FICTIF_PERSONNE = [/(?:Madame|Monsieur|Mme|Mlle|M\.)\s+[A-ZÀ-Ý][\p{L}’'-]{2,}/u, /\bBonjour\s+[A-ZÀ-Ý][\p{L}-]{2,}/u, /\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\s·\s\d{1,2}[:h]\d{2}/u]
const FICTIF_PIECE = /\b(?:DEV|FAC|FA|BC|AV)-\d{4}-\d{3,5}\b/
const FICTIF_MONTANT_DEC = /\d[\d  .]*,\d{2}\s?€?/
const estDemoClasse = (e) => classesDe(e).some((c) => /(?:^|[-_])(?:win|demo|scene|capture)|(?:win|demo|scene|capture)(?:$|[-_])/i.test(c))
export const estBlocDemo = (e) => e.tag === 'figure' || e.attrs.role === 'img' || estDemoClasse(e)
export function fictif(t, dansDemo) {
  for (const re of FICTIF_PERSONNE) { const m = re.exec(t); if (m) return { motif: 'nom de personne', extrait: m[0] } }
  let m = FICTIF_PIECE.exec(t); if (m) return { motif: 'numéro de pièce', extrait: m[0] }
  m = FICTIF_MONTANT_DEC.exec(t); if (m) return { motif: 'montant', extrait: m[0] }
  if (dansDemo) { m = /\d[\d  .]*\s?€/.exec(t); if (m) return { motif: 'montant', extrait: m[0] } }
  return null
}
REGLES['LV-12'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []; let n = 0, portent = 0
  for (const [pid, Pg] of liste) {
    const vusBlocs = new Set()
    const verifier = (noeud, t, origine) => {
      const chaine = [noeud, ...ancetres(noeud)].filter((x) => x.type === 'el')
      const demo = chaine.find(estBlocDemo)
      const f = fictif(t, !!demo)
      if (!f) return
      n++
      const bloc = demo ?? chaine.find((x) => x.tag === 'section') ?? chaine[chaine.length - 1]
      if (vusBlocs.has(bloc)) return
      vusBlocs.add(bloc)
      if (!/(?<![\p{L}])exemples?(?![\p{L}])/iu.test(nettoyer(texteVisible(bloc)))) fautes.push(`${pid} ${f.motif} « ${court(f.extrait, 30)} » (${origine}) dans ${demo ? `<${bloc.tag} class="${court(bloc.attrs.class ?? '', 30)}">` : 'la section, hors bloc de démo'} sans « Exemple » en texte visible`)
      else portent++
    }
    for (const b of Pg.a.blocs) verifier(b.parent, b.t, 'texte')
    for (const a of Pg.a.attributs) verifier(a.noeud, a.t, a.origine)
  }
  if (!n) fautes.push('aucune donnée fictive (nom, montant, pièce) trouvée : la maquette du hero en montre — la règle ne passe pas sur du vide')
  return resultat('LV-12', fautes, `${n} donnée(s) fictive(s), ${portent} bloc(s) portant « Exemple »`)
}

REGLES['LV-13'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []; let n = 0
  const estRacineSel = (s) => /^(?::root|html|body)$/.test(s.trim())
  for (const [pid, Pg] of liste) {
    const { emplois, regles } = emploisCouleur(A, Pg)
    if (!regles.length) { fautes.push(`${pid} : aucune feuille concernée lue`); continue }
    n += emplois.length
    // (a) toute teinte saturée est le corail, le vert réservé, ou un jeton sémantique employé par son nom
    for (const e of emplois) if ((e.classe === 'froid' || e.classe === 'autre') && !e.semantique) fautes.push(`(a) ${pid} ${e.ou} ${e.sel} { ${e.prop}: ${e.valeur} } → ${e.brut} (teinte ${e.h}°) : ni corail, ni vert réservé, ni --warn/--crit/--hi par son nom`)
    // (b) la valeur effective de --ok à la racine de la v2
    const decls = []
    for (const r of regles) for (const d of r.decls) if (d.prop === '--ok') decls.push({ r, d })
    const racine = Pg.a.racine.enfants.find((e) => e.type === 'el' && !['script', 'style', 'link', 'meta'].includes(e.tag))
    const classesRacine = new Set(racine ? classesDe(racine) : [])
    const surRacine = (r) => r.selecteurs.some((s) => { const cl = [...s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]); return cl.length && !/[\s>+~]/.test(s.trim()) && cl.every((c) => classesRacine.has(c)) })
    const heritees = decls.filter(({ r }) => r.selecteurs.some(estRacineSel))
    const directes = decls.filter(({ r }) => !r.selecteurs.some(estRacineSel) && surRacine(r))
    const dernier = (l) => [...l].sort((a, b) => a.r.ordre - b.r.ordre).pop()
    const eff = dernier(directes) ?? dernier(heritees)
    if (!eff) fautes.push(`(b) ${pid} : --ok n’est défini nulle part (valeur effective attendue ${VERT_RESERVE.toUpperCase()})`)
    else if (norm(eff.d.valeur) !== VERT_RESERVE) fautes.push(`(b) ${pid} : la valeur effective de --ok à la racine est ${eff.d.valeur} (${eff.r.fichier}:${eff.d.ligne} ${eff.r.selecteurs.join(', ')}), pas ${VERT_RESERVE.toUpperCase()}${eff.r.propre ? '' : ' — règle partagée concernée qui redéfinit le jeton'}`)
    for (const { r, d } of decls) if (norm(d.valeur) !== VERT_RESERVE && !surRacine(r) && !r.selecteurs.some(estRacineSel)) fautes.push(`(b) ${pid} : ${r.fichier}:${d.ligne} ${r.selecteurs.join(', ')} redéfinit --ok à ${d.valeur}`)
    // (c) toute règle qui emploie le vert nomme un état validé ou payé
    const vues = new Set()
    for (const e of emplois) {
      if (e.classe !== 'vert' || !e.regle || vues.has(e.regle)) continue
      if (e.custom && !e.propre) continue
      vues.add(e.regle)
      if (!e.regle.selecteurs.some((s) => /valid|pay|data-etat/i.test(s))) fautes.push(`(c) ${pid} ${e.ou} ${e.sel} emploie le vert (${e.prop}: ${e.valeur}) sans nommer un état validé ou payé`)
    }
  }
  return resultat('LV-13', unique(fautes), `${n} emplois de couleur`)
}

REGLES['LV-14'] = (A) => {
  const { liste, manques } = lirePages(A, ['/'])
  if (!liste.length) return resultat('LV-14', [], '')
  const h1 = elements(liste[0][1].a.racine, (e) => e.tag === 'h1')[0]
  if (!h1) return echec('LV-14', ['/ : aucun <h1>'])
  const t = nettoyer(texteVisible(h1))
  const m = /[.!?…]+["»”’)]*\s+\S/u.exec(t)
  return resultat('LV-14', t ? (m ? [`/ : le h1 compte plus d’une phrase : « ${court(t, 120)} »`] : []) : ['/ : le h1 est vide'], `h1 = « ${court(t, 80)} »`)
}

REGLES['LV-15'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []
  const acc = liste.find(([id]) => id === '/')?.[1]
  if (!acc) return resultat('LV-15', [], '')
  const h1 = elements(acc.a.racine, (e) => e.tag === 'h1')[0]
  let sous = null
  if (h1) {
    const section = ancetres(h1).find((a) => a.tag === 'section') ?? ancetres(h1).find((a) => a.tag === 'main') ?? acc.a.racine
    const tous = [...descendants(section)]
    sous = tous.slice(tous.indexOf(h1) + 1).find((e) => e.type === 'el' && e.tag === 'p' && nettoyer(texteVisible(e)))
  }
  if (!h1) fautes.push('/ : aucun <h1>')
  else {
    const t1 = nettoyer(texteVisible(h1))
    const r1 = DET.dureeOuChiffre(t1); if (r1) fautes.push(`/ h1 « ${court(t1, 70)} » : ${r1.motif}`)
    if (!sous) fautes.push('/ : aucune sous-phrase (premier <p> après le h1 dans sa section)')
    else { const t2 = nettoyer(texteVisible(sous)); const r2 = DET.dureeOuChiffre(t2); if (r2) fautes.push(`/ sous-phrase « ${court(t2, 80)} » : ${r2.motif}`) }
  }
  const r = banque(A, 'LV-15', (t) => DET.moinsUneMinute(t))
  fautes.push(...r.fautes.map((f) => (/^\d/.test(f) ? f : `« moins d’une minute » ${f}`)))
  return resultat('LV-15', fautes, `h1, sous-phrase ; ${r.vu}`)
}

REGLES['LV-16'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []; let n = 0
  for (const [pid, Pg] of liste) {
    for (const u of Pg.a.unites) {
      n++
      const r = DET.autoSansSignature(u.t)
      if (r) fautes.push(`${pid} [${u.origine}] ${r.motif} : « ${court(u.t, 110)} »`)
    }
  }
  if (!n) fautes.push('aucune phrase examinée')
  return resultat('LV-16', fautes, `${n} phrases`)
}

const nomAccessible = (e) => nettoyer(e.attrs['aria-label'] ?? texteVisible(e))
REGLES['LV-17'] = (A) => {
  const { liste, manques } = lirePages(A)
  const fautes = []
  const acc = liste.find(([id]) => id === '/')?.[1]
  if (!acc) return resultat('LV-17', [], '')
  const liens = elements(acc.a.racine, (e) => e.tag === 'a' && 'href' in e.attrs)
  const cheminDe = (h) => (/^\/[^?#]*/.exec(h) ?? [''])[0]
  const boutons = elements(acc.a.racine, (e) => classesDe(e).some((c) => EST_BOUTON.test(c)))
  const main = elements(acc.a.racine, (e) => e.tag === 'main')[0]
  const sections = main ? elements(main, (e) => e.tag === 'section' && !ancetres(e).some((a) => a.tag === 'section')) : []
  const dansSection6 = (id) => { const s6 = sections[5]; return !!s6 && [s6, ...descendants(s6)].some((e) => e.type === 'el' && e.attrs.id === id) }
  const attendus = [
    [LIBELLES.essayer, 'plein', (h) => cheminDe(h) === '/signup', 'vers /signup'],
    [LIBELLES.compte, 'plein', (h) => cheminDe(h) === '/signup', 'vers /signup'],
    [LIBELLES.entreprise, 'contour', (h) => h.startsWith('#') && dansSection6(h.slice(1)), 'vers une ancre de la section 6'],
    [LIBELLES.demo, 'contour', (h) => cheminDe(h) === '/contact', 'vers /contact'],
    [LIBELLES.demoEntreprise, 'contour', (h) => cheminDe(h) === '/contact', 'vers /contact'],
  ]
  for (const [libelle, genre, vise, ou] of attendus) {
    const portes = liens.filter((l) => nomAccessible(l) === nettoyer(libelle))
    if (!portes.length) { fautes.push(`/ : aucun lien dont le nom accessible est « ${libelle} »`); continue }
    const bon = portes.some((l) => classesDe(l).some((c) => CLASSES_BOUTONS[c]?.genre === genre) && vise(l.attrs.href))
    if (!bon) fautes.push(`/ : « ${libelle} » doit être un bouton ${genre} ${ou} — trouvé : ${portes.map((l) => `class="${l.attrs.class ?? ''}" href="${l.attrs.href}"`).join(' ; ')}`)
  }
  for (const b of boutons) {
    const inconnues = classesDe(b).filter((c) => EST_BOUTON.test(c) && !CLASSES_BOUTONS[c])
    if (inconnues.length) fautes.push(`/ : bouton « ${court(nomAccessible(b), 30)} » de classe inconnue ${inconnues.join(', ')} (table CLASSES_BOUTONS : ${Object.keys(CLASSES_BOUTONS).join(', ')})`)
    if (classesDe(b).some((c) => CLASSES_BOUTONS[c]?.genre === 'plein') && !(b.tag === 'a' && cheminDe(b.attrs.href ?? '') === '/signup')) fautes.push(`/ : bouton plein « ${court(nomAccessible(b), 30)} » qui ne vise pas /signup (${b.attrs.href ?? b.tag})`)
  }
  for (const [pid, Pg] of liste) {
    for (const u of Pg.a.unites) { const m = /essayer\s+gratuitement|diagnostic\s+gratuit/iu.exec(u.t); if (m) fautes.push(`${pid} [${u.origine}] « ${m[0]} » : ${court(u.t, 90)}`) }
  }
  return resultat('LV-17', unique(fautes), `${boutons.length} bouton(s) et ${liens.length} lien(s) sur /`)
}

REGLES['LV-18'] = (A) => {
  const fautes = []
  const jours = new Set(Object.values(A.essaiJours))
  const parOffre = Object.fromEntries(Object.entries(A.essaiJours).map(([k, v]) => [v, A.plans[k].label]))
  let nSources = 0
  for (const [pid, Pg] of Object.entries(A.pages)) {
    if (!Pg.sources) continue
    for (const [rel, src] of Object.entries(Pg.sources)) {
      if (A.horsSources.includes(rel)) continue
      nSources++
      const t = decoderEntites(normaliser(src.sansCommentaires))
      for (const m of t.matchAll(/(?<![\p{L}\p{N}+])(\d+)\s*jours?(?![\p{L}])/giu)) fautes.push(`(a) ${rel}:${ligneDe(t, m.index)} nombre de jours tapé « ${m[0]} » (page ${pid})`)
    }
  }
  if (!nSources) fautes.push('(a) aucune source de page lue')
  const { liste, manques } = lirePages(A)
  let n = 0
  for (const [pid, Pg] of liste) {
    for (const u of corpusDe(Pg)) {
      for (const p of (u.origine === 'visible' ? phrasesDe(u.t) : [u.t])) {
        for (const m of p.matchAll(/(?<![\p{L}\p{N}+])(\d+)\s*jours?(?![\p{L}])/giu)) {
          n++
          const j = +m[1]
          if (!jours.has(j)) fautes.push(`(b) ${pid} [${u.origine}] « ${m[0]} » n’est pas une durée d’essai de lib/plans.ts (${[...jours].join(' ou ')}) : « ${court(p, 90)} »`)
          else if (!new RegExp(`(?<![\\p{L}])${parOffre[j]}(?![\\p{L}])`, 'u').test(p)) fautes.push(`(b) ${pid} [${u.origine}] « ${m[0]} » sans nommer son offre (${parOffre[j]}) dans la phrase : « ${court(p, 90)} »`)
        }
      }
      for (const m of u.t.matchAll(/(?<![\p{L}])Essentiel(?![\p{L}])|(?<![\p{L}])(?:offre|formule|forfait|plan|abonnement|d[èe]s|avec)\s+(?:l[’']\s*)?essentiel(?![\p{L}])/gu)) fautes.push(`(c) ${pid} [${u.origine}] l’Essentiel n’est plus vendu : « ${extrait(u.t, m)} »`)
    }
  }
  return resultat('LV-18', unique(fautes), `${nSources} source(s), ${n} durée(s) rendue(s)`)
}

const lireModule = (A, rel) => (A.extra && rel in A.extra ? A.extra[rel] : A.arbre.lire(rel))
const listerModules = (A) => unique([...['app', 'components', 'lib'].flatMap((d) => A.arbre.lister(d, /\.(tsx?|jsx?)$/)), ...Object.keys(A.extra ?? {})])
/** Les modules du projet qui portent le texte des trois étapes (on cherche le début de chaque étape, tel que l'écrit le plan). */
function modulesDesEtapes(A) {
  const res = []
  for (const rel of listerModules(A)) {
    const s = lireModule(A, rel); if (s == null) continue
    const t = nettoyer(decoderEntites(sansCommentaires(s)))
    if (t.includes(ETAPES[0].slice(0, 40)) || t.includes(ETAPES[1].slice(0, 40))) res.push(rel)
  }
  return res
}
function modulesDuBloc(A, Pg) {
  const res = []
  for (const [rel, src] of Object.entries(Pg.sources ?? {})) {
    if (A.horsSources.includes(rel)) continue
    const t = nettoyer(decoderEntites(src.sansCommentaires))
    if ((/entreprise/i.test(t) && /d[ée]mo/i.test(t)) || t.includes(TITRE_ENSUITE) || t.includes(ETAPES[0].slice(0, 40))) res.push(rel)
  }
  return res
}
const importe = (rel, cible, sansCom) => {
  const sf = ts.createSourceFile(rel, sansCom, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
  let oui = false
  sf.forEachChild((n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const spec = n.moduleSpecifier.text
      const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)) : null
      if (base && [base, base + '.ts', base + '.tsx', base + '/index.ts'].includes(cible)) oui = true
    }
  })
  return oui
}
REGLES['LV-19'] = (A) => {
  const { liste } = lirePages(A, ['/contact'])
  if (!liste.length) return resultat('LV-19', [], '')
  const Pg = liste[0][1]
  const fautes = []
  const bloc = Pg.a.bloc
  const modules = modulesDuBloc(A, Pg)
  if (!modules.length) fautes.push('aucun module de /contact ne porte le bloc de démo Entreprise (« entreprise » et « démo » dans ses textes) ni « Ce qui se passe ensuite »')
  // (a) aucun délai, (b) aucune marque : dans le bloc rendu et dans les textes de ses modules (la confirmation n'est pas rendue par le serveur)
  const textes = Pg.a.unites.map((u) => ({ t: u.t, ou: `rendu [${u.origine}]` }))
  for (const rel of modules) {
    const { unites } = unitesDeTexte(rel, Pg.sources[rel].brut)
    for (const u of unites) { if (u.genre === 'commentaire') continue; for (const v of u.variantes) for (const p of phrasesDeMorceaux(v)) { const t = nettoyer(p.texte); if (u.genre === 'chaine' && !/\s/.test(t)) continue /* un mot seul : spécificateur d'import, clé, classe */; textes.push({ t, ou: `${rel}:${p.ligne}` }) } }
  }
  for (const x of textes) {
    const d = DET.delai(x.t); if (d) fautes.push(`(a) ${x.ou} délai « ${d.motif} » : « ${court(x.t, 90)} »`)
    const mq = DET.marque(x.t); if (mq) fautes.push(`(b) ${x.ou} « ${mq.motif} » : « ${court(x.t, 90)} »`)
  }
  // (c) « Ce qui se passe ensuite » et ses trois étapes, égaux au texte imposé, dans le bloc
  const plat = nettoyer(texteVisible(bloc)).replace(/(^|\s)[123][.)]\s+(?=\S)/g, '$1')
  if (!plat.includes(TITRE_ENSUITE)) fautes.push(`(c) le bloc ne porte pas le titre « ${TITRE_ENSUITE} »`)
  let reste = plat.slice(Math.max(0, plat.indexOf(TITRE_ENSUITE)))
  for (let i = 0; i < ETAPES.length; i++) {
    const k = reste.indexOf(ETAPES[i])
    if (k < 0) { fautes.push(`(c) étape ${i + 1} absente ou différente du texte imposé : « ${court(ETAPES[i], 70)} »`); break }
    reste = reste.slice(k + ETAPES[i].length)
  }
  // (c bis) la confirmation reprend « Ce qui se passe ensuite » : elle porte le texte, ou importe le module qui le porte
  const modEtapes = modulesDesEtapes(A)
  const confirmations = modules.filter((rel) => /confirm|re[cç]u|merci|envoy[ée]e?|enregistr/iu.test(Pg.sources[rel].sansCommentaires))
  if (!confirmations.length) fautes.push('(c) confirmation introuvable : aucun module du bloc ne porte de message de confirmation')
  for (const rel of confirmations) {
    const sc = Pg.sources[rel].sansCommentaires
    const porte = ETAPES.every((e) => nettoyer(decoderEntites(sc)).includes(e)) || modEtapes.includes(rel) || modEtapes.some((m) => importe(rel, m, sc))
    if (!porte) fautes.push(`(c) ${rel} : la confirmation ne reprend pas « ${TITRE_ENSUITE} » (ni le texte, ni l’import du module qui le porte)`)
  }
  // (d) les trois étapes vivent dans un seul module
  if (modEtapes.length !== 1) fautes.push(`(d) les trois étapes vivent dans ${modEtapes.length} module(s)${modEtapes.length ? ' : ' + modEtapes.join(', ') : ''} (un seul attendu)`)
  // si le plan du chantier 4 de la copie porte le texte, la constante lui est égale
  if (A.planChantier4) {
    const p = nettoyer(A.planChantier4.replace(/[*_`>]/g, '')).replace(/(^|\s)[123][.)]\s+/g, '$1')
    if (p.includes(TITRE_ENSUITE) && !ETAPES.every((e) => p.includes(e))) fautes.push('(c) la constante de la suite diffère du texte du plan du chantier 4 de la copie')
  }
  return resultat('LV-19', unique(fautes), `bloc de /contact (${Pg.bloc?.mode === 'seul' ? 'composant rendu seul : ' + Pg.bloc.module : 'dans la page'}), ${modules.length} module(s) lu(s), étapes dans ${modEtapes.length} module(s)`)
}

// L'enveloppe : les pages manquantes notées par lirePages deviennent des fautes de la règle, en tête.
for (const id of Object.keys(REGLES)) {
  const f = REGLES[id]
  REGLES[id] = (A) => {
    A.__manques = []
    const r = f(A)
    const manques = unique(A.__manques); A.__manques = []
    return { ...r, fautes: unique([...manques, ...r.fautes]) }
  }
}
