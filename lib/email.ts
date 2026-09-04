// Envoi d'emails transactionnels via Resend (appel HTTP direct, sans dépendance).
// Domaine prestiapp.fr VÉRIFIÉ dans Resend (envoi activé). Le nom d'expéditeur est celui de
// l'ARTISAN (white-label : le prospect voit sa marque, pas « Presti »), l'adresse reste
// contact@prestiapp.fr (seul domaine vérifié) et reply_to pointe vers l'email de l'artisan.
//
// Règle Reply-To (sprint J-1 §15) :
//  • email DE PRESTI (pas de `fromName` : réinitialisation, notifications à l'artisan,
//    rapports) → Reply-To `contact@prestiapp.fr` par défaut, sauf Reply-To explicite
//    (ex. : le prospect, pour que l'artisan puisse lui répondre d'un clic) ;
//  • email AU NOM D'UN ARTISAN (`fromName` posé : réponse auto, devis, relance, accusé de
//    réception, lien de connexion) → Reply-To = l'artisan, JAMAIS `contact@prestiapp.fr`
//    (white-label : la réponse du client ne doit pas atterrir chez l'éditeur).
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDR = 'contact@prestiapp.fr'
/** Adresse de l'entreprise : reçoit les réponses aux emails de Presti et les notifications internes.
 *  Réglable par variable d'environnement, parce que les ALERTES DE PANNE passent par ici : tant
 *  que la boîte du domaine n'existe pas, elles doivent pouvoir arriver sur une adresse qui, elle,
 *  est relevée. Une alerte envoyée à une boîte inexistante ne prévient personne. */
const EMAIL_SIMPLE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const EMAIL_ENTREPRISE = process.env.EMAIL_ENTREPRISE?.trim() || 'contact@prestiapp.fr'

// Nettoie un nom d'affichage pour l'en-tête From (pas de retour ligne, guillemets, chevrons).
function fromHeader(name?: string | null): string {
  const clean = (name || 'Presti').replace(/[\r\n<>"]/g, '').trim().slice(0, 70) || 'Presti'
  return `${clean} <${FROM_ADDR}>`
}

type SendResult = { ok: boolean; id?: string; error?: string }

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  replyTo?: string
  fromName?: string // marque de l'artisan (défaut : Presti)
  attachments?: { filename: string; content: string }[]
}): Promise<SendResult> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY manquante' }

  // Reply-To : voir la règle en tête de fichier. Un email white-label sans adresse d'artisan
  // part SANS Reply-To (le client répondra à contact@… et on le lui relaiera) plutôt
  // qu'avec l'adresse de l'éditeur affichée comme si c'était celle de l'artisan.
  const replyTo = opts.replyTo || (opts.fromName ? undefined : EMAIL_ENTREPRISE)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader(opts.fromName),
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(opts.attachments && opts.attachments.length ? { attachments: opts.attachments } : {}),
      }),
    })

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` }
    return { ok: true, id: data?.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'envoi email" }
  }
}

/**
 * Notification interne de l'entreprise (sprint J-1 §15) : nouvel artisan inscrit, paiement
 * Stripe, erreur critique… Un email court à contact@prestiapp.fr (redirigé vers les deux
 * fondateurs). Ne jette jamais : une notification qui échoue ne doit pas casser la route
 * qui l'émet — elle est journalisée, c'est tout.
 */
export async function notifierEntreprise(sujet: string, corps: string, repondreA?: string): Promise<SendResult> {
  try {
    const r = await sendEmail({
      to: EMAIL_ENTREPRISE,
      subject: `[Presti] ${sujet.replace(/[\r\n]/g, ' ').slice(0, 120)}`,
      text: `${corps.slice(0, 4000)}\n\n— Presti (notification automatique)`,
      // Quand la notification vient de QUELQU'UN (formulaire de contact), le bouton Répondre
      // doit écrire à cette personne, pas à notre propre adresse.
      replyTo: repondreA && EMAIL_SIMPLE.test(repondreA) ? repondreA : EMAIL_ENTREPRISE,
    })
    if (!r.ok) console.error('[notifierEntreprise]', sujet, '→', r.error)
    return r
  } catch (e) {
    console.error('[notifierEntreprise]', sujet, '→', e instanceof Error ? e.message : e)
    return { ok: false, error: 'notification impossible' }
  }
}
