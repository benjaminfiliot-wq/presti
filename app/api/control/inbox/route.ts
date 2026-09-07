export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ImapFlow } from 'imapflow'
import { getUserRevocable } from '@/lib/authArtisan'
import { boiteEntrepriseResolue } from '@/lib/canaux'

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Non authentifié' }, 401)
  const { data: userData } = await getUserRevocable(token)
  if (!userData?.user) return json({ error: 'Session expirée' }, 401)
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  if (!me?.is_founder) return json({ error: 'Réservé aux fondateurs' }, 403)

  // Boîte de l'entreprise (sprint J-1 §15) : contact@prestiapp.fr chez OVH, identifiants
  // dans PRESTI_MAIL_IMAP_USER / PRESTI_MAIL_IMAP_PASS (Vercel). Les anciennes variables
  // IMAP_* restent acceptées. Sans identifiants : `configured:false`, rien d'affiché, rien ne plante.
  // Même boîte que la relève du Poste de contrôle, donc même résolution : ce fichier proposait
  // `imap.gmail.com` là où la relève proposait `ssl0.ovh.net`, pour le même compte (07/09).
  const b = boiteEntrepriseResolue()
  if (!b) return json({ configured: false })

  const client = new ImapFlow({
    host: b.hote,
    port: b.port,
    secure: true,
    auth: { user: b.user, pass: b.pass },
    logger: false,
  })

  try {
    await client.connect()
    const messages: { id: string; from: string; fromName: string; subject: string; at: string; seen: boolean }[] = []
    const lock = await client.getMailboxLock('INBOX')
    try {
      const total = (client.mailbox && typeof client.mailbox === 'object' && 'exists' in client.mailbox ? (client.mailbox.exists as number) : 0) || 0
      if (total > 0) {
        const from = Math.max(1, total - 24)
        for await (const msg of client.fetch(`${from}:*`, { envelope: true, flags: true, internalDate: true })) {
          const f = msg.envelope?.from?.[0]
          const d = msg.internalDate || msg.envelope?.date
          messages.push({
            id: String(msg.uid ?? msg.seq),
            from: f?.address || '',
            fromName: f?.name || f?.address || '',
            subject: msg.envelope?.subject || '(sans objet)',
            at: (d ? new Date(d) : new Date()).toISOString(),
            seen: !!(msg.flags && msg.flags.has('\\Seen')),
          })
        }
      }
    } finally {
      lock.release()
    }
    await client.logout()
    messages.reverse()
    return json({ configured: true, messages, total: messages.length })
  } catch (e) {
    try { await client.logout() } catch {}
    const msg = e instanceof Error ? e.message : 'Erreur IMAP'
    return json({ configured: true, error: msg })
  }
}
