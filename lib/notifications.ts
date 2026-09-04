import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'

// Notifications par email à l'ARTISAN, par type d'événement (sprint J-1 §6, migration 0052).
//
// Un seul point de passage : chaque email adressé à l'artisan passe par `notifierArtisan`,
// qui lit `artisans.notifications` et n'envoie pas si le type est coupé. Les emails aux
// PROSPECTS (accusés de réception, réponses, devis) ne sont pas concernés : ce sont ses
// clients, pas ses préférences.
//
// Seuls les types qui correspondent à un envoi RÉEL figurent ici. Il n'existe aucun email
// de « paiement » adressé à l'artisan (Stripe lui envoie ses reçus, Presti prévient
// l'entreprise) — donc pas de réglage pour ça : ce qui n'existe pas n'apparaît pas.

export type TypeNotification = 'nouvelle_demande' | 'proposition' | 'devis_accepte'

export const TYPES_NOTIFICATION: { id: TypeNotification; label: string; detail: string }[] = [
  { id: 'nouvelle_demande', label: 'Nouvelle demande ou message', detail: 'Un prospect vous écrit sur votre plateforme, laisse ses coordonnées, ou poursuit un échange.' },
  { id: 'proposition', label: 'Proposition à valider', detail: 'L’assistant a préparé un devis brouillon (ou l’a envoyé, selon vos règles).' },
  { id: 'devis_accepte', label: 'Devis accepté ou à modifier', detail: 'Un client accepte votre devis, ou demande une modification.' },
]

export type Notifications = Partial<Record<TypeNotification, boolean>>

/** Absent = activé : un artisan qui n'a jamais touché au réglage reçoit tout. */
export const notificationActive = (n: Notifications | null | undefined, type: TypeNotification): boolean =>
  !n || typeof n !== 'object' || n[type] !== false

type Envoi = Omit<Parameters<typeof sendEmail>[0], 'to'>

/**
 * Envoie un email à l'artisan si — et seulement si — il n'a pas coupé ce type.
 * Ne jette jamais : une notification qui échoue ne doit pas casser la route qui l'émet.
 * Renvoie `envoye: false` avec la raison, pour que les tests puissent le vérifier.
 */
export async function notifierArtisan(
  artisanId: string,
  type: TypeNotification,
  email: string | null | undefined,
  contenu: Envoi,
): Promise<{ envoye: boolean; raison?: 'sans_email' | 'desactive' | 'erreur' }> {
  if (!email) return { envoye: false, raison: 'sans_email' }
  try {
    const { data } = await supabaseAdmin.from('artisans').select('notifications').eq('id', artisanId).maybeSingle()
    if (!notificationActive(data?.notifications as Notifications | null, type)) return { envoye: false, raison: 'desactive' }
    const r = await sendEmail({ ...contenu, to: email })
    return r.ok ? { envoye: true } : { envoye: false, raison: 'erreur' }
  } catch {
    return { envoye: false, raison: 'erreur' }
  }
}
