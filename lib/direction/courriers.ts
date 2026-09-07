import { ImapFlow } from 'imapflow'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { boiteEntrepriseResolue, testerImap } from '@/lib/canaux'

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

/** Les identifiants de la boîte de l'entreprise, ou null si elle n'est pas configurée.
 *
 *  L'hôte n'est plus deviné ici : `boiteEntrepriseResolue` est la seule vérité du dépôt (voir son
 *  commentaire — deux fichiers en donnaient deux, et la relève frappait peut-être le mauvais serveur). */
export function boiteEntreprise(): Identifiants | null {
  const b = boiteEntrepriseResolue()
  return b ? { hote: b.hote, port: b.port, user: b.user, pass: b.pass } : null
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

/** La seule boîte relevée. La valeur ne change pas : la nommer évite de la répéter cinq fois. */
const BOITE = 'INBOX'

/** Les en-têtes qu'on lit, et AUCUN autre.
 *
 *  `Received` n'y est pas et n'y sera pas : c'est une chaîne d'adresses IP, donc une donnée
 *  personnelle, et une table de courrier n'est pas un journal réseau. */
const ENTETES = ['auto-submitted', 'precedence', 'list-unsubscribe', 'list-id', 'return-path',
  'x-failed-recipients', 'authentication-results']

/** Les en-têtes bruts, en clés minuscules bornées.
 *
 *  Découpage sur les sauts de ligne NON suivis d'une espace : un en-tête se replie sur plusieurs
 *  lignes, et couper naïvement sur `\n` produirait des clés inventées. Première occurrence gardée —
 *  les serveurs empilent par le haut, donc la première ligne est la plus récente. */
function lireEntetes(brut?: Buffer | Uint8Array | null): Record<string, string> {
  if (!brut?.length) return {}
  const texte = Buffer.from(brut).toString('utf8').replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, ' ')
  const out: Record<string, string> = {}
  for (const ligne of texte.split('\n')) {
    const i = ligne.indexOf(':')
    if (i < 1) continue
    const cle = ligne.slice(0, i).trim().toLowerCase()
    if (!ENTETES.includes(cle) || out[cle] !== undefined) continue
    out[cle] = ligne.slice(i + 1).trim().slice(0, 256)
  }
  return out
}

/** Un rapport de non-remise se reconnaît à sa STRUCTURE (RFC 3464), jamais à son sujet.
 *
 *  Un humain ne fabrique pas un `multipart/report` par accident, alors que « Mail delivery failed »
 *  est l'un des sujets les plus copiés par l'hameçonnage. */
function estRapportDeRemise(n?: Partie): boolean {
  if (!n) return false
  const plat: Partie[] = []
  const parcourir = (x: Partie) => { plat.push(x); (x.childNodes ?? []).forEach(parcourir) }
  parcourir(n)
  return plat.some((x) => x.type === 'message/delivery-status'
    || (x.type === 'multipart/report' && String((x as { parameters?: Record<string, string> }).parameters?.['report-type'] ?? '').toLowerCase() === 'delivery-status'))
}

/** Les faits normalisés qu'on garde d'un message — jamais l'en-tête brut. */
function faits(bruts: Record<string, string>, opts: { rapport: boolean; deSoi: boolean; replyTo?: string | null }): Record<string, string | boolean> {
  const f: Record<string, string | boolean> = {}
  if (bruts['auto-submitted']) f.auto_submitted = bruts['auto-submitted']
  if (bruts['precedence']) f.precedence = bruts['precedence']
  if (bruts['list-unsubscribe']) f.list_unsubscribe = bruts['list-unsubscribe']
  if (bruts['list-id']) f.list_id = bruts['list-id']
  if (bruts['return-path']) f.return_path = bruts['return-path']
  if (bruts['x-failed-recipients']) f.x_failed_recipients = bruts['x-failed-recipients']
  const ar = bruts['authentication-results'] ?? ''
  if (/dkim=pass/i.test(ar)) { f.dkim_pass = true; const d = ar.match(/header\.d=([\w.-]+)/i); if (d) f.dkim_d = d[1].toLowerCase() }
  if (opts.rapport) f.rapport_remise = true
  if (opts.deSoi) f.de_soi = true
  if (opts.replyTo) f.reply_to = opts.replyTo.toLowerCase().slice(0, 320)
  return f
}

export type Releve =
  | { ok: true; lus: number; nouveaux: number; boite: string; reste: boolean; depuisUid: number }
  | { ok: false; erreur: string }

/** Où reprendre la prochaine fois : le plus haut UID déjà enregistré, et la validité de la boîte.
 *
 *  `uidValidity` est le garde-fou de la norme IMAP : tant qu'elle ne change pas, un UID désigne
 *  toujours le même message. Si le serveur renumérote (rare), les anciens UID ne veulent plus rien
 *  dire — on repart d'une fenêtre, une seule fois, et le dédoublonnage par `Message-ID` fait le reste. */
async function pointDeReprise(validiteCourante: string): Promise<number> {
  const { data } = await supabaseAdmin.from('reglages_globaux').select('valeur').eq('cle', 'courriers_uid_validity').maybeSingle()
  const memorisee = data?.valeur == null ? '' : String(data.valeur).replace(/^"|"$/g, '')
  if (memorisee !== validiteCourante) {
    // Boîte renumérotée, ou première relève : on ne peut pas faire confiance aux UID d'avant.
    await supabaseAdmin.from('reglages_globaux').upsert(
      { cle: 'courriers_uid_validity', valeur: validiteCourante, description: 'Validité IMAP de la boîte de l’entreprise : si elle change, les UID mémorisés ne désignent plus les mêmes messages.', maj_le: new Date().toISOString() },
      { onConflict: 'cle' })
    return 0
  }
  const { data: haut } = await supabaseAdmin.from('courriers')
    .select('uid_imap').eq('boite', BOITE).not('uid_imap', 'is', null)
    .order('uid_imap', { ascending: false }).limit(1).maybeSingle()
  return Number(haut?.uid_imap ?? 0)
}

/** « contact@prestiapp.fr » → « c…@prestiapp.fr ». Assez pour reconnaître la boîte, pas assez pour
 *  qu'une capture d'écran de l'erreur devienne une fuite. */
const identifiantReduit = (u: string) => {
  const [avant, apres] = u.split('@')
  return apres ? `${avant.slice(0, 1)}…@${apres}` : `${u.slice(0, 2)}…`
}

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
  let lus = 0, nouveaux = 0, aRelever = false, reprise = 0
  try {
    await client.connect()
    const lock = await client.getMailboxLock(BOITE)
    try {
      const boiteOuverte = client.mailbox && typeof client.mailbox === 'object' ? client.mailbox : null
      const total = (boiteOuverte && 'exists' in boiteOuverte ? (boiteOuverte.exists as number) : 0) || 0
      const validite = String((boiteOuverte as { uidValidity?: bigint } | null)?.uidValidity ?? '')
      const depuisUid = await pointDeReprise(validite)
      reprise = depuisUid
      if (total === 0) return { ok: true, lus: 0, nouveaux: 0, boite: BOITE, reste: false, depuisUid }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- lisibilité : la plage se lit mieux nommée
      // Par UID quand on a un point de reprise ; par fenêtre seulement à la toute première relève,
      // ou après une renumérotation du serveur.
      const plage = depuisUid > 0 ? `${depuisUid + 1}:*` : `${Math.max(1, total - limite + 1)}:*`
      const parUid = depuisUid > 0
      const messages: { uid: number; messageId: string; inReplyTo: string | null; email: string; nom: string | null; sujet: string | null; date: Date; partie: { part: string; html: boolean } | null; entetes: Record<string, string | boolean> }[] = []
      for await (const m of client.fetch(plage, { uid: true, envelope: true, bodyStructure: true, internalDate: true, headers: ENTETES }, parUid ? { uid: true } : undefined)) {
        const env = m.envelope
        const id = env?.messageId
        if (!id) continue // sans Message-ID, on ne sait pas dédoublonner : on laisse le message tranquille
        const de = env.from?.[0]
        const repondreA = env.replyTo?.[0]?.address ?? null
        const expediteur = (de?.address ?? '').toLowerCase()
        messages.push({
          uid: m.uid, messageId: id, inReplyTo: env.inReplyTo ?? null,
          email: de?.address ?? '', nom: de?.name ?? null,
          sujet: env.subject ?? null, date: new Date(m.internalDate || env.date || Date.now()),
          partie: partieTexte(m.bodyStructure as Partie | undefined),
          entetes: faits(lireEntetes(m.headers as Buffer | undefined), {
            rapport: estRapportDeRemise(m.bodyStructure as Partie | undefined),
            // « de soi » : le message vient du compte qu'on relève. Sans ce fait, le jour où la
            // boîte appartient à un fondateur qui est aussi une ligne `artisans`, tout ce qu'il
            // s'envoie se rattacherait à sa propre fiche.
            deSoi: !!expediteur && expediteur === b.user.toLowerCase(),
            replyTo: repondreA && repondreA.toLowerCase() !== expediteur ? repondreA : null,
          }),
        })
      }
      // La limite borne le PASSAGE (une route serverless doit finir), elle ne fait plus perdre :
      // le point de reprise n'avance que de ce qui a été enregistré, donc la suite sera lue au
      // passage suivant. On dit combien il reste, pour que ça ne s'ignore pas en silence.
      // Les plus ANCIENS d'abord : un message vieux de trois jours a déjà trop attendu.
      messages.sort((a, b) => a.uid - b.uid)
      aRelever = messages.length > limite
      if (aRelever) messages.length = limite
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
        const args = {
          p_message_id: m.messageId, p_fil: fil, p_sens: 'recu', p_email: m.email, p_nom: m.nom,
          p_sujet: m.sujet, p_corps: texteSeul(corps), p_recu_le: new Date(m.date).toISOString(), p_boite: BOITE, p_uid: m.uid,
        }
        let { data, error } = await supabaseAdmin.rpc('enregistrer_courrier', { ...args, p_entetes: m.entetes })
        // Tant que la migration 0072 n'est pas collée, la fonction n'accepte que dix arguments et
        // PostgREST refuse celui-ci. Sans ce repli, déployer avant de coller ferait sauter CHAQUE
        // message en silence — un ordre de gestes humains ne doit jamais garder du courrier en otage.
        // Le classement attendra la migration ; les messages, eux, entrent. Un rangement en retard
        // se rattrape avec `reclasser_courriers`, un message jamais lu, non.
        if (error && /PGRST202|function|schema cache/i.test(error.message)) {
          const r = await supabaseAdmin.rpc('enregistrer_courrier', args)
          data = r.data; error = r.error
          if (!error) console.warn('[courriers] migration 0072 absente : le message est enregistré, son classement attendra.')
        }
        if (error) { console.error('[courriers] enregistrement :', error.message); continue }
        if ((data as { nouveau?: boolean })?.nouveau) nouveaux++
      }
    } finally { lock.release() }
    await client.logout()
    return { ok: true, lus, nouveaux, boite: BOITE, reste: aRelever, depuisUid: reprise }
  } catch (e) {
    try { await client.logout() } catch { /* la connexion est déjà tombée */ }
    // La bibliothèque IMAP jette « Command failed » pour à peu près tout : mot de passe refusé,
    // boîte inexistante, serveur qui coupe. Ce message-là n'a jamais aidé personne (07/09, six
    // secondes de 503 sans savoir quoi corriger). On rejoue donc la connexion seule, avec le
    // diagnostic de `testerImap`, qui distingue les cas et le dit en français.
    const brut = (e as Error).message.slice(0, 200)
    const t = await testerImap(b.hote, b.port, b.user, b.pass)
    const ou = `${b.hote}:${b.port}, compte ${identifiantReduit(b.user)}`
    // Le message du serveur est repris tel quel, à la fin : c'est lui qui départage quand aucun des
    // cas reconnus ne tombe juste, et il ne contient ni identifiant ni mot de passe.
    if (!t.ok) {
      // Ce que seul le code peut voir : un mot de passe collé dans un champ web arrive souvent avec
      // une espace ou un retour à la ligne en trop. Invisible à l'œil, fatal pour un serveur IMAP,
      // et impossible à vérifier depuis le webmail. On le signale sans y toucher : le corriger en
      // douce ferait exister deux versions du mot de passe selon qui le lit.
      const sali = b.pass !== b.pass.trim() ? ' ⚠️ le mot de passe enregistré commence ou finit par une espace : c’est probablement un copier-coller de trop.' : ''
      const court = b.pass.trim().length < 6 ? ` ⚠️ le mot de passe enregistré ne fait que ${b.pass.trim().length} caractère(s).` : ''
      return { ok: false, erreur: `${t.erreur} (${ou}) — le serveur a répondu : « ${t.brut} »${sali}${court}` }
    }
    // La connexion passe mais la relève a échoué : c'est la BOÎTE ou le message, pas l'accès.
    return { ok: false, erreur: `La connexion à ${ou} fonctionne, mais la relève s’est arrêtée : ${brut}` }
  }
}

/** L'adresse d'un correspondant, en clair pour la direction, jamais dans une URL ni un journal. */
export const correspondantLisible = (nom: string | null, email: string) => (nom && nom !== email ? `${nom} <${email}>` : email)

/** Un sujet de réponse : « Re: » une seule fois, jamais « Re: Re: Re: ». */
export const sujetReponse = (sujet: string | null | undefined) => {
  const s = (sujet ?? '').trim() || '(sans objet)'
  return /^re\s*:/i.test(s) ? s : `Re: ${s}`
}
