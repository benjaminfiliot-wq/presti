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
import { consommerLimite } from '@/lib/limites'
import { signalerPanneIA } from '@/lib/alerteService'
import { suspensionEnCours } from '@/lib/suspension'
import { notifierArtisan } from '@/lib/notifications'
import { messageVerrou } from '@/lib/plans'
import {
  LIBELLE_CANAL, estCanalMeta, fenetreOuverte, idEnvoye, lireErreurMeta, lireNomProfil, messageErreurMeta, messageHorsFenetre,
  requeteEnvoiMeta, requeteProfil, versionGraph, type CanalMeta, type HoteMeta, type RequeteMeta,
} from './meta'
import { LIEN_MESSAGERIE_LEBONCOIN } from './libelles'
import { nomProvisoire, type CanalConversation, type Liaison, type MagasinCanaux } from './rangement'
import { canalOuvert, capaciteCanal, estCanalConversation, formuleCanal } from './regles'

const version = () => versionGraph(process.env.META_GRAPH_VERSION)
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
    const decision = decisionReponse(artisan, { prise_en_main: lead.prise_en_main as boolean | null }, cfg, { nbReponsesIA: 0, message: dernierTexte })
    const preparer = p.avecIA !== false && (decision.ok || decision.comportement === 'preparer')
      && formuleCanal(p.canal, artisan.plan as string | null, artisan.is_founder as boolean | null)
      && tours.some((t) => t.sens === 'in')
      && await consommerLimite(`canaux:ia:${artisan.id}`, 8, 10 * 60)

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
            const { error } = await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: texte.trim(), etat: 'proposition', modele: tier })
            proposee = !error
          }
        } catch (e) {
          console.error('[canaux] proposition : échec de l’IA')
          await signalerPanneIA(`proposition de réponse (canal ${p.canal})`, e)
        }
        if (!proposee) await rendreCredit(artisan.id, tier, !!artisan.is_founder)
      }
    }

    const libelle = LIBELLE_CANAL[p.canal]
    const qui = nom || 'un client'
    const r = await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email as string | null, {
      leadId: lead.id,
      subject: proposee ? `Réponse proposée — à valider — ${libelle} — ${qui}` : `Nouveau message ${libelle} — ${qui}`,
      text: proposee
        ? `${qui} vous a écrit sur ${libelle}. Une réponse est prête : relisez-la et validez-la dans votre espace (Messages) — rien n’est parti sans vous.\n\nSon message : ${dernierTexte || 'non précisé'}`
        : `${qui} vous a écrit sur ${libelle}.\n\nSon message : ${dernierTexte || 'non précisé'}\n\nRépondez-lui depuis votre espace (Messages).`,
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

  if (canal === 'leboncoin') {
    // Pas d'API : l'artisan colle la réponse lui-même. On ne marque envoyé que parce qu'il l'a copiée pour la coller.
    return { traite: true, ok: true, canal, externe_id: null, canal_id: lead.canal_id ?? null, manuel: { lien: lead.canal_lien_reponse || LIEN_MESSAGERIE_LEBONCOIN } }
  }

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
