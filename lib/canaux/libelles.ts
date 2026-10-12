// lib/canaux/libelles.ts — les noms des canaux de messagerie, sans aucune dépendance : lu par le navigateur (boîte de réception,
// écran Canaux) comme par le serveur (lib/canaux/meta.ts). Rien de secret ni de « node: » ici.
export const LIBELLE_CANAL = {
  whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram', leboncoin: 'Le Bon Coin',
} as const

export type CanalLibelle = keyof typeof LIBELLE_CANAL
export const libelleCanalConversation = (c: string | null | undefined): string | null =>
  c && Object.prototype.hasOwnProperty.call(LIBELLE_CANAL, c) ? LIBELLE_CANAL[c as CanalLibelle] : null

/** Le Bon Coin n'a pas d'API : la page générale de la messagerie, quand l'e-mail ne donnait pas de lien plus précis. */
export const LIEN_MESSAGERIE_LEBONCOIN = 'https://www.leboncoin.fr/messages'
