// lib/crieur/juge.ts — le juge d'exécution du Crieur (fiche 026-116, « Ce qu'il faut faire », point 1), écrit par
// Claude Code AVANT le composeur (026-119) et la route (026-122) qui l'appelleront. Depuis le 27/09 (R24, qui
// remplace R7) : le Crieur ne publie plus seul — il dépose chaque publication en BROUILLON dans Publora, et Benj
// accorde chacune en la programmant lui-même. Ce juge reste la dernière relecture AVANT le dépôt du brouillon : un
// refus ici = pas de brouillon envoyé à Publora, jamais une publication qui invente un fait ou une donnée.
//
// Pur : aucun import hors des types (aucun fetch, aucune variable d'environnement, aucun accès à Supabase ou à
// Publora). `faits` et `phrasesGabarit` sont fournis par l'appelant (lib/crieur/faits.ts et lib/crieur/composer.ts,
// 026-119) ; `drapeaux` est un instantané fourni par la route (026-122), jamais lu ici.
//
// jugerPublication({ canal, texte, fait_ids, media? }, { faits, phrasesGabarit, drapeaux })
//   → { ok: true } | { ok: false, raisons: string[] }
//
// `texte` est découpé en phrases (chaque morceau qui se termine par « . », « ! » ou « ? », suivi d'un blanc ou de
// la fin du texte). Chaque phrase doit être, mot pour mot, SOIT le texte d'un des faits cités par `fait_ids` (une
// preuve peut être citée en entier, jamais reformulée), SOIT une phrase de `phrasesGabarit` (la liste fermée du
// composeur), SOIT `PHRASE_AIMANT` — sinon la publication est refusée (`phrase_inconnue`) : une phrase que le
// Crieur n'a lue nulle part ne part jamais.
//
// Raisons de refus (un identifiant par ligne de `raisons`, sans doublon) :
//   phrase_inconnue    une phrase qui n'est ni un texte de fait cité, ni une phrase du gabarit, ni la phrase aimant ;
//                      un texte entièrement vide (aucune phrase) ; ou un fait_ids qui cite un id absent de `faits`
//                      (correction du 28/09 : une contre-vérification a montré que ni l'un ni l'autre n'était refusé).
//   aimant_absent      Instagram ou Facebook sans PHRASE_AIMANT en dernière phrase, quand drapeaux.aimantSite est vrai.
//   aimant_en_trop     LinkedIn avec PHRASE_AIMANT (peu importe le drapeau) ; et, sur tout canal, dès que
//                      drapeaux.aimantSite n'est pas vrai (revue du 25/09 : la promesse ne part pas avant d'être servie).
//   formule_interdite  les formules interdites de CR-2 (026-119, « moins d'une minute » sans « prête »/« prépare »
//                      dans la même phrase, « Presti répond » sans « Studio »/« Signature » dans la même phrase,
//                      « n°1 », « meilleur », « garanti », « premier sur Google »).
//   drapeau_baisse     un fait cité (fait_ids) porte un drapeau, et drapeaux[ce drapeau] n'est pas true.
//   adresse_etrangere  une adresse http(s) ou www. dans `texte` dont le nom d'hôte n'est pas exactement
//                      prestiapp.fr (correction du 28/09 : un simple préfixe de texte laissait passer
//                      https://prestiapp.fr.evil.com — l'hôte est désormais comparé, pas le préfixe).
//   media_invalide     Instagram sans média, un média qui n'est pas
//                      ^https://prestiapp\.fr/api/crieur/visuel/[a-z0-9-]+\.png$, ou un média sur un autre canal.
//   trop_long          LinkedIn > 1300 signes, Facebook > 500, Instagram > 2200 (comptés en points de code Unicode).
//   donnee_personnelle une adresse e-mail ou un numéro de téléphone dans `texte`.

export const PHRASE_AIMANT = 'Commente SITE, je te prépare gratuitement la maquette de ton site.'

export type Canal = 'linkedin' | 'facebook' | 'instagram'

export type PublicationAJuger = {
  canal: Canal
  texte: string
  fait_ids: string[]
  media?: string | null
}

/** Un fait tel que le juge en a besoin : le sous-ensemble de lib/crieur/faits.ts (026-119) qu'il lit. */
export type FaitPourJuge = { texte: string; drapeau?: string }

export type ContexteJuge = {
  /** Les faits cités par leur id (au moins ceux de `fait_ids` ; un id absent d'ici est traité comme un fait inconnu). */
  faits: Record<string, FaitPourJuge>
  /** La liste fermée des phrases de gabarit du composeur (026-119), en dehors des textes de faits et de l'aimant. */
  phrasesGabarit: readonly string[]
  /** Les drapeaux tels que la route les a lus (026-122) ; seul `aimantSite` est lu ici. */
  drapeaux: Record<string, boolean>
}

export type VerdictJuge = { ok: true } | { ok: false; raisons: string[] }

const LIMITES: Record<Canal, number> = { linkedin: 1300, facebook: 500, instagram: 2200 }
const MEDIA_VALIDE = /^https:\/\/prestiapp\.fr\/api\/crieur\/visuel\/[a-z0-9-]+\.png$/
const ADRESSE = /\b(?:https?:\/\/|www\.)[^\s]+/gi
const HOTE_AUTORISE = 'prestiapp.fr'
// Ponctuation de fin de phrase qui peut coller à une adresse captée par ADRESSE (« …prestiapp.fr. » en fin de post) :
// retirée avant l'analyse de l'hôte, jamais avant la détection elle-même (ADRESSE reste inchangée).
const PONCTUATION_FINALE = /[.,;:!?)\]}'"«»]+$/
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const TELEPHONE = /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/
const APOSTROPHES = "['’ʼ]"
const RE_MOINS_UNE_MINUTE = new RegExp(`moins d${APOSTROPHES}une minute`, 'i')
const RE_PRETE_PREPARE = /prêt|prépar/i
const RE_PRESTI_REPOND = /presti répond/i
const RE_STUDIO_SIGNATURE = /studio|signature/i
const FORMULES_SIMPLES = [/n°\s?1/i, /\bmeilleur/i, /\bgaranti/i, /premier sur google/i]

// Correction du 28/09 (contre-vérification indépendante, défaut bloquant confirmé) : l'ancien test était un simple
// `.startsWith('https://prestiapp.fr')`, donc « https://prestiapp.fr.evil.com/hack » passait — le préfixe de chaîne
// coïncide avec le préfixe de domaine. On compare désormais le NOM D'HÔTE réel (via `URL`), jamais un préfixe de texte.
function hoteAutorise(adresseBrute: string): boolean {
  const sansPonctuation = adresseBrute.replace(PONCTUATION_FINALE, '')
  if (!sansPonctuation) return false
  const avecSchema = /^https?:\/\//i.test(sansPonctuation) ? sansPonctuation : `https://${sansPonctuation}`
  let u: URL
  try { u = new URL(avecSchema) } catch { return false }
  const hote = u.hostname.toLowerCase().replace(/\.$/, '')
  return hote === HOTE_AUTORISE
}

/** Découpe `texte` en phrases : chaque morceau qui finit par ./!/? suivi d'un blanc ou de la fin du texte. */
function phrasesDe(texte: string): string[] {
  return String(texte ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Les formules interdites de CR-2, cherchées phrase par phrase (« dans la même phrase » pour les deux premières). */
function formuleInterditeDans(phrases: string[]): boolean {
  for (const p of phrases) {
    if (RE_MOINS_UNE_MINUTE.test(p) && !RE_PRETE_PREPARE.test(p)) return true
    if (RE_PRESTI_REPOND.test(p) && !RE_STUDIO_SIGNATURE.test(p)) return true
  }
  const tout = phrases.join(' ')
  return FORMULES_SIMPLES.some((re) => re.test(tout))
}

export function jugerPublication(pub: PublicationAJuger, ctx: ContexteJuge): VerdictJuge {
  const raisons = new Set<string>()
  const texte = String(pub?.texte ?? '')
  const canal = pub?.canal
  const faitIds = Array.isArray(pub?.fait_ids) ? pub.fait_ids : []
  const drapeaux = ctx?.drapeaux || {}
  const faits = ctx?.faits || {}
  const phrasesGabarit = ctx?.phrasesGabarit || []

  const phrases = phrasesDe(texte)
  const textesFaitsCites = new Set(faitIds.map((id) => faits[id]?.texte).filter((t): t is string => typeof t === 'string'))
  const gabaritConnu = new Set(phrasesGabarit)

  // Correction du 28/09 (contre-vérification indépendante, défaut bloquant confirmé) : un texte entièrement vide ne
  // produit aucune phrase, donc la boucle ci-dessous ne s'exécutait jamais et jugerPublication rendait { ok: true }
  // pour { canal, texte: '', fait_ids: [] } — une publication qui ne cite rien n'est plus jamais acceptée.
  if (phrases.length === 0) raisons.add('phrase_inconnue')

  // Correction du 28/09 : un fait_ids qui cite un id absent de `faits` était silencieusement ignoré (aucune de ses
  // phrases n'était alors « couverte » par ce fait, mais rien ne signalait la citation elle-même comme invalide) —
  // un fait_ids inconnu ne peut jamais être une preuve, la publication est donc refusée dès qu'elle en cite un.
  for (const id of faitIds) {
    if (!Object.prototype.hasOwnProperty.call(faits, id)) raisons.add('phrase_inconnue')
  }

  for (const p of phrases) {
    if (p === PHRASE_AIMANT) continue
    if (textesFaitsCites.has(p)) continue
    if (gabaritConnu.has(p)) continue
    raisons.add('phrase_inconnue')
  }

  const dernierePhrase = phrases.at(-1)
  const portePhraseAimant = phrases.includes(PHRASE_AIMANT)
  const aimantLeve = drapeaux.aimantSite === true

  if ((canal === 'instagram' || canal === 'facebook') && aimantLeve && dernierePhrase !== PHRASE_AIMANT) {
    raisons.add('aimant_absent')
  }
  if (portePhraseAimant && (canal === 'linkedin' || !aimantLeve)) raisons.add('aimant_en_trop')

  if (formuleInterditeDans(phrases)) raisons.add('formule_interdite')

  for (const id of faitIds) {
    const f = faits[id]
    if (f?.drapeau && drapeaux[f.drapeau] !== true) raisons.add('drapeau_baisse')
  }

  for (const m of texte.matchAll(ADRESSE)) {
    if (!hoteAutorise(m[0])) { raisons.add('adresse_etrangere'); break }
  }

  const media = pub?.media || null
  if (canal === 'instagram' && !media) raisons.add('media_invalide')
  else if (media && !MEDIA_VALIDE.test(media)) raisons.add('media_invalide')
  else if (media && canal !== 'instagram') raisons.add('media_invalide')

  const limite = canal ? LIMITES[canal] : undefined
  if (limite !== undefined && [...texte].length > limite) raisons.add('trop_long')

  if (EMAIL.test(texte) || TELEPHONE.test(texte)) raisons.add('donnee_personnelle')

  return raisons.size ? { ok: false, raisons: [...raisons] } : { ok: true }
}
