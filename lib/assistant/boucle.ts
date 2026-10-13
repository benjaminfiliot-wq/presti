// L'assistant de gestion de la console — la BOUCLE d'un tour (tool use du SDK Anthropic, comme lib/ai/outils.ts).
//
// Un tour = un message de l'artisan → une réponse. Dedans, le modèle peut appeler des outils : ETAPES_MAX appels au
// modèle au plus, DUREE_TOUR_MS au plus, et UN brouillon au plus (un brouillon coûte des crédits). Chaque appel d'outil
// est journalisé AVANT que son résultat reparte au modèle : un journal qui refuse d'écrire arrête le tour (jamais
// d'action silencieuse, plan §2).
//
// Tout est injecté (client du modèle, exécuteurs, journal) : la boucle ne connaît ni la base ni la clé d'API, ce qui
// permet de la jouer en entier dans les tests avec un faux modèle (scripts/assistant-qa.mjs) et dans le harnais
// d'évaluation avec le vrai modèle et des données simulées (scripts/ai-eval.mjs --assistant).
import type Anthropic from '@anthropic-ai/sdk'
import { DUREE_TOUR_MS, ETAPES_MAX, chiffresNonSources, rappelChiffres, retirerChiffresNonSources } from './cadrage'
import { OUTILS_BROUILLON, OUTILS_CRM, estNomOutil, outilsAssistant, validerEntree, type EntreesOutils, type NomOutil } from './outils'
import type { ObjetJournal, ResultatJournal } from './journal'

export type Brouillon =
  | { type: 'devis'; id: string; numero: string | null; lien: string; libelle: string }
  | { type: 'reponse'; conversation_id: string; lien: string; libelle: string }

export type ResultatExecution = {
  /** Ce que le modèle lit (sérialisé en JSON). */
  donnees: unknown
  /** La phrase du journal. */
  resume: string
  /** 'refus' : l'outil a répondu mais n'a rien fait (crédit épuisé, conversation introuvable, brouillon déjà là…). */
  resultat?: Exclude<ResultatJournal, 'erreur'>
  brouillon?: Brouillon
  objet?: ObjetJournal
}

export type Executeurs = { [N in NomOutil]: (entree: EntreesOutils[N]) => Promise<ResultatExecution> }

export type AppelJournal = { nom: string; entree: unknown; resultat: ResultatJournal; resume: string; objet?: ObjetJournal }

/** Le strict nécessaire du client Anthropic : injecté, pour que les tests passent un faux modèle. */
export type ClientModele = {
  messages: { create(body: Anthropic.MessageCreateParamsNonStreaming, options?: { signal?: AbortSignal }): Promise<Anthropic.Message> }
}

/** Paramètres de génération, tels que genParams (lib/ai.ts) les construit pour le modèle du palier. */
export type ParametresModele = { model: string; max_tokens: number; thinking?: { type: 'adaptive' } }

export type EchangePasse = { role: 'artisan' | 'assistant'; texte: string }

export type ResultatTour = {
  texte: string
  brouillons: Brouillon[]
  outilsAppeles: string[]
  etapes: number
  /** Le tour s'est arrêté sur un plafond (étapes ou temps) : le texte est le dernier utile. */
  tronque: boolean
  /** `signales` : les nombres sans source de la PREMIÈRE réponse (avant régénération) — pour l'évaluation. */
  garde: { regenere: boolean; retires: string[]; signales: string[] }
}

/**
 * Le tour n'a rien rendu d'utile. `appelsAboutis` : appels au modèle qui ont abouti (donc facturés à Presti) avant
 * l'échec ; `parClient` : l'écran a coupé la connexion. La route ne rend le crédit que si RIEN n'a été facturé et que
 * ce n'est pas un abandon du client (audit d'attaque du 12/10, H1 : couper la connexion rendait l'assistant gratuit).
 */
export class TourEchoue extends Error {
  readonly appelsAboutis: number
  readonly parClient: boolean
  readonly cause?: unknown
  constructor(message: string, appelsAboutis: number, parClient: boolean, cause?: unknown) {
    super(message); this.name = 'TourEchoue'; this.appelsAboutis = appelsAboutis; this.parClient = parClient; this.cause = cause
  }
}

export class JournalIndisponible extends Error {
  constructor(cause: unknown) { super(`journal indisponible : ${cause instanceof Error ? cause.message : String(cause)}`); this.name = 'JournalIndisponible' }
}

const texteDe = (res: Anthropic.Message) => res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim()
/**
 * Le texte rendu à l'écran est du texte brut (le prompt le demande) : restes de Markdown retirés, et aucune adresse web
 * ni identifiant technique — le modèle avait fabriqué un lien sur un faux domaine pendant l'éval du 12/10.
 */
export const brut = (s: string) => s
  .replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '')
  .replace(/\(?\b(?:https?:\/\/|www\.)\S+\)?/gi, '')
  .replace(/\(?(?:\/messages\?lead=|\/devis\/)?\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b\)?/gi, '')
  .replace(/[ \t]{2,}/g, ' ').replace(/ +([.,])/g, '$1')
  .trim()

/** Historique (écran) + message courant → messages alternés, commençant et finissant par l'artisan. */
export function messagesDuTour(historique: readonly EchangePasse[], message: string): Anthropic.MessageParam[] {
  const out: { role: 'user' | 'assistant'; content: string }[] = []
  for (const e of [...historique, { role: 'artisan' as const, texte: message }]) {
    const t = String(e.texte ?? '').trim()
    if (!t) continue
    const role = e.role === 'artisan' ? 'user' : 'assistant'
    const dernier = out[out.length - 1]
    if (dernier && dernier.role === role) dernier.content += '\n\n' + t
    else out.push({ role, content: t })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

export async function executerTour(p: {
  client: ClientModele
  parametres: ParametresModele
  systeme: string
  historique: readonly EchangePasse[]
  message: string
  executeurs: Executeurs
  /** Vrai seulement si l'artisan a demandé un brouillon dans CE message (cadrerDemande) : sinon ces outils n'existent pas pour le modèle. */
  brouillonsAutorises: boolean
  /** Le compte a le CRM (drapeau ou essai, et capacité `crm`) : sinon ses outils n'existent pas pour le modèle. */
  crm?: boolean
  journaliser: (a: AppelJournal) => Promise<void>
  /** Prévient l'écran qu'un outil est appelé (« l'assistant consulte : stock… »). */
  onOutil?: (nom: NomOutil) => void
  /** Sources de nombres admises en plus des données lues (date du jour…). */
  sourcesFixes?: readonly string[]
  signal?: AbortSignal
  etapesMax?: number
  dureeMs?: number
}): Promise<ResultatTour> {
  const etapesMax = p.etapesMax ?? ETAPES_MAX
  const tools = outilsAssistant({ crm: !!p.crm }).filter((t) => p.brouillonsAutorises || !(OUTILS_BROUILLON as readonly string[]).includes(t.name))
  const messages: Anthropic.MessageParam[] = messagesDuTour(p.historique, p.message)
  if (!messages.length) throw new Error('message vide')

  const ac = new AbortController()
  const minuteur = setTimeout(() => ac.abort(), p.dureeMs ?? DUREE_TOUR_MS)
  const surAbandon = () => ac.abort()
  p.signal?.addEventListener('abort', surAbandon)

  const sources: string[] = [p.message, ...p.historique.map((h) => h.texte), ...(p.sourcesFixes ?? [])]
  const brouillons: Brouillon[] = []
  const outilsAppeles: string[] = []
  let etapes = 0
  let tronque = false
  let texteFinal = ''
  let dernierTexte = ''
  let brouillonsDuTour = 0
  let appelsAboutis = 0

  const appelerModele = (extra: Partial<Anthropic.MessageCreateParamsNonStreaming> = {}) => {
    etapes++
    return p.client.messages.create({ ...p.parametres, system: p.systeme, tools, messages, ...extra }, { signal: ac.signal }).then((r) => { appelsAboutis++; return r })
  }

  const executer = async (u: Anthropic.ToolUseBlock): Promise<Anthropic.ToolResultBlockParam> => {
    const reponse = (contenu: unknown, erreur = false): Anthropic.ToolResultBlockParam => {
      const json = JSON.stringify(contenu)
      // Un nombre écrit par un client (entre [MESSAGE_CLIENT]) n'est pas une source : sinon « 4 850 € » glissé dans un nom de
      // prospect passait pour un chiffre lu (audit d'attaque du 12/10, M1).
      sources.push(json.replace(/\[MESSAGE_CLIENT\][\s\S]*?\[\/MESSAGE_CLIENT\]/g, ''))
      return { type: 'tool_result', tool_use_id: u.id, content: json, ...(erreur ? { is_error: true } : {}) }
    }
    outilsAppeles.push(u.name)
    if (!estNomOutil(u.name)) {
      await journal({ nom: u.name, entree: u.input, resultat: 'refus', resume: 'outil inconnu' })
      return reponse({ erreur: `Outil inconnu : ${u.name}` }, true)
    }
    const nom = u.name
    const v = validerEntree(nom, u.input)
    if (!v.ok) {
      await journal({ nom, entree: u.input, resultat: 'refus', resume: `entrée refusée : ${v.erreur}` })
      return reponse({ erreur: `Entrée refusée : ${v.erreur}` }, true)
    }
    if (OUTILS_CRM.includes(nom) && !p.crm) {
      // Défense en profondeur : l'outil n'a pas été proposé (compte sans CRM), mais un modèle peut halluciner un nom.
      await journal({ nom, entree: v.entree, resultat: 'refus', resume: 'CRM non ouvert sur ce compte' })
      return reponse({ erreur: "Le CRM n'est pas ouvert sur ce compte : tu n'as aucune donnée de chantier, d'équipe ni de réservation. Dis-le à l'artisan." }, true)
    }
    if (OUTILS_BROUILLON.includes(nom)) {
      // Défense en profondeur : l'outil n'a pas été proposé, mais un modèle peut halluciner un nom.
      if (!p.brouillonsAutorises) {
        await journal({ nom, entree: v.entree, resultat: 'refus', resume: 'brouillon non demandé par l’artisan dans ce message' })
        return reponse({ erreur: "L'artisan n'a pas demandé de brouillon dans ce message : propose-le-lui, ne le fais pas." }, true)
      }
      if (brouillonsDuTour >= 1) {
        await journal({ nom, entree: v.entree, resultat: 'refus', resume: 'un seul brouillon par message' })
        return reponse({ erreur: "Un seul brouillon par message : dis à l'artisan de le redemander dans son prochain message." }, true)
      }
      brouillonsDuTour++
    }
    p.onOutil?.(nom)
    let r: ResultatExecution
    try {
      r = await (p.executeurs[nom] as (e: unknown) => Promise<ResultatExecution>)(v.entree)
    } catch (e) {
      await journal({ nom, entree: v.entree, resultat: 'erreur', resume: `lecture impossible : ${e instanceof Error ? e.message : 'erreur'}` })
      return reponse({ erreur: "Ces données n'ont pas pu être lues pour l'instant. Dis-le à l'artisan, sans rien supposer à leur place." }, true)
    }
    await journal({ nom, entree: v.entree, resultat: r.resultat ?? 'ok', resume: r.resume, objet: r.objet ?? null })
    if (r.brouillon) brouillons.push(r.brouillon)
    return reponse(r.donnees)
  }
  const journal = async (a: AppelJournal) => {
    try { await p.journaliser(a) } catch (e) { throw new JournalIndisponible(e) }
  }

  try {
    while (etapes < etapesMax) {
      const res = await appelerModele()
      const texte = texteDe(res)
      const usages = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (res.stop_reason !== 'tool_use' || !usages.length) { texteFinal = texte; break }
      if (texte) dernierTexte = texte
      messages.push({ role: 'assistant', content: res.content })
      const resultats: Anthropic.ToolResultBlockParam[] = []
      for (const u of usages) resultats.push(await executer(u))
      messages.push({ role: 'user', content: resultats })
      if (etapes >= etapesMax) tronque = true
    }
    // Plafond d'étapes atteint sans conclusion : un dernier appel SANS outil pour répondre avec ce qui a été lu.
    if (!texteFinal && tronque) {
      const res = await appelerModele({ tool_choice: { type: 'none' } })
      texteFinal = texteDe(res)
    }
  } catch (e) {
    if (e instanceof JournalIndisponible) throw e
    const abandon = (e instanceof Error && (e.name === 'AbortError' || e.name === 'APIUserAbortError')) || ac.signal.aborted
    if (!abandon) throw new TourEchoue(e instanceof Error ? e.message : String(e), appelsAboutis, false, e)
    tronque = true
  } finally {
    clearTimeout(minuteur)
    p.signal?.removeEventListener('abort', surAbandon)
  }

  let texte = brut(texteFinal || dernierTexte)
  if (!texte) {
    // Rien à dire et rien de fait : c'est une panne (la route rend le crédit). Un brouillon fait sans conclusion, lui, se dit.
    if (!brouillons.length) throw new TourEchoue(tronque ? 'temps dépassé sans réponse' : 'réponse vide', appelsAboutis, !!p.signal?.aborted)
    texte = 'Le brouillon est prêt : ouvrez-le avec le bouton ci-dessous pour le relire et le valider.'
  }

  // Garde-fou des chiffres : une régénération avec le rappel nommé, puis on retire la phrase fautive.
  let fautifs = chiffresNonSources(texte, sources)
  const signales = [...fautifs]
  let regenere = false
  if (fautifs.length && !ac.signal.aborted) {
    regenere = true
    try {
      const res = await p.client.messages.create(
        { ...p.parametres, system: p.systeme + rappelChiffres(fautifs), tools, tool_choice: { type: 'none' }, messages: [...messages, ...(texteFinal ? [{ role: 'assistant' as const, content: texteFinal }, { role: 'user' as const, content: 'Réécris ta réponse en respectant la consigne sur les nombres.' }] : [])] },
        {},
      )
      etapes++
      const nouveau = brut(texteDe(res))
      if (nouveau) texte = nouveau
    } catch { /* on garde la première réponse, qui sera nettoyée ci-dessous */ }
    fautifs = chiffresNonSources(texte, sources)
  }
  const retires = [...fautifs]
  if (fautifs.length) texte = retirerChiffresNonSources(texte, fautifs)

  return { texte, brouillons, outilsAppeles, etapes, tronque, garde: { regenere, retires, signales } }
}
