// lib/canaux/regles.ts — qui ouvre quel canal : le drapeau (la fonctionnalité existe-t-elle ?) et la formule (l'artisan
// l'a-t-il achetée ?). Une seule table, lue par le webhook, la connexion, la relève et l'envoi.
import { actif, type Flag } from '../flags.ts'
import { peut, type Capacite } from '../plans.ts'
import { CANAUX_NOTIFICATION, type CanalNotification } from './libelles.ts'
import type { CanalConversation } from './rangement.ts'

export const CANAUX_CONVERSATION: readonly CanalConversation[] = ['whatsapp', 'messenger', 'instagram', 'leboncoin', 'telegram', ...CANAUX_NOTIFICATION] as const
export const estCanalConversation = (x: unknown): x is CanalConversation => typeof x === 'string' && (CANAUX_CONVERSATION as readonly string[]).includes(x)

const parNotification = <T,>(v: T): Record<CanalNotification, T> => Object.fromEntries(CANAUX_NOTIFICATION.map((c) => [c, v])) as Record<CanalNotification, T>

const DRAPEAU: Record<CanalConversation, Flag> = {
  whatsapp: 'canauxWhatsapp', messenger: 'canauxReseaux', instagram: 'canauxReseaux', leboncoin: 'canauxLeboncoin',
  // 21/10/2026 — le bot Telegram de l'artisan ; les réseaux lus par leurs e-mails de notification.
  telegram: 'canauxTelegram', ...parNotification<Flag>('canauxNotifications'),
}
// La grille (lib/plans.ts) : WhatsApp à partir de Studio, réseaux sociaux en Signature. Le Bon Coin passe par la boîte
// e-mail branchée : il suit la capacité « canaux.email » (Studio et au-dessus depuis le 15/10 : la boîte branchée fait partie de la plateforme).
// 21/10/2026 : Telegram, messagerie instantanée comme WhatsApp, suit « canaux.whatsapp » (Studio) ; les notifications passent par la
// boîte branchée, comme Le Bon Coin : « canaux.email » (Studio). Aucune ligne de lib/plans.ts n'est changée (voir le rapport du chantier).
const CAPACITE: Record<CanalConversation, Capacite> = {
  whatsapp: 'canaux.whatsapp', messenger: 'canaux.reseaux', instagram: 'canaux.reseaux', leboncoin: 'canaux.email',
  telegram: 'canaux.whatsapp', ...parNotification<Capacite>('canaux.email'),
}

export const canalOuvert = (c: CanalConversation): boolean => actif(DRAPEAU[c])
export const capaciteCanal = (c: CanalConversation): Capacite => CAPACITE[c]
/** Un compte fondateur compte comme Business, comme partout ailleurs (app/api/leads). */
export const formuleCanal = (c: CanalConversation, plan: string | null | undefined, fondateur?: boolean | null): boolean => peut(fondateur ? 'business' : plan, CAPACITE[c])
export const metaOuvert = (): boolean => actif('canauxWhatsapp') || actif('canauxReseaux')

/** Le canal d'une demande IMPORTÉE d'un formulaire publicitaire (lib/canaux/importProspects.ts) : la personne n'a pas écrit à l'artisan. */
export const CANAL_IMPORT = 'import'

/**
 * Les canaux où le PILOTE AUTOMATIQUE peut faire partir une réponse (21/10/2026) : Telegram seulement — l'API du bot envoie pour de
 * vrai, sans fenêtre de 24 h ni jeton qui expire. Jamais : Le Bon Coin et les réseaux lus par notification (c'est l'artisan qui colle
 * la réponse : un envoi « automatique » n'enverrait rien), WhatsApp / Messenger / Instagram (fenêtre de 24 h, examen de Meta : à
 * décider quand ils ouvriront), et une demande importée (la personne n'a pas écrit : aucun envoi automatique, RGPD).
 */
export const CANAUX_PILOTABLES: readonly CanalConversation[] = ['telegram'] as const

/** Le pilote automatique est-il INTERDIT pour une conversation de ce canal ? (formulaire et e-mail : non, rien ne change) */
export function piloteInterdit(canal: string | null | undefined): boolean {
  if (canal === CANAL_IMPORT) return true
  return estCanalConversation(canal) && !(CANAUX_PILOTABLES as readonly string[]).includes(canal)
}
