// Filtre anti-fabrication ÉTENDU (v5 §7) — au-delà des chiffres et labels.
//
// Une réponse écrite au nom de l'artisan peut lui faire dire des choses qu'il n'a jamais
// déclarées : « je me déplace », « en atelier », « sous 48 h », « je fais aussi la clim ».
// Ce ne sont pas des chiffres, donc `findFabrications` (lib/ai.ts) ne les voit pas. Ici on
// compare le texte généré au PROFIL réel de l'artisan (services, horaires, zone, bio,
// assurance) : une affirmation de capacité absente du profil est une invention.
//
// Stratégie appliquée par `assainirReponse` : régénérer UNE fois avec le rappel nommé,
// puis DÉGRADER (retirer la phrase fautive) plutôt que livrer une promesse intenable.
//
// Module pur (aucun import projet) : testable avec `node --experimental-strip-types`.

export type ProfilCapacites = {
  metier?: string | null
  services?: ({ nom?: string | null; description?: string | null } | string)[] | null
  horaires?: string | null
  zone?: string | null
  bio?: string | null
  assurance_nom?: string | null
}

export type CapaciteDetectee = { cle: string; label: string; extrait: string; phrase: string }

/** Minuscule sans accents ni ponctuation (même règle que lib/ai.ts). */
export function normaliser(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Tout ce que le profil déclare, en un seul texte normalisé — la référence de comparaison. */
export function texteProfil(p: ProfilCapacites): string {
  const services = (p.services ?? [])
    .map((s) => (typeof s === 'string' ? s : [s?.nom, s?.description].filter(Boolean).join(' ')))
    .join(' ')
  // Une zone renseignée = l'artisan déclare qu'il intervient (se déplace) dans cette zone.
  const morceaux = [p.metier, services, p.horaires, p.zone ? 'zone d intervention ' + p.zone : '', p.bio, p.assurance_nom ? 'assurance decennale ' + p.assurance_nom : '']
  return ' ' + normaliser(morceaux.filter(Boolean).join(' ')) + ' '
}

// Prestations qu'un artisan peut « ajouter » à son offre dans une phrase. Le mot-clé doit
// figurer dans le profil (ou être le métier lui-même) pour que l'affirmation soit légitime.
const PRESTATIONS = [
  'ramonage', 'terrassement', 'domotique', 'climatisation', 'clim', 'pompe a chaleur', 'photovoltaique',
  'panneaux solaires', 'plomberie', 'electricite', 'maconnerie', 'carrelage', 'peinture', 'menuiserie',
  'couverture', 'toiture', 'charpente', 'zinguerie', 'isolation', 'chauffage', 'chaudiere', 'elagage',
  'abattage', 'piscine', 'arrosage automatique', 'portail', 'serrurerie', 'vitrerie', 'parquet', 'cuisine',
  'salle de bain', 'placo', 'platrerie', 'facade', 'ravalement', 'demoussage', 'gouttieres', 'velux',
  'volets', 'stores', 'alarme', 'videosurveillance', 'fibre', 'antenne', 'demenagement', 'debarras',
  'fosse septique', 'assainissement', 'forage', 'dallage', 'pavage', 'cloture', 'terrasse', 'pergola',
  'veranda', 'extension', 'surelevation', 'combles', 'escalier', 'dressing', 'agencement',
  'gazon', 'paysagisme', 'jardinage', 'tonte', 'taille de haies',
  // Retirés (audit final, E, M4) : « dépannage », « urgence », « entretien » — ce ne sont pas des
  // prestations mais des mots de toute conversation d'artisan (« je prends en charge votre urgence »).
]
const VERBES =
  '(?:je|nous|on) (?:fais|faisons|fait|realise|realisons|propose|proposons|installe|installons|pose|posons|assure|assurons|m occupe|nous occupons|gere|gerons|prends en charge|prenons en charge|intervien\\w*|interviens|peux(?: aussi| egalement)? (?:faire|realiser|installer|poser|m occuper de|gerer|intervenir)|pouvons(?: aussi| egalement)? (?:faire|realiser|installer|poser|nous occuper de|gerer|intervenir))'
const RE_PRESTATION = new RegExp(`\\b${VERBES}\\b[^.!?]{0,40}?\\b(${PRESTATIONS.join('|')})\\b`)

// Créneau inventé (audit des promesses du 12/10, ligne 5 : « sans inventer de prix ni de créneau ») : un jour, une date ou
// une heure que l'assistant propose au client (« je peux passer jeudi à 14 h », « rendez-vous le 16 octobre »). Rien dans le
// profil ne lui donne l'agenda de l'artisan : seul l'artisan fixe un rendez-vous. Le texte est déjà normalisé (sans accents).
const HEURE = '\\d{1,2} ?h(?: ?\\d{2}|eures?)?'
const JOUR = '(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|apres demain|demain)'
const MOIS = '(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)'
export const RE_CRENEAU = new RegExp(
  `\\b(${JOUR}(?: \\d{1,2}(?:er)?(?: ${MOIS})?)?(?: prochain)? (?:matin|midi|apres midi|soir|(?:a |vers |des |entre )?${HEURE})` +
  `|(?:a|vers|des|entre|de) ${HEURE}` +
  `|(?:le|du|au) \\d{1,2}(?:er)? ${MOIS}` +
  `|${JOUR} \\d{1,2}(?:er)?(?: ${MOIS})?` +
  `|${JOUR} prochain)\\b`,
)
// Un jour ou une heure n'est un créneau proposé que si la phrase S'ENGAGE sur un rendez-vous : « votre chauffe-eau a lâché
// lundi matin » ne promet rien, « je peux passer lundi matin » si.
const RE_ENGAGEMENT_CRENEAU = /\b(passer|passage|passe|venir|viens|viendr\w*|intervenir|intervien\w*|intervention|rendez vous|rdv|rappel\w*|disponibl\w*|dispo|creneau|visite|libre|serai|serons|on se voit|je peux|nous pouvons|pourrai\w*|pourrions|propose|proposons|prevoir|prevu|bloquer|reserv\w*)\b/

type Motif = { cle: string; label: string; re: RegExp; declare: (profil: string, extrait: string, phrase?: string) => boolean }

const contient = (profil: string, ...cles: string[]) => cles.some((c) => profil.includes(c))

/** Les motifs FR de capacités qu'on ne laisse passer que si le profil les déclare. */
export const MOTIFS_CAPACITE: Motif[] = [
  {
    cle: 'deplacement',
    label: 'déplacement gratuit / offert non déclaré',
    re: /\b(deplacement(?: \w+)? (?:gratuit|offert|inclus)|sans frais de deplacement|(?:je me deplace|nous nous deplacons) (?:gratuitement|sans frais))\b/,
    declare: (p) => contient(p, 'deplacement gratuit', 'deplacement offert', 'sans frais'),
  },
  {
    cle: 'deplacement',
    label: 'déplacement / intervention à domicile non déclaré (aucune zone)',
    re: /\b(je me deplace|nous nous deplacons|(?:j|nous) intervien\w* (?:a domicile|chez vous|sur toute|dans tout))\b/,
    declare: (p) => contient(p, 'deplac', 'domicile', 'sur place', 'interv', 'rayon', ' km '),
  },
  {
    cle: 'atelier',
    label: 'travail en atelier non déclaré',
    re: /\b(en atelier|dans (?:mon|notre|l) atelier|a l atelier)\b/,
    declare: (p) => contient(p, 'atelier'),
  },
  {
    cle: 'delai',
    label: 'délai précis non déclaré',
    re: /\b((?:sous|en|d ici|dans les|en moins de|sous les) ?\d{1,2} ?(?:h|heures?|jours?|j|semaines?)|des demain|demain matin|demain a la premiere heure|dans l heure|dans la demi heure|d ici ce soir|ce soir meme)\b/,
    declare: (p, extrait) => contient(p, extrait, extrait.replace(/\s+/g, '')),
  },
  {
    cle: 'creneau',
    label: 'créneau (jour, date ou heure) proposé sans l’agenda de l’artisan',
    re: RE_CRENEAU,
    // Légitime seulement si le profil le déclare tel quel (horaires « de 8 h à 18 h ») ; sans engagement, ce n'est pas un créneau.
    declare: (p, extrait, phrase) => contient(p, ` ${extrait} `, extrait.replace(/\s+/g, '')) || !RE_ENGAGEMENT_CRENEAU.test(phrase ?? ''),
  },
  {
    cle: 'permanence',
    label: 'permanence (7j/7, 24h/24, week-end, nuit) non déclarée',
    re: /\b(7 ?j ?7|7 jours sur 7|24 ?h ?24|24 heures sur 24|le week end|ce week end|les week ends?|le dimanche|jours feries|de nuit|la nuit)\b/,
    // Une permanence n'est affirmée que si la phrase s'ENGAGE (j'interviens, je suis disponible,
    // joignable, ouvert, astreinte). « Je vous rappelle après le week-end » ou « la nuit dernière ? »
    // ne promettent rien (audit final, E, M4).
    declare: (p, _extrait, phrase) => contient(p, '7j', '7 j', '24h', '24 h', 'week', 'dimanche', 'ferie', 'nuit', 'astreinte')
      || !/\b(intervien\w*|intervention|disponibl\w*|joignabl\w*|ouvert\w*|astreinte|permanence|me deplace|nous deplacons|repond\w*|garanti\w*|assur\w*)\b/.test(phrase ?? ''),
  },
  {
    cle: 'garantie',
    label: 'garantie / certification non déclarée',
    re: /\b(garanti\w* \d+ ans?|garantie (?:decennale|biennale|de parfait achevement)|assur\w* decennale|certifi\w* (?:rge|qualibat|qualifelec|qualipac)|label\w* rge|agree\w* (?:par|rge|qualibat))\b/,
    declare: (p, extrait) => contient(p, 'decennale', 'rge', 'qualibat', 'qualifelec', 'qualipac', 'garantie') || contient(p, extrait),
  },
  {
    cle: 'prestation',
    label: 'prestation absente du profil',
    re: RE_PRESTATION,
    declare: (p, extrait, phrase) => {
      // Le dernier groupe capturé est la prestation ; le métier lui-même (« plombier » →
      // « plomberie ») la déclare via un préfixe commun. On cherche dans la PHRASE entière :
      // l'extrait transmis n'est que le premier groupe (le verbe), pas la prestation.
      const m = (phrase ?? extrait).match(RE_PRESTATION)
      const presta = m ? m[m.length - 1] : extrait
      const racine = presta.slice(0, Math.min(5, presta.length))
      // Le métier implique certaines prestations : un plombier est plombier-chauffagiste dans
      // l'usage (chaudière, chauffe-eau, sanitaire) — « l'entretien de votre chaudière » n'est
      // pas une invention (audit final, E, M4).
      const implique = p.includes('plomb') && ['chauffage', 'chaudiere', 'chauffe eau', 'sanitaire', 'salle de bain'].includes(presta)
      return implique || p.includes(presta) || (presta.length >= 6 && p.includes(racine))
    },
  },
]

// Une négation JUSTE AVANT l'affirmation (« je n'interviens pas le week-end ») l'annule. Avant, toute
// phrase contenant « pas de » ou « malheureusement » était sautée entière : « Pas de souci, je me
// déplace gratuitement et j'interviens sous 24 h » passait sans contrôle (audit final, E, M4).
const RE_NEGATION_AVANT = /\b(?:ne|n) \w+(?: \w+)? (?:pas|plus|jamais|aucun\w*) [^.!?]{0,12}$|\bpas (?:de|d) $|\bne (?:propose|fais|realise|couvre)\b[^.!?]{0,20}$|\bni $/
// (conservée pour l'export : l'ancienne règle, à titre documentaire)
export const RE_NEGATION = /\b(?:ne|n)\b[^.!?]{0,40}?\b(?:pas|plus|jamais|aucun\w*)\b|\bpas (?:de|d)\b|\bmalheureusement\b|\bne (?:propose|fais|realise|couvre)\b/

/** Découpe un texte en phrases (on retire une phrase entière, jamais un demi-mot). */
export function phrases(texte: string): string[] {
  return (texte || '').split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
}

/**
 * Affirmations de capacité que le profil ne déclare pas. Chaque hit porte la phrase
 * complète (pour la retirer) et l'extrait fautif (pour le rappel au modèle).
 */
export function detecterCapacitesNonDeclarees(texte: string, profil: ProfilCapacites): CapaciteDetectee[] {
  const ref = texteProfil(profil)
  const hits: CapaciteDetectee[] = []
  for (const phrase of phrases(texte)) {
    const n = ' ' + normaliser(phrase) + ' '
    for (const m of MOTIFS_CAPACITE) {
      const hit = n.match(m.re)
      if (!hit) continue
      const extrait = hit[1] ?? hit[0]
      const avant = n.slice(Math.max(0, (hit.index ?? 0) - 48), hit.index ?? 0)
      if (RE_NEGATION_AVANT.test(avant)) continue
      if (m.declare(ref, extrait.trim(), n)) continue
      hits.push({ cle: m.cle, label: m.label, extrait: extrait.trim(), phrase })
    }
  }
  return hits
}

/** Montants chiffrés dans une réponse (interdits : le devis porte les prix, pas le message). */
export function detecterPrixChiffres(texte: string): string[] {
  const out = new Set<string>()
  // « € » n'est pas un caractère de mot : pas de \b après lui (sinon « 450 € » passe).
  for (const m of (texte || '').matchAll(/\b\d[\d\s.,]*?\s?(?:€|euros?\b|eur\b)/gi)) out.add(m[0].trim())
  for (const m of (texte || '').matchAll(/(?:€|\beuros?)\s?\d[\d\s.,]*\d/gi)) out.add(m[0].trim())
  return [...out]
}

/** Retire les phrases fautives, sans laisser de trou visible (espaces et ponctuation recollés). */
export function retirerPhrases(texte: string, aRetirer: string[]): string {
  if (!aRetirer.length) return texte
  let out = texte
  for (const p of aRetirer) out = out.split(p).join('')
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/ +\n/g, '\n').trim()
}

/**
 * Passe complète : détecte → régénère une fois avec le rappel nommé → dégrade si ça persiste.
 * `regenerer` reçoit le rappel à ajouter au prompt ; s'il est absent on dégrade directement.
 */
export async function assainirReponse(
  texte: string,
  profil: ProfilCapacites,
  regenerer?: (rappel: string) => Promise<string>,
): Promise<{ texte: string; retirees: CapaciteDetectee[]; regenere: boolean; prixRetires: string[] }> {
  let courant = texte
  let hits = detecterCapacitesNonDeclarees(courant, profil)
  let prix = detecterPrixChiffres(courant)
  let regenere = false
  if ((hits.length || prix.length) && regenerer) {
    regenere = true
    const rappel = rappelAntiFabrication(hits, prix)
    try { courant = await regenerer(rappel) } catch { /* on garde la version courante et on dégrade */ }
    hits = detecterCapacitesNonDeclarees(courant, profil)
    prix = detecterPrixChiffres(courant)
  }
  const retirees = hits
  if (hits.length || prix.length) {
    const phrasesFautives = new Set<string>(hits.map((h) => h.phrase))
    // Une phrase qui contient un montant part aussi.
    for (const ph of phrases(courant)) if (prix.some((p) => ph.includes(p))) phrasesFautives.add(ph)
    courant = retirerPhrases(courant, [...phrasesFautives])
  }
  return { texte: courant, retirees, regenere, prixRetires: prix }
}

/** Le rappel injecté dans le prompt lors de la régénération. */
export function rappelAntiFabrication(hits: CapaciteDetectee[], prix: string[] = []): string {
  const items = [
    ...hits.map((h) => `« ${h.extrait} » (${h.label})`),
    ...prix.map((p) => `« ${p} » (montant chiffré — interdit dans une réponse)`),
  ]
  return `\n\nATTENTION — ta version précédente affirmait des choses que le profil de l'artisan NE DÉCLARE PAS : ${items.slice(0, 6).join(' ; ')}. Recommence SANS ces affirmations ni équivalent : aucun montant, et ne promets aucun déplacement, atelier, délai chiffré, créneau (jour, date ou heure de passage), permanence, garantie, certification ou prestation qui ne figure pas dans le profil. Pour un rendez-vous, demande au client ses disponibilités : c'est l'artisan qui fixera le créneau. En cas de doute, propose de vérifier avec l'artisan plutôt que d'affirmer.`
}
