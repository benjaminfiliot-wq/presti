import { ImapFlow } from 'imapflow'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canalEntreprise } from '@/lib/canaux'

// La messagerie de l'entreprise (prompt v10 §2.3, J3) : relever la boîte, ranger ce qui arrive, répondre
// dans le fil. Rien à voir avec les conversations d'un artisan et de ses clients — celles-là ne sont
// lisibles nulle part dans le Centre, et ne le seront pas.
//
// Deux principes tenus ici :
//   • la relève est REJOUABLE. On identifie chaque message par son Message-ID, jamais par son numéro
//     IMAP (qui change quand la boîte est réorganisée). Relever deux fois ne duplique rien et n'écrase
//     aucun classement fait la veille ;
//   • on ne garde que le texte. Le HTML d'un email est du code venu de l'extérieur : ni utile ici,
//     ni sûr à réafficher. On stocke le `text/plain`, ou le HTML dépouillé de ses balises à défaut.

export type Identifiants = { hote: string; port: number; user: string; pass: string }

/** Les identifiants de la boîte de l'entreprise, ou null si elle n'est pas configurée. */
export function boiteEntreprise(): Identifiants | null {
  const e = canalEntreprise()
  // Les deux noms de variables ont coexisté (IMAP_* d'abord, PRESTI_MAIL_IMAP_* ensuite) : on accepte
  // les deux plutôt que de laisser la production muette pour une histoire de préfixe.
  const user = (process.env.IMAP_USER || e?.identifiant || '').trim()
  const pass = process.env.IMAP_PASS || e?.motDePasse || ''
  if (!user || !pass) return null
  return {
    hote: process.env.IMAP_HOST || e?.imap_hote || 'ssl0.ovh.net',
    port: Number(process.env.IMAP_PORT || e?.imap_port || 993),
    user, pass,
  }
}

/** Le texte d'un message, sans HTML. Borné : un email de 2 Mo ne remplit pas une ligne de base. */
function texteSeul(brut: string): string {
  const sansStyle = brut.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  const sansBalises = /<[a-z!/][\s\S]*?>/i.test(sansStyle) ? sansStyle.replace(/<[^>]+>/g, ' ') : sansStyle
  return sansBalises
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '’')
    .replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim().slice(0, 40_000)
}

type Partie = { part?: string; type?: string; childNodes?: Partie[] }
/** La première partie `text/plain` d'un message ; à défaut la première `text/html`. */
function partieTexte(n: Partie | undefined): { part: string; html: boolean } | null {
  if (!n) return null
  const plat: Partie[] = []
  const parcourir = (x: Partie) => { plat.push(x); (x.childNodes ?? []).forEach(parcourir) }
  parcourir(n)
  const plain = plat.find((x) => x.type === 'text/plain' && x.part)
  if (plain?.part) return { part: plain.part, html: false }
  const html = plat.find((x) => x.type === 'text/html' && x.part)
  if (html?.part) return { part: html.part, html: true }
  // Un message d'une seule partie n'a pas de numéro : la partie « 1 » est le corps entier.
  return plat.length === 1 && plat[0].type?.startsWith('text/') ? { part: '1', html: plat[0].type === 'text/html' } : null
}

export type Releve = { ok: true; lus: number; nouveaux: number; boite: string } | { ok: false; erreur: string }

/**
 * Relève la boîte de l'entreprise et enregistre ce qui est nouveau.
 *
 * `limite` borne le nombre de messages examinés : la relève tourne dans une route serverless, elle doit
 * finir. Les plus récents d'abord — un message vieux de six mois qui n'a jamais été relevé n'est pas
 * l'urgence du jour.
 */
export async function relever(limite = 40): Promise<Releve> {
  const b = boiteEntreprise()
  if (!b) return { ok: false, erreur: 'La boîte de l’entreprise n’est pas configurée (IMAP_USER / IMAP_PASS).' }

  const client = new ImapFlow({ host: b.hote, port: b.port, secure: true, auth: { user: b.user, pass: b.pass }, logger: false })
  let lus = 0, nouveaux = 0
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const total = (client.mailbox && typeof client.mailbox === 'object' && 'exists' in client.mailbox ? (client.mailbox.exists as number) : 0) || 0
      if (total === 0) return { ok: true, lus: 0, nouveaux: 0, boite: 'INBOX' }
      const debut = Math.max(1, total - limite + 1)
      const messages: { uid: number; messageId: string; inReplyTo: string | null; email: string; nom: string | null; sujet: string | null; date: Date; partie: { part: string; html: boolean } | null }[] = []
      for await (const m of client.fetch(`${debut}:*`, { uid: true, envelope: true, bodyStructure: true, internalDate: true })) {
        const env = m.envelope
        const id = env?.messageId
        if (!id) continue // sans Message-ID, on ne sait pas dédoublonner : on laisse le message tranquille
        const de = env.from?.[0]
        messages.push({
          uid: m.uid, messageId: id, inReplyTo: env.inReplyTo ?? null,
          email: de?.address ?? '', nom: de?.name ?? null,
          sujet: env.subject ?? null, date: new Date(m.internalDate || env.date || Date.now()),
          partie: partieTexte(m.bodyStructure as Partie | undefined),
        })
      }
      lus = messages.length

      // Ce qui est déjà connu ne se retélécharge pas : un corps d'email pèse, et la boîte n'a pas
      // besoin d'être relue en entier chaque matin.
      const { data: connus } = await supabaseAdmin.from('courriers').select('message_id').in('message_id', messages.map((m) => m.messageId))
      const dejaLa = new Set((connus ?? []).map((c) => c.message_id))

      for (const m of messages) {
        if (dejaLa.has(m.messageId)) continue
        let corps = ''
        if (m.partie) {
          try {
            const d = await client.download(String(m.uid), m.partie.part, { uid: true })
            const morceaux: Buffer[] = []
            for await (const c of d.content) { morceaux.push(Buffer.from(c)); if (morceaux.reduce((n, x) => n + x.length, 0) > 2_000_000) break }
            const charset = (d.meta?.charset || 'utf-8').toLowerCase()
            corps = new TextDecoder(/^(utf-?8|us-ascii|iso-8859-1|windows-1252|latin1)$/.test(charset) ? charset.replace('utf8', 'utf-8') : 'utf-8', { fatal: false }).decode(Buffer.concat(morceaux))
          } catch { corps = '' } // un corps illisible ne fait pas perdre l'en-tête : le message existe quand même
        }
        // Le fil : on suit le message auquel celui-ci répond. Regrouper par sujet rapprocherait
        // deux « Bonjour » qui n'ont rien à voir.
        let fil = m.messageId
        if (m.inReplyTo) {
          const { data: parent } = await supabaseAdmin.from('courriers').select('fil').eq('message_id', m.inReplyTo).maybeSingle()
          if (parent?.fil) fil = parent.fil
        }
        const { data, error } = await supabaseAdmin.rpc('enregistrer_courrier', {
          p_message_id: m.messageId, p_fil: fil, p_sens: 'recu', p_email: m.email, p_nom: m.nom,
          p_sujet: m.sujet, p_corps: texteSeul(corps), p_recu_le: new Date(m.date).toISOString(), p_boite: 'INBOX', p_uid: m.uid,
        })
        if (error) { console.error('[courriers] enregistrement :', error.message); continue }
        if ((data as { nouveau?: boolean })?.nouveau) nouveaux++
      }
    } finally { lock.release() }
    await client.logout()
    return { ok: true, lus, nouveaux, boite: 'INBOX' }
  } catch (e) {
    try { await client.logout() } catch { /* la connexion est déjà tombée */ }
    return { ok: false, erreur: (e as Error).message.slice(0, 200) }
  }
}

/** L'adresse d'un correspondant, en clair pour la direction, jamais dans une URL ni un journal. */
export const correspondantLisible = (nom: string | null, email: string) => (nom && nom !== email ? `${nom} <${email}>` : email)

/** Un sujet de réponse : « Re: » une seule fois, jamais « Re: Re: Re: ». */
export const sujetReponse = (sujet: string | null | undefined) => {
  const s = (sujet ?? '').trim() || '(sans objet)'
  return /^re\s*:/i.test(s) ? s : `Re: ${s}`
}
