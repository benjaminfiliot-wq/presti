// Envoi d'emails transactionnels via Resend (appel HTTP direct, sans dépendance).
// ⚠️ Tant qu'aucun domaine n'est vérifié dans Resend, l'expéditeur reste
// « onboarding@resend.dev » et Resend n'envoie QU'À l'adresse du compte Resend.
// Pour écrire aux vrais prospects : vérifier un domaine dans Resend (DNS) puis
// remplacer FROM par une adresse de ce domaine (ex : « Presti <devis@tondomaine.fr> »).
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Presti <onboarding@resend.dev>'

type SendResult = { ok: boolean; id?: string; error?: string }

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<SendResult> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY manquante' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` }
    return { ok: true, id: data?.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'envoi email" }
  }
}
