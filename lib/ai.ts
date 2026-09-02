import Anthropic from '@anthropic-ai/sdk'

// ⚙️ Modèle par défaut pour rédiger les réponses aux prospects.
// Haiku = rapide + très économique, parfait pour des réponses courtes en volume.
// Les routes passent un vrai modèle (haiku/sonnet/opus) via resolveModel selon le plan.
const AI_MODEL = 'claude-haiku-4-5'

// Lit automatiquement ANTHROPIC_API_KEY depuis .env.local (côté serveur uniquement).
const client = new Anthropic()

// Modèles qui supportent le "thinking adaptatif" (raisonnement profond auto-dosé) : 4.6+ et 5-series.
// Haiku 4.5 (Standard) reste sur la voie rapide, sans thinking.
function supportsThinking(model: string): boolean {
  return /claude-(opus|sonnet|fable)-(5($|-)|4-[6-9])/.test(model)
}

/**
 * Paramètres de génération : sur un modèle capable (Pro/Expert), active le thinking
 * adaptatif et élargit max_tokens pour laisser de la place au raisonnement + à la sortie.
 * Sur Standard (Haiku), garde la voie rapide et économique.
 */
function genParams(model: string, baseMaxTokens: number) {
  if (supportsThinking(model)) {
    return { model, max_tokens: baseMaxTokens + 4000, thinking: { type: 'adaptive' as const } }
  }
  return { model, max_tokens: baseMaxTokens }
}

type Artisan = { nom: string | null; metier: string | null; ton_style: string | null }
type Lead = { nom_prospect?: string | null; contact?: string | null; message?: string | null }

// ── Petits utilitaires d'analyse du message (déterministes, robustes) ──────────
// Toute l'intelligence "de cadrage" est calculée ici, en dur : elle reste fiable
// même sur le modèle le plus léger (Standard/Haiku) et évite que le LLM parte à côté.

/** Minuscule sans accents ni ponctuation, espaces normalisés — pour la détection de mots-clés. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques combinants)
    .replace(/[^a-z0-9]+/g, ' ') // ponctuation/apostrophes → espaces
    .trim()
}

/** true si l'un des mots-clés (déjà "sans accents") apparaît dans le texte normalisé `n`. */
function has(n: string, keys: string[]): boolean {
  return keys.some((k) => n.includes(normalize(k)))
}

// Signaux forts d'une situation d'urgence (sinistre / panne) dans le bâtiment.
const URGENCE_KEYWORDS = [
  'fuite', 'degat des eaux', 'degats des eaux', 'inond', 'panne', 'plus de chauffage',
  'plus d eau chaude', 'plus d eau', 'coupure', 'court circuit', 'odeur de gaz', 'sent le gaz',
  'fuite de gaz', 'urgent', 'urgence', 'au plus vite', 'des que possible', 'tout de suite',
  'immediat', 'sinistre', 'refoul', 'deborde', 'engorge', 'effondr', 'danger', 'ne fonctionne plus',
  'ne marche plus', 'tombe en panne', 'en rade', 'ce soir', 'aujourd hui', 'des maintenant',
]

// Insatisfaction / SAV sur un travail déjà réalisé (à traiter avec doigté, sans reconnaître de faute).
const RECLAMATION_KEYWORDS = [
  'malfacon', 'mal facon', 'pas satisfait', 'insatisfait', 'decu', 'deception', 'decevant',
  'mecontent', 'reclamation', 'plainte', 'sav', 'reprise', 'bacle', 'mal fait', 'mal realise',
  'travail mal', 'garantie decennale', 'depuis les travaux', 'depuis votre passage',
  'apres les travaux', 'apres votre passage', 'rembours', 'litige', 'geste commercial',
  'toujours pas repare', 'toujours pas fini', 'jamais revenu',
]

// Le prospect veut concrètement une date / un contact (RDV, appel, visite).
const RDV_KEYWORDS = [
  'rendez vous', 'rdv', 'creneau', 'disponib', 'quand pouvez', 'quand etes', 'quand seriez',
  'venir voir', 'passer voir', 'vous deplacer', 'deplacer chez', 'planifier', 'convenir d un',
  'prendre date', 'cette semaine', 'la semaine prochaine', 'me rappeler', 'rappelez moi',
  'quand pourriez', 'quand viendriez',
]

// Le prospect s'interroge sur le prix / demande un devis.
const PRIX_KEYWORDS = [
  'prix', 'tarif', 'combien', 'cout', 'coute', 'couterait', 'devis', 'estimation',
  'chiffrage', 'chiffrer', 'a peu pres', 'ordre de prix', 'fourchette', 'ca fait combien',
  'ca coute', 'ca reviendrait',
]

// Le prospect met en concurrence (compare plusieurs devis).
const COMPARAISON_KEYWORDS = [
  'moins cher', 'plus competitif', 'concurrent', 'autre devis', 'autres devis', 'plusieurs devis',
  'comparer', 'comparaison', 'meilleur prix', 'faire jouer', 'd autres artisans', 'autres artisans',
]

// Budget explicitement contraint.
const BUDGET_SERRE_KEYWORDS = [
  'petit budget', 'budget serre', 'budget limite', 'budget reduit', 'pas trop cher',
  'pas les moyens', 'economique', 'le moins cher', 'au plus juste', 'pas cher',
]

// Contexte assurance / sinistre (devis pour un dossier, expert, indemnisation).
const ASSURANCE_KEYWORDS = [
  'assurance', 'sinistre', 'expertise', 'expert', 'declaration de sinistre', 'indemnis',
  'franchise', 'catastrophe naturelle', 'assureur', 'dossier assurance',
]

// Contexte copropriété (syndic, AG, parties communes).
const COPRO_KEYWORDS = [
  'copropriete', 'copro', 'syndic', 'parties communes', 'immeuble', 'assemblee generale',
  'ag de copropriete', 'cage d escalier',
]

// Signaux d'un chantier d'ampleur (mérite une visite technique avant chiffrage).
const COMPLEXE_KEYWORDS = [
  'renovation complete', 'renovation totale', 'tout refaire', 'toute la maison',
  'tout l appartement', 'plusieurs pieces', 'plusieurs travaux', 'cle en main', 'de a a z',
  'gros chantier', 'extension', 'plusieurs corps de metier', 'combles amenag',
]

/** Détecte une demande potentiellement urgente à partir du message du prospect. */
function isUrgent(message: string): boolean {
  const n = normalize(message)
  if (!n) return false
  return has(n, URGENCE_KEYWORDS)
}

/** Détecte une demande trop floue pour être chiffrée/traitée sans précisions. */
function isVague(message: string, hasMessage: boolean): boolean {
  if (!hasMessage) return true
  const words = normalize(message).split(' ').filter(Boolean)
  return words.length <= 3
}

type Canal = 'email' | 'telephone' | 'inconnu'

/** Déduit le canal de contact laissé par le prospect (email vs téléphone). */
function detectCanal(contact?: string | null): Canal {
  const c = (contact ?? '').trim()
  if (!c) return 'inconnu'
  if (c.includes('@')) return 'email'
  const digits = c.replace(/[^0-9]/g, '')
  if (digits.length >= 9) return 'telephone'
  return 'inconnu'
}

type LeadInsights = {
  canal: Canal
  urgent: boolean
  vague: boolean
  reclamation: boolean
  rdv: boolean
  prix: boolean
  comparaison: boolean
  budgetSerre: boolean
  assurance: boolean
  copropriete: boolean
  complexe: boolean
  detail: 'faible' | 'moyen' | 'eleve'
  primary: 'urgence' | 'reclamation' | 'rdv' | 'prix' | 'info'
}

/**
 * Analyse déterministe complète d'une demande : intention principale, contexte
 * (assurance, copro, budget), canal et niveau de détail. Sert à piloter finement
 * le prompt sans dépendre de la finesse du modèle.
 */
function analyzeLead(message: string, contact?: string | null): LeadInsights {
  const hasMessage = Boolean(message && message.trim())
  const n = normalize(message)
  const wordCount = n ? n.split(' ').filter(Boolean).length : 0

  const urgent = isUrgent(message)
  const vague = !urgent && isVague(message, hasMessage)
  const reclamation = has(n, RECLAMATION_KEYWORDS)
  const rdv = has(n, RDV_KEYWORDS)
  const prix = has(n, PRIX_KEYWORDS)
  const comparaison = has(n, COMPARAISON_KEYWORDS)
  const budgetSerre = has(n, BUDGET_SERRE_KEYWORDS)
  const assurance = has(n, ASSURANCE_KEYWORDS)
  const copropriete = has(n, COPRO_KEYWORDS)
  const complexe = has(n, COMPLEXE_KEYWORDS) || wordCount > 45

  const detail: LeadInsights['detail'] = wordCount <= 3 ? 'faible' : wordCount <= 25 ? 'moyen' : 'eleve'

  // Priorité d'intention : la sécurité et la relation client priment sur le commercial.
  const primary: LeadInsights['primary'] = urgent
    ? 'urgence'
    : reclamation
      ? 'reclamation'
      : rdv
        ? 'rdv'
        : prix || comparaison
          ? 'prix'
          : 'info'

  return {
    canal: detectCanal(contact),
    urgent, vague, reclamation, rdv, prix, comparaison, budgetSerre,
    assurance, copropriete, complexe, detail, primary,
  }
}

// Type de chantier déduit des mots-clés de la demande (déterministe). Ordre = priorité de tranche.
const TYPE_CHANTIER: { label: string; keys: string[] }[] = [
  { label: 'Plomberie', keys: ['fuite', 'robinet', 'chauffe eau', 'wc', 'toilette', 'evier', 'lavabo', 'canalisation', 'tuyau', 'douche', 'baignoire', 'degat des eaux', 'siphon', 'chasse d eau', 'debouch'] },
  { label: 'Chauffage', keys: ['chaudiere', 'radiateur', 'pompe a chaleur', 'thermostat', 'plancher chauffant', 'chauffage', 'ballon d eau', 'climatisation', 'clim', 'frigo'] },
  { label: 'Électricité', keys: ['electric', 'prise', 'tableau electrique', 'disjoncteur', 'court circuit', 'compteur', 'luminaire', 'interrupteur', 'panne de courant', 'mise aux normes'] },
  { label: 'Toiture', keys: ['toit', 'toiture', 'tuile', 'ardoise', 'gouttiere', 'charpente', 'zinguerie', 'faitage'] },
  { label: 'Menuiserie', keys: ['fenetre', 'porte', 'volet', 'parquet', 'escalier', 'dressing', 'placard', 'veranda', 'menuiserie', 'portail', 'store'] },
  { label: 'Peinture', keys: ['peinture', 'peindre', 'enduit', 'papier peint', 'ravalement', 'lasure'] },
  { label: 'Maçonnerie', keys: ['macon', 'dalle', 'terrasse', 'fondation', 'parpaing', 'extension', 'chape', 'beton', 'ouverture de mur'] },
  { label: 'Carrelage', keys: ['carrelage', 'carreau', 'faience', 'pose de sol'] },
  { label: 'Salle de bain', keys: ['salle de bain', 'salle d eau'] },
  { label: 'Cuisine', keys: ['cuisine', 'plan de travail', 'credence'] },
  { label: 'Isolation', keys: ['isolation', 'isoler', 'combles', 'laine de verre'] },
  { label: 'Serrurerie', keys: ['serrure', 'serrurier', 'porte blindee', 'cylindre', 'verrou'] },
]

// Métier → libellé de repli quand aucun mot-clé de la demande ne tranche.
function metierToType(metier?: string | null): string | null {
  if (!metier) return null
  const m = normalize(metier)
  const map: [string, string][] = [
    ['plomb', 'Plomberie'], ['chauffag', 'Chauffage'], ['frigoriste', 'Chauffage'], ['climatis', 'Chauffage'],
    ['electric', 'Électricité'], ['couvreur', 'Toiture'], ['toitur', 'Toiture'], ['charpent', 'Toiture'],
    ['menuis', 'Menuiserie'], ['ebenist', 'Menuiserie'], ['peintr', 'Peinture'], ['macon', 'Maçonnerie'],
    ['carrel', 'Carrelage'], ['serrur', 'Serrurerie'],
  ]
  for (const [k, v] of map) if (m.includes(k)) return v
  return null
}

/** Qualification DÉTERMINISTE d'un lead (0 coût IA) : niveau d'urgence + type de chantier. */
export function qualifyLead(message?: string | null, metier?: string | null): { urgence: 'urgent' | 'normal'; type_chantier: string | null } {
  const msg = (message || '').trim()
  const urgence: 'urgent' | 'normal' = msg && isUrgent(msg) ? 'urgent' : 'normal'
  const n = normalize(msg)
  let type: string | null = null
  if (n) { const hit = TYPE_CHANTIER.find((t) => has(n, t.keys)); type = hit ? hit.label : null }
  if (!type) type = metierToType(metier)
  return { urgence, type_chantier: type }
}

/** Construit le bloc d'instructions dynamiques injecté dans le prompt système. */
function buildLeadGuidance(a: LeadInsights, metier: string): string {
  const lines: string[] = []

  const primaryMap: Record<LeadInsights['primary'], string> = {
    urgence:
      "INTENTION = URGENCE (sinistre/panne). Réponse TRÈS courte (2-3 phrases) : rassure d'abord, montre que tu prends au sérieux, puis UNE action immédiate (rappel très rapide, intervention au plus vite, ou geste de sécurité simple si pertinent : couper l'eau, l'électricité ou le gaz).",
    reclamation:
      "INTENTION = RÉCLAMATION / insatisfaction. Accueille la remarque avec sérieux, sans te braquer et sans reconnaître de faute juridique à l'aveugle. Propose de venir constater rapidement et de trouver une solution. Ton posé et responsable.",
    rdv:
      "INTENTION = PRISE DE RENDEZ-VOUS. Le prospect veut te voir ou te parler : propose concrètement de convenir d'un créneau (visite ou appel) et demande-lui ses disponibilités. Droit au but.",
    prix:
      "INTENTION = QUESTION DE PRIX / BUDGET. NE DONNE AUCUN CHIFFRE ni fourchette. Explique brièvement qu'un chiffrage juste demande un ou deux détails (ou une courte visite), valorise le sérieux d'un devis précis et gratuit, et propose de l'établir vite.",
    info:
      "INTENTION = DEMANDE D'INFORMATION. Réponds utilement et clairement à ce qui est demandé, puis propose la prochaine étape (devis, visite ou appel).",
  }
  lines.push(primaryMap[a.primary])

  if (a.vague && a.primary !== 'urgence') {
    lines.push(
      `Demande FLOUE : pose 1 à 2 questions PRÉCISES et utiles pour un(e) ${metier} — uniquement ce qui manque vraiment pour avancer (surface, nombre de pièces, type/état du matériel, photos). Une seule salve, courte.`,
    )
  }
  if (a.comparaison) {
    lines.push(
      "Le prospect COMPARE plusieurs devis : différencie-toi par le sérieux, le conseil et la clarté — sans dénigrer personne et sans casser les prix.",
    )
  }
  if (a.budgetSerre) {
    lines.push(
      "BUDGET SERRÉ évoqué : rassure sur ta capacité à t'adapter (proposer des options, prioriser l'essentiel), sans t'engager sur un montant.",
    )
  }
  if (a.assurance) {
    lines.push(
      "Contexte ASSURANCE / SINISTRE : précise que tu peux établir un devis détaillé adapté au dossier d'assurance et intervenir en lien avec l'expert si besoin.",
    )
  }
  if (a.copropriete) {
    lines.push(
      "Contexte COPROPRIÉTÉ : mentionne que tu peux fournir un devis détaillé exploitable pour le syndic ou l'assemblée générale.",
    )
  }
  if (a.complexe && a.primary !== 'urgence') {
    lines.push(
      "Chantier POTENTIELLEMENT IMPORTANT : propose une visite technique pour bien cadrer les postes avant tout chiffrage.",
    )
  }

  // Canal → prochaine étape concrète, formulée pour le bon média.
  if (a.canal === 'telephone') {
    lines.push("Le prospect a laissé un TÉLÉPHONE : propose un rappel et invite-le à indiquer un créneau qui lui convient.")
  } else if (a.canal === 'email') {
    lines.push("Le prospect a laissé un EMAIL : propose de convenir par retour de mail d'un échange ou d'une visite.")
  }

  return '\n\nANALYSE DE LA DEMANDE (déduite automatiquement — adapte-toi précisément) :\n- ' + lines.join('\n- ')
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
  const contact = lead.contact?.trim() || null
  const besoin = messageBrut || '(aucune précision donnée)'

  // Pré-analyse déterministe : intention, contexte, canal, niveau de détail.
  const insights = analyzeLead(messageBrut, contact)
  const guidance = buildLeadGuidance(insights, metier)

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE la toute première réponse à un prospect qui vient de le contacter (demande via son site).
Ton et style à respecter absolument : ${ton}

OBJECTIF : une réponse humaine, utile et rassurante qui fait avancer le prospect d'UNE étape concrète — jamais un texte générique ni du remplissage. Tu t'adaptes précisément à l'intention réelle du prospect et au niveau de détail qu'il a donné.

CADRE GÉNÉRAL D'ADAPTATION :
- Demande URGENTE (fuite, dégât des eaux, panne, plus de chauffage/d'eau, coupure, odeur de gaz, sinistre…) → RASSURER d'abord, puis UNE action immédiate. Sérieux et réactif.
- Demande FLOUE ou incomplète → 1 à 2 questions PRÉCISES et pertinentes pour un(e) ${metier}. Une seule salve, courte.
- Demande CLAIRE → confirme en une phrase que tu as bien compris, puis propose la prochaine étape.
- Question de PRIX / BUDGET → jamais de chiffre ; propose un devis précis et gratuit après un ou deux détails ou une courte visite.
- RÉCLAMATION → prends au sérieux, sans reconnaître de faute à l'aveugle ; propose de constater et de corriger.
- Demande HORS de ton métier (${metier}) → dis-le honnêtement, sans t'engager sur un travail que tu ne fais pas, et invite à préciser si une partie relève quand même de ton activité.

RÈGLES (garde-fous) :
- Français impeccable, à la première personne (comme si ${nomArtisan} écrivait lui-même).
- Longueur adaptée : 3 à 6 phrases en général, 2 à 3 si c'est urgent. Zéro blabla, aucune formule creuse.
- Ne donne JAMAIS de prix chiffré ni de fourchette (tu n'as pas les détails).
- N'invente AUCUN délai précis intenable : reste sur « rapidement », « au plus vite », « dans la journée » (si urgent).
- Termine TOUJOURS par une prochaine étape ultra-concrète (rappel, visite, devis, créneau).
- Emploie le nom du prospect s'il est fourni, sinon un « Bonjour » simple.
- Termine par une formule de politesse signée « ${nomArtisan} ».
- Renvoie UNIQUEMENT le texte du message : pas d'objet, pas de « Voici la réponse », pas de guillemets, pas de balises.${guidance}`

  const user = `Nom du prospect : ${nomProspect}
Canal de contact : ${insights.canal === 'email' ? 'email' : insights.canal === 'telephone' ? 'téléphone' : 'non précisé'}
Besoin décrit par le prospect : ${besoin}`

  const res = await client.messages.create({
    ...genParams(model, 1024),
    system,
    messages: [{ role: 'user', content: user }],
  })

  let out = ''
  for (const block of res.content) {
    if (block.type === 'text') out += block.text
  }
  return out.trim()
}

export type ConvTurn = { sens: 'in' | 'out'; contenu: string }

/**
 * Rédige la réponse SUIVANTE dans une conversation en cours entre un prospect et
 * l'artisan (le prospect a répondu / relancé sur la plateforme). Contrairement à
 * generateLeadReply (premier contact), on tient compte de TOUT l'historique pour
 * une réponse naturelle, humaine et contextuelle — jamais un copier-coller du 1er
 * message. Renvoie uniquement le corps du message.
 */
export async function generateConversationReply(
  artisan: Artisan,
  lead: Lead,
  history: ConvTurn[],
  model: string = AI_MODEL,
  // Si fourni, la réponse est DIFFUSÉE au fil de l'eau (streaming SSE, v4 §A2) :
  // le prospect voit le texte s'écrire au lieu d'un spinner opaque.
  onDelta?: (texte: string) => void,
): Promise<string> {
  const nomArtisan = artisan.nom?.trim() || "l'artisan"
  const metier = artisan.metier?.trim() || 'artisan'
  const ton = artisan.ton_style?.trim() || 'professionnel, chaleureux et rassurant'
  const nomProspect = lead.nom_prospect?.trim() || null
  const besoinInitial = lead.message?.trim() || '(aucune précision au départ)'

  // Dernier message entrant du prospect → pilote l'analyse d'intention (déterministe).
  const dernierIn = [...history].reverse().find((t) => t.sens === 'in')?.contenu?.trim() || ''
  const insights = analyzeLead(dernierIn, lead.contact ?? null)
  const guidance = buildLeadGuidance(insights, metier)

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE, dans une CONVERSATION DÉJÀ ENGAGÉE avec un prospect sur sa page de contact. Le prospect vient de t'écrire à nouveau ; tu réponds à son dernier message.
Ton et style à respecter absolument : ${ton}
Contexte — besoin décrit au départ : ${besoinInitial}${nomProspect ? `\nPrénom/nom du prospect : ${nomProspect}` : ''}

OBJECTIF : une réponse HUMAINE et naturelle, comme un vrai artisan qui discute avec son client — chaleureuse, concrète, qui fait avancer l'échange d'UNE étape. Tu réagis vraiment à ce qu'il vient de dire, tu ne récites pas.

RÈGLES (garde-fous) :
- Français impeccable, première personne, comme si ${nomArtisan} écrivait lui-même.
- COURT et vivant : 2 à 5 phrases. On est dans une conversation, pas dans une lettre — pas de « Bonjour » ni de signature à CHAQUE message (tu t'es déjà présenté). Va droit au but, avec chaleur.
- Rebondis sur le dernier message du prospect : réponds à sa question, prends en compte les précisions qu'il donne, remercie brièvement s'il t'a apporté un détail utile.
- Ne donne JAMAIS de prix chiffré ni de fourchette. Si le prospect insiste sur le prix, explique avec tact qu'un devis précis et gratuit sera établi (après un ou deux détails ou une courte visite) et propose de l'enclencher.
- N'invente aucun délai précis intenable (reste sur « rapidement », « au plus vite », « dans la journée » si urgent).
- Propose une prochaine étape concrète quand c'est pertinent (préciser un point, convenir d'un créneau, établir le devis), sans harceler.
- Si le prospect a donné assez d'éléments pour chiffrer, tu peux proposer de lui préparer un devis.
- Renvoie UNIQUEMENT le texte du message : pas d'objet, pas de « Voici la réponse », pas de guillemets, pas de balises.${guidance}`

  // Historique → messages Anthropic (in=user, out=assistant), en fusionnant les
  // messages consécutifs de même rôle pour garantir l'alternance stricte exigée par l'API.
  const msgs: { role: 'user' | 'assistant'; content: string }[] = []
  for (const t of history) {
    const role: 'user' | 'assistant' = t.sens === 'in' ? 'user' : 'assistant'
    const contenu = (t.contenu ?? '').trim()
    if (!contenu) continue
    const last = msgs[msgs.length - 1]
    if (last && last.role === role) last.content += '\n\n' + contenu
    else msgs.push({ role, content: contenu })
  }
  // L'API exige de commencer par un message 'user'. Si l'historique commençait par
  // une réponse auto (rare), on préfixe le besoin initial du prospect.
  if (!msgs.length || msgs[0].role !== 'user') {
    msgs.unshift({ role: 'user', content: besoinInitial })
  }
  // On répond à un message entrant : la conversation doit se terminer côté 'user'.
  if (msgs[msgs.length - 1].role !== 'user') {
    msgs.push({ role: 'user', content: dernierIn || '(le prospect attend votre retour)' })
  }

  // Streaming : on émet chaque fragment de texte dès qu'il arrive (les blocs de
  // raisonnement ne sont jamais transmis au prospect).
  if (onDelta) {
    const stream = client.messages.stream({ ...genParams(model, 900), system, messages: msgs })
    let acc = ''
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        acc += ev.delta.text
        onDelta(ev.delta.text)
      }
    }
    return acc.trim()
  }

  const res = await client.messages.create({
    ...genParams(model, 900),
    system,
    messages: msgs,
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

  // Analyse du besoin initial pour caler la relance sur ce qui comptait pour le prospect.
  const insights = analyzeLead(messageBrut, lead.contact ?? null)
  const hints: string[] = []
  if (insights.primary === 'prix' || insights.comparaison) {
    hints.push("Son besoin tournait autour du prix/devis : propose simplement de lui établir ou finaliser un devis précis (sans donner de chiffre).")
  }
  if (insights.primary === 'rdv') {
    hints.push("Il souhaitait un rendez-vous : re-propose un créneau simple (appel ou visite).")
  }
  if (insights.assurance) {
    hints.push("Contexte assurance/sinistre : rappelle que tu peux fournir un devis détaillé adapté à son dossier.")
  }
  if (insights.copropriete) {
    hints.push("Contexte copropriété : rappelle que ton devis est exploitable pour le syndic ou l'assemblée générale.")
  }
  if (insights.urgent) {
    hints.push("Le besoin initial semblait pressé : montre-toi disponible et réactif, sans dramatiser ni faire de fausse urgence.")
  }
  const notes = hints.length ? '\n' + hints.map((h) => `- ${h}`).join('\n') : ''

  const system = `Tu es l'assistant de ${nomArtisan}, ${metier}. Tu écris À SA PLACE un email de relance à un prospect qui avait fait une demande mais n'a pas donné suite.
Ton et style à respecter : ${ton}
${contexte}${notes ? '\nÀ prendre en compte :' + notes : ''}

RÈGLES :
- Français impeccable, première personne (comme si c'était ${nomArtisan}).
- Très court : 3 à 5 phrases. AUCUNE pression, aucune culpabilisation (jamais de « vous n'avez pas répondu »), aucune fausse urgence ou rareté.
- Calibre le message selon le rang de relance (voir ci-dessus) et rappelle brièvement le besoin de façon naturelle, en t'appuyant dessus.
- Propose une prochaine étape simple et concrète, adaptée au rang.
- Jamais de prix chiffré, jamais de délai inventé.
- Emploie le nom du prospect s'il est fourni, sinon un « Bonjour » simple.
- Termine par une formule de politesse signée « ${nomArtisan} ».
- Renvoie UNIQUEMENT le texte de l'email : pas d'objet, pas de balises, pas de guillemets.`

  const user = `Nom du prospect : ${nomProspect}
Besoin initial : ${besoin}
Numéro de relance : ${rang}`

  const res = await client.messages.create({
    ...genParams(model, 700),
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

// Aides à la décomposition par métier — orientent le CHIFFRAGE (postes, unités, TVA)
// avec des ordres de grandeur France crédibles (HT, à ajuster). Ce ne sont PAS des prix fermes :
// le modèle affine selon le chantier réel.
const METIER_GUIDES: { keys: string[]; guide: string }[] = [
  {
    keys: ['plomb', 'sanitaire', 'chauffagi', 'chauffage'],
    guide:
      "Plomberie/chauffage : dépose de l'existant, fourniture (mitigeur, WC, ballon, chaudière, radiateur, PAC), tuyauterie (ml), pose + raccordements eau/évacuation/gaz, main d'œuvre (h), mise en service/essais. Ordres de grandeur HT France : MO 45-70€/h ; mitigeur fourni-posé 120-300€ ; WC suspendu fourni-posé 400-900€ ; ballon ECS 300-900€ + pose ; chaudière gaz à condensation 2500-5000€ fourni-posé ; PAC air/eau 9000-15000€ fourni-posé ; radiateur 150-600€ + pose ; tuyauterie 30-60€/ml. TVA 5,5% pour la rénovation énergétique (PAC, chaudière à condensation, ballon thermodynamique), sinon 10% en rénovation.",
  },
  {
    keys: ['elec', 'electric', 'electrici', 'domotique'],
    guide:
      "Électricité : dépose, fourniture (tableau, disjoncteurs, prises, points lumineux, câble au ml), tirage/pose (au point ou ml), mise aux normes du tableau (forfait), attestation Consuel/essais. Ordres de grandeur HT France : MO 40-60€/h ; point (prise/interrupteur/lumineux) 80-150€ posé ; tableau électrique 1000-2500€ ; rénovation complète 90-150€/m² ; Consuel ~150€. TVA 10% en rénovation, 20% dans le neuf.",
  },
  {
    keys: ['macon', 'maconn', 'gros oeuvre', 'gros œuvre', 'beton', 'terrasse', 'dalle', 'fondation'],
    guide:
      "Maçonnerie : démolition + évacuation des gravats (m³ ou forfait), fourniture matériaux (m²/m³), ouverture de mur porteur + linteau/IPN (u), dalle/chape béton (m²), enduit (m²), main d'œuvre maçon (h/m²). Ordres de grandeur HT France : MO 45-70€/h ; ouverture mur porteur + IPN 1500-4000€/u ; dalle béton 60-120€/m² ; enduit façade 30-60€/m². TVA 10% en rénovation, 20% pour le neuf/extension.",
  },
  {
    keys: ['peint', 'peintre', 'ravalement', 'decoration', 'enduit'],
    guide:
      'Peinture : préparation des supports (rebouchage, ponçage, sous-couche) au m², application 2 couches au m², traitement des boiseries (ml/u), protection + nettoyage (forfait). Ordres de grandeur HT France : peinture murs/plafonds avec prépa 25-45€/m² ; sous-couche 5-10€/m² ; boiseries 20-40€/ml ou /u. TVA 10% en rénovation.',
  },
  {
    keys: ['menuis', 'menuiserie', 'fenetre', 'porte', 'placard', 'agencement', 'volet', 'veranda'],
    guide:
      "Menuiserie : fourniture des ouvrages (fenêtre, porte, placard) à l'unité, dépose de l'ancien (u), pose + étanchéité/calfeutrement (u), habillage/finitions (ml). Ordres de grandeur HT France : fenêtre PVC double vitrage fournie-posée 400-900€/u ; fenêtre alu 700-1500€/u ; porte d'entrée 900-2500€/u ; placard sur mesure 300-800€/ml ; dépose 50-120€/u. Menuiseries isolantes améliorant la performance thermique → TVA 5,5%, sinon 10% en rénovation.",
  },
  {
    keys: ['carrel', 'carrelage', 'faience', 'sol', 'parquet', 'revetement'],
    guide:
      'Carrelage/sols : dépose du revêtement existant (m²), préparation/ragréage du support (m²), fourniture carrelage/faïence (m²), pose (m²), plinthes (ml), joints/finitions (forfait). Ordres de grandeur HT France : pose carrelage sol 40-70€/m² (pose seule) + fourniture 20-60€/m² ; faïence murale 45-80€/m² posée ; ragréage 15-30€/m² ; dépose 10-25€/m² ; plinthes 8-15€/ml. TVA 10% en rénovation.',
  },
  {
    keys: ['couvr', 'couverture', 'toiture', 'toit', 'zinguerie', 'charpente', 'tuile', 'ardoise'],
    guide:
      "Couverture/toiture : dépose de la couverture existante (m²), fourniture (tuiles/ardoises, liteaux, écran sous-toiture, zinguerie), pose (m²), gouttières/descentes (ml), faîtage, échafaudage (forfait). Ordres de grandeur HT France : MO couvreur 45-70€/h ; réfection toiture tuiles 100-250€/m² ; zinguerie/gouttières 40-90€/ml ; démoussage/traitement 15-40€/m² ; Velux fourni-posé 800-2000€/u ; isolation combles 20-60€/m² (TVA 5,5%). TVA 10% en rénovation, 5,5% pour l'isolation, 20% dans le neuf.",
  },
  {
    keys: ['multi', 'renovation', 'rénovation', 'batiment', 'tous corps', 'general', 'tce'],
    guide:
      'Multiservices/rénovation : décompose le chantier par LOT (démolition, plomberie, élec, peinture, sols, menuiserie…). Chiffre chaque lot avec ses propres unités et ordres de grandeur, et choisis la TVA lot par lot selon sa nature (10% rénovation, 5,5% rénovation énergétique, 20% neuf). Consigne clairement les hypothèses de découpage dans "note".',
  },
]

/** Renvoie l'aide de décomposition la plus pertinente pour le métier donné. */
function guideMetier(metier: string): string {
  const n = normalize(metier)
  const hit = METIER_GUIDES.find((g) => g.keys.some((k) => n.includes(normalize(k))))
  return hit ? `\nRepères de chiffrage pour ce métier : ${hit.guide}` : ''
}

/** Indice de contexte TVA déduit de la description (soft hint, l'IA décide ligne par ligne). */
function tvaContexte(description: string): string {
  const n = normalize(description)
  const neuf = has(n, [
    'neuf', 'construction neuve', 'maison neuve', 'extension', 'agrandissement', 'surelevation',
    'batiment neuf', 'local neuf', 'construire',
  ])
  const energetique = has(n, [
    'isolation', 'isoler', 'pompe a chaleur', 'pac', 'chaudiere a condensation', 'chaudiere condensation',
    'ballon thermodynamique', 'double vitrage', 'triple vitrage', 'menuiserie isolante', 'renovation energetique',
    'vmc double flux', 'calorifug', 'poele a granule', 'poele a bois',
  ])
  const base =
    'Rappel TVA France (choisis le taux LIGNE PAR LIGNE ; en cas de doute prends le taux le plus prudent et signale-le dans "note") : 10% en rénovation d\'un logement achevé depuis +2 ans ; 5,5% en rénovation énergétique ; 20% dans le neuf/extension ou si le doute persiste.'
  const flags: string[] = []
  if (neuf) flags.push("la description évoque du NEUF/extension → 20% possible sur ces postes")
  if (energetique) flags.push("elle évoque de la RÉNOVATION ÉNERGÉTIQUE → 5,5% possible sur ces postes")
  const detect = flags.length ? ` Indices détectés : ${flags.join(' ; ')}.` : ''
  return `\n${base}${detect}`
}

/** Normalise l'unité renvoyée par le modèle vers un jeu cohérent (m², m³, ml, u, h, forfait…). */
function normalizeUnite(u: string): string {
  const raw = (u ?? '').trim()
  const t = normalize(raw)
  const map: Record<string, string> = {
    'm2': 'm²', 'metre carre': 'm²', 'metres carres': 'm²', 'm carre': 'm²',
    'm3': 'm³', 'metre cube': 'm³', 'metres cubes': 'm³',
    'ml': 'ml', 'metre lineaire': 'ml', 'metres lineaires': 'ml', 'metre': 'ml', 'metres': 'ml', 'm': 'ml',
    'u': 'u', 'unite': 'u', 'unites': 'u', 'piece': 'u', 'pieces': 'u', 'pce': 'u', 'p': 'u',
    'h': 'h', 'heure': 'h', 'heures': 'h', 'hr': 'h',
    'j': 'j', 'jour': 'j', 'jours': 'j',
    'forfait': 'forfait', 'ft': 'forfait', 'fft': 'forfait', 'ff': 'forfait',
    'ens': 'ens.', 'ens.': 'ens.', 'ensemble': 'ens.', 'lot': 'ens.',
  }
  return map[t] ?? (raw || 'u')
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
  const s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

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

  // 5) Dernier recours : récupérer un tableau de lignes seul, même sans l'objet englobant.
  const as = s.indexOf('[')
  const ae = s.lastIndexOf(']')
  if (as >= 0 && ae > as) {
    const sub = s.slice(as, ae + 1).replace(/,\s*([}\]])/g, '$1')
    try {
      const v = JSON.parse(sub)
      if (Array.isArray(v)) return { lignes: v }
    } catch {
      /* irrécupérable */
    }
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
    ? '\nBibliothèque de postes de référence de CET artisan (à privilégier quand un poste correspond ; désignation | unité | fourchette prix HT | TVA%) :\n' +
      postes.map((p) => `- ${p.designation} | ${p.unite} | ${p.prix_ht_min}-${p.prix_ht_max}€ | ${p.tva_defaut}%`).join('\n')
    : ''
  const repere = guideMetier(metier)
  const tvaHint = tvaContexte(description)

  const system = `Tu es un métreur-chiffreur expert pour un(e) ${metier} en France. À partir de la description d'un chantier, tu produis les LIGNES d'un devis réaliste, bien décomposé et cohérent.${biblio}${repere}${tvaHint}

RÈGLES :
- Décompose le chantier en postes clairs. Sépare FOURNITURE et POSE quand c'est pertinent, isole la main d'œuvre si utile, ajoute la dépose/évacuation et la mise en service quand le chantier l'exige.
- Chaque ligne : "designation" précise et parlante, "quantite" (nombre > 0), "unite" (u, ml, m², m³, h, j, forfait, ens.), "prix_unitaire_ht" (€ HT réaliste pour la France), "tva_taux" (20, 10 ou 5.5).
- COHÉRENCE des quantités et unités : une surface de pose ≈ la surface de préparation ; le linéaire de plinthes suit le périmètre ; les heures de main d'œuvre restent proportionnées au chantier. N'invente pas de quantités absurdes.
- Respecte les ordres de grandeur du marché français fournis ci-dessus : ce sont des ESTIMATIONS que l'artisan ajustera, n'exagère jamais ni en plus ni en moins.
- TVA — applique la règle française LIGNE PAR LIGNE : 10 en rénovation d'un logement achevé depuis +2 ans ; 5.5 pour la rénovation énergétique (isolation, PAC, chaudière à condensation, ballon thermodynamique, menuiseries isolantes, VMC double flux) ; 20 pour le neuf, une extension, ou en cas de doute. En cas d'ambiguïté, choisis le taux le plus prudent et signale-le dans "note".
- Si la description est incomplète ou ambiguë, fais des HYPOTHÈSES raisonnables, chiffre quand même, et LISTE clairement dans "note" : (1) les hypothèses retenues (surfaces/quantités supposées, type de matériel, TVA choisie) et (2) les points à confirmer avec le client avant devis ferme.
- N'invente aucune certitude : la "note" doit rappeler que ce sont des estimations HT à valider (idéalement après visite).
- 3 à 12 lignes selon l'ampleur.
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte ni balise autour, au format EXACT :
{"lignes":[{"designation":"...","quantite":1,"unite":"u","prix_unitaire_ht":0,"tva_taux":10}],"note":"hypothèses retenues et points à préciser avec le client"}`

  const res = await client.messages.create({
    ...genParams(model, 2200),
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
        unite: normalizeUnite(String(l.unite ?? 'u')),
        prix_unitaire_ht: Number.isFinite(pu) && pu > 0 ? Math.round(pu * 100) / 100 : 0,
        tva_taux: [0, 5.5, 10, 20].includes(tva) ? tva : 10, // 0 autorisé (franchise de TVA)
      }
    })
    .filter((l) => l.designation)

  // Filet de sécurité : une "note" toujours utile, même si le modèle l'a oubliée.
  const note =
    typeof parsed.note === 'string' && parsed.note.trim()
      ? parsed.note.trim()
      : "Estimations HT indicatives, à confirmer après visite : les quantités, prix et taux de TVA sont à ajuster selon l'état réel du support, les finitions choisies et l'ancienneté du logement."

  return { lignes, note }
}

export type SiteContenu = {
  hero_accroche: string; hero_lede: string; apropos: string
  prestations_intro: string; realisations_intro: string
  cta_titre: string; cta_texte: string; meta_description: string
  manifeste: string        // grande phrase plein-cadre (section manifeste cinématique)
  mots_cles: string[]      // 3–4 MOTS GÉANTS (savoir-faire, section « FIND »)
  // ── v2 (optionnels : les sites v1 ne les ont pas) ──
  process?: { titre: string; texte: string }[]  // 3–4 étapes « comment ça se passe »
  faq?: { q: string; r: string }[]               // 4–6 questions réelles → schema.org FAQPage
  zone_texte?: string                            // phrase de zone d'intervention (SEO local)
}

// Détecte les FAITS potentiellement FABRIQUÉS dans un texte généré : années d'expérience,
// pourcentages, prix, labels/certifs, superlatifs absolus — SAUF s'ils figurent déjà dans
// les données d'entrée de l'artisan (auquel cas ce n'est pas une invention). Renvoie la liste.
export function findFabrications(output: string, input: string): string[] {
  const inLc = ` ${input.toLowerCase()} `
  const pats: RegExp[] = [
    /\b\d{1,3}\s*ans?\b/gi,                                   // "15 ans" d'expérience
    /\b\d+\s*%/g,                                             // pourcentages
    /\b\d[\d .,]*\s*(?:€|euros?)\b/gi,                        // prix
    /\b(RGE|Qualibat|Qualifelec|QualiPAC|décennale|certifi\w+|labellis\w+|agréé\w*|garantie\s+\d)/gi, // labels/certifs
    /\b(le meilleur|num[ée]ro\s*(?:1|un)|n°\s*1|leader\b|incontournable|expert\s+reconnu|référence\s+(?:du|de la))\b/gi, // superlatifs
  ]
  const hits = new Set<string>()
  for (const re of pats) for (const m of output.matchAll(re)) {
    const tok = m[0].trim()
    if (!inLc.includes(` ${tok.toLowerCase()} `) && !inLc.includes(tok.toLowerCase())) hits.add(tok)
  }
  return [...hits]
}
type SiteArtisan = {
  nom: string | null; metier: string | null; bio: string | null; zone: string | null
  ville: string | null; horaires: string | null
  services: { nom?: string; description?: string }[]
  realisations: { titre?: string; specialite?: string }[]
}

/**
 * Rédige, à la place de l'artisan, le CONTENU de son site vitrine (accroches, lede,
 * à-propos, intros de sections, meta SEO). Sur-mesure à partir de ses données réelles.
 * Garde-fous (audit + fabrication interdite) : n'invente JAMAIS de fait non fourni
 * (années, certifications, avis, chiffres, distinctions). Français pro, humain, spécifique.
 */
export async function generateSiteContent(a: SiteArtisan, model: string = AI_MODEL): Promise<SiteContenu> {
  const metier = a.metier?.trim() || 'artisan du bâtiment'
  const nom = a.nom?.trim() || "l'entreprise"
  const lieu = a.zone?.trim() || a.ville?.trim() || ''
  const svc = a.services.filter((s) => s?.nom).map((s) => `- ${s.nom}${s.description ? ' : ' + s.description : ''}`).join('\n') || '(non précisées)'
  const real = a.realisations.filter((r) => r?.titre || r?.specialite).map((r) => `- ${[r.titre, r.specialite].filter(Boolean).join(' — ')}`).join('\n') || '(aucune)'

  const system = `Tu es directeur de création ET concepteur-rédacteur d'un studio réputé pour des sites d'artisans qu'on ne peut confondre avec aucun autre. Tu écris le CONTENU du site vitrine de ${nom} (${metier}${lieu ? `, ${lieu}` : ''}), à partir de ses données RÉELLES uniquement. Ce site vise le niveau des sites primés : chaque mot compte.

MÉTHODE (pense d'abord, puis rédige) :
1. Trouve l'ANGLE propre à cet artisan : ce que son métier a de concret, matériel, sensoriel (matières, gestes, finitions, exigence). Pas d'abstraction marketing.
2. Écris une signature (hero_accroche) qu'on RETIENT — courte, juste, jamais vue sur un autre site du même métier.
3. Choisis 3 ou 4 MOTS GÉANTS (mots_cles) : des mots pleins, évocateurs, ancrés dans le geste du métier (ex. menuisier : « Sur-mesure », « Massif », « Patine », « Assemblages » ; plombier : « Étanche », « Précis », « Dépannage »). PAS les libellés bruts des prestations : des mots qui claquent, en 1 à 2 mots chacun, sans article.
4. Écris un MANIFESTE : une seule grande phrase (6 à 12 mots), affichée en énorme plein cadre, qui condense la promesse — différente de la signature, plus ample.
5. PROCESS (3 ou 4 étapes) : « comment ça se passe » avec cet artisan, du premier contact à la fin du chantier. Étapes concrètes du métier (ex. « On échange », « Je viens voir », « Devis clair », « On réalise »). Chaque étape : titre court + 1 phrase.
6. FAQ (4 à 6 questions) : les VRAIES questions que se pose un client de ce métier (délais, déroulé, zone, devis, garanties générales SANS chiffre inventé). Réponses courtes, honnêtes, rassurantes — JAMAIS de délai précis, prix, garantie chiffrée ou certification non fournis.
7. ZONE_TEXTE : une phrase de zone d'intervention pour le SEO local (ex. « J'interviens à Lyon et dans un rayon de 30 km. »), à partir de la zone fournie uniquement.

RÈGLES ABSOLUES :
- N'INVENTE AUCUN FAIT non fourni : pas d'années d'expérience, certifications, labels (RGE, Qualibat, décennale…), distinctions, avis clients, chiffres, pourcentages, prix ou noms de clients absents des données. Si une info n'est pas donnée, ne la mentionne pas. Ceci vaut AUSSI pour le process et la FAQ.
- Français impeccable, ton pro, chaleureux, sobre et confiant, vocabulaire juste du ${metier}.
- Spécifique : appuie-toi sur les prestations et réalisations réelles fournies.
- SEO naturel : métier + lieu intégrés naturellement dans accroche et meta, sans bourrage.
- Zéro superlatif creux (« le meilleur », « numéro 1 »), zéro promesse intenable, zéro cliché (« votre satisfaction est notre priorité »).
- Longueurs : hero_accroche = 3–6 mots ; hero_lede = 1–2 phrases ; apropos = 3–5 phrases (à la 1re personne, humain) ; intros = 1 phrase ; cta_texte = 1 phrase ; meta_description = 150–160 caractères ; manifeste = 6–12 mots ; mots_cles = 3 ou 4 mots ; process = 3–4 étapes (titre 1–3 mots + 1 phrase) ; faq = 4–6 items (question + réponse 1–2 phrases) ; zone_texte = 1 phrase.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte ni balise autour, au format EXACT :
{"hero_accroche":"...","hero_lede":"...","apropos":"...","prestations_intro":"...","realisations_intro":"...","cta_titre":"...","cta_texte":"...","meta_description":"...","manifeste":"...","mots_cles":["...","..."],"process":[{"titre":"...","texte":"..."}],"faq":[{"q":"...","r":"..."}],"zone_texte":"..."}`

  const user = `Données réelles de l'artisan :
Nom / entreprise : ${nom}
Métier : ${metier}
Zone / ville : ${lieu || '(non précisé)'}
Disponibilités : ${a.horaires?.trim() || '(non précisé)'}
Présentation fournie (bio) : ${a.bio?.trim() || '(aucune)'}
Prestations :
${svc}
Réalisations :
${real}`

  const str = (v: unknown, max: number, fb = '') => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fb)
  const build = (p: Record<string, unknown>): SiteContenu => {
    const mots = (Array.isArray(p.mots_cles) ? p.mots_cles : [])
      .map((m) => (typeof m === 'string' ? m.trim().replace(/^[«"'\s]+|[»"'.,;:\s]+$/g, '').replace(/^(le|la|les|un|une|des|du|de)\s+/i, '') : ''))
      .filter((m: string) => m && m.length <= 22).slice(0, 4)
    const process = (Array.isArray(p.process) ? p.process : []).map((e: { titre?: string; texte?: string }) => ({ titre: str(e?.titre, 40), texte: str(e?.texte, 200) })).filter((e) => e.titre && e.texte).slice(0, 4)
    const faq = (Array.isArray(p.faq) ? p.faq : []).map((e: { q?: string; r?: string }) => ({ q: str(e?.q, 140), r: str(e?.r, 400) })).filter((e) => e.q && e.r).slice(0, 6)
    return {
      hero_accroche: str(p.hero_accroche, 80), hero_lede: str(p.hero_lede, 400), apropos: str(p.apropos, 900),
      prestations_intro: str(p.prestations_intro, 300), realisations_intro: str(p.realisations_intro, 300),
      cta_titre: str(p.cta_titre, 120, 'Parlons de votre projet'),
      cta_texte: str(p.cta_texte, 300, 'Décrivez votre besoin — vous recevez une réponse rapide et un devis clair.'),
      meta_description: str(p.meta_description, 180), manifeste: str(p.manifeste, 120), mots_cles: mots,
      process, faq, zone_texte: str(p.zone_texte, 240),
    }
  }
  const allText = (c: SiteContenu) => [c.hero_accroche, c.hero_lede, c.apropos, c.prestations_intro, c.realisations_intro, c.cta_titre, c.cta_texte, c.meta_description, c.manifeste, c.zone_texte, ...(c.process || []).flatMap((e) => [e.titre, e.texte]), ...(c.faq || []).flatMap((e) => [e.q, e.r])].join(' \n ')

  const gen = async (extra = '') => {
    const res = await client.messages.create({ ...genParams(model, 2600), system: system + extra, messages: [{ role: 'user', content: user }] })
    let raw = ''
    for (const b of res.content) if (b.type === 'text') raw += b.text
    const p = extractJsonObject(raw.trim()) as Record<string, unknown> | null
    if (!p) throw new Error('Contenu de site IA non exploitable.')
    return build(p)
  }

  // Génération + passe de validation anti-fabrication PROGRAMMATIQUE (audit) :
  // si l'IA a glissé un fait non fourni (années, %, prix, label, superlatif), on régénère UNE fois
  // en le lui interdisant nommément ; si ça persiste, on DÉGRADE proprement (on retire process + FAQ,
  // les champs les plus à risque, plutôt que de livrer une invention).
  let out = await gen()
  let bad = findFabrications(allText(out), user)
  if (bad.length) {
    out = await gen(`\n\nATTENTION : ta version précédente contenait des faits NON fournis, INTERDITS : ${bad.slice(0, 8).join(', ')}. Recommence SANS aucun de ces éléments ni équivalent (aucune année, %, prix, label ou superlatif absent des données).`)
    bad = findFabrications(allText(out), user)
    if (bad.length) { out = { ...out, process: [], faq: [] }; if (findFabrications(allText(out), user).length) console.warn('[generateSiteContent] fabrication résiduelle après dégradation:', findFabrications(allText(out), user)) }
  }
  return out
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
