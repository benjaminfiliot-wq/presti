// lib/canaux/notifications.ts — les réseaux SANS API ouverte, regroupés par leurs E-MAILS DE NOTIFICATION (21/10/2026, drapeau
// canauxNotifications). Le modèle est celui de Le Bon Coin (lib/canaux/leboncoin.ts), généralisé.
//
// LinkedIn, une Page Facebook, Instagram, TikTok et les plateformes de demandes de devis (123devis, Habitatpresto, PagesJaunes,
// Houzz, Travaux.com, StarOfService) préviennent par e-mail d'un nouveau message ou d'une nouvelle demande. Quand l'artisan a
// branché la boîte qui reçoit ces e-mails (Messages → Canaux), la relève (lib/releveCanal.ts) les reconnaît ici : la conversation
// arrive dans sa messagerie avec la pastille du réseau, le nom et l'extrait quand l'e-mail les contient, et le lien profond vers la
// conversation d'origine. L'IA prépare la réponse ; « Copier et ouvrir LinkedIn » la copie et ouvre la conversation : c'est
// l'artisan qui colle. JAMAIS d'envoi par une voie non officielle (ni cookie, ni robot, ni WhatsApp Web).
//
// Module PUR. Garde-fous anti-hameçonnage, dans cet ordre :
//   1. l'adresse de l'EXPÉDITEUR (jamais le nom affiché) est sur un domaine du réseau, comparé par suffixe exact de domaine
//      (« linkedin.com » ou « x.linkedin.com », pas « linkedin.com.evil.fr » ni « linkedln.com ») ;
//   2. l'en-tête Authentication-Results posé par le serveur de la boîte (le PREMIER : lib/mailLite.ts garde celui-là, un expéditeur
//      peut en écrire un faux plus bas) doit porter dkim=pass ALIGNÉ (header.d ou header.i sur un domaine du réseau). dmarc=pass seul
//      ne suffit pas (123devis n'a pas de DMARC ; Habitatpresto, Solocal, StarOfService sont en p=none). Absent, en échec ou sans
//      signature alignée : ce n'est PAS une notification du réseau (audit offensif du 21/10, E1) — l'e-mail suit le chemin ordinaire
//      de la relève, sans pastille ni réponse préparée ;
//   3. l'e-mail parle d'un MESSAGE ou d'une DEMANDE (objet ou corps), pas d'une offre d'emploi, d'une invitation, d'un paiement ;
//   4. le lien retenu est https, sans identifiants, sur un hôte du réseau, sur le CHEMIN d'une conversation du réseau — jamais un
//      redirecteur (l.facebook.com/l.php, linkedin.com/redir, fb.me…), jamais un lien d'un autre domaine : c'est l'artisan qui va
//      cliquer. À défaut, la messagerie générale du réseau (lib/canaux/libelles.ts).
//
// Les gabarits de ces e-mails changent sans prévenir et nos fixtures (scripts/fixtures/canaux-reseaux/) sont INVENTÉES, sur la
// forme publique de ces notifications : [à confronter au premier vrai e-mail reçu par un artisan, caviardé]. Google (fiche
// d'établissement) n'est PAS dans la liste : sa messagerie a été arrêtée le 31/07/2024 (https://support.google.com/business/answer/14919056).
import crypto from 'node:crypto'
import { LIEN_MESSAGERIE, LIBELLE_CANAL, type CanalNotification } from './libelles.ts'
import type { MailNotification } from './leboncoin.ts'

export type ReseauNotification = {
  canal: CanalNotification
  /** Domaines d'expédition admis (suffixe exact). */
  domaines: readonly string[]
  /** Hôtes admis pour le lien de réponse (suffixe exact). */
  hotes: readonly string[]
  /** L'e-mail parle d'un message ou d'une demande. */
  signal: RegExp
  /** Ce n'est PAS un message de client (emploi, invitation, publicité, sécurité du compte…). */
  exclu: RegExp
  /** Chemin d'un lien qui mène à la conversation (préféré à tout autre lien du réseau). */
  chemin: RegExp
  /** Plateforme de demandes de devis (le texte de la demande est souvent dans l'e-mail) plutôt que messagerie. */
  plateformeDevis?: boolean
}

const MESSAGE_FR_EN = /(nouveau(x)? message|new message|vous a (envoy[ée]|[ée]crit|r[ée]pondu)|sent you a (new )?message|a r[ée]pondu [àa] votre|message de |message from |vous avez re[çc]u un (nouveau )?message|you have (a )?new message|messages? non lus?|unread message|r[ée]pondre au message)/i
const DEMANDE_DEVIS = /(nouvelle demande|demande de devis|nouveau (projet|chantier|contact)|un (particulier|client) (vous|souhaite|recherche)|demande d.intervention|nouveau prospect|new (lead|request|project)|vous a contact[ée])/i
const EXCLU_COMMUN = /(mot de passe|password|code de (connexion|v[ée]rification|s[ée]curit[ée])|verification code|connexion (inhabituelle|depuis)|security alert|alerte de s[ée]curit[ée]|facture|invoice|paiement|payment|re[çc]u de paiement|newsletter|se d[ée]sabonner de cette lettre|offre sp[ée]ciale|promotion|webinar|essai gratuit)/i

export const RESEAUX_NOTIFICATION: readonly ReseauNotification[] = [
  {
    canal: 'linkedin', domaines: ['linkedin.com'], hotes: ['linkedin.com'],
    signal: MESSAGE_FR_EN,
    exclu: /(offre d.emploi|job alert|alerte emploi|postuler|vous a invit[ée]|invitation [àa] (se connecter|rejoindre)|wants to connect|souhaite (se connecter|rejoindre votre r[ée]seau)|a consult[ée] votre profil|viewed your profile|anniversaire|f[ée]licitez|endorse|recommandation de comp[ée]tence|publication|a comment[ée]|a r[ée]agi|tendances|sales navigator|premium)/i,
    chemin: /^\/(comm\/)?messaging\//i,
  },
  {
    canal: 'facebook', domaines: ['facebookmail.com'], hotes: ['facebook.com'],
    signal: MESSAGE_FR_EN,
    exclu: /(anniversaire|vous a identifi[ée]|tagged you|a comment[ée]|a aim[ée]|liked|a partag[ée]|invitation [àa] aimer|suggestion|souvenirs?|memories|groupe|marketplace|publicit[ée] (refus|approuv)|ad (rejected|approved)|facturation|boost)/i,
    chemin: /^\/(latest\/inbox|messages\/t)\//i,
  },
  {
    canal: 'instagram_notif', domaines: ['instagram.com', 'mail.instagram.com'], hotes: ['instagram.com'],
    signal: MESSAGE_FR_EN,
    exclu: /(a commenc[ée] [àa] vous suivre|started following|a aim[ée]|liked|a comment[ée]|commented|vous a identifi[ée]|tagged|en direct|live|story|stories|reels?|suggestions?)/i,
    chemin: /^\/direct\//i,
  },
  {
    canal: 'tiktok', domaines: ['tiktok.com'], hotes: ['tiktok.com'],
    signal: /(nouveau(x)? message|new message|vous a envoy[ée] un message|sent you a message|nouveau prospect|new lead|nouvelle demande)/i,
    exclu: /(a commenc[ée] [àa] vous suivre|followed you|a aim[ée]|liked|en direct|live|campagne|campaign|budget|solde|balance|creator)/i,
    chemin: /^\/(messages|business\/inbox)(\/|$)/i,
  },
  { canal: '123devis', domaines: ['123devis.com'], hotes: ['123devis.com'], signal: DEMANDE_DEVIS, exclu: /(abonnement|cr[ée]dits?)/i, chemin: /(demande|projet|lead|contact)/i, plateformeDevis: true },
  { canal: 'habitatpresto', domaines: ['habitatpresto.com'], hotes: ['habitatpresto.com'], signal: DEMANDE_DEVIS, exclu: /(abonnement|cr[ée]dits?)/i, chemin: /(demande|projet|chantier|contact)/i, plateformeDevis: true },
  { canal: 'pagesjaunes', domaines: ['pagesjaunes.fr', 'solocal.com'], hotes: ['pagesjaunes.fr', 'solocal.com'], signal: new RegExp(`${MESSAGE_FR_EN.source}|${DEMANDE_DEVIS.source}`, 'i'), exclu: /(avis|statistiques|audience|abonnement)/i, chemin: /(message|demande|contact)/i, plateformeDevis: true },
  { canal: 'houzz', domaines: ['houzz.com', 'houzz.fr'], hotes: ['houzz.com', 'houzz.fr'], signal: new RegExp(`${MESSAGE_FR_EN.source}|${DEMANDE_DEVIS.source}`, 'i'), exclu: /(id[ée]es?|inspiration|ideabook|a enregistr[ée]|saved)/i, chemin: /(message|inbox|lead)/i, plateformeDevis: true },
  { canal: 'travaux_com', domaines: ['travaux.com'], hotes: ['travaux.com'], signal: DEMANDE_DEVIS, exclu: /(abonnement|cr[ée]dits?)/i, chemin: /(demande|projet|lead|contact)/i, plateformeDevis: true },
  { canal: 'starofservice', domaines: ['starofservice.com', 'starofservice.fr'], hotes: ['starofservice.com', 'starofservice.fr'], signal: new RegExp(`${MESSAGE_FR_EN.source}|${DEMANDE_DEVIS.source}`, 'i'), exclu: /(cr[ée]dits?|abonnement)/i, chemin: /(request|demande|message|lead)/i, plateformeDevis: true },
]

export type NotificationReseau = {
  canal: CanalNotification
  /** Le nom de la personne quand l'e-mail le donne. */
  nom: string | null
  /** L'extrait du message ou le texte de la demande quand l'e-mail le recopie ; null sinon. */
  texte: string | null
  /** Le lien https sur un hôte du réseau pour lire et répondre ; à défaut, la messagerie générale. */
  lien: string
  /** Une clé stable pour ranger les messages successifs d'une même conversation dans le même fil. */
  cle_conversation: string
}

// ── Domaines ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le domaine `hote` est-il `domaine` ou un de ses sous-domaines ? Comparaison exacte de suffixe, en minuscules. */
export function surDomaine(hote: string, domaines: readonly string[]): boolean {
  const h = hote.toLowerCase().trim().replace(/\.$/, '')
  if (!h || !/^[a-z0-9.-]+$/.test(h)) return false
  return domaines.some((d) => h === d || h.endsWith(`.${d}`))
}

/** L'adresse de l'expéditeur : la partie après le DERNIER @, si l'adresse a une forme d'adresse. */
export function domaineExpediteur(email: string | null | undefined): string {
  if (!email || !/^[^\s@<>"]+@[^\s@<>"]+$/.test(email.trim())) return ''
  return email.trim().split('@').pop()!.toLowerCase()
}

/**
 * Verdict sur l'en-tête Authentication-Results : 'ok' (succès pour le domaine du réseau), 'echec' (forgé, ou aucun succès pour ce
 * domaine), 'absent' (pas d'en-tête : on ne conclut rien).
 */
export function verdictAuthentification(entete: string | null | undefined, domaines: readonly string[]): 'ok' | 'echec' | 'absent' {
  if (!entete || !entete.trim()) return 'absent'
  const e = entete.toLowerCase()
  if (/dmarc=fail/.test(e)) return 'echec'
  // Seule une signature DKIM valide ET alignée sur le domaine du réseau vaut preuve (audit du 21/10, E1).
  for (const m of e.matchAll(/dkim=pass[^;]*?header\.(?:d|i)=@?([a-z0-9.-]+)/g)) if (surDomaine(m[1], domaines)) return 'ok'
  return 'echec'
}

/** Les redirecteurs : un lien « du réseau » qui mène ailleurs (audit du 21/10). Hôtes et chemins refusés, quel que soit le réseau. */
const REDIRECTEUR_HOTE = /^(l|lm|m\.l)\.|^(fb\.me|lnkd\.in|vm\.tiktok\.com)$/i
const REDIRECTEUR_CHEMIN = /(^|\/)(redir|redirect|l\.php|r\.php|link|out|away|click|track)(\/|\.|$)/i
const REDIRECTEUR_PARAM = /^(url|u|redirect|redirect_uri|redirect_url|next|dest|destination|target|to)$/i

/** Une signature DKIM vérifiée par NOUS (lib/canaux/dkim.ts) est-elle celle d'un domaine du réseau ? */
export const signeePar = (valides: readonly string[] | null | undefined, domaines: readonly string[]): boolean =>
  Array.isArray(valides) && valides.some((d) => surDomaine(d, domaines))

/** L'expéditeur est-il sur le domaine d'un réseau connu (Le Bon Coin compris) ? Sert à ne lancer la vérification DKIM (DNS) que pour eux. */
export function expediteurDeReseau(email: string | null | undefined): boolean {
  const d = domaineExpediteur(email)
  return !!d && (surDomaine(d, ['leboncoin.fr']) || RESEAUX_NOTIFICATION.some((r) => surDomaine(d, r.domaines)))
}

/** Lien sûr : https, sans identifiants dans l'adresse, hôte du réseau, et pas un redirecteur. */
export function lienSur(brut: string, hotes: readonly string[]): string | null {
  try {
    const u = new URL(brut.replace(/&amp;/g, '&').trim())
    if (u.protocol !== 'https:' || u.username || u.password || !surDomaine(u.hostname, hotes)) return null
    if (REDIRECTEUR_HOTE.test(u.hostname) || REDIRECTEUR_CHEMIN.test(u.pathname)) return null
    for (const k of u.searchParams.keys()) if (REDIRECTEUR_PARAM.test(k)) return null
    return u.toString()
  } catch { return null }
}

// ── Lecture ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ENTITES: Record<string, string> = {
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', nbsp: ' ', amp: '&', quot: '"', apos: '’', lt: '<', gt: '>',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', icirc: 'î', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', hellip: '…', euro: '€',
}
const decoder = (s: string) => s
  .replace(/&#(\d{1,6});/g, (m, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m })
  .replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m })
  .replace(/&([a-z]{2,8});/gi, (m, nom) => ENTITES[nom] ?? m)
const nettoyer = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s"'«“‘:–—-]+|[\s"'»”’:.,!–—-]+$/g, '').trim()

function liensDe(html: string, texte: string): { url: string; libelle: string }[] {
  const vus = new Set<string>()
  const sortie: { url: string; libelle: string }[] = []
  const ajouter = (url: string, libelle: string) => { if (!vus.has(url)) { vus.add(url); sortie.push({ url, libelle }) } }
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) ajouter(m[1], m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  for (const m of texte.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) ajouter(m[0], '')
  return sortie
}

const NOM = "([A-ZÀ-ÖØ-Þ][\\p{L}'’\\-]{1,30}(?: [A-ZÀ-ÖØ-Þ][\\p{L}'’\\-.]{0,30}){0,2})"
const PAS_UN_NOM = /^(linkedin|facebook|instagram|tiktok|meta|vous|un|une|nouveau|nouvelle|message|messages|bonjour|hello|hi|votre|your|new|la|le|les|pages ?jaunes|houzz|habitatpresto|travaux|starofservice|123devis)$/i
function nomDe(sujet: string, corps: string): string | null {
  const motifs = [
    new RegExp(`${NOM} vous a (?:envoy[ée] un (?:nouveau )?message|[ée]crit|r[ée]pondu|contact[ée])`, 'u'),
    new RegExp(`${NOM} (?:sent you a (?:new )?message|messaged you|replied)`, 'u'),
    new RegExp(`(?:[Nn]ouveau )?[Mm]essage de(?: la part de)? ${NOM}`, 'u'),
    new RegExp(`(?:[Nn]ew )?[Mm]essage from ${NOM}`, 'u'),
    new RegExp(`^\\s*(?:nom|name|client|contact|de|exp[ée]diteur|demandeur)\\s*:\\s*${NOM}\\s*$`, 'imu'),
  ]
  for (const s of [sujet, corps]) for (const m of motifs) {
    const r = s.match(m)
    const v = r?.[1] ? nettoyer(r[1]) : ''
    if (v && !PAS_UN_NOM.test(v) && !PAS_UN_NOM.test(v.split(' ')[0])) return v.slice(0, 60)
  }
  return null
}

const FIN_BLOC = /^\s*(r[ée]pondre|reply|voir\b|view\b|lire (le|la suite)|ouvrir|open\b|acc[ée]der|pour r[ée]pondre|vous recevez cet e-?mail|you are receiving|this email was|cet e-?mail a [ée]t[ée]|ce message a [ée]t[ée] envoy[ée]|se d[ée]sabonner|unsubscribe|https?:\/\/|©)/i
/** L'extrait recopié : après « a écrit : », « Message : », « Description du projet : »…, jusqu'au bouton ; sinon entre guillemets. */
function texteDe(corps: string): string | null {
  const lignes = corps.replace(/\r\n/g, '\n').split('\n')
  const debut = lignes.findIndex((l) => /(a [ée]crit|wrote|son message|message|description( du projet| de la demande)?|d[ée]tails? (de la demande|du projet)|projet|besoin|demande)\s*:\s*$/i.test(l.trim()))
  if (debut !== -1) {
    const bloc: string[] = []
    for (const l of lignes.slice(debut + 1)) { if (FIN_BLOC.test(l)) break; bloc.push(l) }
    const t = bloc.join('\n').replace(/^[\s>«"“]+|[\s»"”]+$/g, '').trim()
    if (t.length >= 2) return t.slice(0, 4000)
  }
  const enLigne = corps.match(/^\s*(?:message|description|projet|besoin|demande)\s*:\s*(.{4,2000})$/im)
  if (enLigne?.[1]) return enLigne[1].trim()
  for (const cite of corps.matchAll(/[«“"]\s*([^»”"]{8,4000}?)\s*[»”"]/g)) return cite[1].trim()
  return null
}

function cleDe(canal: CanalNotification, lien: string | null, nom: string | null, sujet: string, corps: string): string {
  if (lien) {
    const u = new URL(lien)
    const m = u.pathname.match(/(?:thread|threads|messages?|conversations?|direct\/t|inbox|demandes?|requests?|leads?|projets?|projects?)\/(?:[a-z_-]+\/)?([A-Za-z0-9=_-]{6,120})/i)
    if (m) return `${canal}:c:${m[1]}`.slice(0, 160)
    // L'identifiant de la conversation passé en paramètre (boîte de réception de Meta Business Suite : ?selected_item_id=…).
    for (const k of ['selected_item_id', 'thread_id', 'conversation_id', 'threadId', 'conversationId']) {
      const v = u.searchParams.get(k)
      if (v && /^[A-Za-z0-9=_-]{6,120}$/.test(v)) return `${canal}:c:${v}`.slice(0, 160)
    }
  }
  // Sans identifiant de conversation NI nom : jamais de fusion de deux clients sous le même objet (audit du 21/10) — chaque
  // notification ouvre son propre fil (empreinte de son contenu, stable si la même notification est relue).
  if (!nom) return `${canal}:u:${crypto.createHash('sha256').update(sujet + '\n' + corps).digest('base64url').slice(0, 32)}`
  const base = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  return `${canal}:n:${base}`.slice(0, 160)
}

/** La notification d'un réseau lue dans un e-mail, ou null si ce n'en est pas une (ou si elle n'est pas authentique). Ne lève jamais. */
export function lireNotificationReseau(mail: MailNotification, reseaux: readonly ReseauNotification[] = RESEAUX_NOTIFICATION): NotificationReseau | null {
  try {
    const domaine = domaineExpediteur(mail.de.email)
    if (!domaine) return null
    const r = reseaux.find((x) => surDomaine(domaine, x.domaines))
    if (!r) return null
    if (verdictAuthentification(mail.authentification, r.domaines) !== 'ok') return null
    // ET notre propre vérification de la signature (lib/canaux/dkim.ts) : un en-tête se recopie, une signature ne se fabrique pas.
    if (!signeePar(mail.dkim_valides, r.domaines)) return null
    const sujet = decoder((mail.sujet || '').slice(0, 300))
    const corps = decoder((mail.texte || '').slice(0, 20_000))
    const html = (mail.html || '').slice(0, 300_000)
    const tete = `${sujet}\n${corps.slice(0, 2000)}`
    if (!r.signal.test(tete)) return null
    if (EXCLU_COMMUN.test(sujet) || r.exclu.test(sujet)) return null

    const liens = liensDe(html, corps)
      .map((l) => ({ ...l, sur: lienSur(l.url, r.hotes) }))
      .filter((l): l is { url: string; libelle: string; sur: string } => !!l.sur)
    // Seul le CHEMIN d'une conversation du réseau est retenu (plus le libellé d'un bouton, que l'expéditeur choisit).
    const choisi = liens.find((l) => r.chemin.test(new URL(l.sur).pathname))?.sur ?? null

    const nom = nomDe(sujet, corps)
    const texte = texteDe(corps)
    return { canal: r.canal, nom, texte, lien: choisi ?? LIEN_MESSAGERIE[r.canal], cle_conversation: cleDe(r.canal, choisi, nom, sujet, corps) }
  } catch {
    return null
  }
}

/** Le message rangé quand l'e-mail ne recopie pas le texte : l'artisan sait où aller. */
export function contenuEntrantReseau(n: NotificationReseau): string {
  if (n.texte) return n.texte
  return `Nouveau message sur ${LIBELLE_CANAL[n.canal]}. L’e-mail de notification ne recopie pas le texte : ouvrez la conversation sur ${LIBELLE_CANAL[n.canal]} pour le lire.`
}
