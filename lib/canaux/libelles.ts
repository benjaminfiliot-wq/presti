// lib/canaux/libelles.ts — les noms des canaux de messagerie, sans aucune dépendance : lu par le navigateur (boîte de réception,
// écran Canaux) comme par le serveur (lib/canaux/meta.ts). Rien de secret ni de « node: » ici.
export const LIBELLE_CANAL = {
  whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram', leboncoin: 'Le Bon Coin',
  // 21/10/2026 — le bot Telegram de l'artisan (lib/canaux/telegram.ts, drapeau canauxTelegram) : reçu ET envoyé par l'API du bot.
  telegram: 'Telegram',
  // 21/10/2026 — les réseaux sans API ouverte, regroupés par leurs E-MAILS DE NOTIFICATION (lib/canaux/notifications.ts, drapeau
  // canauxNotifications) : comme Le Bon Coin, la réponse préparée est copiée et la conversation d'origine s'ouvre.
  linkedin: 'LinkedIn', facebook: 'Facebook', instagram_notif: 'Instagram', tiktok: 'TikTok',
  '123devis': '123devis', habitatpresto: 'Habitatpresto', pagesjaunes: 'PagesJaunes', houzz: 'Houzz', travaux_com: 'Travaux.com',
  starofservice: 'StarOfService',
} as const

export type CanalLibelle = keyof typeof LIBELLE_CANAL
export const libelleCanalConversation = (c: string | null | undefined): string | null =>
  c && Object.prototype.hasOwnProperty.call(LIBELLE_CANAL, c) ? LIBELLE_CANAL[c as CanalLibelle] : null

/** Le Bon Coin n'a pas d'API : la page générale de la messagerie, quand l'e-mail ne donnait pas de lien plus précis. */
export const LIEN_MESSAGERIE_LEBONCOIN = 'https://www.leboncoin.fr/messages'

/** Les réseaux lus par leurs e-mails de notification (la liste fermée ; la reconnaissance vit dans lib/canaux/notifications.ts). */
export const CANAUX_NOTIFICATION = ['linkedin', 'facebook', 'instagram_notif', 'tiktok', '123devis', 'habitatpresto', 'pagesjaunes', 'houzz', 'travaux_com', 'starofservice'] as const
export type CanalNotification = typeof CANAUX_NOTIFICATION[number]
export const estCanalNotification = (x: unknown): x is CanalNotification => typeof x === 'string' && (CANAUX_NOTIFICATION as readonly string[]).includes(x)

/** La messagerie générale de chaque réseau, quand l'e-mail ne donnait pas de lien plus précis (https, domaine du réseau). */
export const LIEN_MESSAGERIE: Record<CanalNotification | 'leboncoin', string> = {
  leboncoin: LIEN_MESSAGERIE_LEBONCOIN,
  linkedin: 'https://www.linkedin.com/messaging/',
  facebook: 'https://business.facebook.com/latest/inbox',
  instagram_notif: 'https://www.instagram.com/direct/inbox/',
  tiktok: 'https://www.tiktok.com/messages',
  '123devis': 'https://www.123devis.com/',
  habitatpresto: 'https://www.habitatpresto.com/',
  pagesjaunes: 'https://www.pagesjaunes.fr/',
  houzz: 'https://www.houzz.fr/',
  travaux_com: 'https://www.travaux.com/',
  starofservice: 'https://www.starofservice.com/',
}

/** Canaux où l'artisan COLLE lui-même la réponse (aucune API d'envoi) : Le Bon Coin et les réseaux lus par notification. */
export const estCanalManuel = (c: string | null | undefined): boolean => c === 'leboncoin' || estCanalNotification(c)
/** Les domaines où un lien de réponse peut mener, par réseau (le lien enregistré est RE-vérifié avant d'être ouvert). */
export const DOMAINES_LIEN: Record<CanalNotification | 'leboncoin', readonly string[]> = {
  leboncoin: ['leboncoin.fr'], linkedin: ['linkedin.com'], facebook: ['facebook.com'], instagram_notif: ['instagram.com'], tiktok: ['tiktok.com'],
  '123devis': ['123devis.com'], habitatpresto: ['habitatpresto.com'], pagesjaunes: ['pagesjaunes.fr', 'solocal.com'], houzz: ['houzz.com', 'houzz.fr'],
  travaux_com: ['travaux.com'], starofservice: ['starofservice.com', 'starofservice.fr'],
}

/**
 * Le lien où coller la réponse : celui de la conversation, s'il est en https, sans identifiants et sur un domaine du réseau
 * (21/10/2026, audit : revérifié ici, au moment de l'ouvrir, quoi que la base contienne) ; sinon la messagerie générale du réseau.
 */
export function lienReponseManuelle(c: string | null | undefined, lien: string | null | undefined): string | null {
  if (c !== 'leboncoin' && !estCanalNotification(c)) return null
  const canal = c as CanalNotification | 'leboncoin'
  if (lien) {
    try {
      const u = new URL(lien)
      const h = u.hostname.toLowerCase()
      if (u.protocol === 'https:' && !u.username && !u.password && DOMAINES_LIEN[canal].some((d) => h === d || h.endsWith(`.${d}`))) return u.toString()
    } catch { /* illisible : la messagerie générale */ }
  }
  return LIEN_MESSAGERIE[canal]
}

/**
 * Le texte d'un TIERS recopié dans un e-mail envoyé à l'artisan : ses liens deviennent « [lien : domaine] » (audit du 21/10, E1 —
 * jamais un lien cliquable choisi par un inconnu dans un e-mail qui vient de nous), borné.
 */
export function sansLiens(texte: string, max: number): string {
  return texte
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi, (brut) => {
      const fin = /[.,;:!?]+$/.exec(brut)?.[0] ?? ''
      const url = fin ? brut.slice(0, -fin.length) : brut
      try { return `[lien : ${new URL(/^www\./i.test(url) ? `https://${url}` : url).hostname}]${fin}` } catch { return `[lien]${fin}` }
    })
    .slice(0, max)
}
