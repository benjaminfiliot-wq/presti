// lib/canaux/meta.ts — les canaux Meta DE L'ARTISAN (WhatsApp Cloud API, Messenger, Instagram Messaging).
//
// À ne pas confondre avec lib/agents/acquisition/metaWebhooks.ts : celui-là range les messages reçus par la Page et le compte
// Instagram de PRESTI (prospection). Ici, ce sont les clients d'un artisan qui lui écrivent sur SON numéro WhatsApp Business,
// SA Page ou SON compte Instagram, et la réponse validée par l'artisan repart par le même canal.
//
// Module PUR : aucune base, aucun réseau, aucune variable d'environnement. La signature, la lecture des trois charges utiles,
// la fenêtre de 24 h, la construction des requêtes d'envoi et la lecture des erreurs de la Graph API sont testées hors ligne
// (scripts/canaux-meta-e2e.mjs). Aucune valeur d'un corps (texte, nom, numéro), aucun jeton n'est écrit dans `console.*`.
//
// Les formats sont ceux de la documentation publique de Meta au 12/10/2026 :
//   • WhatsApp : object « whatsapp_business_account », entry[].changes[].value.{metadata.phone_number_id, contacts[], messages[]} ;
//     envoi POST /{phone_number_id}/messages { messaging_product: 'whatsapp', to, type: 'text', text: { body } } ;
//   • Messenger : object « page », entry[].messaging[] { sender.id (PSID), recipient.id (page), message.{mid,text,is_echo} } ;
//     envoi POST /me/messages (jeton de Page) { recipient: { id }, messaging_type: 'RESPONSE', message: { text } } ;
//   • Instagram : object « instagram », même forme que Messenger ; envoi POST /me/messages, par graph.facebook.com (jeton de la
//     Page liée, « Messenger API for Instagram ») ou par graph.instagram.com (jeton « Instagram API with Instagram Login »).
// [à vérifier sur un vrai message le jour où l'application Meta de l'artisan est branchée]
import crypto from 'node:crypto'
import { LIBELLE_CANAL } from './libelles.ts'

export type CanalMeta = 'whatsapp' | 'messenger' | 'instagram'
export const CANAUX_META: readonly CanalMeta[] = ['whatsapp', 'messenger', 'instagram'] as const
export const estCanalMeta = (x: unknown): x is CanalMeta => typeof x === 'string' && (CANAUX_META as readonly string[]).includes(x)

export { LIBELLE_CANAL }

/** Version de la Graph API : la même que le client d'acquisition (envoiMeta.ts). Surchargeable, jamais devinée ailleurs. */
export const VERSION_GRAPH_DEFAUT = 'v26.0'
const RE_VERSION = /^v\d{1,2}\.\d$/
export const versionGraph = (v?: string | null): string => (v && RE_VERSION.test(v) ? v : VERSION_GRAPH_DEFAUT)

export type HoteMeta = 'graph.facebook.com' | 'graph.instagram.com'
export const HOTES_META: readonly HoteMeta[] = ['graph.facebook.com', 'graph.instagram.com'] as const

// ── La signature ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const RE_HEX64 = /^[0-9a-f]{64}$/

/** `X-Hub-Signature-256: sha256=<HMAC-SHA256 hexadécimal du corps BRUT>`, clé = secret de l'application, temps constant. */
export function verifierSignatureMeta(corpsBrut: Uint8Array | string, entete: string | null | undefined, secret: string | null | undefined): boolean {
  if (typeof entete !== 'string' || typeof secret !== 'string' || secret === '') return false
  if (!entete.startsWith('sha256=')) return false
  const recu = entete.slice('sha256='.length).trim().toLowerCase()
  if (!RE_HEX64.test(recu)) return false
  const attendu = crypto.createHmac('sha256', secret).update(corpsBrut).digest()
  const propose = Buffer.from(recu, 'hex')
  return propose.length === attendu.length && crypto.timingSafeEqual(propose, attendu)
}

/** Égalité de deux chaînes en temps constant (jeton de vérification du GET). */
export function memeChaine(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest()
  const hb = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

/** Le GET d'abonnement : renvoie le défi à rendre, ou null (→ 403). */
export function reponseVerification(params: URLSearchParams, jetonAttendu: string | null | undefined): string | null {
  if (!jetonAttendu) return null
  const jeton = params.get('hub.verify_token')
  const defi = params.get('hub.challenge')
  if (params.get('hub.mode') !== 'subscribe' || jeton === null || !memeChaine(jeton, jetonAttendu)) return null
  if (defi === null || !/^[0-9A-Za-z_-]{1,64}$/.test(defi)) return null
  return defi
}

// ── La lecture des charges utiles ────────────────────────────────────────────────────────────────────────────────────────
/** Un message entrant, neutre, quel que soit le produit Meta. */
export type EntrantMeta = {
  canal: CanalMeta
  /** Le compte de l'ARTISAN qui reçoit : phone_number_id (WhatsApp), id de Page (Messenger), id du compte Instagram. */
  compte: string
  /** La personne qui écrit : wa_id (numéro, WhatsApp), PSID (Messenger), IGSID (Instagram). */
  expediteur: string
  /** Le nom affiché quand Meta le donne (WhatsApp seulement, dans `contacts[].profile.name`). */
  nom: string | null
  /** L'identifiant du message chez Meta (wamid / mid) : la clé d'idempotence. */
  id_message: string
  texte: string
  piece_jointe: boolean
  recu_le: string
}

type Objet = Record<string, unknown>
const objet = (x: unknown): Objet | null => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Objet) : null)
const MAX_ID = 200
const MAX_TEXTE = 4000
const MAX_EVENEMENTS = 100
const ident = (x: unknown): string | null => {
  const s = typeof x === 'number' && Number.isSafeInteger(x) ? String(x) : typeof x === 'string' ? x.trim() : ''
  return s !== '' && s.length <= MAX_ID && /^[A-Za-z0-9_.:=+\-/]+$/.test(s) ? s : null
}
const texteDe = (x: unknown): string => (typeof x === 'string' ? x.normalize('NFC').replace(/\u0000/g, '').slice(0, MAX_TEXTE).trim() : '')
const isoDepuis = (v: unknown, enMs: boolean, repli: number): string => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,16}$/.test(v) ? Number(v) : Number.NaN
  const d = Number.isFinite(n) && n > 0 ? new Date(enMs ? n : n * 1000) : new Date(repli)
  return Number.isNaN(d.getTime()) ? new Date(repli).toISOString() : d.toISOString()
}

/** Libellé d'un message WhatsApp sans texte : l'artisan sait au moins ce qu'il a reçu. */
const LIBELLES_WA: Record<string, string> = {
  image: '[photo]', video: '[vidéo]', audio: '[message vocal]', voice: '[message vocal]', document: '[document]',
  sticker: '[autocollant]', location: '[position partagée]', contacts: '[fiche contact]',
}

function lireWhatsapp(racine: Objet, maintenant: number): EntrantMeta[] {
  const sortie: EntrantMeta[] = []
  for (const e of Array.isArray(racine.entry) ? racine.entry : []) {
    const entree = objet(e)
    for (const c of Array.isArray(entree?.changes) ? entree!.changes as unknown[] : []) {
      const changement = objet(c)
      const valeur = objet(changement?.value)
      if (!changement || !valeur || changement.field !== 'messages') continue
      const compte = ident(objet(valeur.metadata)?.phone_number_id)
      if (!compte) continue
      const noms = new Map<string, string>()
      for (const k of Array.isArray(valeur.contacts) ? valeur.contacts : []) {
        const contact = objet(k)
        const wa = ident(contact?.wa_id)
        const nom = objet(contact?.profile)?.name
        if (wa && typeof nom === 'string' && nom.trim()) noms.set(wa, nom.trim().slice(0, 80))
      }
      // `statuses` (envoyé, distribué, lu, échec) ne sont pas des messages entrants : ignorés ici.
      for (const m of Array.isArray(valeur.messages) ? valeur.messages : []) {
        const msg = objet(m)
        if (!msg) continue
        const expediteur = ident(msg.from)
        const id = ident(msg.id)
        const type = typeof msg.type === 'string' ? msg.type : ''
        if (!expediteur || !id || type === 'reaction' || type === 'system' || type === 'ephemeral') continue
        let texte = ''
        let piece = false
        if (type === 'text') texte = texteDe(objet(msg.text)?.body)
        else if (type === 'button') texte = texteDe(objet(msg.button)?.text)
        else if (type === 'interactive') {
          const i = objet(msg.interactive)
          texte = texteDe(objet(i?.button_reply)?.title) || texteDe(objet(i?.list_reply)?.title)
        } else if (LIBELLES_WA[type]) {
          piece = type !== 'location' && type !== 'contacts'
          const legende = texteDe(objet(msg[type])?.caption)
          texte = legende ? `${LIBELLES_WA[type]} ${legende}` : LIBELLES_WA[type]
        } else texte = '[message non pris en charge par WhatsApp — ouvrez WhatsApp pour le lire]'
        if (!texte) continue
        sortie.push({ canal: 'whatsapp', compte, expediteur, nom: noms.get(expediteur) ?? null, id_message: id, texte, piece_jointe: piece, recu_le: isoDepuis(msg.timestamp, false, maintenant) })
        if (sortie.length >= MAX_EVENEMENTS) return sortie
      }
    }
  }
  return sortie
}

function lireMessagerie(racine: Objet, canal: 'messenger' | 'instagram', maintenant: number): EntrantMeta[] {
  const sortie: EntrantMeta[] = []
  for (const e of Array.isArray(racine.entry) ? racine.entry : []) {
    const entree = objet(e)
    const compte = ident(entree?.id)
    if (!entree || !compte) continue
    for (const m of Array.isArray(entree.messaging) ? entree.messaging : []) {
      const evt = objet(m)
      const message = objet(evt?.message)
      if (!evt || !message) continue // postbacks, lectures, réactions, accusés : pas des messages du client
      if (message.is_echo === true || message.is_deleted === true || message.is_unsupported === true) continue
      const expediteur = ident(objet(evt.sender)?.id)
      const id = ident(message.mid)
      if (!expediteur || !id || expediteur === compte) continue
      const piece = Array.isArray(message.attachments) && message.attachments.length > 0
      const texte = texteDe(message.text) || (piece ? '[pièce jointe]' : '')
      if (!texte) continue
      sortie.push({ canal, compte, expediteur, nom: null, id_message: id, texte, piece_jointe: piece, recu_le: isoDepuis(evt.timestamp, true, maintenant) })
      if (sortie.length >= MAX_EVENEMENTS) return sortie
    }
  }
  return sortie
}

/** Les messages entrants d'un corps de webhook, quel que soit le produit. Ne lève jamais ; tout l'inconnu est ignoré. */
export function lireWebhookMeta(corps: unknown, maintenant = Date.now()): EntrantMeta[] {
  const racine = objet(corps)
  if (!racine) return []
  if (racine.object === 'whatsapp_business_account') return lireWhatsapp(racine, maintenant)
  if (racine.object === 'page') return lireMessagerie(racine, 'messenger', maintenant)
  if (racine.object === 'instagram') return lireMessagerie(racine, 'instagram', maintenant)
  return []
}

// ── La fenêtre de 24 heures ───────────────────────────────────────────────────────────────────────────────────────────────
/** 24 h moins une marge de 5 min : on ne joue pas l'envoi à la seconde près contre l'horloge de Meta. */
export const FENETRE_MS = 24 * 3600 * 1000 - 5 * 60 * 1000

/** La fenêtre de service client est-elle ouverte ? Sans date du dernier message du client : fermée (on n'envoie pas). */
export function fenetreOuverte(dernierEntrant: string | Date | null | undefined, maintenant = Date.now()): boolean {
  if (!dernierEntrant) return false
  const t = new Date(dernierEntrant).getTime()
  if (!Number.isFinite(t)) return false
  return t <= maintenant + 60_000 && maintenant - t < FENETRE_MS
}

/** Ce qu'on dit à l'artisan quand la fenêtre est fermée — la réponse reste dans sa boîte, rien n'est parti. */
export function messageHorsFenetre(canal: CanalMeta): string {
  if (canal === 'whatsapp') {
    return 'Rien n’est parti : votre client a écrit il y a plus de 24 heures. Passé ce délai, WhatsApp n’accepte qu’un « modèle de message » approuvé par Meta, que Presti n’envoie pas. Appelez-le, ou attendez qu’il vous réécrive : la réponse est gardée ici.'
  }
  return `Rien n’est parti : votre client a écrit il y a plus de 24 heures, et ${LIBELLE_CANAL[canal]} refuse alors les réponses d’une entreprise. Attendez qu’il vous réécrive : la réponse est gardée ici.`
}

// ── La construction des requêtes d'envoi ─────────────────────────────────────────────────────────────────────────────────
/** Longueur maximale d'un message texte, par produit (documentation Meta). On REFUSE au-delà, on ne coupe pas en douce. */
export const LONGUEUR_MAX: Record<CanalMeta, number> = { whatsapp: 4096, messenger: 2000, instagram: 1000 }

/** Le texte tel qu'il part : le gras Markdown de l'assistant (**x**) devient *x* sur WhatsApp, disparaît ailleurs. */
export function texteSortant(canal: CanalMeta, texte: string): string {
  const t = texte.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return canal === 'whatsapp' ? t.replace(/\*\*(.+?)\*\*/g, '*$1*') : t.replace(/\*\*(.+?)\*\*/g, '$1')
}

export type LiaisonEnvoi = {
  canal: CanalMeta
  /** WhatsApp : phone_number_id. Messenger : id de Page. Instagram : id du compte Instagram. */
  compte: string
  jeton: string
  /** Instagram seulement : par la Page liée (graph.facebook.com, défaut) ou par Instagram Login (graph.instagram.com). */
  hote?: HoteMeta | null
}

export type RequeteMeta = { url: string; init: { method: 'POST' | 'GET'; headers: Record<string, string>; body?: string } }

/** La requête d'envoi d'un message texte, ou la raison pour laquelle elle ne doit pas partir. Le jeton est dans l'en-tête, jamais dans l'adresse. */
export function requeteEnvoiMeta(l: LiaisonEnvoi, destinataire: string, texteBrut: string, version?: string | null): RequeteMeta | { erreur: string } {
  if (!estCanalMeta(l.canal)) return { erreur: 'Canal inconnu.' }
  if (!ident(l.compte) || !ident(destinataire)) return { erreur: 'Destinataire ou compte illisible.' }
  if (!l.jeton) return { erreur: 'Le jeton d’accès de ce canal est illisible : reconnectez-le dans Messages → Canaux.' }
  const texte = texteSortant(l.canal, texteBrut)
  if (!texte) return { erreur: 'Message vide.' }
  if ([...texte].length > LONGUEUR_MAX[l.canal]) return { erreur: `Message trop long pour ${LIBELLE_CANAL[l.canal]} (${LONGUEUR_MAX[l.canal]} signes au plus) : raccourcissez-le.` }
  const v = versionGraph(version)
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${l.jeton}` }
  if (l.canal === 'whatsapp') {
    // `to` : le wa_id reçu (chiffres seuls) ; preview_url faux : pas d'aperçu de lien fabriqué au nom de l'artisan.
    const to = destinataire.replace(/[^0-9]/g, '')
    if (to.length < 6 || to.length > 20) return { erreur: 'Numéro du client illisible.' }
    return {
      url: `https://graph.facebook.com/${v}/${encodeURIComponent(l.compte)}/messages`,
      init: { method: 'POST', headers, body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body: texte } }) },
    }
  }
  const hote: HoteMeta = l.canal === 'instagram' && l.hote === 'graph.instagram.com' ? 'graph.instagram.com' : 'graph.facebook.com'
  return {
    url: `https://${hote}/${v}/me/messages`,
    // messaging_type RESPONSE : une réponse dans la fenêtre standard. Aucune étiquette (HUMAN_AGENT…) : elle demande une permission à part.
    init: { method: 'POST', headers, body: JSON.stringify({ recipient: { id: destinataire }, messaging_type: 'RESPONSE', message: { text: texte } }) },
  }
}

/** L'identifiant du message envoyé, lu dans la réponse de Meta (WhatsApp : messages[0].id ; Messenger/Instagram : message_id). */
export function idEnvoye(corps: unknown): string | null {
  const o = objet(corps)
  if (!o) return null
  const wa = Array.isArray(o.messages) ? ident(objet(o.messages[0])?.id) : null
  return wa ?? ident(o.message_id)
}

// ── La lecture des erreurs de la Graph API ───────────────────────────────────────────────────────────────────────────────
export type ErreurMeta = { genre: 'hors_fenetre' | 'jeton' | 'permission' | 'debit' | 'destinataire' | 'autre'; code: number | null; sous_code: number | null }

/** Classe une erreur Graph (le message brut de Meta n'est jamais renvoyé tel quel à l'interface). */
export function lireErreurMeta(corps: unknown): ErreurMeta {
  const e = objet(objet(corps)?.error)
  const code = typeof e?.code === 'number' ? e.code : null
  const sous = typeof e?.error_subcode === 'number' ? e.error_subcode : null
  const r = (genre: ErreurMeta['genre']): ErreurMeta => ({ genre, code, sous_code: sous })
  // WhatsApp 131047 : « Re-engagement message », plus de 24 h. Messenger/Instagram : code 10, sous-codes 2018278 / 2534022.
  if (code === 131047 || (code === 10 && (sous === 2018278 || sous === 2534022))) return r('hors_fenetre')
  if (code === 190 || code === 102) return r('jeton')
  if (code === 10 || code === 200 || code === 3 || (code !== null && code >= 200 && code < 300)) return r('permission')
  if (code === 4 || code === 17 || code === 32 || code === 613 || code === 80007 || code === 130429 || code === 131056) return r('debit')
  if (code === 100 || code === 131026 || code === 131030 || code === 551) return r('destinataire')
  return r('autre')
}

export function messageErreurMeta(canal: CanalMeta, e: ErreurMeta): string {
  const nom = LIBELLE_CANAL[canal]
  switch (e.genre) {
    case 'hors_fenetre': return messageHorsFenetre(canal)
    case 'jeton': return `Rien n’est parti : ${nom} a refusé le jeton d’accès (expiré ou révoqué). Reconnectez le canal dans Messages → Canaux.`
    case 'permission': return `Rien n’est parti : l’application Meta n’a pas la permission d’envoyer sur ce ${nom}. Vérifiez la connexion dans Messages → Canaux.`
    case 'debit': return `Rien n’est parti : ${nom} limite le nombre d’envois en ce moment. Réessayez dans quelques minutes.`
    case 'destinataire': return `Rien n’est parti : ${nom} ne reconnaît pas ce destinataire (compte fermé, ou numéro sans WhatsApp).`
    default: return `Rien n’est parti : ${nom} a refusé le message. Réessayez, ou répondez-lui directement depuis ${nom}.`
  }
}

// ── La connexion d'un canal (vérification du jeton, abonnement aux webhooks) ─────────────────────────────────────────────
/**
 * La lecture qui PROUVE que le jeton donne bien accès au compte déclaré — sans elle, un artisan pourrait déclarer le numéro ou
 * la Page d'un autre et détourner ses messages (le rattachement se fait par cet identifiant).
 *   • WhatsApp : GET /{phone_number_id}?fields=display_phone_number,verified_name
 *   • Messenger : GET /me?fields=id,name (un jeton de PAGE répond par la Page elle-même)
 *   • Instagram par la Page : GET /{page_id}?fields=id,name,instagram_business_account{id,username}
 *   • Instagram Login : GET graph.instagram.com/me?fields=user_id,username
 */
export function requeteVerificationLiaison(p: { canal: CanalMeta; compte: string; jeton: string; hote?: HoteMeta | null }, version?: string | null): RequeteMeta | { erreur: string } {
  if (!estCanalMeta(p.canal) || !ident(p.compte) || !p.jeton) return { erreur: 'Identifiant ou jeton manquant.' }
  const v = versionGraph(version)
  const headers = { authorization: `Bearer ${p.jeton}` }
  const c = encodeURIComponent(p.compte)
  if (p.canal === 'whatsapp') return { url: `https://graph.facebook.com/${v}/${c}?fields=display_phone_number,verified_name`, init: { method: 'GET', headers } }
  if (p.canal === 'messenger') return { url: `https://graph.facebook.com/${v}/me?fields=id,name`, init: { method: 'GET', headers } }
  if (p.hote === 'graph.instagram.com') return { url: `https://graph.instagram.com/${v}/me?fields=user_id,username`, init: { method: 'GET', headers } }
  return { url: `https://graph.facebook.com/${v}/${c}?fields=id,name,instagram_business_account%7Bid,username%7D`, init: { method: 'GET', headers } }
}

export type LiaisonVerifiee = { externe_id: string; libelle: string; page_id: string | null }

/** Lit la réponse de la vérification. `compte` = ce que l'artisan a saisi (phone_number_id, id de Page, ou id IG en Instagram Login). */
export function lireVerificationLiaison(canal: CanalMeta, compte: string, corps: unknown, hote?: HoteMeta | null): LiaisonVerifiee | { erreur: string } {
  const o = objet(corps)
  if (!o || o.error) return { erreur: 'Meta a refusé ce jeton pour ce compte : vérifiez l’identifiant et le jeton, et ses permissions.' }
  if (canal === 'whatsapp') {
    const numero = typeof o.display_phone_number === 'string' ? o.display_phone_number : null
    if (!numero) return { erreur: 'Ce jeton ne donne pas accès à ce numéro WhatsApp Business.' }
    const nom = typeof o.verified_name === 'string' ? o.verified_name : ''
    return { externe_id: compte, libelle: `${numero}${nom ? ` · ${nom}` : ''}`.slice(0, 120), page_id: null }
  }
  if (canal === 'messenger') {
    if (ident(o.id) !== compte) return { erreur: 'Ce jeton n’est pas celui de cette Page : il faut le jeton d’accès de la PAGE, pas celui de votre profil.' }
    return { externe_id: compte, libelle: String(o.name ?? 'Page Facebook').slice(0, 120), page_id: compte }
  }
  if (hote === 'graph.instagram.com') {
    const id = ident(o.user_id)
    if (!id || id !== compte) return { erreur: 'Ce jeton Instagram ne correspond pas à ce compte professionnel.' }
    return { externe_id: id, libelle: typeof o.username === 'string' ? `@${o.username}` : 'Compte Instagram', page_id: null }
  }
  const ig = objet(o.instagram_business_account)
  const igId = ident(ig?.id)
  if (ident(o.id) !== compte) return { erreur: 'Ce jeton n’est pas celui de cette Page.' }
  if (!igId) return { erreur: 'Aucun compte Instagram professionnel n’est relié à cette Page : reliez-le dans les réglages de la Page, puis recommencez.' }
  return { externe_id: igId, libelle: typeof ig?.username === 'string' ? `@${ig.username}` : 'Compte Instagram', page_id: compte }
}

/**
 * L'abonnement de l'application aux webhooks du compte (sans lui, Meta n'envoie rien même si l'application est abonnée) :
 *   • WhatsApp : POST /{waba_id}/subscribed_apps
 *   • Page (Messenger, Instagram par la Page) : POST /{page_id}/subscribed_apps?subscribed_fields=messages
 *   • Instagram Login : POST graph.instagram.com/me/subscribed_apps?subscribed_fields=messages
 */
export function requeteAbonnement(p: { canal: CanalMeta; jeton: string; waba_id?: string | null; page_id?: string | null; hote?: HoteMeta | null }, version?: string | null): RequeteMeta | { erreur: string } {
  const v = versionGraph(version)
  const init = { method: 'POST' as const, headers: { authorization: `Bearer ${p.jeton}` } }
  if (!p.jeton) return { erreur: 'Jeton manquant.' }
  if (p.canal === 'whatsapp') {
    const w = ident(p.waba_id)
    if (!w) return { erreur: 'L’identifiant du compte WhatsApp Business (WABA) est requis.' }
    return { url: `https://graph.facebook.com/${v}/${encodeURIComponent(w)}/subscribed_apps`, init }
  }
  if (p.canal === 'instagram' && p.hote === 'graph.instagram.com') return { url: `https://graph.instagram.com/${v}/me/subscribed_apps?subscribed_fields=messages`, init }
  const page = ident(p.page_id)
  if (!page) return { erreur: 'L’identifiant de la Page est requis.' }
  return { url: `https://graph.facebook.com/${v}/${encodeURIComponent(page)}/subscribed_apps?subscribed_fields=messages`, init }
}

/**
 * Un jeton de Page qui n'expire pas, à partir du jeton UTILISATEUR (souvent de courte durée) que l'artisan obtient en autorisant
 * l'application Presti : (1) échange contre un jeton utilisateur de longue durée — POST /oauth/access_token, grant_type
 * fb_exchange_token, avec l'ID et le secret de l'application (le secret dans le CORPS, jamais dans une adresse) ; (2) lecture du
 * jeton de la Page avec ce jeton long — GET /{page_id}?fields=id,name,access_token. Documentation Meta « Long-Lived Access Tokens ».
 */
export function requeteEchangeJetonLong(jetonUtilisateur: string, appId: string, appSecret: string, version?: string | null): RequeteMeta | { erreur: string } {
  if (!jetonUtilisateur || !/^[0-9]{5,30}$/.test(appId) || !appSecret) return { erreur: 'Application Meta non configurée.' }
  const corps = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: jetonUtilisateur })
  return { url: `https://graph.facebook.com/${versionGraph(version)}/oauth/access_token`, init: { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: corps.toString() } }
}
export const lireJetonLong = (corps: unknown): string | null => {
  const t = objet(corps)?.access_token
  return typeof t === 'string' && t.length >= 20 ? t : null
}
export function requeteJetonPage(pageId: string, jetonLong: string, version?: string | null): RequeteMeta | { erreur: string } {
  if (!ident(pageId) || !jetonLong) return { erreur: 'Identifiant de Page manquant.' }
  return { url: `https://graph.facebook.com/${versionGraph(version)}/${encodeURIComponent(pageId)}?fields=id,name,access_token`, init: { method: 'GET', headers: { authorization: `Bearer ${jetonLong}` } } }
}
export function lireJetonPage(pageId: string, corps: unknown): string | null {
  const o = objet(corps)
  if (!o || ident(o.id) !== pageId) return null
  return typeof o.access_token === 'string' && o.access_token.length >= 20 ? o.access_token : null
}

/** Le nom d'un client Messenger/Instagram (le webhook ne le donne pas). GET /{psid|igsid}?fields=… — lu une fois, au premier message. */
export function requeteProfil(l: LiaisonEnvoi, personne: string, version?: string | null): RequeteMeta | null {
  if (l.canal === 'whatsapp' || !ident(personne) || !l.jeton) return null
  const v = versionGraph(version)
  const hote: HoteMeta = l.canal === 'instagram' && l.hote === 'graph.instagram.com' ? 'graph.instagram.com' : 'graph.facebook.com'
  const champs = l.canal === 'messenger' ? 'first_name,last_name' : 'name,username'
  return { url: `https://${hote}/${v}/${encodeURIComponent(personne)}?fields=${champs}`, init: { method: 'GET', headers: { authorization: `Bearer ${l.jeton}` } } }
}

export function lireNomProfil(corps: unknown): string | null {
  const o = objet(corps)
  if (!o || o.error) return null
  const complet = [o.first_name, o.last_name].filter((x) => typeof x === 'string' && x.trim()).join(' ')
  const nom = complet || (typeof o.name === 'string' ? o.name : '') || (typeof o.username === 'string' ? `@${o.username}` : '')
  return nom.trim() ? nom.trim().slice(0, 80) : null
}
