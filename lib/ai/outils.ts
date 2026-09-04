// Les OUTILS de l'assistant (tool use, v5 §7) — ce qui relie la réponse automatique au
// devis automatique : consulter les prix de l'artisan, ses disponibilités, créer un devis
// brouillon, demander une photo, proposer un rendez-vous, escalader à l'humain.
//
// Une seule fonction publique : `repondreAvecOutils` fait la boucle tool-use (4 tours au
// plus, 40 s au plus) et rend le texte pour le client + la liste des ACTIONS produites, que
// la route appelante enregistre et que le poste de pilotage affiche.
//
// Sécurité (v5 §11, « un outil creer_devis_brouillon détourné par un prospect serait grave ») :
//  • chaque exécuteur est FERMÉ sur l'artisan et la conversation en cours — aucun identifiant
//    ne vient du modèle, donc aucun ne peut venir du prospect ;
//  • creer_devis_brouillon passe par lib/devisAuto (source 'outil') : un seul brouillon par
//    conversation, garanti en base par l'index unique de la migration 0050 ;
//  • le texte final passe par le filtre anti-fabrication : aucun montant, aucune capacité
//    non déclarée — le devis porte les prix, pas la réponse ;
//  • les outils sont filtrés par la configuration de la plateforme (devis_auto = 'jamais'
//    → pas d'outil devis) et par l'offre (routage du modèle).
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { rechercherPrix } from '@/lib/prix'
import { creerDevisBrouillonPourLead } from '@/lib/devisAuto'
import { personaDe, type PlateformeConfig } from '@/lib/plateformeConfig'
import type { Tier } from '@/lib/models'
import { preparerConversation, genParams, profilCapacites, type Artisan, type Lead, type ConvTurn } from '@/lib/ai'
import { routerModele, type Routage } from './routage'
import { assainirReponse, type CapaciteDetectee } from './antiFabrication'
import { chargerExemples, type ExemplesArtisan } from './exemples'

const client = new Anthropic()

export const MAX_TOURS_OUTILS = 4
export const TIMEOUT_OUTILS_MS = 40_000

// ── Ce que la boucle rend ────────────────────────────────────────────────────

export type ActionOutil =
  | { type: 'devis_brouillon'; devis_id: string; numero: string; total_ttc: number; deja_existant: boolean; postes: string[] }
  | { type: 'devis_refuse'; motif: string }
  | { type: 'photo_demandee'; precision: string | null }
  | { type: 'rdv_propose'; creneaux: string[]; objet: string | null }
  | { type: 'escalade'; motif: string }
  | { type: 'prix_consulte'; ref: string; nb: number }
  | { type: 'disponibilites_consultees'; horaires: string | null }

export type ArtisanOutils = Artisan & {
  id: string
  plan?: string | null
  is_founder?: boolean | null
}

export type ConversationOutils = {
  lead: Lead & { id: string }
  /** Les tours précédents (sans le message courant, ou avec : on ne le duplique pas). */
  history: ConvTurn[]
}

export type ResultatOutils = {
  /** Le texte à envoyer au client (déjà passé au filtre anti-fabrication). */
  texte: string
  actions: ActionOutil[]
  /** Le niveau de modèle RÉELLEMENT utilisé (« répondu avec Pro ») et pourquoi. */
  tier: Tier
  model: string
  routage: Routage
  tours: number
  outilsAppeles: string[]
  assainissement: { retirees: CapaciteDetectee[]; prixRetires: string[]; regenere: boolean }
  /** La boucle s'est arrêtée sur le plafond (tours ou temps) : le texte est celui du dernier tour utile. */
  tronque: boolean
}

// ── Exécuteurs (injectables : les tests unitaires n'ont pas de base) ─────────

export type Executeurs = {
  consulter_prix: (ref: string) => Promise<{ postes: { designation: string; unite: string; prix_ht: number; tva_taux: number; provenance: string }[] }>
  consulter_disponibilites: () => Promise<{ horaires: string | null }>
  creer_devis_brouillon: (postes: string[]) => Promise<{ ok: true; id: string; numero: string; total_ttc: number; deja: boolean } | { ok: false; error: string }>
}

/** Les exécuteurs réels, FERMÉS sur l'artisan et la conversation : rien ne vient du modèle. */
export function executeursSupabase(ctx: { artisanId: string; leadId: string; metier: string | null; tier: Tier; horaires?: string | null }): Executeurs {
  return {
    async consulter_prix(ref) {
      const q = String(ref ?? '').slice(0, 120)
      const postes = q.trim() ? await rechercherPrix(q, { artisanId: ctx.artisanId, metier: ctx.metier }) : []
      return {
        postes: postes.slice(0, 8).map((p) => ({ designation: p.designation, unite: p.unite, prix_ht: p.prix_ht, tva_taux: p.tva_taux, provenance: p.source_libelle })),
      }
    },
    async consulter_disponibilites() {
      if (ctx.horaires !== undefined) return { horaires: ctx.horaires?.trim() || null }
      const { data } = await supabaseAdmin.from('artisans').select('horaires').eq('id', ctx.artisanId).maybeSingle()
      return { horaires: (data?.horaires as string | null)?.trim() || null }
    },
    async creer_devis_brouillon() {
      const r = await creerDevisBrouillonPourLead({ artisanId: ctx.artisanId, leadId: ctx.leadId, tier: ctx.tier, source: 'outil' })
      if (!r.ok) return { ok: false, error: r.error }
      return { ok: true, id: r.id, numero: r.numero, total_ttc: r.total_ttc, deja: r.deja }
    },
  }
}

// ── Définitions des outils (schémas Anthropic) ───────────────────────────────

const OUTILS: Anthropic.Tool[] = [
  {
    name: 'consulter_prix',
    description: "Cherche dans les tarifs de l'artisan (sa bibliothèque de prix) un poste par mots-clés (ex. « chauffe-eau 200 L », « pose carrelage »). Sert UNIQUEMENT à préparer un devis : les montants rendus ne doivent JAMAIS être écrits dans le message au client.",
    input_schema: {
      type: 'object',
      properties: { ref: { type: 'string', description: 'Mots-clés ou référence du poste recherché.' } },
      required: ['ref'],
      additionalProperties: false,
    },
  },
  {
    name: 'consulter_disponibilites',
    description: "Rend les disponibilités / horaires DÉCLARÉS par l'artisan, tels quels (texte libre). S'ils sont vides, tu ne proposes aucun créneau précis : tu demandes au client ses disponibilités et tu dis que l'artisan confirme.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'creer_devis_brouillon',
    description: "Crée un DEVIS BROUILLON à partir de toute la conversation, que l'artisan relira et validera avant envoi. À appeler quand le besoin est assez qualifié (surface/quantités, matériel, accès) ou après 3 questions. Un seul devis par conversation : s'il existe déjà, l'outil le rend. Ne mets aucun montant dans ta réponse : dis simplement que le devis est en préparation.",
    input_schema: {
      type: 'object',
      properties: {
        postes: { type: 'array', items: { type: 'string' }, description: 'Récapitulatif des postes identifiés (libellés courts), pour l’artisan.' },
      },
      required: ['postes'],
      additionalProperties: false,
    },
  },
  {
    name: 'demander_photo',
    description: "Demande au client une ou plusieurs photos (l'interface affiche un bouton d'envoi). Précise ce qu'il faut photographier.",
    input_schema: {
      type: 'object',
      properties: { precision: { type: 'string', description: "Ce qu'il faut voir sur la photo (ex. « le tableau électrique ouvert »)." } },
      required: ['precision'],
      additionalProperties: false,
    },
  },
  {
    name: 'proposer_rdv',
    description: "Propose au client 1 à 3 créneaux (l'interface affiche des boutons). UNIQUEMENT dans le cadre des disponibilités déclarées (consulter_disponibilites d'abord) ; sinon, demande ses disponibilités au lieu d'inventer.",
    input_schema: {
      type: 'object',
      properties: {
        creneaux: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3, description: 'Créneaux lisibles (ex. « mardi matin », « jeudi entre 14 h et 16 h »).' },
        objet: { type: 'string', description: 'Visite de chiffrage, intervention, appel…' },
      },
      required: ['creneaux'],
      additionalProperties: false,
    },
  },
  {
    name: 'escalader',
    description: "Passe la main à l'artisan (humain) : réclamation, litige, demande sensible, hors de ton cadre, ou client qui insiste pour un prix ferme. Donne le motif. Ensuite, dis au client que l'artisan le recontacte personnellement.",
    input_schema: {
      type: 'object',
      properties: { motif: { type: 'string', description: 'Pourquoi un humain doit reprendre.' } },
      required: ['motif'],
      additionalProperties: false,
    },
  },
]

/** Les outils autorisés pour cette plateforme : la configuration de l'artisan tranche. */
export function outilsPour(cfg: Pick<PlateformeConfig, 'devis_auto'>): Anthropic.Tool[] {
  return OUTILS.filter((t) => t.name !== 'creer_devis_brouillon' || cfg.devis_auto !== 'jamais')
}

// ── Nettoyage des entrées du modèle (jamais de confiance aveugle) ────────────

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const liste = (v: unknown, max: number, taille: number) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, taille)).filter(Boolean).slice(0, max)

// ── La boucle ────────────────────────────────────────────────────────────────

export async function repondreAvecOutils(params: {
  artisan: ArtisanOutils
  conversation: ConversationOutils
  message: string
  cfg: PlateformeConfig
  /** Modèle demandé : un tier ('standard' | 'pro' | 'expert') ou rien → routage automatique selon la demande et l'offre. */
  model?: Tier | string | null
  /** Exemples déjà chargés (sinon chargés ici depuis la base). `null` = pas de few-shot. */
  exemples?: ExemplesArtisan | null
  /** Exécuteurs de remplacement (tests). */
  executeurs?: Partial<Executeurs>
  signal?: AbortSignal
}): Promise<ResultatOutils> {
  const { artisan, conversation, cfg } = params
  const message = String(params.message ?? '').trim()
  const lead = conversation.lead

  // Historique + message courant, sans doublon si la route l'a déjà ajouté.
  const history: ConvTurn[] = [...conversation.history]
  const dernier = history[history.length - 1]
  if (!(dernier && dernier.sens === 'in' && dernier.contenu.trim() === message)) history.push({ sens: 'in', contenu: message })

  // Few-shot : les exemples de l'artisan (ton, forme), sauf si l'appelant les a déjà.
  const exemples = params.exemples === undefined ? await chargerExemples(artisan.id).catch(() => null) : params.exemples

  const { system, msgs, insights } = preparerConversation(
    artisan, lead, history,
    { exemples, avecOutils: true, nomAssistant: cfg.nom_assistant, persona: personaDe(cfg) },
  )

  // Routage : Standard par défaut, Pro sur complexité si l'offre le permet, Expert sur demande.
  const routage = routerModele({
    plan: artisan.plan,
    demande: params.model ?? cfg.modele ?? null,
    signaux: { complexe: insights.complexe, reclamation: insights.reclamation, multiPostes: insights.multiPostes, contraintes: insights.assurance || insights.copropriete },
  })
  const model = routage.model

  const exec: Executeurs = {
    ...executeursSupabase({ artisanId: artisan.id, leadId: lead.id, metier: artisan.metier, tier: routage.tier, horaires: artisan.horaires }),
    ...(params.executeurs ?? {}),
  }
  const tools = outilsPour(cfg)

  // Plafond de temps global : 40 s (maxDuration Vercel = 60, il faut garder de la marge).
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_OUTILS_MS)
  const onAbort = () => ac.abort()
  params.signal?.addEventListener('abort', onAbort)

  const messages: Anthropic.MessageParam[] = msgs.map((m) => ({ role: m.role, content: m.content }))
  const actions: ActionOutil[] = []
  const outilsAppeles: string[] = []
  let tours = 0
  let tronque = false
  let texteFinal = ''
  const textesIntermediaires: string[] = []

  try {
    for (; tours < MAX_TOURS_OUTILS; ) {
      tours++
      const res = await client.messages.create(
        { ...genParams(model, 1200), system, tools, messages },
        { signal: ac.signal },
      )
      const texte = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim()
      const usages = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

      if (res.stop_reason !== 'tool_use' || !usages.length) { texteFinal = texte; break }
      if (texte) textesIntermediaires.push(texte)

      // Le tour de l'assistant (texte + appels), puis TOUS les résultats dans un seul message.
      messages.push({ role: 'assistant', content: res.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const u of usages) {
        outilsAppeles.push(u.name)
        let contenu: unknown
        let erreur = false
        try {
          contenu = await executerOutil(u.name, (u.input ?? {}) as Record<string, unknown>, exec, actions)
        } catch (e) {
          erreur = true
          contenu = { error: e instanceof Error ? e.message : 'Outil indisponible' }
        }
        results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(contenu), ...(erreur ? { is_error: true } : {}) })
      }
      messages.push({ role: 'user', content: results })

      if (tours === MAX_TOURS_OUTILS) tronque = true
    }

    // Plafond de tours atteint sans texte final : un dernier tour SANS outil pour conclure.
    if (!texteFinal && tronque) {
      const res = await client.messages.create(
        { ...genParams(model, 600), system, tools, tool_choice: { type: 'none' }, messages },
        { signal: ac.signal },
      )
      texteFinal = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim()
    }
  } catch (e) {
    // Temps dépassé ou erreur API : on rend ce qu'on a (les actions déjà faites restent vraies).
    if (!(e instanceof Error && e.name === 'AbortError') && !(e instanceof Anthropic.APIUserAbortError)) throw e
    tronque = true
  } finally {
    clearTimeout(timer)
    params.signal?.removeEventListener('abort', onAbort)
  }

  if (!texteFinal) texteFinal = textesIntermediaires[textesIntermediaires.length - 1] ?? ''
  if (!texteFinal && actions.length) texteFinal = phraseDeRepli(actions)

  // Filtre anti-fabrication étendu : capacités non déclarées + montants. Régénération une
  // fois (sans outil, avec le rappel), puis dégradation (phrase retirée).
  const regenerer = async (rappel: string) => {
    const res = await client.messages.create({
      ...genParams(model, 900), system: system + rappel, tools, tool_choice: { type: 'none' }, messages,
    })
    return res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim()
  }
  const propre = await assainirReponse(texteFinal, profilCapacites(artisan), texteFinal ? regenerer : undefined)

  return {
    texte: propre.texte,
    actions,
    tier: routage.tier,
    model,
    routage,
    tours,
    outilsAppeles,
    assainissement: { retirees: propre.retirees, prixRetires: propre.prixRetires, regenere: propre.regenere },
    tronque,
  }
}

/** Exécute UN outil, nettoie ses entrées, enregistre l'action. Rend ce que le modèle lira. */
async function executerOutil(nom: string, input: Record<string, unknown>, exec: Executeurs, actions: ActionOutil[]): Promise<unknown> {
  switch (nom) {
    case 'consulter_prix': {
      const ref = str(input.ref, 120)
      const r = await exec.consulter_prix(ref)
      actions.push({ type: 'prix_consulte', ref, nb: r.postes.length })
      return r.postes.length
        ? { postes: r.postes, rappel: 'Ces montants servent à préparer le devis. Ne les écris pas au client.' }
        : { postes: [], info: "Aucun tarif enregistré pour cette recherche : le devis s'appuiera sur des estimations que l'artisan ajustera." }
    }
    case 'consulter_disponibilites': {
      const r = await exec.consulter_disponibilites()
      actions.push({ type: 'disponibilites_consultees', horaires: r.horaires })
      return r.horaires
        ? { horaires: r.horaires, rappel: 'Propose uniquement des créneaux compatibles avec ce texte, tel quel.' }
        : { horaires: null, info: "L'artisan n'a pas déclaré d'horaires : ne propose AUCUN créneau précis, demande les disponibilités du client et dis que l'artisan confirme." }
    }
    case 'creer_devis_brouillon': {
      const postes = liste(input.postes, 12, 80)
      const r = await exec.creer_devis_brouillon(postes)
      if (!r.ok) {
        actions.push({ type: 'devis_refuse', motif: r.error })
        return { ok: false, info: `Devis impossible pour l'instant (${r.error}). Dis au client que l'artisan reviendra vers lui avec un devis.` }
      }
      actions.push({ type: 'devis_brouillon', devis_id: r.id, numero: r.numero, total_ttc: r.total_ttc, deja_existant: r.deja, postes })
      return {
        ok: true, numero: r.numero, deja_existant: r.deja,
        rappel: r.deja
          ? "Un devis est déjà en préparation pour cette conversation : dis-le simplement, sans montant."
          : "Devis brouillon créé, l'artisan le relit avant envoi. Dis au client qu'il le recevra après validation — AUCUN montant dans ta réponse.",
      }
    }
    case 'demander_photo': {
      const precision = str(input.precision, 200) || null
      actions.push({ type: 'photo_demandee', precision })
      return { ok: true, info: "Le client voit un bouton pour envoyer sa photo. Dis-lui en une phrase quoi photographier." }
    }
    case 'proposer_rdv': {
      const creneaux = liste(input.creneaux, 3, 80)
      if (!creneaux.length) return { ok: false, info: 'Aucun créneau valide : demande plutôt ses disponibilités au client.' }
      actions.push({ type: 'rdv_propose', creneaux, objet: str(input.objet, 80) || null })
      return { ok: true, info: 'Le client voit ces créneaux sous forme de boutons ; l’artisan confirme ensuite.' }
    }
    case 'escalader': {
      const motif = str(input.motif, 300) || 'demande à traiter par l’artisan'
      actions.push({ type: 'escalade', motif })
      return { ok: true, info: "L'artisan est prévenu et reprend la main. Dis au client qu'il le recontacte personnellement, sans rien promettre d'autre." }
    }
    default:
      return { error: `Outil inconnu : ${nom}` }
  }
}

/** Si le modèle a agi sans conclure (rare : plafond atteint), une phrase honnête plutôt qu'un vide. */
function phraseDeRepli(actions: ActionOutil[]): string {
  const a = actions[actions.length - 1]
  switch (a.type) {
    case 'devis_brouillon': return 'Merci pour ces précisions : un devis est en préparation, vous le recevrez dès que l’artisan l’aura validé.'
    case 'photo_demandee': return `Pourriez-vous m’envoyer une photo${a.precision ? ` (${a.precision})` : ''} ? Cela permettra d’avancer précisément.`
    case 'rdv_propose': return `Voici les créneaux possibles : ${a.creneaux.join(', ')}. Dites-moi celui qui vous convient.`
    case 'escalade': return 'Merci pour votre message : l’artisan reprend personnellement votre demande et vous recontacte très vite.'
    default: return 'Merci, je reviens vers vous très rapidement avec la suite.'
  }
}
