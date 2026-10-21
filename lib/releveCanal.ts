import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { dechiffrer } from '@/lib/secretBox'
import { lireMail } from '@/lib/mailLite'
import { MESSAGE_SERVEUR_INJOIGNABLE, verifierServeurImap } from '@/lib/hoteSur'
import { typeChantier } from '@/lib/qualification'
import { villeDe } from '@/lib/ville'
import { actif } from '@/lib/flags'
import { contenuEntrantLeboncoin, lireNotificationLeboncoin } from '@/lib/canaux/leboncoin'
import { rangerNotificationLeboncoin, rangerNotificationReseau, type Range } from '@/lib/canaux/rangement'
import { contenuEntrantReseau, expediteurDeReseau, lireNotificationReseau } from '@/lib/canaux/notifications'
import { signaturesDkimValides, type ResolveurTxt } from '@/lib/canaux/dkim'
import { promises as dns } from 'node:dns'
import { magasinCanaux, preparerReponseCanal } from '@/lib/canaux/serveur'

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
/** Réponses préparées par l'IA pour Le Bon Coin, par boîte et par passage : la relève de 50 boîtes tient en 60 s. */
const MAX_PREPARATIONS_LBC = 2

/** Repli DNS-over-HTTPS (dns.google, enregistrements TXT) quand le DNS direct échoue ou se tait : la clé publique d'un domaine est
 *  publique, seul son nom part. 21/10/2026 : le DNS direct a été refusé (ECONNREFUSED) sur un poste de test, alors que le même e-mail
 *  TikTok réel était vérifié par cette voie — une panne DNS passagère ne doit pas éteindre la reconnaissance des notifications. */
async function txtParDoh(nom: string): Promise<string[][]> {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(nom)}&type=TXT`, { signal: AbortSignal.timeout(4_000) })
  if (!r.ok) return []
  const j = await r.json() as { Answer?: { type: number; data: string }[] }
  return (j.Answer ?? []).filter((a) => a.type === 16 && typeof a.data === 'string').map((a) => [a.data.replace(/^"|"$/g, '').split('" "').join('')])
}

/** La lecture DNS des clés DKIM (lib/canaux/dkim.ts), bornée à 4 s, mémorisée le temps d'un passage, avec repli DoH. Muette : rien de vérifié. */
function resolveurDkim(): ResolveurTxt {
  const memo = new Map<string, Promise<string[][]>>()
  return (nom) => {
    if (!memo.has(nom)) {
      memo.set(nom, Promise.race([
        dns.resolveTxt(nom),
        new Promise<string[][]>((_, non) => setTimeout(() => non(new Error('dns lent')), 4_000)),
      ]).then((r) => (r.length ? r : txtParDoh(nom))).catch(() => txtParDoh(nom).catch(() => [])))
    }
    return memo.get(nom) as Promise<string[][]>
  }
}

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
  // Audit du 20/10 (SSRF, rebinding DNS) : la validation faite à l'enregistrement ne vaut pas pour toujours — un nom
  // public d'hier peut résoudre vers le réseau interne aujourd'hui. On revalide donc à CHAQUE relève, et on se
  // connecte à l'adresse validée (le nom reste en SNI), pas à une seconde résolution que l'attaquant pourrait changer.
  const verdict = await verifierServeurImap(canal.imap_hote, port)
  if (!verdict.ok) {
    await supabaseAdmin.from('canaux').update({ derniere_erreur: MESSAGE_SERVEUR_INJOIGNABLE }).eq('id', canal.id)
    return { importes: 0, erreur: MESSAGE_SERVEUR_INJOIGNABLE }
  }
  let client: import('imapflow').ImapFlow | null = null
  let importes = 0
  let metier: string | null | undefined
  let resolveur: ResolveurTxt | undefined
  // Le Bon Coin (drapeau canauxLeboncoin) : les conversations rangées pendant ce passage, préparées une fois la boîte refermée.
  const leboncoin: { r: Range; avecIA: boolean }[] = []

  try {
    const { ImapFlow } = await import('imapflow')
    client = new ImapFlow({
      host: verdict.adresse, servername: verdict.hote, port, secure: port === 993,
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
        const lu = lireMail(msg.source)
        if (!lu.messageId) continue
        // 21/10/2026 (audit offensif, E1) : un e-mail qui SE DIT d'un réseau (Le Bon Coin, LinkedIn…) n'en est une notification que si
        // NOUS vérifions sa signature DKIM (lib/canaux/dkim.ts) — l'en-tête Authentication-Results peut avoir été écrit par l'expéditeur.
        const doitVerifier = (actif('canauxLeboncoin') || actif('canauxNotifications')) && expediteurDeReseau(lu.de.email)
        const mail = doitVerifier ? { ...lu, dkim_valides: await signaturesDkimValides(msg.source, resolveur ??= resolveurDkim()) } : lu
        if (!mail.messageId) continue

        // Une notification Le Bon Coin vient d'un expéditeur automatique : elle est reconnue AVANT le filtre qui l'écarterait.
        // Idempotente par Message-ID (canaux_evenements, 0139) ; le contact reste vide (l'adresse est celle de Le Bon Coin).
        if (actif('canauxLeboncoin')) {
          const lbc = lireNotificationLeboncoin(mail)
          if (lbc) {
            const issue = await rangerNotificationLeboncoin(
              { ...lbc, texte: contenuEntrantLeboncoin(lbc) },
              { id: canal.id, artisan_id: canal.artisan_id, type: 'email', actif: true },
              mail.messageId, (mail.date || new Date()).toISOString(), magasinCanaux,
            )
            if (issue.etat === 'range') {
              importes++
              const avecIA = !!lbc.texte && leboncoin.filter((x) => x.avecIA).length < MAX_PREPARATIONS_LBC
              leboncoin.push({ r: issue.r, avecIA })
            }
            continue
          }
        }

        // 21/10/2026 — les réseaux sans API (LinkedIn, Page Facebook, Instagram, TikTok, plateformes de devis), par leurs e-mails de
        // notification, sur le modèle de Le Bon Coin (lib/canaux/notifications.ts : domaine de l'expéditeur ET authentification). Même
        // idempotence (Message-ID), même plafond de réponses préparées par passage.
        if (actif('canauxNotifications')) {
          const n = lireNotificationReseau(mail)
          if (n) {
            const issue = await rangerNotificationReseau(
              { ...n, texte: contenuEntrantReseau(n) },
              { id: canal.id, artisan_id: canal.artisan_id, type: 'email', actif: true },
              mail.messageId, (mail.date || new Date()).toISOString(), magasinCanaux,
            )
            if (issue.etat === 'range') {
              importes++
              const avecIA = !!n.texte && leboncoin.filter((x) => x.avecIA).length < MAX_PREPARATIONS_LBC
              leboncoin.push({ r: issue.r, avecIA })
            }
            continue
          }
        }

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
            // La commune nommée dans le message, sur une liste fermée (0133, lib/ville.ts) ; null si aucune.
            ville: villeDe(message),
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
    // Une proposition (quand l'e-mail recopie le texte) et une notification par conversation ; sans le texte, l'artisan est
    // seulement prévenu : l'IA ne répond pas à un message qu'elle n'a pas lu.
    for (const { r, avecIA } of leboncoin) await preparerReponseCanal({ ...r, avecIA })
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
