export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ImapFlow } from 'imapflow'

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Non authentifié' }, 401)
  const { data: userData } = await supabaseAdmin.auth.getUser(token)
  if (!userData?.user) return json({ error: 'Session expirée' }, 401)
  const { data: me } = await supabaseAdmin.from('artisans').select('is_founder').eq('id', userData.user.id).maybeSingle()
  if (!me?.is_founder) return json({ error: 'Réservé aux fondateurs' }, 403)

  const user = process.env.IMAP_USER
  const pass = process.env.IMAP_PASS
  if (!user || !pass) return json({ configured: false })

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user, pass },
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
