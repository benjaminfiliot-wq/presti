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
import { sortiePermise } from '@/lib/agents/sortie'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDR_PLATEFORME = 'contact@prestiapp.fr'
const NOM_PLATEFORME = 'Presti'
// Adresse technique d'envoi des e-mails AU NOM D'UN ARTISAN (seul domaine vérifié chez Resend tant qu'aucun autre ne l'est) :
// réglable par EMAIL_EXPEDITEUR_ARTISAN dès qu'un domaine neutre est vérifié. Le nom affiché et le Reply-To restent ceux de l'artisan.
const FROM_ADDR_ARTISAN = process.env.EMAIL_EXPEDITEUR_ARTISAN?.trim() || 'contact@prestiapp.fr'
/** Adresse de l'entreprise : reçoit les réponses aux emails de Presti et les notifications internes.
 *  Réglable par variable d'environnement, parce que les ALERTES DE PANNE passent par ici : tant
 *  que la boîte du domaine n'existe pas, elles doivent pouvoir arriver sur une adresse qui, elle,
 *  est relevée. Une alerte envoyée à une boîte inexistante ne prévient personne. */
const EMAIL_SIMPLE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const EMAIL_ENTREPRISE = process.env.PRESTI_ALERTES_EMAIL?.trim() || process.env.EMAIL_ENTREPRISE?.trim() || 'contact@prestiapp.fr'

// Nettoie un nom d'affichage pour l'en-tête From (pas de retour ligne, guillemets, chevrons).
// `name` absent : e-mail de la plateforme. Un nom d'artisan, même vide après nettoyage, ne retombe JAMAIS sur la marque de l'éditeur.
function fromHeader(name?: string | null): string {
  if (name === undefined || name === null) return `${NOM_PLATEFORME} <${FROM_ADDR_PLATEFORME}>`
  const clean = name.replace(/[\r\n<>"]/g, '').trim().slice(0, 70) || 'Votre artisan'
  return `${clean} <${FROM_ADDR_ARTISAN}>`
}

type SendResult = { ok: boolean; id?: string; error?: string }

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  replyTo?: string
  fromName?: string // marque de l'artisan ; absent : e-mail de la plateforme
  attachments?: { filename: string; content: string }[]
  /** En-têtes bruts — sert à répondre DANS un fil (`In-Reply-To`, `References`). Sans eux, la réponse
   *  ouvre une conversation neuve chez le destinataire, et le fil se lit à trous des deux côtés. */
  entetes?: Record<string, string>
  critique?: boolean // alertes et notifications de l'entreprise : jamais bloquées par le plafond
}): Promise<SendResult> {
  // Les suites de test créent des comptes en @presti-test.invalid : un envoi réel vers un TLD
  // réservé rebondit à coup sûr et 34 % de rebonds abîmaient la réputation du domaine
  // (audit final, F, majeur 8). On fait comme si c'était parti, sans rien envoyer.
  if (/\.invalid$/i.test(opts.to.trim())) return { ok: true, id: 'ignore-adresse-de-test' }
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY manquante' }
  // La pause générale ferme TOUTE sortie ordinaire, par quelque voie qu'elle arrive ici ; dans le doute (lecture en erreur, valeur
  // inattendue) elle reste fermée. Seuls les messages critiques passent : l'alerte au fondateur est ce qui lui dit que la pause est posée.
  if (!opts.critique) {
    const sortie = await sortiePermise()
    if (!sortie.permise) return { ok: false, error: `pause générale : rien ne part (${sortie.raison})` }
  }
  // Plafond global quotidien (F, majeur 7) : l'offre Resend gratuite s'arrête à 100 envois/jour ;
  // sans borne, six prospects par IP suffisaient à l'épuiser en une heure et demie, et plus
  // aucune alerte ni réinitialisation ne partait. Les envois critiques passent toujours.
  if (!opts.critique) {
    const { consommerLimite } = await import('@/lib/limites')
    if (!(await consommerLimite('emails:jour', Number(process.env.EMAILS_PAR_JOUR) || 80, 86_400))) {
      // L'adresse ne va PAS dans le journal : deux chemins non critiques passent ici avec celle
      // d'un client d'artisan (le prospect qui vient d'écrire, la réponse de l'artisan). Le
      // domaine suffit à diagnostiquer un plafond ; l'adresse complète n'ajoute rien qu'un risque.
      console.error('[email] plafond quotidien atteint — envoi refusé (destinataire en @' + String(opts.to ?? '').split('@')[1] + ')')
      return { ok: false, error: 'plafond quotidien d’envois atteint' }
    }
  }

  // Reply-To : voir la règle en tête de fichier. Un email white-label sans adresse d'artisan
  // part SANS Reply-To (le client répondra à contact@… et on le lui relaiera) plutôt
  // qu'avec l'adresse de l'éditeur affichée comme si c'était celle de l'artisan.
  const replyTo = opts.replyTo || (opts.fromName !== undefined ? undefined : EMAIL_ENTREPRISE)

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
        ...(opts.entetes && Object.keys(opts.entetes).length ? { headers: opts.entetes } : {}),
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
      critique: true,
    })
    if (!r.ok) console.error('[notifierEntreprise]', sujet, '→', r.error)
    return r
  } catch (e) {
    console.error('[notifierEntreprise]', sujet, '→', e instanceof Error ? e.message : e)
    return { ok: false, error: 'notification impossible' }
  }
}
