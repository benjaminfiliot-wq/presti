// lib/canaux/regles.ts — qui ouvre quel canal : le drapeau (la fonctionnalité existe-t-elle ?) et la formule (l'artisan
// l'a-t-il achetée ?). Une seule table, lue par le webhook, la connexion, la relève et l'envoi.
import { actif, type Flag } from '../flags.ts'
import { peut, type Capacite } from '../plans.ts'
import type { CanalConversation } from './rangement.ts'

export const CANAUX_CONVERSATION: readonly CanalConversation[] = ['whatsapp', 'messenger', 'instagram', 'leboncoin'] as const
export const estCanalConversation = (x: unknown): x is CanalConversation => typeof x === 'string' && (CANAUX_CONVERSATION as readonly string[]).includes(x)

const DRAPEAU: Record<CanalConversation, Flag> = { whatsapp: 'canauxWhatsapp', messenger: 'canauxReseaux', instagram: 'canauxReseaux', leboncoin: 'canauxLeboncoin' }
// La grille (lib/plans.ts) : WhatsApp à partir de Studio, réseaux sociaux en Signature. Le Bon Coin passe par la boîte
// e-mail branchée : il suit la capacité « canaux.email », ouverte à toutes les formules.
const CAPACITE: Record<CanalConversation, Capacite> = { whatsapp: 'canaux.whatsapp', messenger: 'canaux.reseaux', instagram: 'canaux.reseaux', leboncoin: 'canaux.email' }

export const canalOuvert = (c: CanalConversation): boolean => actif(DRAPEAU[c])
export const capaciteCanal = (c: CanalConversation): Capacite => CAPACITE[c]
/** Un compte fondateur compte comme Business, comme partout ailleurs (app/api/leads). */
export const formuleCanal = (c: CanalConversation, plan: string | null | undefined, fondateur?: boolean | null): boolean => peut(fondateur ? 'business' : plan, CAPACITE[c])
export const metaOuvert = (): boolean => actif('canauxWhatsapp') || actif('canauxReseaux')
