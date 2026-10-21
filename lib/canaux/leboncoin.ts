// lib/canaux/leboncoin.ts — les messages Le Bon Coin, par la seule voie honnête : l'e-mail de notification.
//
// Le Bon Coin n'ouvre AUCUNE API publique de messagerie. Il envoie en revanche un e-mail à chaque nouveau message reçu sur une
// annonce. Quand l'artisan a branché la boîte qui reçoit ces e-mails (Messages → Canaux), la relève (lib/releveCanal.ts) les
// reconnaît ici, en extrait l'annonce, le prénom affiché, le texte quand l'e-mail le recopie, et le lien pour répondre. On ne
// peut pas répondre par API : l'artisan copie la réponse préparée en un clic et la colle dans Le Bon Coin.
//
// Module PUR. On ne se fie à aucune chaîne unique — le gabarit de ces e-mails change sans prévenir, et nos fixtures
// (scripts/fixtures/leboncoin/) sont inventées faute d'e-mail réel :
//   1. l'expéditeur est sur le domaine leboncoin.fr (ou un sous-domaine), ET l'en-tête Authentication-Results posé par le serveur de
//      la boîte (le premier) porte dkim=pass aligné sur leboncoin.fr — absent ou sans signature alignée : ignoré (audit du 21/10,
//      E1 : un en-tête « dkim=pass » écrit par l'expéditeur lui-même ne compte pas ; un e-mail forgé ne doit pas fabriquer un client) ;
//   2. l'e-mail parle d'un MESSAGE (objet ou corps), pas d'une alerte, d'une annonce mise en ligne ou d'un paiement ;
//   3. le lien de réponse n'est retenu que s'il pointe en https vers leboncoin.fr — jamais un lien d'un autre domaine, même
//      présent dans l'e-mail : c'est l'artisan qui va cliquer.
// [à confronter au premier vrai e-mail de notification reçu par un artisan, caviardé]

export type MailNotification = {
  de: { nom: string | null; email: string | null }
  sujet: string
  texte: string
  html?: string | null
  /** L'en-tête Authentication-Results brut, s'il existe. */
  authentification?: string | null
  /** 21/10/2026 (audit offensif, E1) : les domaines dont la signature DKIM a été VÉRIFIÉE par nous (lib/canaux/dkim.ts). Absent : rien de vérifié. */
  dkim_valides?: readonly string[] | null
}

export type NotificationLeboncoin = {
  /** Le titre de l'annonce, si on l'a trouvé. */
  annonce: string | null
  /** Le prénom (ou pseudo) affiché par Le Bon Coin, si on l'a trouvé. */
  prenom: string | null
  /** Le texte du message quand l'e-mail le recopie ; null sinon (il faut alors l'ouvrir sur Le Bon Coin). */
  texte: string | null
  /** Le lien https://…leboncoin.fr pour lire et répondre ; à défaut, la messagerie générale. */
  lien: string
  /** Une clé stable pour ranger les messages successifs d'une même conversation dans le même fil. */
  cle_conversation: string
}

import { LIEN_MESSAGERIE_LEBONCOIN } from './libelles.ts'
import { signeePar, verdictAuthentification } from './notifications.ts'
export { LIEN_MESSAGERIE_LEBONCOIN }

const DOMAINE = /(^|\.)leboncoin\.fr$/i
const domaineDe = (email: string | null | undefined) => (email && email.includes('@') ? email.split('@').pop()!.toLowerCase().trim() : '')

/** Lien sûr : https, hôte leboncoin.fr ou un de ses sous-domaines, sans identifiants dans l'adresse. */
export function lienLeboncoinSur(brut: string): string | null {
  try {
    const u = new URL(brut.replace(/&amp;/g, '&').trim())
    if (u.protocol !== 'https:' || u.username || u.password || !DOMAINE.test(u.hostname)) return null
    return u.toString()
  } catch { return null }
}

const SIGNAL_MESSAGE = /(nouveau(x)? message|vous a (envoy[ée]|[ée]crit|r[ée]pondu)|a r[ée]pondu [àa] votre|message (de|concernant|au sujet|à propos|a propos|pour)|vous avez re[çc]u un (nouveau )?message|r[ée]pondre au message|lire (le|son) message)/i
const PAS_UN_MESSAGE = /(alerte|nouvelles annonces|votre annonce (est|a [ée]t[ée]) (en ligne|publi|valid|refus|expir|supprim)|mot de passe|code de (connexion|v[ée]rification)|paiement|facture|virement|remboursement|livraison|colis|newsletter|offre sp[ée]ciale|favoris|baisse de prix)/i

/** Sort les URL d'un HTML (href) et d'un texte brut, sans doublon, dans l'ordre d'apparition. */
function liensDe(html: string, texte: string): { url: string; libelle: string }[] {
  const vus = new Set<string>()
  const sortie: { url: string; libelle: string }[] = []
  const ajouter = (url: string, libelle: string) => { if (!vus.has(url)) { vus.add(url); sortie.push({ url, libelle }) } }
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    ajouter(m[1], m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  }
  for (const m of texte.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) ajouter(m[0], '')
  return sortie
}

// lib/mailLite ne décode que quelques entités du repli HTML ; une notification envoyée en HTML seul garde « &laquo; », « &eacute; »…
const ENTITES: Record<string, string> = {
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', nbsp: ' ', amp: '&', quot: '"', apos: '’', lt: '<', gt: '>',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ugrave: 'ù', ucirc: 'û',
  Eacute: 'É', Egrave: 'È', Agrave: 'À', Ccedil: 'Ç', hellip: '…', ndash: '–', mdash: '—', euro: '€',
}
export const decoderEntites = (s: string) => s
  .replace(/&#(\d{1,6});/g, (m, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m })
  .replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m })
  .replace(/&([a-z]{2,8});/gi, (m, nom) => ENTITES[nom] ?? m)

const nettoyer = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s"'«“‘:–—-]+|[\s"'»”’:.,!–—-]+$/g, '').trim()

function annonceDe(sujet: string, corps: string): string | null {
  const sources = [sujet, corps]
  const motifs = [
    /(?:annonce|concernant|au sujet de|à propos de|a propos de|pour)\s*(?:votre annonce)?\s*[:\-–]?\s*[«"“]\s*([^»"”\n]{2,120})\s*[»"”]/i,
    /^\s*annonce\s*:\s*(.{2,120})$/im,
    /(?:au sujet de|concernant|à propos de) (?:votre |l['’])annonce\s+([^\n.!?]{2,120})/i,
  ]
  for (const s of sources) for (const m of motifs) { const r = s.match(m); if (r?.[1]) { const v = nettoyer(r[1]); if (v) return v.slice(0, 120) } }
  return null
}

const PRENOM = "([A-ZÀ-ÖØ-Þ][\\p{L}'’\\-]{1,30}(?: [A-ZÀ-ÖØ-Þ][\\p{L}'’\\-.]{0,30})?)"
function prenomDe(sujet: string, corps: string): string | null {
  const motifs = [
    new RegExp(`${PRENOM} vous a (?:envoy[ée] un (?:nouveau )?message|[ée]crit|r[ée]pondu)`, 'u'),
    // Sans le drapeau i : il rendrait [A-Z] insensible à la casse, et « Message de Jean-Marc concernant » prendrait « concernant ».
    new RegExp(`(?:[Nn]ouveau )?[Mm]essage de(?: la part de)? ${PRENOM}`, 'u'),
    new RegExp(`^\\s*(?:de|exp[ée]diteur|envoy[ée] par)\\s*:\\s*${PRENOM}\\s*$`, 'imu'),
    new RegExp(`${PRENOM} (?:a r[ée]pondu|est int[ée]ress[ée])`, 'u'),
  ]
  for (const s of [sujet, corps]) for (const m of motifs) {
    const r = s.match(m)
    const v = r?.[1] ? nettoyer(r[1]) : ''
    if (v && !/^(le ?bon ?coin|leboncoin|vous|un|une|nouveau|message|bonjour)$/i.test(v)) return v.slice(0, 60)
  }
  return null
}

/** Le texte recopié du message : entre guillemets, ou après « a écrit : » / « Son message : », jusqu'au bouton. */
function texteMessageDe(corps: string, annonce: string | null): string | null {
  const fin = /^\s*(r[ée]pondre|voir (le|la|son) (message|conversation)|lire (le|la suite)|acc[ée]der [àa] (la|ma) messagerie|ouvrir la conversation|pour r[ée]pondre|ce message vous a [ée]t[ée] envoy[ée]|l['’][ée]quipe leboncoin|conseils? de s[ée]curit[ée]|https?:\/\/)/i
  const lignes = corps.replace(/\r\n/g, '\n').split('\n')
  const debut = lignes.findIndex((l) => /(a [ée]crit|son message|votre message re[çc]u|message re[çc]u|il vous dit|elle vous dit)\s*:\s*$/i.test(l.trim()))
  if (debut !== -1) {
    const bloc: string[] = []
    for (const l of lignes.slice(debut + 1)) { if (fin.test(l)) break; bloc.push(l) }
    const t = bloc.join('\n').replace(/^[\s>«"“]+|[\s»"”]+$/g, '').trim()
    if (t.length >= 2) return t.slice(0, 4000)
  }
  // Un passage entre guillemets français (Le Bon Coin cite parfois le message ainsi) — sauf le titre de l'annonce, cité de même
  // (« votre annonce « Dépannage chauffe-eau » ») : écarté s'il vaut l'annonce ou suit « annonce / concernant / au sujet de ».
  for (const cite of corps.matchAll(/«\s*([^»]{8,4000}?)\s*»/g)) {
    const avant = corps.slice(Math.max(0, (cite.index ?? 0) - 30), cite.index ?? 0)
    const t = cite[1].trim()
    if (annonce && nettoyer(t) === annonce) continue
    if (/(annonce|concernant|au sujet de|à propos de|a propos de)\s*[:\-–]?\s*$/i.test(avant)) continue
    return t
  }
  return null
}

/** Clé de conversation : un identifiant tiré du lien quand il en porte un, sinon l'annonce et le prénom. */
function cleDe(lien: string | null, annonce: string | null, prenom: string | null): string {
  if (lien) {
    const p = new URL(lien).pathname
    const m = p.match(/(?:messages?|conversations?|messagerie|reply|repondre)\/(?:[a-z_-]+\/)?([A-Za-z0-9-]{6,80})/i)
    if (m) return `lbc:c:${m[1]}`.slice(0, 120)
  }
  const base = `${(annonce ?? '').toLowerCase()}|${(prenom ?? '').toLowerCase()}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9|]+/g, '-')
  return `lbc:a:${base}`.slice(0, 120)
}

/** L'en-tête d'authentification dit-il que l'e-mail est forgé ? (absent : on ne conclut rien — la relève IMAP ne le voit pas toujours) */
export function authentificationEchouee(entete: string | null | undefined): boolean {
  if (!entete) return false
  const e = entete.toLowerCase()
  if (/dmarc=fail/.test(e)) return true
  return /spf=(fail|softfail)/.test(e) && !/dkim=pass/.test(e)
}

/** La notification Le Bon Coin lue dans un e-mail, ou null si ce n'en est pas une. Ne lève jamais. */
export function lireNotificationLeboncoin(mail: MailNotification): NotificationLeboncoin | null {
  try {
    if (!DOMAINE.test(domaineDe(mail.de.email))) return null
    if (authentificationEchouee(mail.authentification)) return null
    // 21/10/2026 (audit offensif, E1) : il faut une PREUVE — dkim=pass aligné sur leboncoin.fr dans l'en-tête posé par le serveur de
    // la boîte (le premier, lib/mailLite.ts). Absent ou sans signature alignée : ce n'est pas une notification Le Bon Coin.
    if (verdictAuthentification(mail.authentification, ['leboncoin.fr']) !== 'ok') return null
    if (!signeePar(mail.dkim_valides, ['leboncoin.fr'])) return null
    const sujet = (mail.sujet || '').slice(0, 300)
    const html = (mail.html || '').slice(0, 300_000)
    const corps = decoderEntites((mail.texte || '').slice(0, 20_000))
    const signal = SIGNAL_MESSAGE.test(sujet) || SIGNAL_MESSAGE.test(corps.slice(0, 2000))
    if (!signal) return null
    if (PAS_UN_MESSAGE.test(sujet) && !SIGNAL_MESSAGE.test(sujet)) return null

    const liens = liensDe(html, corps)
      .map((l) => ({ ...l, sur: lienLeboncoinSur(l.url) }))
      .filter((l): l is { url: string; libelle: string; sur: string } => !!l.sur)
    const parChemin = liens.find((l) => /messag|conversation|reply|repondre|r%C3%A9pondre/i.test(new URL(l.sur).pathname))
    const parBouton = liens.find((l) => /r[ée]pondre|voir le message|lire le message|ouvrir la conversation|messagerie/i.test(l.libelle))
    const choisi = parChemin?.sur ?? parBouton?.sur ?? null

    const annonce = annonceDe(sujet, corps)
    const prenom = prenomDe(sujet, corps)
    const texte = texteMessageDe(corps, annonce)
    return { annonce, prenom, texte, lien: choisi ?? LIEN_MESSAGERIE_LEBONCOIN, cle_conversation: cleDe(choisi, annonce, prenom) }
  } catch {
    return null
  }
}

/** Le premier message rangé dans le fil quand l'e-mail ne recopie pas le texte : l'artisan sait où aller. */
export function contenuEntrantLeboncoin(n: NotificationLeboncoin): string {
  if (n.texte) return n.texte
  return `Nouveau message sur Le Bon Coin${n.annonce ? ` au sujet de « ${n.annonce} »` : ''}. L’e-mail de notification ne recopie pas le texte : ouvrez-le sur Le Bon Coin pour le lire.`
}
