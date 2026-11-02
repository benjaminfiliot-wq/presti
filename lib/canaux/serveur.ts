// lib/canaux/serveur.ts — le côté base et réseau des canaux de messagerie de l'artisan (WhatsApp, Messenger, Instagram,
// Le Bon Coin). Module SERVEUR : service_role, Graph API, IA. La logique pure vit à côté (meta.ts, leboncoin.ts, rangement.ts).
//
// Trois choses ici :
//   1. le magasin Supabase du rangement (rangement.ts) ;
//   2. la préparation de la réponse — une PROPOSITION que l'artisan valide, jamais un envoi autonome sur ces canaux — et la
//      notification de l'artisan, comme pour une demande arrivée par sa page (app/api/leads) ;
//   3. l'envoi de la réponse validée par le même canal (Graph API), ou, pour Le Bon Coin, le lien où la coller.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { dechiffrer } from '@/lib/secretBox'
import { generateConversationReply, qualifyLead, type ConvTurn } from '@/lib/ai'
import { villeDe } from '@/lib/ville'
import { getPlateformeConfig, decisionReponse, personaDe } from '@/lib/plateformeConfig'
import { resolveModel } from '@/lib/models'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { consommerLimite, consommerLimiteStricte } from '@/lib/limites'
import { signalerPanneIA } from '@/lib/alerteService'
import { suspensionEnCours } from '@/lib/suspension'
import { notifierArtisan } from '@/lib/notifications'
import { messageVerrou } from '@/lib/plans'
import {
  LIBELLE_CANAL, estCanalMeta, fenetreOuverte, idEnvoye, lireErreurMeta, lireNomProfil, messageErreurMeta, messageHorsFenetre,
  requeteEnvoiMeta, requeteProfil, versionGraph, type CanalMeta, type HoteMeta, type RequeteMeta,
} from './meta'
import { estCanalManuel, lienReponseManuelle, sansLiens } from './libelles'
import { idEnvoyeTelegram, lireErreurTelegram, messageErreurTelegram, requeteEnvoiTelegram } from './telegram'
import { actif } from '@/lib/flags'
import { nomProvisoire, type CanalConversation, type Liaison, type MagasinCanaux } from './rangement'
import { canalOuvert, capaciteCanal, estCanalConversation, formuleCanal, piloteInterdit } from './regles'
import { MESSAGES_ESCALADE_RELUS } from '@/lib/pilote/regles'

const version = () => versionGraph(process.env.META_GRAPH_VERSION)

// 21/10/2026 (audit offensif, E2 et M1) — les plafonds des canaux, en un seul endroit.
/** Réponses préparées par l'IA au plus, par conversation et par jour. */
export const IA_PAR_FIL = 3
/** Nouvelles conversations servies par l'IA au plus, par artisan et par jour (au-delà : rangées, l'artisan répond lui-même). */
export const IA_NOUVEAUX_FILS = 20
/** Une notification au plus par conversation pendant cette durée (secondes) : les messages qui suivent sont dans la même. */
export const NOTIF_FIL_S = 20 * 60
/** Notifications de messages des canaux au plus, par artisan et par jour. */
export const NOTIF_ARTISAN_JOUR = 30
const DELAI_GRAPH_MS = 10_000

// ── 1. Le magasin ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const erreur = (ou: string, e: { message: string } | null) => { if (e) throw new Error(`[canaux] ${ou} : ${e.message}`) }

export const magasinCanaux: MagasinCanaux = {
  async liaison(type, externeId) {
    const { data, error } = await supabaseAdmin.from('canaux').select('id, artisan_id, type, actif').eq('type', type).eq('externe_id', externeId).maybeSingle()
    erreur('liaison', error)
    return (data as Liaison | null) ?? null
  },
  async marquer(canalId, externeId) {
    // ignoreDuplicates : `insert … on conflict do nothing` — atomique, la livraison qui perd la course ne reçoit aucune ligne.
    const { data, error } = await supabaseAdmin.from('canaux_evenements')
      .upsert({ canal_id: canalId, externe_id: externeId }, { onConflict: 'canal_id,externe_id', ignoreDuplicates: true }).select('canal_id')
    erreur('marquer', error)
    return Array.isArray(data) && data.length > 0
  },
  async oublier(canalId, externeId) {
    await supabaseAdmin.from('canaux_evenements').delete().eq('canal_id', canalId).eq('externe_id', externeId)
  },
  async ouvrirConversation(l, depuisIso) {
    // La qualification (urgence, type de chantier, commune) comme pour une demande du formulaire ; utilisée seulement si le fil naît.
    const { data: a } = await supabaseAdmin.from('artisans').select('metier').eq('id', l.artisan_id).maybeSingle()
    const q = qualifyLead(l.message, (a?.metier as string | null | undefined) ?? null)
    const { data, error } = await supabaseAdmin.rpc('canaux_conversation_ouvrir', {
      p: { ...l, urgence: q.urgence, type_chantier: q.type_chantier, ville: villeDe(l.message) },
      p_depuis: depuisIso,
    })
    erreur('ouvrirConversation', error)
    const o = data as { id?: unknown; statut?: unknown; nouveau?: unknown } | null
    if (!o || typeof o.id !== 'string') throw new Error('[canaux] ouvrirConversation : réponse illisible')
    return { id: o.id, statut: typeof o.statut === 'string' ? o.statut : null, nouveau: o.nouveau === true }
  },
  async rafraichir(leadId, champs) {
    const { error } = await supabaseAdmin.from('leads').update({ ...champs, lu_le: null, updated_at: new Date().toISOString() }).eq('id', leadId)
    erreur('rafraichir', error)
  },
  async ajouterMessage(m) {
    const { data, error } = await supabaseAdmin.from('messages').insert({
      lead_id: m.lead_id, sens: 'in', type: m.canal, contenu: m.contenu, canal_id: m.canal_id, externe_id: m.externe_id, sent_at: m.sent_at,
    }).select('id').single()
    erreur('ajouterMessage', error)
    return (data as { id: string }).id
  },
}

// ── 2. La préparation de la réponse et la notification ───────────────────────────────────────────────────────────────────
type FetchLike = (url: string, init: RequestInit) => Promise<Response>

async function appelerGraph(req: RequeteMeta, f: FetchLike = fetch): Promise<{ ok: boolean; corps: unknown }> {
  const arret = new AbortController()
  const minuteur = setTimeout(() => arret.abort(), DELAI_GRAPH_MS)
  try {
    const r = await f(req.url, { ...req.init, signal: arret.signal, cache: 'no-store' })
    const corps = await r.json().catch(() => null)
    return { ok: r.ok, corps }
  } catch {
    return { ok: false, corps: null }
  } finally {
    clearTimeout(minuteur)
  }
}

type LigneCanal = { id: string; artisan_id: string; type: string; externe_id: string | null; secret: string | null; meta_hote: string | null; actif: boolean }
async function ligneCanal(id: string | null | undefined, artisanId: string): Promise<LigneCanal | null> {
  if (!id) return null
  const { data } = await supabaseAdmin.from('canaux').select('id, artisan_id, type, externe_id, secret, meta_hote, actif').eq('id', id).eq('artisan_id', artisanId).maybeSingle()
  return (data as LigneCanal | null) ?? null
}
const hoteDe = (h: string | null): HoteMeta | null => (h === 'graph.instagram.com' ? 'graph.instagram.com' : h === 'graph.facebook.com' ? 'graph.facebook.com' : null)

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Après la réponse 200 au webhook (ou dans la relève, pour Le Bon Coin) : lit le nom du client si Meta ne l'a pas donné, prépare
 * une PROPOSITION de réponse (jamais un envoi), prévient l'artisan. Ne lève jamais.
 *
 * Les messages par rafales (« Bonjour » / « j'ai une fuite » / une photo) : on attend `attenteMs`, puis on ne prépare que si ce
 * message est toujours le dernier du client — la proposition tient compte des trois, et ne coûte qu'un crédit.
 */
export async function preparerReponseCanal(p: { lead_id: string; message_id: string; artisan_id: string; canal: CanalConversation; nouveau: boolean; attenteMs?: number; avecIA?: boolean }): Promise<{ proposee: boolean; notifie: boolean }> {
  try {
    if (p.attenteMs) await pause(p.attenteMs)
    const { data: dernier } = await supabaseAdmin.from('messages').select('id').eq('lead_id', p.lead_id).eq('sens', 'in').order('sent_at', { ascending: false }).limit(1).maybeSingle()
    if (dernier && dernier.id !== p.message_id) return { proposee: false, notifie: false } // un message plus récent s'en charge

    const { data: lead } = await supabaseAdmin.from('leads')
      .select('id, nom_prospect, contact, message, prise_en_main, canal_id, canal_externe_id').eq('id', p.lead_id).maybeSingle()
    const { data: artisan } = await supabaseAdmin.from('artisans')
      .select('id, nom, metier, ton_style, email, is_founder, leads_pause, services, zone_intervention, bio, tva_regime, assurance_nom, plan').eq('id', p.artisan_id).maybeSingle()
    if (!lead || !artisan) return { proposee: false, notifie: false }
    if (await suspensionEnCours(artisan.id)) return { proposee: false, notifie: false }

    // Le nom d'un client Messenger / Instagram : une lecture, au premier message, si la liaison le permet.
    let nom = lead.nom_prospect as string | null
    if (p.nouveau && estCanalMeta(p.canal) && p.canal !== 'whatsapp' && nom === nomProvisoire(p.canal) && lead.canal_externe_id) {
      const c = await ligneCanal(lead.canal_id as string | null, artisan.id)
      const jeton = c ? dechiffrer(c.secret) : null
      const req = c && jeton && c.externe_id ? requeteProfil({ canal: p.canal, compte: c.externe_id, jeton, hote: hoteDe(c.meta_hote) }, lead.canal_externe_id as string, version()) : null
      if (req) {
        const r = await appelerGraph(req)
        const lu = r.ok ? lireNomProfil(r.corps) : null
        if (lu) { nom = lu; await supabaseAdmin.from('leads').update({ nom_prospect: lu }).eq('id', lead.id) }
      }
    }

    const { data: fil } = await supabaseAdmin.from('messages').select('sens, contenu, sent_at').eq('lead_id', lead.id).is('etat', null).order('sent_at', { ascending: true }).limit(60)
    const tours: ConvTurn[] = ((fil as { sens: 'in' | 'out'; contenu: string }[] | null) ?? []).map((m) => ({ sens: m.sens, contenu: m.contenu }))
    const dernierTexte = [...tours].reverse().find((t) => t.sens === 'in')?.contenu ?? ''

    // La même décision que les autres entrées (lib/plateformeConfig) ; sur ces canaux, même « auto » ne fait que PRÉPARER.
    const cfg = await getPlateformeConfig(artisan.id)
    // 02/11 (troisième audit 032-005, I3) : le fil récent du client est relu pour l'escalade, comme le pilote.
    const decision = decisionReponse(artisan, { prise_en_main: lead.prise_en_main as boolean | null }, cfg, { nbReponsesIA: 0, message: dernierTexte,
      messagesClient: tours.filter((t) => t.sens === 'in').slice(-MESSAGES_ESCALADE_RELUS).map((t) => t.contenu) })
    const preparer = p.avecIA !== false && (decision.ok || decision.comportement === 'preparer')
      && formuleCanal(p.canal, artisan.plan as string | null, artisan.is_founder as boolean | null)
      && tours.some((t) => t.sens === 'in')
      && await consommerLimite(`canaux:ia:${artisan.id}`, 8, 10 * 60)
      // 21/10/2026 (audit offensif, M1) : un inconnu qui écrit en boucle à un bot ne vide pas les crédits de l'artisan — au plus
      // IA_PAR_FIL réponses préparées par conversation et par jour, et IA_NOUVEAUX_FILS nouvelles conversations servies par jour.
      // Fail-closed : base muette = pas de proposition (le message reste, l'artisan est prévenu).
      && await consommerLimiteStricte(`canaux:ia:fil:${lead.id}`, IA_PAR_FIL, 86_400)
      && (!p.nouveau || await consommerLimiteStricte(`canaux:ia:nouveaux:${artisan.id}`, IA_NOUVEAUX_FILS, 86_400))

    let proposee = false
    if (preparer) {
      const { model, tier } = resolveModel(cfg.modele || 'standard', artisan.plan as string | null)
      const credit = await consumeCredit(artisan.id, tier, !!artisan.is_founder)
      if (credit.ok) {
        try {
          const texte = await generateConversationReply(
            { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style, services: artisan.services, zone: artisan.zone_intervention, bio: artisan.bio, tva_regime: artisan.tva_regime, assurance_nom: artisan.assurance_nom },
            { nom_prospect: nom, contact: lead.contact as string | null, message: lead.message as string | null },
            tours, model, undefined, { persona: personaDe(cfg) },
          )
          if (texte?.trim()) {
            // Une seule proposition en attente par fil : la précédente, rédigée sans le dernier message, est écartée (gardée, jamais montrée).
            await supabaseAdmin.from('messages').update({ etat: 'rejete' }).eq('lead_id', lead.id).eq('etat', 'proposition')
            const { data: prop, error } = await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: texte.trim(), etat: 'proposition', modele: tier }).select('id').single()
            proposee = !error
            // 21/10/2026 — le PILOTE AUTOMATIQUE sur un canal qui envoie pour de vrai (Telegram, CANAUX_PILOTABLES de lib/canaux/regles.ts) :
            // la proposition entre dans sa file (10 min d'annulation possible), comme sur la page. piloterProposition revérifie tout
            // (drapeau, offre Signature, réglage de l'artisan, canal) et ne lève jamais.
            if (proposee && prop?.id && actif('piloteAutomatique') && !piloteInterdit(p.canal)) {
              await (await import('@/lib/pilote/serveur')).piloterProposition(artisan.id, { leadId: lead.id, messageId: prop.id as string, nomProspect: nom })
            }
          }
        } catch (e) {
          console.error('[canaux] proposition : échec de l’IA')
          await signalerPanneIA(`proposition de réponse (canal ${p.canal})`, e)
        }
        if (!proposee) await rendreCredit(artisan.id, tier, !!artisan.is_founder)
      }
    }

    // 21/10/2026 (audit offensif, E2) : la notification de l'artisan est REGROUPÉE — au plus une par conversation toutes les
    // NOTIF_FIL_S secondes, et NOTIF_ARTISAN_JOUR par artisan et par jour — et elle puise dans SA part du plafond d'e-mails
    // (`part: 'canaux'`, lib/email.ts), pas dans celle des devis et factures de tous les comptes. Un inconnu qui inonde un bot (ou
    // des notifications relevées en rafale) ne peut plus vider les envois du produit.
    const peutNotifier = await consommerLimiteStricte(`canaux:notif:${lead.id}`, 1, NOTIF_FIL_S)
      && await consommerLimiteStricte(`canaux:notif:artisan:${artisan.id}`, NOTIF_ARTISAN_JOUR, 86_400)
    if (!peutNotifier) return { proposee, notifie: false }
    const libelle = LIBELLE_CANAL[p.canal]
    const qui = sansLiens(nom || 'un client', 80)
    const extrait = sansLiens(dernierTexte || 'non précisé', 1500)
    const r = await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email as string | null, {
      leadId: lead.id,
      part: 'canaux',
      // L'objet ne porte JAMAIS le nom donné par l'expéditeur (audit du 21/10) : un nom Telegram se choisit librement.
      subject: proposee ? `Réponse proposée — à valider — ${libelle}` : `Nouveau message ${libelle}`,
      text: proposee
        ? `${qui} vous a écrit sur ${libelle}. Une réponse est prête : relisez-la et validez-la dans votre espace (Messages) — rien n’est parti sans vous${estCanalManuel(p.canal) ? ` (un clic la copie et ouvre la conversation sur ${libelle} : vous la collez)` : ''}.\n\nSon message : ${extrait}`
        : `${qui} vous a écrit sur ${libelle}.\n\nSon message : ${extrait}\n\nRépondez-lui depuis votre espace (Messages).`,
    }).catch(() => ({ envoye: false }))
    return { proposee, notifie: !!r.envoye }
  } catch {
    console.error('[canaux] préparation en échec')
    return { proposee: false, notifie: false }
  }
}

// ── 3. L'envoi de la réponse validée ─────────────────────────────────────────────────────────────────────────────────────
export type LeadEnvoi = {
  id: string; artisan_id: string; canal: string | null
  canal_id?: string | null; canal_externe_id?: string | null; canal_dernier_entrant_le?: string | null; canal_lien_reponse?: string | null
}

export type IssueEnvoi =
  | { traite: false }
  | { traite: true; ok: true; canal: CanalConversation; externe_id: string | null; canal_id: string | null; manuel?: { lien: string } }
  | { traite: true; ok: false; canal: CanalConversation; statut: number; erreur: string; hors_fenetre?: boolean }

/** Les colonnes de 0139 : lues SEULEMENT pour une conversation venue d'un de ces canaux (qui n'existe qu'après 0139). */
export async function completerLeadCanal<T extends { id: string; canal?: string | null }>(lead: T): Promise<T & Partial<LeadEnvoi>> {
  if (!estCanalConversation(lead.canal)) return lead
  const { data } = await supabaseAdmin.from('leads').select('canal_id, canal_externe_id, canal_dernier_entrant_le, canal_lien_reponse').eq('id', lead.id).maybeSingle()
  return { ...lead, ...((data as Partial<LeadEnvoi> | null) ?? {}) }
}

/**
 * La réponse validée par l'artisan part par le canal de la conversation. `traite: false` : ce n'est pas une conversation de
 * ces canaux, la route garde son chemin habituel (e-mail ou plateforme). En cas d'échec, RIEN n'est marqué envoyé.
 */
export async function envoyerReponseCanal(lead: LeadEnvoi, texte: string, f: FetchLike = fetch): Promise<IssueEnvoi> {
  if (!estCanalConversation(lead.canal)) return { traite: false }
  const canal = lead.canal
  if (!canalOuvert(canal)) return { traite: true, ok: false, canal, statut: 409, erreur: `Le canal ${LIBELLE_CANAL[canal]} n’est pas encore ouvert : rien n’est parti.` }

  if (estCanalManuel(canal)) {
    // Pas d'API (Le Bon Coin ; 21/10/2026 : LinkedIn, Page Facebook, Instagram, TikTok, plateformes de devis, lus par leurs e-mails de
    // notification) : l'artisan colle la réponse lui-même. On ne marque envoyé que parce qu'il l'a copiée pour la coller.
    return { traite: true, ok: true, canal, externe_id: null, canal_id: lead.canal_id ?? null, manuel: { lien: lienReponseManuelle(canal, lead.canal_lien_reponse) as string } }
  }

  if (canal === 'telegram') return envoyerTelegram(lead, texte, f)
  if (!estCanalMeta(canal)) return { traite: true, ok: false, canal, statut: 409, erreur: 'Canal inconnu : rien n’est parti.' }

  const { data: a } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', lead.artisan_id).maybeSingle()
  if (!formuleCanal(canal, a?.plan as string | null, a?.is_founder as boolean | null)) return { traite: true, ok: false, canal, statut: 403, erreur: messageVerrou(capaciteCanal(canal)) }
  if (!fenetreOuverte(lead.canal_dernier_entrant_le)) return { traite: true, ok: false, canal, statut: 409, erreur: messageHorsFenetre(canal), hors_fenetre: true }

  const c = await ligneCanal(lead.canal_id, lead.artisan_id)
  if (!c || !c.actif || c.type !== canal || !c.externe_id) return { traite: true, ok: false, canal, statut: 409, erreur: `Ce ${LIBELLE_CANAL[canal]} a été déconnecté : reconnectez-le dans Messages → Canaux. Rien n’est parti.` }
  const jeton = dechiffrer(c.secret)
  const req = requeteEnvoiMeta({ canal, compte: c.externe_id, jeton: jeton ?? '', hote: hoteDe(c.meta_hote) }, lead.canal_externe_id ?? '', texte, version())
  if ('erreur' in req) return { traite: true, ok: false, canal, statut: 400, erreur: req.erreur }

  const r = await appelerGraph(req, f)
  if (!r.ok) {
    const e = lireErreurMeta(r.corps)
    if (e.genre === 'jeton' || e.genre === 'permission') await supabaseAdmin.from('canaux').update({ derniere_erreur: messageErreurMeta(canal, e).slice(0, 300) }).eq('id', c.id)
    console.error('[canaux] envoi refusé :', canal, e.genre, e.code ?? '-', e.sous_code ?? '-')
    return { traite: true, ok: false, canal, statut: e.genre === 'hors_fenetre' ? 409 : 502, erreur: messageErreurMeta(canal as CanalMeta, e), hors_fenetre: e.genre === 'hors_fenetre' }
  }
  return { traite: true, ok: true, canal, externe_id: idEnvoye(r.corps), canal_id: c.id }
}

/** Le chemin de connexion lit et écrit ces lignes ; exporté pour app/api/canaux/meta/liaison. */
export { appelerGraph }

// ── 4. Telegram (21/10/2026, drapeau canauxTelegram) ─────────────────────────────────────────────────────────────────────
/** La liaison Telegram d'une adresse de webhook (id de la ligne `canaux`), ou null. Lue par la route APRÈS la vérification du secret. */
export async function liaisonTelegram(id: string): Promise<Liaison | null> {
  const { data, error } = await supabaseAdmin.from('canaux').select('id, artisan_id, type, actif, externe_id').eq('id', id).eq('type', 'telegram').maybeSingle()
  erreur('liaisonTelegram', error)
  return (data as Liaison | null) ?? null
}

/** Le fil de cette personne existe-t-il déjà (30 jours, comme canaux_conversation_ouvrir) ? Sert au plafond de NOUVEAUX fils par bot. */
export async function filTelegramExiste(artisanId: string, personne: string): Promise<boolean> {
  const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data, error } = await supabaseAdmin.from('leads').select('id').eq('artisan_id', artisanId).eq('canal', 'telegram')
    .eq('canal_externe_id', personne).gte('updated_at', depuis).limit(1)
  erreur('filTelegramExiste', error)
  return (data ?? []).length > 0
}

/** La réponse part par le bot Telegram de l'artisan (pas de fenêtre de 24 h : le client a écrit le premier, le bot peut répondre). */
async function envoyerTelegram(lead: LeadEnvoi, texte: string, f: FetchLike): Promise<IssueEnvoi> {
  const canal = 'telegram' as const
  const { data: a } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', lead.artisan_id).maybeSingle()
  if (!formuleCanal(canal, a?.plan as string | null, a?.is_founder as boolean | null)) return { traite: true, ok: false, canal, statut: 403, erreur: messageVerrou(capaciteCanal(canal)) }
  const c = await ligneCanal(lead.canal_id, lead.artisan_id)
  if (!c || !c.actif || c.type !== canal) return { traite: true, ok: false, canal, statut: 409, erreur: 'Ce bot Telegram a été déconnecté : reconnectez-le dans Messages → Canaux. Rien n’est parti.' }
  // Le fil appartient à CE bot (<id du bot>:<chat>) : jamais un message envoyé par le bot d'un autre fil.
  const [botDuFil, chatId] = String(lead.canal_externe_id ?? '').split(':')
  if (!c.externe_id || botDuFil !== c.externe_id || !chatId) return { traite: true, ok: false, canal, statut: 409, erreur: 'Cette conversation n’est pas celle de ce bot : rien n’est parti.' }
  const jeton = dechiffrer(c.secret)
  const req = requeteEnvoiTelegram(jeton ?? '', chatId, texte)
  if ('erreur' in req) return { traite: true, ok: false, canal, statut: 400, erreur: req.erreur }
  const arret = new AbortController()
  const minuteur = setTimeout(() => arret.abort(), DELAI_GRAPH_MS)
  let statut = 0
  let corps: unknown = null
  try {
    const r = await f(req.url, { ...req.init, signal: arret.signal, cache: 'no-store' })
    statut = r.status
    corps = await r.json().catch(() => null)
  } catch { statut = 0 } finally { clearTimeout(minuteur) }
  if (statut >= 200 && statut < 300 && (corps as { ok?: unknown } | null)?.ok === true) {
    return { traite: true, ok: true, canal, externe_id: idEnvoyeTelegram(corps, chatId), canal_id: c.id }
  }
  const e = lireErreurTelegram(statut, corps)
  if (e.genre === 'jeton') await supabaseAdmin.from('canaux').update({ derniere_erreur: messageErreurTelegram(e).slice(0, 300) }).eq('id', c.id)
  // Jamais l'adresse (elle porte le jeton), jamais la description brute de Telegram.
  console.error('[canaux] envoi Telegram refusé :', e.genre, e.code ?? '-')
  return { traite: true, ok: false, canal, statut: e.genre === 'debit' ? 429 : 502, erreur: messageErreurTelegram(e) }
}
