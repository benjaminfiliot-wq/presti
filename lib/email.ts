// Envoi d'emails transactionnels via Resend (appel HTTP direct, sans dépendance).
// Domaine prestiapp.fr VÉRIFIÉ dans Resend (envoi activé). Le nom d'expéditeur est celui de
// l'ARTISAN (white-label : le prospect voit sa marque, pas « Presti »), l'adresse reste
// contact@prestiapp.fr (seul domaine vérifié) et reply_to pointe vers l'email de l'artisan.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDR = 'contact@prestiapp.fr'

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
