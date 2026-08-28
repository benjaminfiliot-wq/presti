// Envoi d'emails transactionnels via Resend (appel HTTP direct, sans dépendance).
// Expéditeur = domaine prestiapp.fr (à VÉRIFIER dans Resend en posant les DNS chez OVH :
// TXT resend._domainkey, MX send, TXT send/SPF). Tant que le domaine n'est pas "verified",
// Resend refuse l'envoi vers des adresses tierces — dès qu'il l'est, les emails partent aux vrais prospects.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Presti <contact@prestiapp.fr>'

type SendResult = { ok: boolean; id?: string; error?: string }

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  replyTo?: string
  attachments?: { filename: string; content: string }[]
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
