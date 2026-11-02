// lib/demandesDemo.ts — les demandes de démo « Presti pour l'entreprise » (chantier 4, lot L19 ; tâche 032-026 ; migration 0190).
//
// Trois choses, écrites UNE fois et jugées hors ligne par scripts/demandes-demo-qa.mjs :
//   1. `traiterContact` : tout le formulaire de contact public (app/api/contact/route.ts n'en est que le branchement). Drapeau
//      `demandesDemo` baissé : le comportement d'avant, à l'octet près (mêmes contrôles, mêmes messages, même e-mail, aucune lecture
//      de motif, taille ni activité). Levé : motif, taille et activité lus et validés en liste fermée ; une demande de démo est écrite
//      dans `demandes_demo` EN PLUS de l'e-mail à Benj, et une écriture en panne n'empêche jamais l'e-mail de partir ;
//   2. `listeDemandesDemo` et `marquerDemandeTraitee` : l'onglet « Démos » du Poste de contrôle (app/api/controle/demandes-demo),
//      compte fondateur seulement, le geste « traitée » journalisé ;
//   3. les listes fermées, recopiées du formulaire du chantier 2 (plans/011-cadrage-01-11/c2-lot4/texte.md:284-285) et du CHECK de 0190.
//
// Ce module n'importe RIEN à l'exécution (seulement des types) : la base, l'e-mail, la garde et le journal sont passés par la route.
// C'est ce qui permet de le juger sans réseau, sans base et sans clé.
import type { Fondateur, Refus } from '@/lib/direction/garde'
import type { Entree } from '@/lib/direction/journal'
import type { Domaine, Verbe } from '@/lib/controle/droits'

export const MOTIFS = ['entreprise'] as const
export const TAILLES = ['1', '2 à 5', '6 à 20', 'plus de 20'] as const
export const ACTIVITES = ['Artisan', 'Entreprise du bâtiment', 'Architecte', 'Autre'] as const
export const ETATS = ['nouvelle', 'traitee'] as const
export type Taille = (typeof TAILLES)[number]
export type Activite = (typeof ACTIVITES)[number]
export type EtatDemande = (typeof ETATS)[number]

/** Une réponse de route, sans dépendre de next/server : la route la rend telle quelle (`NextResponse.json(corps, { status })`). */
export type Reponse = { statut: number; corps: Record<string, unknown> }
const rep = (statut: number, corps: Record<string, unknown>): Reponse => ({ statut, corps })

// ─── 1. Le formulaire de contact ──────────────────────────────────────────────────────────────────────────────────────────────

// Repris tels quels de app/api/contact/route.ts (avant le 02/11) : ils font le comportement « drapeau baissé ».
const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, n) : null
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** La ligne écrite dans `demandes_demo` : rien d'autre (ni IP, ni empreinte, ni agent). */
export type LigneDemandeDemo = { motif: 'entreprise'; taille: Taille; activite: Activite; prenom: string; email: string; message: string | null }

export type DepsContact = {
  /** `actif('demandesDemo')`. */
  drapeau: boolean
  ip: () => string
  banni: (ip: string) => Promise<boolean>
  abus: (ip: string, raison: string) => Promise<unknown>
  limite: (cle: string, max: number, fenetreSec: number) => Promise<boolean>
  corps: () => Promise<unknown>
  notifier: (sujet: string, corps: string, repondreA?: string) => Promise<{ ok: boolean }>
  /** Écrit la ligne ; rend `true` si elle est en base. Ne doit pas jeter (une exception compte comme un échec). */
  enregistrer: (ligne: LigneDemandeDemo) => Promise<boolean>
}

const present = (v: unknown) => v !== undefined && v !== null && v !== ''
const dans = <T extends string>(liste: readonly T[], v: unknown): v is T => typeof v === 'string' && (liste as readonly string[]).includes(v)

/** Le champ motif, taille, activité d'une demande : `null` pour un message de contact ordinaire, un refus pour une valeur hors liste. */
export function lireMotif(body: unknown):
  | { ok: true; demo: { motif: 'entreprise'; taille: Taille; activite: Activite } | null }
  | { ok: false; error: string; code: 'motif' | 'taille' | 'activite' } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  // Aucun des trois : un message de contact comme avant. Un seul des trois : les trois sont exigés, en liste fermée.
  const motif = b.motif, taille = b.taille, activite = b.activite
  if (!present(b.motif) && !present(b.taille) && !present(b.activite)) return { ok: true, demo: null }
  if (!dans(MOTIFS, motif)) return { ok: false, error: 'Ce motif de demande n’existe pas.', code: 'motif' }
  if (!dans(TAILLES, taille)) return { ok: false, error: 'Choisissez la taille de votre équipe.', code: 'taille' }
  if (!dans(ACTIVITES, activite)) return { ok: false, error: 'Choisissez votre activité.', code: 'activite' }
  return { ok: true, demo: { motif, taille, activite } }
}

/** Le message facultatif du demandeur : le formulaire du chantier 2 le précède d'une ligne composée (« [Démo entreprise] Équipe : … ·
 *  activité : … »), qui redit des champs déjà rangés. On la retire quand elle est exactement celle-là ; sinon le message reste entier. */
export function messageDuDemandeur(message: string, taille: Taille, activite: Activite): string | null {
  const entete = `[Démo entreprise] Équipe : ${taille} · activité : ${activite}`
  if (message === entete) return null
  if (message.startsWith(entete + '\n')) return message.slice(entete.length).trim() || null
  return message
}

// Un caractère coupé en deux par `clip` (une moitié d'émoji) rend le texte invalide pour Postgres : on le retire de la ligne rangée.
const SURROGAT_SEUL = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g
const propre = (t: string) => t.replace(SURROGAT_SEUL, '')

/** La ligne rangée : prénom, adresse et message tels que l'e-mail les porte, sans moitié de caractère. */
export function ligneDemande(m: { motif: 'entreprise'; taille: Taille; activite: Activite }, nom: string, email: string, message: string): LigneDemandeDemo {
  const texte = messageDuDemandeur(propre(message), m.taille, m.activite)
  return { ...m, prenom: propre(nom), email: propre(email), message: texte }
}

export async function traiterContact(d: DepsContact): Promise<Reponse> {
  try {
    const ip = d.ip()
    if (await d.banni(ip)) return rep(403, { error: 'Accès refusé.' })

    const body = (await d.corps().catch(() => null)) as Record<string, unknown> | null

    // Champ piège : invisible à l'écran, donc rempli seulement par un robot. On répond « ok »
    // pour ne pas lui apprendre qu'il a été repéré.
    if (clip(body?.societe, 50)) {
      await d.abus(ip, 'honeypot /api/contact')
      return rep(200, { ok: true })
    }

    const nom = clip(body?.nom, 120)
    const email = clip(body?.email, 200)
    const message = clip(body?.message, 4000)
    if (!nom || !email || !message) return rep(400, { error: 'Il manque votre nom, votre email ou votre message.' })
    if (!EMAIL.test(email)) return rep(400, { error: 'Cette adresse email ne semble pas valide.' })
    if (message.length < 10) return rep(400, { error: 'Dites-nous un peu plus, en une phrase au moins.' })

    // Drapeau levé seulement : motif, taille et activité. Baissé, ils ne sont même pas lus.
    // Une valeur hors liste n'entre JAMAIS en base, mais ne fait jamais perdre la demande non plus : le demandeur ne peut pas la
    // corriger (c'est un choix du formulaire), donc l'e-mail part comme avant et seul le code est journalisé (audit distinct, point 1).
    let demo: LigneDemandeDemo | null = null
    if (d.drapeau) {
      const m = lireMotif(body)
      if (!m.ok) console.error(`[contact] demande de démo hors liste (${m.code}) : non rangée, l’e-mail part quand même`)
      else if (m.demo) demo = ligneDemande(m.demo, nom, email, message)
    }

    // Trois messages par heure et par adresse : de quoi écrire, se corriger, relancer — pas de
    // quoi transformer le formulaire en relais d'envoi.
    if (!(await d.limite(`contact:${ip}`, 3, 3600))) {
      await d.abus(ip, 'flood /api/contact')
      return rep(429, { error: 'Vous avez déjà écrit plusieurs fois : laissez-nous le temps de répondre.' })
    }

    // La base d'abord, l'e-mail ensuite, et JAMAIS l'un à la place de l'autre : une écriture en panne laisse partir l'e-mail ;
    // un e-mail en panne ne perd pas une demande déjà rangée (elle se lit dans le Poste). Les deux en panne : on le dit (502).
    let rangee = false
    if (demo) {
      try { rangee = (await d.enregistrer(demo)) === true } catch { rangee = false }
      // Jamais le prénom, l'adresse ni le message dans un journal : seulement ce qui est arrivé.
      if (!rangee) console.error('[contact] demande de démo non rangée en base : l’e-mail part quand même')
    }

    const r = await d.notifier(
      `Message de ${nom}`,
      `${message}\n\n— ${nom} · ${email}\n(envoyé depuis le formulaire de contact de prestiapp.fr)`,
      email,
    )
    if (!r.ok && !rangee) return rep(502, { error: 'Votre message n’a pas pu partir. Réessayez dans un moment.' })
    if (!r.ok) console.error('[contact] e-mail à l’entreprise en échec : la demande de démo est rangée, elle se lit dans le Poste')
    return rep(200, { ok: true })
  } catch (e) {
    console.error('[contact] POST:', e)
    return rep(500, { error: 'Service momentanément indisponible' })
  }
}

// ─── 2. L'onglet « Démos » du Poste de contrôle ───────────────────────────────────────────────────────────────────────────────

/** Ce que le Poste lit (Benj y lit le message et l'adresse que l'e-mail lui donne aujourd'hui, plan du chantier 4, volet démo). */
export const COLONNES_POSTE = 'id, motif, taille, activite, prenom, email, message, etat, rendez_vous_le, traitee_le, cree_le, maj_le'
/** Une adresse sûre pour un lien `mailto:` : rien qui ajoute une copie, un objet ou un corps (`?`, `&`, `%`, `#`, `/`, `:`). */
export const EMAIL_LIEN = /^[^\s@?&%#/:<>"']+@[^\s@?&%#/:<>"']+\.[^\s@?&%#/:<>"']{2,}$/
export type DemandeDemo = {
  id: string; motif: 'entreprise'; taille: Taille; activite: Activite; prenom: string; email: string; message: string | null
  etat: EtatDemande; rendez_vous_le: string | null; traitee_le: string | null; cree_le: string; maj_le: string
}
export const LIMITE_LISTE = 200
const DELAI_MS = 8_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const estUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

// Le client Supabase, réduit à ce que ce module appelle : la route passe `supabaseAdmin` (clé de service).
type Resultat = { data: unknown; error: { message?: string } | null }
type Requete = PromiseLike<Resultat> & {
  select: (c: string) => Requete
  update: (v: Record<string, unknown>) => Requete
  insert: (v: Record<string, unknown>) => Requete
  eq: (c: string, v: string) => Requete
  order: (c: string, o: { ascending: boolean }) => Requete
  limit: (n: number) => Requete
  abortSignal: (s: AbortSignal) => Requete
}
export type ClientBase = { from: (table: 'demandes_demo') => unknown }
const table = (c: ClientBase) => c.from('demandes_demo') as Requete

/** L'écriture de `/api/contact` : une ligne, par la clé de service. `true` si elle est en base. Ne jette jamais. */
export async function enregistrerDemandeDemo(client: ClientBase, ligne: LigneDemandeDemo): Promise<boolean> {
  try {
    const r = await table(client).insert({ ...ligne }).abortSignal(AbortSignal.timeout(DELAI_MS))
    return !r.error
  } catch {
    return false
  }
}

/** Une ligne lue, gardée seulement si elle a la forme attendue (une valeur hors liste ne s'affiche pas en douce). */
function ligneLue(x: unknown): DemandeDemo | null {
  if (!x || typeof x !== 'object') return null
  const l = x as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' ? v : null)
  const id = l.id, motif = l.motif, taille = l.taille, activite = l.activite, etat = l.etat
  if (!estUuid(id) || !dans(MOTIFS, motif) || !dans(TAILLES, taille) || !dans(ACTIVITES, activite) || !dans(ETATS, etat)) return null
  const prenom = s(l.prenom), email = s(l.email), cree = s(l.cree_le), maj = s(l.maj_le)
  if (!prenom || !email || !cree || !maj) return null
  return { id, motif, taille, activite, prenom, email, message: s(l.message), etat,
    rendez_vous_le: s(l.rendez_vous_le), traitee_le: s(l.traitee_le), cree_le: cree, maj_le: maj }
}

export type DepsPoste = {
  /** `actif('demandesDemo')`. */
  drapeau: boolean
  estFondateur: (req: Request) => Promise<Fondateur | Refus>
  estDirection: (req: Request) => Promise<Fondateur | Refus>
  exigerDomaine: (f: Fondateur, domaine: Domaine, verbe: Verbe) => Refus | { borne: boolean }
  journaliser: (e: Entree, req: Request) => Promise<boolean>
  client: ClientBase
  maintenant?: () => Date
}

const INTROUVABLE = rep(404, { error: 'Introuvable.' })
const refus = (r: Refus) => rep(r.status, { error: r.error, code: r.code })
const RESERVE = 'Les demandes de démo sont réservées à Benjamin.'
const INDISPONIBLE = 'Les demandes de démo ne se lisent pas pour le moment (migration 0190 absente ou base injoignable).'

/** La garde commune : drapeau, compte fondateur (second facteur passé), domaine « messagerie », et jamais un rôle borné.
 *  Un partenaire ne voit que les fils qui lui sont assignés ; une demande de démo n'est assignée à personne : il n'en voit aucune. */
async function garder(req: Request, d: DepsPoste, verbe: Verbe): Promise<Fondateur | Reponse> {
  if (!d.drapeau) return INTROUVABLE
  const f = verbe === 'ecrire' ? await d.estDirection(req) : await d.estFondateur(req)
  if ('error' in f) return refus(f)
  const dom = d.exigerDomaine(f, 'messagerie', verbe)
  if ('error' in dom) return refus(dom)
  if (dom.borne || f.roleInterne !== 'fondateur') return rep(403, { error: RESERVE, code: 'hors_perimetre' })
  return f
}
const estReponse = (x: Fondateur | Reponse): x is Reponse => 'statut' in x

/** GET : les demandes, les neuves d'abord puis les plus récentes (200 au plus). */
export async function listeDemandesDemo(req: Request, d: DepsPoste): Promise<Reponse> {
  const f = await garder(req, d, 'voir')
  if (estReponse(f)) return f
  try {
    // Les neuves d'abord (« nouvelle » < « traitee »), puis les plus récentes : une demande à traiter ne sort jamais de l'écran
    // derrière des demandes traitées (audit distinct, point 9) ; index partiel demandes_demo_nouvelles_idx de 0190.
    const r = await table(d.client).select(COLONNES_POSTE).order('etat', { ascending: true }).order('cree_le', { ascending: false }).limit(LIMITE_LISTE)
      .abortSignal(AbortSignal.timeout(DELAI_MS))
    if (r.error || !Array.isArray(r.data)) return rep(503, { error: INDISPONIBLE, code: 'indisponible' })
    const demandes = r.data.map(ligneLue).filter((x): x is DemandeDemo => x !== null)
    return rep(200, { demandes, role: f.role })
  } catch {
    return rep(503, { error: INDISPONIBLE, code: 'indisponible' })
  }
}

/** POST { id } : le geste « traitée ». Journalisé d'abord (une action non journalisée n'a pas lieu), puis une mise à jour
 *  CONDITIONNELLE (`etat = nouvelle`) : deux clics, deux onglets ou un rejeu ne changent rien de plus. */
export async function marquerDemandeTraitee(req: Request, d: DepsPoste): Promise<Reponse> {
  const f = await garder(req, d, 'ecrire')
  if (estReponse(f)) return f
  const b = (await req.json().catch(() => null)) as { id?: unknown } | null
  const id = b?.id
  if (!estUuid(id)) return rep(400, { error: 'Demande inconnue.', code: 'id' })
  const journalOk = await d.journaliser({ acteur: f, action: 'courrier_classe', cible_type: 'demande_demo', cible_id: id,
    avant: { etat: 'nouvelle' }, apres: { etat: 'traitee' } }, req)
  if (!journalOk) return rep(503, { error: 'Action refusée : le journal de direction est indisponible.', code: 'journal_indisponible' })
  try {
    const quand = (d.maintenant ?? (() => new Date()))().toISOString()
    const r = await table(d.client).update({ etat: 'traitee', traitee_le: quand, traitee_par: f.uid }).eq('id', id).eq('etat', 'nouvelle')
      .select('id, etat, traitee_le').abortSignal(AbortSignal.timeout(DELAI_MS))
    if (r.error || !Array.isArray(r.data)) return rep(503, { error: 'Rien n’a changé : la base ne répond pas pour l’instant.', code: 'indisponible' })
    if (r.data.length === 1) return rep(200, { message: 'Demande marquée traitée.', id, deja: false })
    // Rien n'a bougé : déjà traitée, ou inconnue. On relit pour le dire juste.
    const l = await table(d.client).select('id, etat').eq('id', id).abortSignal(AbortSignal.timeout(DELAI_MS))
    if (l.error || !Array.isArray(l.data)) return rep(503, { error: 'Rien n’a changé : la base ne répond pas pour l’instant.', code: 'indisponible' })
    const ligne = l.data[0] as { etat?: unknown } | undefined
    if (ligne?.etat === 'traitee') return rep(200, { message: 'Cette demande était déjà traitée.', id, deja: true })
    return rep(404, { error: 'Demande inconnue.', code: 'inconnue' })
  } catch {
    return rep(503, { error: 'Rien n’a changé : la base ne répond pas pour l’instant.', code: 'indisponible' })
  }
}
