// Doublure de lib/email (026-045) : aucun e-mail ne part hors --reel. Chaque envoi est consigné dans __JUGE_045__.emails
// avec l'instant simulé ; la doublure répond comme Resend quand l'envoi est accepté.
import { J, noter } from './commun-doublures.mjs'

export const EMAIL_ENTREPRISE = 'alertes@exemple.invalid'
export async function sendEmail(opts) {
  noter('email.sendEmail', { to: opts?.to, subject: opts?.subject })
  J().emails.push({ a: opts?.to ?? null, sujet: String(opts?.subject ?? ''), corps: String(opts?.text ?? ''), le: Date.now(), voie: 'sendEmail' })
  return { ok: true, id: `essai-${J().emails.length}` }
}
export async function notifierEntreprise(sujet, corps) {
  noter('email.notifierEntreprise', { sujet })
  J().emails.push({ a: 'entreprise', sujet: String(sujet ?? ''), corps: String(corps ?? ''), le: Date.now(), voie: 'notifierEntreprise' })
  return { ok: true, id: `essai-${J().emails.length}` }
}
