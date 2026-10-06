import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { dechiffrer } from '@/lib/secretBox'
import { lireMail } from '@/lib/mailLite'
import { typeChantier } from '@/lib/qualification'

// Relève d'une boîte email (v4 §B2) : on va chercher les nouveaux messages et on les
// range dans la boîte de réception de l'artisan, à côté des demandes de sa plateforme.
//
// Trois garde-fous, parce qu'une boîte email reçoit surtout autre chose que des clients :
//  • on ignore les expéditeurs automatiques (no-reply, mailer-daemon, notifications…) ;
//  • on ignore les emails que l'artisan s'envoie à lui-même ;
//  • un même email n'entre jamais deux fois (Message-ID gardé dans messages.externe_id).

export type Canal = {
  id: string; artisan_id: string; adresse: string
  imap_hote: string | null; imap_port: number | null; identifiant: string | null
  secret: string | null; derniere_releve: string | null
}

const AUTOMATIQUE = /^(no-?reply|ne-?pas-?repondre|donotreply|mailer-daemon|postmaster|notifications?|newsletter|bounce|noreply)[@.-]/i
const INDESIRABLE = /(facture[s]? ?orange|newsletter|se désinscrire|unsubscribe|linkedin|no-reply)/i

/** Un email ressemble-t-il à une vraie demande d'un humain ? */
function estUneVraieDemande(deEmail: string | null, sujet: string, texte: string, adresseCanal: string): boolean {
  if (!deEmail) return false
  if (deEmail.toLowerCase() === adresseCanal.toLowerCase()) return false // envoyé par soi-même
  if (AUTOMATIQUE.test(deEmail)) return false
  if (texte.trim().length < 12) return false
  if (INDESIRABLE.test(sujet) && texte.length < 400) return false
  return true
}

export async function releverCanal(canal: Canal): Promise<{ importes: number; erreur?: string }> {
  const motDePasse = dechiffrer(canal.secret)
  if (!motDePasse || !canal.imap_hote) {
    const erreur = 'Identifiants illisibles — reconnectez la boîte.'
    await supabaseAdmin.from('canaux').update({ derniere_erreur: erreur }).eq('id', canal.id)
    return { importes: 0, erreur }
  }

  const port = canal.imap_port || 993
  let client: import('imapflow').ImapFlow | null = null
  let importes = 0
  let metier: string | null | undefined

  try {
    const { ImapFlow } = await import('imapflow')
    client = new ImapFlow({
      host: canal.imap_hote, port, secure: port === 993,
      auth: { user: canal.identifiant || canal.adresse, pass: motDePasse },
      logger: false,
    })
    await client.connect()

    // On ne remonte jamais plus loin que 7 jours : la première relève ne doit pas
    // déverser des années d'archives dans la boîte de réception.
    const depuis = new Date(Math.max(
      canal.derniere_releve ? new Date(canal.derniere_releve).getTime() : 0,
      Date.now() - 7 * 24 * 3600 * 1000,
    ))

    const lock = await client.getMailboxLock('INBOX')
    try {
      for await (const msg of client.fetch({ since: depuis }, { source: true })) {
        if (!msg.source) continue
        if (importes >= 40) break // garde-fou : jamais un déluge en une passe
        const mail = lireMail(msg.source)
        if (!mail.messageId) continue
        if (!estUneVraieDemande(mail.de.email, mail.sujet, mail.texte, canal.adresse)) continue

        // Déjà importé ? (le Message-ID est stable, même si on relève deux fois)
        const { data: deja } = await supabaseAdmin.from('messages')
          .select('id').eq('externe_id', mail.messageId).eq('canal_id', canal.id).maybeSingle()
        if (deja) continue

        // On rattache à la conversation existante avec cette personne si elle est encore
        // ouverte (moins de 30 jours), sinon on ouvre une nouvelle demande.
        const limite = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        const { data: existant } = await supabaseAdmin.from('leads')
          .select('id').eq('artisan_id', canal.artisan_id).eq('contact', mail.de.email!)
          .gte('created_at', limite).order('created_at', { ascending: false }).limit(1).maybeSingle()

        let leadId = existant?.id as string | undefined
        if (!leadId) {
          // Le type de chantier, comme pour une demande du formulaire (app/api/leads) : sans lui, une demande arrivée par
          // email restait hors du rangement « Types de chantier » de /chiffres. Le métier ne sert que de repli ; lu une fois.
          if (metier === undefined) {
            const { data: a } = await supabaseAdmin.from('artisans').select('metier').eq('id', canal.artisan_id).maybeSingle()
            metier = (a?.metier as string | null | undefined) ?? null
          }
          const message = (mail.sujet ? `${mail.sujet}\n\n` : '') + mail.texte
          const { data: nouveau, error } = await supabaseAdmin.from('leads').insert({
            artisan_id: canal.artisan_id,
            nom_prospect: mail.de.nom || mail.de.email!.split('@')[0],
            contact: mail.de.email, canal: 'email',
            message,
            statut: 'nouveau',
            type_chantier: typeChantier(message, metier),
          }).select('id').single()
          if (error || !nouveau) continue
          leadId = nouveau.id
        }

        await supabaseAdmin.from('messages').insert({
          lead_id: leadId, sens: 'in', type: 'email',
          contenu: (mail.sujet ? `${mail.sujet}\n\n` : '') + mail.texte,
          canal_id: canal.id, externe_id: mail.messageId,
          sent_at: (mail.date || new Date()).toISOString(),
        })
        importes++
      }
    } finally { lock.release() }

    await supabaseAdmin.from('canaux').update({ derniere_releve: new Date().toISOString(), derniere_erreur: null }).eq('id', canal.id)
    return { importes }
  } catch (e) {
    const brut = (e instanceof Error ? e.message : String(e)).toLowerCase()
    const erreur = brut.includes('auth') || brut.includes('credential') || brut.includes('login')
      ? 'Identifiants refusés — le mot de passe de la boîte a peut-être changé.'
      : 'Connexion à la boîte impossible pour l’instant.'
    await supabaseAdmin.from('canaux').update({ derniere_erreur: erreur }).eq('id', canal.id)
    return { importes: 0, erreur }
  } finally {
    try { await client?.logout() } catch { /* la boîte se referme toute seule */ }
  }
}
