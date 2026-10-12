import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { envoyerPushArtisan, type ChargePush } from '@/lib/push'
import { notificationActive, pushActive, type Notifications, type TypeNotification } from '@/lib/notificationsTypes'

export { TYPES_NOTIFICATION, notificationActive, pushActive } from '@/lib/notificationsTypes'
export type { Notifications, TypeNotification } from '@/lib/notificationsTypes'

// Notifications à l'ARTISAN, par type d'événement (sprint J-1 §6, migration 0052 ; push : v9 J2,
// migration 0064). Module SERVEUR (il embarque web-push) : les composants du navigateur importent
// lib/notificationsTypes.
//
// Un seul point de passage : chaque email ET chaque push adressés à l'artisan passent par
// `notifierArtisan`, qui lit `artisans.notifications` et n'envoie pas ce qui est coupé. Les emails
// aux PROSPECTS (accusés de réception, réponses, devis) ne sont pas concernés : ce sont ses
// clients, pas ses préférences.
//
// Seuls les types qui correspondent à un envoi RÉEL figurent ici. Il n'existe aucun email de
// « paiement » adressé à l'artisan (Stripe lui envoie ses reçus, Presti prévient l'entreprise) —
// donc pas de réglage pour ça : ce qui n'existe pas n'apparaît pas.
//
// Une push ne porte JAMAIS le contenu : un titre, une ligne neutre, l'adresse de la conversation.
// Le nom du client, son message, ses coordonnées restent dans l'app (§3.2).

/** La charge utile push d'un événement : neutre par construction, l'adresse mène à la conversation. */
export function chargePush(type: TypeNotification, lead?: string | null): ChargePush {
  // Seul un identifiant de conversation (UUID) entre dans l'adresse et le tag : jamais une chaîne libre.
  const leadId = lead && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead) ? lead : null
  const url = leadId ? `/messages?lead=${leadId}` : '/messages'
  switch (type) {
    case 'nouvelle_demande': return { titre: 'Nouvelle demande', ligne: 'Un client vous a écrit. Ouvrez la conversation.', url, tag: leadId ? `conv-${leadId}` : 'conv', renotify: true }
    case 'proposition': return { titre: 'Proposition à valider', ligne: 'L’assistant a préparé un devis. À vous de valider.', url, tag: leadId ? `prop-${leadId}` : 'prop' }
    case 'devis_accepte': return { titre: 'Réponse à votre devis', ligne: 'Un client a répondu à votre devis.', url, tag: leadId ? `devis-${leadId}` : 'devis', renotify: true }
  }
}

type Envoi = Omit<Parameters<typeof sendEmail>[0], 'to'> & {
  /** La conversation concernée : la push y mène directement, et les notifications s'y regroupent. */
  leadId?: string | null
}

/**
 * La push part APRÈS la réponse HTTP quand Next le permet (`after`), sinon tout de suite, sans bloquer.
 * `after` vaut aussi dans une réponse en flux (SSE) : Next 15.5 exécute ses rappels à la fermeture de la
 * réponse, donc après `controller.close()` — un envoi « immédiat » y retenait au contraire la réponse
 * (contre-revue du 06/09). Jamais d'attente d'une push dans une route.
 */
function lancerPush(artisanId: string, charge: ChargePush) {
  const envoyer = () => envoyerPushArtisan(artisanId, charge).catch((e) => console.error('[push] envoi :', (e as Error)?.message))
  import('next/server').then((m) => { try { m.after(envoyer) } catch { void envoyer() } }).catch(() => { void envoyer() })
}

/**
 * Prévient l'artisan d'un événement : email si — et seulement si — il n'a pas coupé ce type ;
 * push (appareils abonnés) de même, sans jamais y mettre le contenu.
 * Ne jette jamais : une notification qui échoue ne doit pas casser la route qui l'émet.
 * Renvoie `envoye` (l'email) avec la raison, pour que les tests puissent le vérifier.
 */
export async function notifierArtisan(
  artisanId: string,
  type: TypeNotification,
  email: string | null | undefined,
  contenu: Envoi,
): Promise<{ envoye: boolean; raison?: 'sans_email' | 'desactive' | 'erreur'; push?: boolean }> {
  const { leadId, ...courrier } = contenu
  let prefs: Notifications | null = null
  try {
    const { data } = await supabaseAdmin.from('artisans').select('notifications').eq('id', artisanId).maybeSingle()
    prefs = (data?.notifications as Notifications | null) ?? null
  } catch { /* préférences illisibles : on considère tout activé, comme un compte neuf */ }

  const push = pushActive(prefs, type)
  if (push) lancerPush(artisanId, chargePush(type, leadId))

  if (!email) return { envoye: false, raison: 'sans_email', push }
  if (!notificationActive(prefs, type)) return { envoye: false, raison: 'desactive', push }
  try {
    // Une notification à l'artisan est un e-mail du produit : la pause des agents ne la coupe pas (lib/email.ts).
    const r = await sendEmail({ ...courrier, to: email, transactionnel: true })
    return r.ok ? { envoye: true, push } : { envoye: false, raison: 'erreur', push }
  } catch {
    return { envoye: false, raison: 'erreur', push }
  }
}
