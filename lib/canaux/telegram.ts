// lib/canaux/telegram.ts — le BOT TELEGRAM DE L'ARTISAN (21/10/2026, drapeau canauxTelegram).
//
// La seule messagerie grand public dont l'API officielle s'ouvre avec une clé que l'artisan obtient LUI-MÊME, sans partenariat ni
// examen : il crée son bot avec @BotFather (application Telegram), reçoit un jeton, le colle dans Messages → Canaux. Presti :
//   1. vérifie le jeton (getMe) et le CHIFFRE au repos (lib/secretBox.ts, AES-256-GCM, comme les boîtes e-mail et les jetons Meta) ;
//   2. pose le webhook du bot (setWebhook) vers /api/canaux/telegram/webhook/<id de la liaison>, avec un `secret_token` que Telegram
//      renvoie dans l'en-tête X-Telegram-Bot-Api-Secret-Token. Ce secret est DÉRIVÉ (HMAC de CANAUX_KEY et de l'id de la liaison) :
//      rien de plus à stocker, et le secret d'une liaison n'ouvre pas le chemin d'une autre (IDOR) ;
//   3. range chaque message privé dans la boîte de l'artisan ; la réponse validée (ou partie par le Pilote) repart par sendMessage.
//
// Module PUR : aucune base, aucun réseau, aucune variable d'environnement (la clé est passée en paramètre). Testé hors ligne par
// scripts/canaux-reseaux-qa.mjs. Le jeton est dans le CHEMIN de l'adresse (c'est l'API de Telegram) : ces adresses ne sont jamais
// écrites dans un journal. Marque blanche : le client parle au bot de l'artisan (son nom, sa photo) ; rien d'ajouté ne dit « Presti ».
//
// Documentation officielle (lue le 21/10/2026) : https://core.telegram.org/bots/api (getMe, setWebhook + secret_token 1-256 caractères
// A-Z a-z 0-9 _ -, deleteWebhook, sendMessage 1-4096 caractères) ; https://core.telegram.org/bots/faq (un bot n'écrit jamais en
// premier ; ~1 message/s par conversation).
import crypto from 'node:crypto'

export const API_TELEGRAM = 'https://api.telegram.org'
/** Longueur maximale d'un message texte (sendMessage). On REFUSE au-delà, on ne coupe pas en douce. */
export const LONGUEUR_MAX_TELEGRAM = 4096
/** Le jeton de BotFather : « 123456789:AA… » (identifiant du bot, deux-points, 35 caractères environ). */
export const RE_JETON_TELEGRAM = /^([0-9]{5,15}):[A-Za-z0-9_-]{30,64}$/
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export const jetonTelegramValide = (j: unknown): j is string => typeof j === 'string' && RE_JETON_TELEGRAM.test(j)
export const botIdDuJeton = (j: string): string | null => RE_JETON_TELEGRAM.exec(j)?.[1] ?? null
export const estIdLiaison = (x: unknown): x is string => typeof x === 'string' && RE_UUID.test(x)

// ── Le secret du webhook ──────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le `secret_token` d'une liaison : HMAC-SHA256(clé CANAUX_KEY, « presti:telegram-webhook:v1:<id> »), en base64url (43 caractères,
 * tous dans A-Z a-z 0-9 _ -). Null sans clé valable (32 octets) ou sans id de liaison : la route répond alors 503.
 */
export function secretWebhookTelegram(cleBase64: string | null | undefined, idLiaison: string): string | null {
  if (!cleBase64 || !estIdLiaison(idLiaison)) return null
  let cle: Buffer
  try { cle = Buffer.from(cleBase64, 'base64') } catch { return null }
  if (cle.length !== 32) return null
  // 21/10/2026 (audit offensif) : une SOUS-CLÉ dérivée (HKDF-SHA256, étiquette propre à cet usage) plutôt que CANAUX_KEY elle-même,
  // qui chiffre aussi les secrets (AES-256-GCM, lib/secretBox.ts) : une même clé ne sert pas à deux algorithmes. Le chiffrement, lui,
  // garde la clé telle quelle : les mots de passe IMAP déjà chiffrés en production doivent rester lisibles.
  const sousCle = Buffer.from(crypto.hkdfSync('sha256', cle, Buffer.alloc(0), 'presti:canaux:telegram-webhook:v1', 32))
  return crypto.createHmac('sha256', sousCle).update(`presti:telegram-webhook:v1:${idLiaison}`).digest('base64url')
}

/** L'en-tête reçu vaut-il le secret attendu ? Temps constant ; absent, vide ou trop long : non. */
export function verifierSecretTelegram(entete: string | null | undefined, attendu: string | null | undefined): boolean {
  if (typeof entete !== 'string' || typeof attendu !== 'string' || !entete || !attendu || entete.length > 256) return false
  const a = crypto.createHash('sha256').update(entete).digest()
  const b = crypto.createHash('sha256').update(attendu).digest()
  return crypto.timingSafeEqual(a, b)
}

/** L'adresse du webhook d'une liaison. `base` : l'origine publique https de l'application (jamais devinée d'un en-tête Host). */
export function urlWebhookTelegram(base: string, idLiaison: string): string | null {
  if (!estIdLiaison(idLiaison)) return null
  try {
    const u = new URL(base)
    if (u.protocol !== 'https:' || u.username || u.password) return null
    return `${u.origin}/api/canaux/telegram/webhook/${idLiaison}`
  } catch { return null }
}

// ── Les requêtes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export type RequeteTelegram = { url: string; init: { method: 'POST'; headers: Record<string, string>; body: string } }
const requete = (jeton: string, methode: string, corps: Record<string, unknown>): RequeteTelegram => ({
  url: `${API_TELEGRAM}/bot${jeton}/${methode}`,
  init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) },
})

export function requeteGetMe(jeton: string): RequeteTelegram | { erreur: string } {
  if (!jetonTelegramValide(jeton)) return { erreur: 'Jeton illisible : copiez en entier le jeton donné par BotFather (« 123456789:AA… »).' }
  return requete(jeton, 'getMe', {})
}

/**
 * Pose le webhook. `allowed_updates: ['message']` : ni modifications, ni groupes de canaux, ni paiements ; `drop_pending_updates` :
 * les messages reçus AVANT la liaison ne sont pas déversés d'un coup. `max_connections` bas : un artisan, pas une foule.
 */
export function requeteSetWebhook(jeton: string, url: string, secret: string): RequeteTelegram | { erreur: string } {
  if (!jetonTelegramValide(jeton)) return { erreur: 'Jeton illisible.' }
  if (!/^https:\/\//.test(url)) return { erreur: 'Adresse de webhook invalide.' }
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) return { erreur: 'Secret de webhook invalide.' }
  return requete(jeton, 'setWebhook', { url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true, max_connections: 5 })
}

export function requeteDeleteWebhook(jeton: string): RequeteTelegram | { erreur: string } {
  if (!jetonTelegramValide(jeton)) return { erreur: 'Jeton illisible.' }
  return requete(jeton, 'deleteWebhook', { drop_pending_updates: false })
}

/** Le texte tel qu'il part : texte brut (aucun parse_mode : rien d'interprété), le gras Markdown de l'assistant (**x**) retiré. */
export const texteSortantTelegram = (texte: string): string =>
  texte.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\*\*(.+?)\*\*/g, '$1').trim()

export function requeteEnvoiTelegram(jeton: string, chatId: string, texteBrut: string): RequeteTelegram | { erreur: string } {
  if (!jetonTelegramValide(jeton)) return { erreur: 'Le jeton de ce bot Telegram est illisible : reconnectez-le dans Messages → Canaux.' }
  if (!/^-?[0-9]{1,20}$/.test(chatId)) return { erreur: 'Destinataire illisible.' }
  const texte = texteSortantTelegram(texteBrut)
  if (!texte) return { erreur: 'Message vide.' }
  if ([...texte].length > LONGUEUR_MAX_TELEGRAM) return { erreur: `Message trop long pour Telegram (${LONGUEUR_MAX_TELEGRAM} signes au plus) : raccourcissez-le.` }
  return requete(jeton, 'sendMessage', { chat_id: chatId, text: texte, link_preview_options: { is_disabled: true } })
}

// ── Les réponses ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type Objet = Record<string, unknown>
const objet = (x: unknown): Objet | null => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Objet) : null)

/** La réponse de getMe : l'identité du bot, ou la raison du refus. */
export function lireGetMe(corps: unknown, jeton: string): { id: string; username: string; nom: string } | { erreur: string } {
  const o = objet(corps)
  const r = objet(o?.result)
  if (!o || o.ok !== true || !r) return { erreur: 'Telegram refuse ce jeton : vérifiez-le dans BotFather (/mybots → votre bot → API Token).' }
  const id = typeof r.id === 'number' && Number.isSafeInteger(r.id) ? String(r.id) : null
  if (!id || r.is_bot !== true || id !== botIdDuJeton(jeton)) return { erreur: 'Ce jeton n’est pas celui d’un bot.' }
  const username = typeof r.username === 'string' && /^[A-Za-z0-9_]{3,64}$/.test(r.username) ? r.username : ''
  if (!username) return { erreur: 'Ce bot n’a pas de nom d’utilisateur : donnez-lui en un dans BotFather.' }
  const nom = typeof r.first_name === 'string' ? r.first_name.slice(0, 80) : username
  return { id, username, nom }
}

export const reponseOk = (corps: unknown): boolean => objet(corps)?.ok === true

/** L'identifiant du message envoyé (result.message_id). */
export function idEnvoyeTelegram(corps: unknown, chatId: string): string | null {
  const r = objet(objet(corps)?.result)
  const id = r && typeof r.message_id === 'number' ? r.message_id : null
  return id === null ? null : `${chatId}:${id}`
}

export type ErreurTelegram = { genre: 'jeton' | 'bloque' | 'destinataire' | 'debit' | 'autre'; code: number | null }

/** Classe une erreur de l'API Bot (la description brute de Telegram n'est jamais renvoyée telle quelle à l'interface). */
export function lireErreurTelegram(statut: number, corps: unknown): ErreurTelegram {
  const o = objet(corps)
  const code = typeof o?.error_code === 'number' ? o.error_code : statut || null
  const description = typeof o?.description === 'string' ? o.description.toLowerCase() : ''
  if (code === 401 || code === 404) return { genre: 'jeton', code }
  if (code === 403) return { genre: 'bloque', code }
  if (code === 429) return { genre: 'debit', code }
  if (code === 400 && /chat not found|user not found|peer_id_invalid/.test(description)) return { genre: 'destinataire', code }
  return { genre: 'autre', code }
}

export function messageErreurTelegram(e: ErreurTelegram): string {
  switch (e.genre) {
    case 'jeton': return 'Rien n’est parti : Telegram refuse le jeton de votre bot (révoqué dans BotFather ?). Reconnectez-le dans Messages → Canaux.'
    case 'bloque': return 'Rien n’est parti : ce client a bloqué votre bot Telegram, ou n’a jamais ouvert la conversation.'
    case 'destinataire': return 'Rien n’est parti : Telegram ne trouve plus cette conversation.'
    case 'debit': return 'Rien n’est parti : Telegram limite le nombre d’envois en ce moment. Réessayez dans une minute.'
    default: return 'Rien n’est parti : Telegram a refusé le message. Réessayez, ou répondez-lui depuis Telegram.'
  }
}

// ── La lecture d'une mise à jour (webhook) ────────────────────────────────────────────────────────────────────────────────
export type EntrantTelegram = {
  /** La conversation privée avec le client (chat.id) : la « personne » du fil. */
  chat_id: string
  /** La clé d'idempotence : <chat.id>:<message_id> (un rejeu de Telegram porte le même). */
  id_message: string
  nom: string | null
  /** Le numéro, SEULEMENT si le client a partagé SA propre fiche contact (contact.user_id = from.id). */
  telephone: string | null
  texte: string
  piece_jointe: boolean
  recu_le: string
}

const MAX_TEXTE = 4000
const texteDe = (x: unknown): string => (typeof x === 'string' ? x.normalize('NFC').replace(/\u0000/g, '').slice(0, MAX_TEXTE).trim() : '')
const LIBELLES: [string, string, boolean][] = [
  ['photo', '[photo]', true], ['video', '[vidéo]', true], ['voice', '[message vocal]', true], ['audio', '[audio]', true],
  ['document', '[document]', true], ['video_note', '[vidéo]', true], ['sticker', '[autocollant]', false], ['location', '[position partagée]', false],
  ['contact', '[fiche contact]', false],
]

/**
 * Le message privé d'un client, ou null : groupes et canaux, messages de bots, modifications, commandes de service et tout l'inconnu
 * sont ignorés. Ne lève jamais.
 */
export function lireUpdateTelegram(corps: unknown, maintenant = Date.now()): EntrantTelegram | null {
  const u = objet(corps)
  const m = objet(u?.message)
  if (!u || !m) return null
  const chat = objet(m.chat)
  const de = objet(m.from)
  if (!chat || chat.type !== 'private' || !de || de.is_bot === true) return null
  const chatId = typeof chat.id === 'number' && Number.isSafeInteger(chat.id) ? String(chat.id) : null
  const mid = typeof m.message_id === 'number' && Number.isSafeInteger(m.message_id) ? m.message_id : null
  if (!chatId || mid === null) return null

  let texte = texteDe(m.text)
  let piece = false
  if (!texte) {
    const legende = texteDe(m.caption)
    for (const [cle, libelle, estPiece] of LIBELLES) {
      if (m[cle] !== undefined) { texte = legende ? `${libelle} ${legende}` : libelle; piece = estPiece; break }
    }
  }
  if (!texte) return null
  // « /start » : ce que Telegram envoie quand le client ouvre la conversation avec le bot. C'est un premier contact, pas une demande.
  if (/^\/start(\s|$)/.test(texte)) texte = texte.replace(/^\/start\s*/, '').trim() || 'Bonjour (premier contact par Telegram)'

  const prenom = typeof de.first_name === 'string' ? de.first_name.trim() : ''
  const nomFamille = typeof de.last_name === 'string' ? de.last_name.trim() : ''
  const nom = `${prenom} ${nomFamille}`.trim().slice(0, 80) || null
  const contact = objet(m.contact)
  const telephone = contact && typeof contact.phone_number === 'string' && contact.user_id === de.id
    ? `+${contact.phone_number.replace(/[^0-9]/g, '')}`.slice(0, 20) : null
  const t = typeof m.date === 'number' && m.date > 0 ? new Date(m.date * 1000) : new Date(maintenant)
  return { chat_id: chatId, id_message: `${chatId}:${mid}`, nom, telephone: telephone && telephone.length > 6 ? telephone : null, texte, piece_jointe: piece, recu_le: (Number.isNaN(t.getTime()) ? new Date(maintenant) : t).toISOString() }
}
