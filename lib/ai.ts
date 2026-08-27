import Anthropic from '@anthropic-ai/sdk'

// ⚙️ Modèle utilisé pour rédiger les réponses aux prospects.
// Haiku = rapide + très économique, parfait pour des réponses courtes en volume.
// Pour des réponses plus soignées, remplace par 'claude-opus-5' (plus cher).
const AI_MODEL = 'claude-haiku-4-5'

// Lit automatiquement ANTHROPIC_API_KEY depuis .env.local (côté serveur uniquement).
const client = new Anthropic()

type Artisan = { nom: string | null; metier: string | null; ton_style: string | null }
type Lead = { nom_prospect?: string | null; contact?: string | null; message?: string | null }

// ── Petits utilitaires d'analyse du message (déterministes, robustes) ──────────

/** Minuscule sans accents ni ponctuation, espaces normalisés — pour la détection de mots-clés. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques combinants)
    .replace(/[^a-z0-9]+/g, ' ') // ponctuation/apostrophes → espaces
    .trim()
}

// Signaux forts d'une situation d'urgence (sinistre / panne) dans le bâtiment.
const URGENCE_KEYWORDS = [
  'fuite', 'degat des eaux', 'degats des eaux', 'inond', 'panne', 'plus de chauffage',
  'plus d eau chaude', 'plus d eau', 'coupure', 'court circuit', 'odeur de gaz', 'sent le gaz',
  'fuite de gaz', 'urgent', 'urgence', 'au plus vite', 'des que possible', 'tout de suite',
  'immediat', 'sinistre', 'refoul', 'deborde', 'engorge', 'effondr', 'danger', 'ne fonctionne plus',
  'ne marche plus', 'tombe en panne', 'en rade', 'ce soir', 'aujourd hui', 'des maintenant',
]

/** Détecte une demande potentiellement urgente à partir du message du prospect. */
function isUrgent(message: string): boolean {
  const n = normalize(message)
  if (!n) return false
  return URGENCE_KEYWORDS.some((k) => n.includes(k))
}

/** Détecte une demande trop floue pour être chiffrée/traitée sans précisions. */
function isVague(message: string, hasMessage: boolean): boolean {
  if (!hasMessage) return true
  const words = normalize(message).split(' ').filter(Boolean)
  return words.length <= 3
}

/**
 * Rédige, dans le ton de l'artisan, la première réponse à envoyer au prospect.
 * Renvoie uniquement le corps du message (français, 1re personne).
 */
export async function generateLeadReply(artisan: Artisan, lead: Lead, model: string = AI_MODEL): Promise<string> {
  const nomArtisan = artisan.nom?.trim() || "l'artisan"
  const metier = artisan.metier?.trim() || 'artisan'
  const ton = artisan.ton_style?.trim() || 'professionnel, chaleureux et rassurant'
  const nomProspect = lead.nom_prospect?.trim() || 'non précisé'
  const messageBrut = lead.message?.trim() || ''
  const besoin = messageBrut || '(aucune précision donnée)'

  // Pré-analyse déterministe : fiable même sur le modèle le plus léger (Standard/Haiku).
  const urgent = isUrgent(messageBrut)
  const vague = !urgent && isVague(messageBrut, Boolean(messageBrut))

  const situation = urgent
    ? `\nSITUATION DÉTECTÉE : demande potentiellement URGENTE (sinistre, panne, dégât). Priorité absolue : RASSURER en une phrase, montrer que tu prends la situation au sérieux, puis donner UNE étape immédiate et concrète (proposer un rappel très rapide, annoncer une intervention au plus vite, ou suggérer un geste de sécurité simple si pertinent : couper l'eau ou l'électricité). Pas de longue reformulation, on va à l'essentiel.`
    : vague
      ? `\nSITUATION DÉTECTÉE : demande FLOUE ou incomplète. Pose 1 à 2 questions PRÉCISES et utiles pour un(e) ${metier} — uniquement ce qui te manque vraiment pour pouvoir chiffrer (ex. surface, nombre de pièces, type/état du matériel, photos). Une seule salve de questions, courtes et concrètes.`
      : ''

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE la toute première réponse à un prospect qui vient de le contacter (demande via son site).
Ton et style à respecter absolument : ${ton}

OBJECTIF : une réponse humaine, utile et rassurante qui fait avancer le prospect d'une étape concrète — jamais un texte générique ni du remplissage.

ADAPTE-TOI au message reçu :
- Demande URGENTE (fuite, dégât des eaux, panne, plus de chauffage/d'eau, coupure, odeur de gaz, sinistre…) → d'abord RASSURER, puis donner UNE étape immédiate (rappel très rapide, intervention au plus vite, ou geste de sécurité simple). Sérieux et réactif.
- Demande FLOUE ou incomplète → pose 1 à 2 questions PRÉCISES et pertinentes pour un(e) ${metier} (ce qui te manque réellement pour chiffrer). Une seule salve, courte.
- Demande CLAIRE → confirme en une phrase que tu as bien compris le besoin, puis propose la prochaine étape (visite pour chiffrer, appel, ou devis).
- Demande HORS de ton métier (${metier}) → dis honnêtement que ce n'est pas ta spécialité, sans t'engager sur un travail que tu ne fais pas, et invite à préciser si une partie relève quand même de ton activité.

RÈGLES :
- Français, à la première personne (comme si ${nomArtisan} écrivait lui-même).
- Court : 3 à 6 phrases. Zéro blabla.
- Ne donne JAMAIS de prix chiffré ni de fourchette (tu n'as pas les détails).
- N'invente aucun délai précis intenable : reste sur « rapidement », « au plus vite », « dans la journée » (si urgent).
- Emploie le nom du prospect s'il est fourni, sinon un « Bonjour » simple.
- Termine par une formule de politesse signée « ${nomArtisan} ».
- Renvoie UNIQUEMENT le texte du message : pas d'objet, pas de « Voici la réponse », pas de guillemets, pas de balises.${situation}`

  const user = `Nom du prospect : ${nomProspect}
Besoin décrit par le prospect : ${besoin}`

  const res = await client.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0.6,
    system,
    messages: [{ role: 'user', content: user }],
  })

  let out = ''
  for (const block of res.content) {
    if (block.type === 'text') out += block.text
  }
  return out.trim()
}

/**
 * Rédige une relance (follow-up) dans le ton de l'artisan.
 * rang : 1 = douce, 2 = rappel avec créneau, 3 = dernière relance.
 */
export async function generateRelanceReply(artisan: Artisan, lead: Lead, rang: number, model: string = AI_MODEL): Promise<string> {
  const nomArtisan = artisan.nom?.trim() || "l'artisan"
  const metier = artisan.metier?.trim() || 'artisan'
  const ton = artisan.ton_style?.trim() || 'professionnel, chaleureux et rassurant'
  const nomProspect = lead.nom_prospect?.trim() || 'non précisé'
  const messageBrut = lead.message?.trim() || ''
  const besoin = messageBrut || '(aucune précision donnée)'
  const contexte =
    rang <= 1
      ? "C'est une PREMIÈRE relance, DOUCE : le prospect n'a pas répondu depuis quelques jours. Simple prise de nouvelles, rappelle son besoin en une phrase et propose de continuer. Aucune insistance."
      : rang === 2
        ? "C'est une DEUXIÈME relance : reste léger mais propose une étape CONCRÈTE qui facilite la reprise (un créneau d'appel, une visite, un devis rapide). Toujours zéro pression."
        : "C'est une DERNIÈRE relance : courtoise et brève. Laisse la porte grande ouverte, précise que tu ne le relanceras plus pour ne pas le déranger, et qu'il peut revenir vers toi quand il le souhaite."

  // Si le besoin initial était urgent, une relance qui montre de la disponibilité est plus juste.
  const noteUrgence = isUrgent(messageBrut)
    ? "\nLe besoin initial semblait pressé : montre-toi disponible et réactif, sans dramatiser."
    : ''

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE un email de relance à un prospect qui avait fait une demande mais n'a pas donné suite.
Ton et style à respecter : ${ton}
${contexte}${noteUrgence}

RÈGLES :
- Français, première personne (comme si c'était ${nomArtisan}).
- Très court : 3 à 5 phrases. Aucune pression, aucune culpabilisation (pas de « vous n'avez pas répondu »), aucune fausse urgence ou rareté.
- Calibre le message selon le rang de relance (voir ci-dessus) et rappelle brièvement le besoin de façon naturelle.
- Propose une prochaine étape simple, adaptée au rang.
- Jamais de prix chiffré.
- Emploie le nom du prospect s'il est fourni, sinon un « Bonjour » simple.
- Termine par une formule de politesse signée « ${nomArtisan} ».
- Renvoie UNIQUEMENT le texte de l'email : pas d'objet, pas de balises, pas de guillemets.`

  const user = `Nom du prospect : ${nomProspect}
Besoin initial : ${besoin}
Numéro de relance : ${rang}`

  const res = await client.messages.create({
    model,
    max_tokens: 700,
    temperature: 0.6,
    system,
    messages: [{ role: 'user', content: user }],
  })

  let out = ''
  for (const block of res.content) {
    if (block.type === 'text') out += block.text
  }
  return out.trim()
}

export type DevisLigne = {
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  tva_taux: number
}

type Poste = { designation: string; unite: string; prix_ht_min: number; prix_ht_max: number; tva_defaut: number }

// Aides à la décomposition par métier — orientent le CHIFFRAGE (postes, unités, TVA),
// sans imposer de prix : le modèle connaît les ordres de grandeur du marché français.
const METIER_GUIDES: { keys: string[]; guide: string }[] = [
  {
    keys: ['plomb', 'sanitaire', 'chauffagi', 'chauffage'],
    guide:
      "Plomberie/chauffage : dépose de l'existant, fourniture des équipements (mitigeur, WC, ballon, chaudière, radiateur, PAC), tuyauterie (ml), pose + raccordements eau/évacuation/gaz, main d'œuvre (h), mise en service/essais. TVA 5,5% pour la rénovation énergétique (PAC, chaudière à condensation, ballon thermodynamique) sinon 10% en rénovation.",
  },
  {
    keys: ['elec', 'electric', 'electrici', 'domotique'],
    guide:
      "Électricité : dépose, fourniture (tableau, disjoncteurs, prises, points lumineux, câble au ml), tirage/pose (au point ou ml), mise aux normes du tableau (forfait), attestation Consuel/essais. TVA 10% en rénovation, 20% dans le neuf.",
  },
  {
    keys: ['macon', 'maconn', 'gros oeuvre', 'gros œuvre', 'beton', 'terrasse'],
    guide:
      "Maçonnerie : démolition + évacuation des gravats (m³ ou forfait), fourniture matériaux (m²/m³), ouverture de mur + linteau (u), dalle/chape béton (m²), enduit (m²), main d'œuvre maçon (h/m²). TVA 10% en rénovation, 20% pour le neuf/extension.",
  },
  {
    keys: ['peint', 'peintre', 'ravalement', 'decoration'],
    guide:
      'Peinture : préparation des supports (rebouchage, ponçage, sous-couche) au m², application 2 couches au m², traitement des boiseries (ml/u), protection + nettoyage (forfait). TVA 10% en rénovation.',
  },
  {
    keys: ['menuis', 'menuiserie', 'fenetre', 'porte', 'placard', 'agencement'],
    guide:
      'Menuiserie : fourniture des ouvrages (fenêtre, porte, placard) à l\'unité, dépose de l\'ancien (u), pose + étanchéité/calfeutrement (u), habillage/finitions (ml). Menuiseries isolantes améliorant la performance thermique → TVA 5,5%, sinon 10% en rénovation.',
  },
  {
    keys: ['carrel', 'carrelage', 'faience', 'sol'],
    guide:
      'Carrelage : dépose du revêtement existant (m²), préparation/ragréage du support (m²), fourniture carrelage/faïence (m²), pose (m²), plinthes (ml), joints/finitions (forfait). TVA 10% en rénovation.',
  },
  {
    keys: ['multi', 'renovation', 'rénovation', 'batiment', 'tous corps', 'general'],
    guide:
      'Multiservices/rénovation : décompose le chantier par lot (démolition, plomberie, élec, peinture, sols…). Choisis la TVA lot par lot selon sa nature (10% rénovation, 5,5% rénovation énergétique, 20% neuf). Consigne clairement les hypothèses dans "note".',
  },
]

/** Renvoie l'aide de décomposition la plus pertinente pour le métier donné. */
function guideMetier(metier: string): string {
  const n = normalize(metier)
  const hit = METIER_GUIDES.find((g) => g.keys.some((k) => n.includes(normalize(k))))
  return hit ? `\nRepères de chiffrage pour ce métier : ${hit.guide}` : ''
}

/**
 * Extraction robuste d'un objet JSON depuis une réponse de modèle éventuellement
 * bruitée (fences markdown, texte autour, virgules traînantes). Renvoie null si irrécupérable.
 */
function extractJsonObject(raw: string): { lignes?: unknown[]; note?: unknown } | null {
  const tryParse = (t: string): { lignes?: unknown[]; note?: unknown } | null => {
    try {
      const v = JSON.parse(t)
      return v && typeof v === 'object' ? (v as { lignes?: unknown[]; note?: unknown }) : null
    } catch {
      return null
    }
  }

  // 1) Retire d'éventuelles fences markdown ```json ... ```
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  // 2) Tentative directe
  let p = tryParse(s)
  if (p) return p

  // 3) Sous-chaîne entre la première { et la dernière }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const sub = s.slice(start, end + 1)
    p = tryParse(sub)
    if (p) return p
    // 4) Nettoie les virgules traînantes ( ..., }  ou  ..., ] )
    const cleaned = sub.replace(/,\s*([}\]])/g, '$1')
    p = tryParse(cleaned)
    if (p) return p
  }

  return null
}

/**
 * Chiffre un devis à partir d'une description de chantier, adapté au métier
 * (et à la bibliothèque de prix fournie). Renvoie des lignes éditables.
 */
export async function generateDevis(
  artisan: { nom: string | null; metier: string | null },
  description: string,
  postes: Poste[] = [],
  model: string = AI_MODEL,
): Promise<{ lignes: DevisLigne[]; note: string }> {
  const metier = artisan.metier?.trim() || 'artisan du bâtiment'
  const biblio = postes.length
    ? '\nBibliothèque de postes de référence (à privilégier ; désignation | unité | fourchette prix HT | TVA%) :\n' +
      postes.map((p) => `- ${p.designation} | ${p.unite} | ${p.prix_ht_min}-${p.prix_ht_max}€ | ${p.tva_defaut}%`).join('\n')
    : ''
  const repere = guideMetier(metier)

  const system = `Tu es un métreur-chiffreur expert pour un(e) ${metier} en France. À partir de la description d'un chantier, tu produis les LIGNES d'un devis réaliste et bien décomposé.${biblio}${repere}

RÈGLES :
- Décompose le chantier en postes clairs (fourniture + pose séparées quand c'est pertinent, main d'œuvre à part si utile).
- Chaque ligne : "designation" précise, "quantite" (nombre > 0), "unite" (u, ml, m², m³, h, forfait, ens.), "prix_unitaire_ht" (€ HT réaliste pour la France), "tva_taux" (20, 10 ou 5.5).
- Quantités RÉALISTES et cohérentes entre elles (une surface de sol ≈ surface de préparation ; ne surestime pas les heures).
- TVA — applique la règle française : 10 en rénovation d'un logement achevé depuis +2 ans ; 5.5 pour la rénovation énergétique (isolation, PAC, chaudière à condensation, ballon thermodynamique, menuiseries isolantes) ; 20 pour le neuf, une extension, ou en cas de doute. En cas d'ambiguïté sur la TVA, choisis le taux le plus prudent et signale-le dans "note".
- Les prix sont des ESTIMATIONS que l'artisan ajustera : n'exagère pas, reste dans les ordres de grandeur du marché.
- Si la description est incomplète ou ambiguë, fais des HYPOTHÈSES raisonnables, chiffre quand même, et LISTE ces hypothèses + les points à confirmer avec le client dans "note".
- 3 à 10 lignes selon l'ampleur.
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte ni balise autour, au format EXACT :
{"lignes":[{"designation":"...","quantite":1,"unite":"u","prix_unitaire_ht":0,"tva_taux":10}],"note":"hypothèses retenues et points à préciser avec le client"}`

  const res = await client.messages.create({
    model,
    max_tokens: 1500,
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: `Chantier : ${description.trim()}` }],
  })

  let raw = ''
  for (const b of res.content) if (b.type === 'text') raw += b.text
  raw = raw.trim()

  const parsed = extractJsonObject(raw)
  if (!parsed) {
    // Réponse non exploitable : on remonte une erreur claire. Les routes appelantes
    // ont déjà un fallback (message convivial « réessaie/reformule ») — on ne le casse pas.
    throw new Error('Réponse IA non exploitable : aucun JSON de devis valide trouvé.')
  }

  const arr = Array.isArray(parsed.lignes) ? parsed.lignes : []
  const lignes: DevisLigne[] = arr
    .map((item) => {
      const l = (item ?? {}) as Record<string, unknown>
      const tva = Number(l.tva_taux)
      const q = Number(l.quantite)
      const pu = Number(l.prix_unitaire_ht)
      return {
        designation: String(l.designation ?? '').trim(),
        quantite: Number.isFinite(q) && q > 0 ? Math.round(q * 100) / 100 : 1,
        unite: String(l.unite ?? 'u').trim() || 'u',
        prix_unitaire_ht: Number.isFinite(pu) && pu > 0 ? Math.round(pu * 100) / 100 : 0,
        tva_taux: [5.5, 10, 20].includes(tva) ? tva : 10,
      }
    })
    .filter((l) => l.designation)

  return { lignes, note: typeof parsed.note === 'string' ? parsed.note : '' }
}

/** Modèle de relance de secours (utilisé si l'IA n'est pas disponible). */
export function relanceTemplate(nomArtisan: string | null, nomProspect: string | null, rang: number): string {
  const a = nomArtisan?.trim() || 'votre artisan'
  const p = nomProspect?.trim() ? `${nomProspect.trim()}, ` : ''
  if (rang <= 1) {
    return `Bonjour ${p}

Je reviens vers vous suite à votre demande. Souhaitez-vous qu'on avance ensemble ? Je reste à votre disposition pour convenir d'un rendez-vous ou répondre à vos questions.

Bien à vous,
${a}`
  }
  if (rang === 2) {
    return `Bonjour ${p}

Je me permets de vous relancer concernant votre projet. Si c'est toujours d'actualité, dites-moi simplement quand vous êtes disponible et je m'organise.

Bien à vous,
${a}`
  }
  return `Bonjour ${p}

Sans nouvelles de votre part, je mets votre demande de côté pour l'instant — mais n'hésitez pas à me recontacter dès que vous le souhaitez, je serai ravi de vous aider.

Bien à vous,
${a}`
}
