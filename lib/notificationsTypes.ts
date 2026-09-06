// Types et réglages des notifications de l'artisan — la partie SANS dépendance serveur, importable
// par les composants du navigateur (Paramètres → Notifications). L'envoi (email, push) vit dans
// lib/notifications.ts, qui réexporte tout ceci ; lib/push.ts embarque web-push (Node seulement).

export type TypeNotification = 'nouvelle_demande' | 'proposition' | 'devis_accepte'

export const TYPES_NOTIFICATION: { id: TypeNotification; label: string; detail: string }[] = [
  { id: 'nouvelle_demande', label: 'Nouvelle demande ou message', detail: 'Un prospect vous écrit sur votre plateforme, laisse ses coordonnées, ou poursuit un échange.' },
  { id: 'proposition', label: 'Proposition à valider', detail: 'L’assistant a préparé un devis brouillon (ou l’a envoyé, selon vos règles).' },
  { id: 'devis_accepte', label: 'Devis accepté ou à modifier', detail: 'Un client accepte votre devis, ou demande une modification.' },
]

/** `{ type → booléen }` pour l'email, et `push: { type → booléen }`. Absent = activé. */
export type Notifications = Partial<Record<TypeNotification, boolean>> & { push?: Partial<Record<TypeNotification, boolean>> }

/** Absent = activé : un artisan qui n'a jamais touché au réglage reçoit tout. */
export const notificationActive = (n: Notifications | null | undefined, type: TypeNotification): boolean =>
  !n || typeof n !== 'object' || n[type] !== false

/** Même règle pour la push. */
export const pushActive = (n: Notifications | null | undefined, type: TypeNotification): boolean =>
  !n || typeof n !== 'object' || !n.push || typeof n.push !== 'object' || n.push[type] !== false
