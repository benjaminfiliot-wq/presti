// lib/agents/acquisition/porteurs/gmail.ts — le porteur du Gmail de prospection (fiche 026-089) : l'envoi SMTP des messages
// sollicités et la relève IMAP, en lecture seule, des seuls messages adressés à l'adresse de prospection.
//
// Une boîte Gmail propre à Presti, jamais le Gmail personnel de Benj ni le Workspace de prestiapp.fr. Elle ENVOIE seulement à
// qui a écrit (le Facteur exige la preuve de demande avant) et RELÈVE ce qu'on lui écrit. Du texte brut : ni HTML, ni pixel,
// ni suivi. Le monde extérieur est injecté (`transport`, `imap`) : les tests parlent à un faux serveur, la production à
// nodemailer et à imapflow, importés à la demande.
//
// Deux règles de sortie : jamais une exception (toute panne est rendue en objet), jamais un secret, un texte de message ou une
// adresse dans un journal ou une erreur rendue — ce module n'écrit d'ailleurs rien dans la console.
import { randomUUID } from 'node:crypto'
import { NOM_EXPEDITEUR } from '../contrat'
import type { MessageSortant, Porteur, ResultatPorteur } from '../porteurs'

export const HOTE_SMTP = 'smtp.gmail.com'
export const HOTE_IMAP = 'imap.gmail.com'
export const DELAI_SMTP_MS = 20_000
/** Une pièce jointe : un MP4 de 3 Mo au plus, lu dans le bucket privé `packs-pubs`. */
export const PIECE_JOINTE_MAX_OCTETS = 3 * 1024 * 1024
const CHEMIN_PIECE_JOINTE = /^studio\/[A-Za-z0-9_-]{1,80}\/echantillon-\d{1,3}\.mp4$/
const TEXTE_RELEVE_MAX = 4000
const RELEVE_MAX_MESSAGES = 50
const REPRISE_JOURS = 14

// ── L'envoi ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Ce que `nodemailer.createTransport(...).sendMail` reçoit : du texte seul, jamais de champ `html`. */
export interface OptionsCourriel {
  from: string
  to: string
  subject: string
  text: string
  messageId: string
  inReplyTo?: string
  references?: string[]
  attachments?: { filename: string; content: Uint8Array; contentType: string }[]
  /** Les identifiants, aussi posés sur le message : nodemailer les lit par message avant ceux du transport. */
  auth: { user: string; pass: string }
  disableFileAccess: boolean
  disableUrlAccess: boolean
}
export interface TransportSmtp {
  sendMail(options: OptionsCourriel): Promise<unknown>
}

export interface OptionsPorteurGmail {
  user: string
  /** Le mot de passe d'application Google, avec ou sans les espaces que Google affiche. */
  pass: string
  adresse: string
  transport?: TransportSmtp | null
  /** Lecture injectée pour les bancs ; absente : pause générale réelle, fermée sur panne. */
  pauseGenerale?: () => Promise<{ active: boolean }>
  /** Lit un objet du bucket privé `packs-pubs` ; absent : toute pièce jointe est refusée sans envoi. */
  lirePieceJointe?: (chemin: string) => Promise<Uint8Array | null>
  delaiMs?: number
}

/**
 * Un mot de passe d'application Google : seize lettres minuscules AFFICHÉES en quatre groupes de quatre. Les espaces sont une
 * aide à la lecture, pas une partie du secret (lib/canaux.ts, mémoire « messagerie d'entreprise »). On ne nettoie que cette
 * forme, reconnue au motif près : un autre mot de passe reste tel quel.
 */
const MDP_APPLICATION_GOOGLE = /^[a-z]{4}(?: [a-z]{4}){3}$/
export const nettoyerMotDePasse = (p: string): string => (MDP_APPLICATION_GOOGLE.test(p.trim()) ? p.trim().replace(/ /g, '') : p)

const RE_ADRESSE = /^[^\s<>,;"'()\\]+@[^\s<>,;"'()\\]+\.[^\s<>,;"'()\\]+$/
const RE_MESSAGE_ID = /^<[^\s<>]{1,200}>$/
const sansRetourLigne = (s: string): string => s.replace(/[\r\n]+/g, ' ').trim()

/** Un octet de plus qu'un MP4 : la signature « ftyp » aux octets 4 à 8. */
const estMp4 = (o: Uint8Array): boolean => o.length >= 12 && o[4] === 0x66 && o[5] === 0x74 && o[6] === 0x79 && o[7] === 0x70

type ErreurCode = { responseCode?: unknown; code?: unknown; response?: unknown; message?: unknown }

/** L'erreur d'un serveur SMTP → un motif rendu ; jamais son texte. */
function classer(erreur: unknown): { erreur: 'auth' | 'quota' | 'injoignable' | 'refus'; definitif: boolean } {
  const e = (erreur && typeof erreur === 'object' ? erreur : {}) as ErreurCode
  const reponse = `${String(e.response ?? '')} ${String(e.message ?? '')}`
  const code = Number(e.responseCode)
  if (e.code === 'EAUTH' || code === 535 || /\b535\b|5\.7\.8/.test(reponse)) return { erreur: 'auth', definitif: false }
  if (/5\.4\.5|daily user sending limit|sending limit exceeded/i.test(reponse)) return { erreur: 'quota', definitif: false }
  if (code >= 500 && code < 600) return { erreur: 'refus', definitif: true }
  return { erreur: 'injoignable', definitif: false }
}

function attendreAuPlus<T>(promesse: Promise<T>, ms: number): Promise<T | 'delai'> {
  let minuteur: ReturnType<typeof setTimeout> | undefined
  const delai = new Promise<'delai'>((resolve) => { minuteur = setTimeout(() => resolve('delai'), ms) })
  return Promise.race([promesse, delai]).finally(() => { if (minuteur) clearTimeout(minuteur) })
}

async function transportParDefaut(user: string, pass: string): Promise<TransportSmtp | null> {
  try {
    // nodemailer est importé à la demande : le module se charge (et se juge) sans lui quand un transport est injecté.
    // @ts-ignore — les types de nodemailer sont une dépendance de développement ; le module, une dépendance d'exécution.
    const brut = await import('nodemailer')
    const nodemailer = (brut as { default?: unknown }).default ?? brut
    const creer = (nodemailer as { createTransport: (o: unknown) => TransportSmtp }).createTransport
    return creer({
      host: HOTE_SMTP, port: 465, secure: true, auth: { user, pass },
      connectionTimeout: DELAI_SMTP_MS, greetingTimeout: DELAI_SMTP_MS, socketTimeout: DELAI_SMTP_MS,
    })
  } catch {
    return null
  }
}

export function creerPorteurGmail(options: OptionsPorteurGmail): Porteur {
  const pass = nettoyerMotDePasse(String(options.pass ?? ''))
  const adresse = String(options.adresse ?? '').trim()
  const delai = options.delaiMs ?? DELAI_SMTP_MS
  const domaine = /^[^@\s]+@([A-Za-z0-9.-]{1,200})$/.exec(adresse)?.[1] ?? 'presti.invalid'
  let transport: TransportSmtp | null = options.transport ?? null

  return {
    canal: 'email_sollicite',
    async envoyer(m: MessageSortant): Promise<ResultatPorteur> {
      try {
        if (!RE_ADRESSE.test(adresse) || !RE_ADRESSE.test(String(m?.a ?? '')) || typeof m.texte !== 'string' || !m.texte.trim()) {
          return { ok: false, erreur: 'refus', definitif: true }
        }
        const references = (Array.isArray(m.references) ? m.references : []).filter((r) => typeof r === 'string' && RE_MESSAGE_ID.test(r))
        const enReponseA = typeof m.enReponseA === 'string' && RE_MESSAGE_ID.test(m.enReponseA) ? m.enReponseA : null

        // Une seule pièce jointe : un MP4 de 3 Mo au plus du bucket privé ; sinon refus, SANS ouvrir de connexion.
        let piece: { filename: string; content: Uint8Array; contentType: string } | undefined
        if (m.pieceJointe) {
          const chemin = String(m.pieceJointe.chemin_bucket ?? '')
          if (!CHEMIN_PIECE_JOINTE.test(chemin) || !options.lirePieceJointe) return { ok: false, erreur: 'refus', definitif: true }
          let octets: Uint8Array | null = null
          try { octets = await options.lirePieceJointe(chemin) } catch { octets = null }
          if (!octets || octets.length === 0 || octets.length > PIECE_JOINTE_MAX_OCTETS || !estMp4(octets)) return { ok: false, erreur: 'refus', definitif: true }
          const nom = /^[A-Za-z0-9_.-]{1,80}\.mp4$/.test(String(m.pieceJointe.nom ?? '')) ? m.pieceJointe.nom : 'echantillon.mp4'
          piece = { filename: nom, content: octets, contentType: 'video/mp4' }
        }

        const pauseGenerale = options.pauseGenerale ?? (async () => (await import('../../pause')).pauseGenerale())
        let pause: unknown
        try { pause = await pauseGenerale() } catch { return { ok: false, erreur: 'refus', definitif: true } }
        if (!pause || typeof pause !== 'object' || (pause as { active?: unknown }).active !== false) return { ok: false, erreur: 'refus', definitif: true }
        if (!transport) transport = await transportParDefaut(options.user, pass)
        if (!transport) return { ok: false, erreur: 'injoignable', definitif: false }

        const messageId = `<${randomUUID()}@${domaine}>`
        const courriel: OptionsCourriel = {
          from: `${NOM_EXPEDITEUR} <${adresse}>`,
          to: m.a,
          subject: sansRetourLigne(m.objet ?? ''),
          text: m.texte,
          messageId,
          ...(enReponseA ? { inReplyTo: enReponseA } : {}),
          ...(references.length || enReponseA ? { references: references.length ? references : [enReponseA as string] } : {}),
          ...(piece ? { attachments: [piece] } : {}),
          auth: { user: options.user, pass },
          disableFileAccess: true,
          disableUrlAccess: true,
        }
        const t = transport
        try { pause = await pauseGenerale() } catch { return { ok: false, erreur: 'refus', definitif: true } }
        if (!pause || typeof pause !== 'object' || (pause as { active?: unknown }).active !== false) return { ok: false, erreur: 'refus', definitif: true }
        const retour = await attendreAuPlus(Promise.resolve().then(() => t.sendMail(courriel)), delai)
        if (retour === 'delai') return { ok: false, erreur: 'injoignable', definitif: false }
        // Un transport de test rend `{ ok: false, erreur }` au lieu de lever : même sortie.
        if (retour && typeof retour === 'object' && (retour as { ok?: unknown }).ok === false) {
          const e = (retour as { erreur?: unknown }).erreur
          const erreur = e === 'auth' || e === 'quota' || e === 'refus' ? e : 'injoignable'
          return { ok: false, erreur, definitif: erreur === 'refus' }
        }
        const rendu = retour && typeof retour === 'object' ? (retour as { messageId?: unknown }).messageId : null
        const id = typeof rendu === 'string' && rendu.trim() ? rendu.trim() : messageId
        const entetes: Record<string, string> = { 'Message-ID': id }
        if (enReponseA) entetes['In-Reply-To'] = enReponseA
        if (courriel.references) entetes.References = courriel.references.join(' ')
        return { ok: true, id_externe: id, entetes }
      } catch (e) {
        const c = classer(e)
        return { ok: false, erreur: c.erreur, definitif: c.definitif }
      }
    },
  }
}

// ── La relève ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le sous-ensemble d'imapflow dont la relève se sert (mêmes noms) : ouvrir en lecture seule, chercher, lire un message. */
export interface ClientImap {
  connect?(): Promise<unknown>
  mailboxOpen(boite: string, opts?: { readOnly?: boolean }): Promise<{ uidValidity?: number | bigint; uidNext?: number }>
  search(requete: Record<string, unknown>, opts?: { uid?: boolean }): Promise<number[] | false>
  fetchOne(uid: number | string, requete: Record<string, unknown>, opts?: { uid?: boolean }): Promise<unknown>
  download(uid: number | string, partie?: string, opts?: { uid?: boolean }): Promise<{ content: AsyncIterable<unknown> & { destroy?: () => void } } | false>
  logout(): Promise<unknown>
}

export interface MessageRecu {
  id_externe: string
  de: string
  objet: string
  texte: string
  en_reponse_a: string | null
  auto: boolean
  accuse_site: boolean
  imap_uid: number
}
export type ResultatReleve =
  | { messages: MessageRecu[]; curseur_suivant: number; uid_validity: number | null }
  | { erreur: 'auth' | 'injoignable' }

export interface OptionsReleve {
  imap?: ClientImap | null
  /** L'adresse de prospection : seuls les messages qui lui sont adressés (À ou Cc) sont relevés. */
  adresse: string
  /** Le plus grand UID déjà lu (0 la première fois). */
  curseur: number
  /** L'UIDVALIDITY vue à la relève précédente ; différente de l'actuelle : reprise des 14 derniers jours. */
  uidValidity?: number | null
  /** Pour construire le client imapflow par défaut. */
  identifiants?: { user: string; pass: string } | null
  maintenant?: number
}

const ENTETES_LUS = ['auto-submitted', 'x-autoreply', 'x-autorespond', 'precedence', 'in-reply-to', 'x-mailer'] as const

async function clientParDefaut(identifiants: { user: string; pass: string }): Promise<ClientImap | null> {
  try {
    const brut = await import('imapflow')
    const ImapFlow = (brut as { ImapFlow?: unknown }).ImapFlow ?? (brut as { default?: { ImapFlow?: unknown } }).default?.ImapFlow
    if (typeof ImapFlow !== 'function') return null
    const c = new (ImapFlow as new (o: unknown) => ClientImap)({
      host: HOTE_IMAP, port: 993, secure: true, auth: { user: identifiants.user, pass: nettoyerMotDePasse(identifiants.pass) }, logger: false,
    })
    return c
  } catch {
    return null
  }
}

/** Les en-têtes lus d'un message : une `Map` (client de test) ou le texte brut d'imapflow → une table en minuscules. */
function entetesDe(brut: unknown): Map<string, string> {
  const table = new Map<string, string>()
  if (brut instanceof Map) {
    for (const [k, v] of brut) table.set(String(k).toLowerCase(), String(Array.isArray(v) ? v[0] : v))
    return table
  }
  const texte = brut instanceof Uint8Array ? Buffer.from(brut).toString('utf8') : typeof brut === 'string' ? brut : ''
  for (const ligne of texte.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = ligne.indexOf(':')
    if (i > 0) table.set(ligne.slice(0, i).trim().toLowerCase(), ligne.slice(i + 1).trim())
  }
  return table
}

const MOTIFS_ACCUSE = /(message (a bien [ée]t[ée] |bien )?(envoy[ée]|re[çc]u)|merci (de nous avoir contact|pour votre message)|nous avons bien re[çc]u votre (message|demande)|contact form 7|wpforms|gravity forms|wix|jimdo|form(ulaire)? (de )?contact)/i
const EXPEDITEURS_ACCUSE = /^(wordpress|noreply|no-reply|donotreply|do-not-reply)@/i

/** Vrai pour une réponse automatique (en-têtes standards), jamais d'après le texte. */
function estAuto(e: Map<string, string>): boolean {
  const soumis = e.get('auto-submitted')
  if (soumis !== undefined && soumis.trim().toLowerCase() !== 'no') return true
  if (e.has('x-autoreply') || e.has('x-autorespond')) return true
  return /^(auto_reply|auto-reply|bulk|junk)\b/i.test(e.get('precedence') ?? '')
}

/** L'accusé automatique d'un formulaire de site : ni une réponse, ni une preuve de demande. */
function estAccuseSite(de: string, objet: string, texte: string, e: Map<string, string>): boolean {
  if (!EXPEDITEURS_ACCUSE.test(de)) return false
  return MOTIFS_ACCUSE.test(`${objet}\n${texte}\n${e.get('x-mailer') ?? ''}`)
}

type NoeudStructure = { type?: string; part?: string; childNodes?: NoeudStructure[] }
function partieTexte(n: NoeudStructure | undefined): { part: string; html: boolean } | null {
  if (!n) return null
  const cherche = (x: NoeudStructure, type: string): string | null => {
    if (x.type === type) return x.part ?? '1'
    for (const f of x.childNodes ?? []) { const r = cherche(f, type); if (r) return r }
    return null
  }
  const brut = cherche(n, 'text/plain')
  if (brut) return { part: brut, html: false }
  const html = cherche(n, 'text/html')
  return html ? { part: html, html: true } : null
}

const versTexte = (s: string, html: boolean): string => {
  const brut = html ? s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ') : s
  return brut.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, TEXTE_RELEVE_MAX)
}

async function lireTexte(imap: ClientImap, uid: number, partie: string, html: boolean): Promise<string> {
  const r = await imap.download(uid, partie, { uid: true })
  if (!r || !r.content) return ''
  const morceaux: Buffer[] = []
  let total = 0
  try {
    for await (const c of r.content) {
      const b = typeof c === 'string' ? Buffer.from(c, 'utf8') : Buffer.from(c as Uint8Array)
      morceaux.push(b)
      total += b.length
      if (total >= TEXTE_RELEVE_MAX * 4) break
    }
  } finally {
    try { r.content.destroy?.() } catch { /* le flux est déjà clos */ }
  }
  return versTexte(Buffer.concat(morceaux).toString('utf8'), html)
}

const adresseDe = (x: unknown): string => {
  const a = Array.isArray(x) ? x[0] : x
  return String((a && typeof a === 'object' ? (a as { address?: unknown }).address : a) ?? '').trim().toLowerCase()
}
const adressesDe = (x: unknown): string[] => (Array.isArray(x) ? x : []).map(adresseDe).filter(Boolean)

export async function releverGmail(options: OptionsReleve): Promise<ResultatReleve> {
  let imap: ClientImap | null = options.imap ?? null
  const adresse = String(options.adresse ?? '').trim().toLowerCase()
  try {
    if (!adresse) return { erreur: 'injoignable' }
    if (!imap) imap = options.identifiants ? await clientParDefaut(options.identifiants) : null
    if (!imap) return { erreur: 'injoignable' }
    if (typeof imap.connect === 'function') await imap.connect()

    // La boîte est ouverte EN LECTURE SEULE (EXAMINE) : rien n'est jamais marqué lu, déplacé ni supprimé.
    const boite = await imap.mailboxOpen('INBOX', { readOnly: true })
    const validite = boite && boite.uidValidity !== undefined ? Number(boite.uidValidity) : null
    const curseur = Number.isFinite(options.curseur) && options.curseur > 0 ? Math.floor(options.curseur) : 0
    const uidNext = typeof boite?.uidNext === 'number' ? boite.uidNext : null
    const reprise = (options.uidValidity != null && validite !== null && validite !== Number(options.uidValidity)) || (uidNext !== null && curseur >= uidNext)
    const maintenant = options.maintenant ?? Date.now()

    // La recherche se fait CÔTÉ SERVEUR sur les seuls messages adressés à `adresse` (À ou Cc) : aucun autre n'est jamais ouvert.
    const trouves = new Set<number>()
    for (const champ of ['to', 'cc'] as const) {
      const requete: Record<string, unknown> = { header: { [champ]: adresse } }
      if (reprise) requete.since = new Date(maintenant - REPRISE_JOURS * 86_400_000)
      else requete.uid = `${curseur + 1}:*`
      const uids = await imap.search(requete, { uid: true })
      if (Array.isArray(uids)) for (const u of uids) if (Number.isInteger(u) && (reprise || u > curseur)) trouves.add(u)
    }
    const liste = [...trouves].sort((a, b) => a - b).slice(0, RELEVE_MAX_MESSAGES)

    const messages: MessageRecu[] = []
    const vus = new Set<string>()
    let plusGrand = reprise ? 0 : curseur
    for (const uid of liste) {
      const brut = await imap.fetchOne(uid, { envelope: true, bodyStructure: true, headers: [...ENTETES_LUS] }, { uid: true })
      if (!brut || typeof brut !== 'object') continue
      const m = brut as { envelope?: Record<string, unknown>; headers?: unknown; bodyStructure?: NoeudStructure }
      const env = m.envelope ?? {}
      // Le serveur a déjà filtré ; si son enveloppe dit pourtant que le message est adressé ailleurs, on ne l'ouvre pas.
      const destinataires = [...adressesDe(env.to), ...adressesDe(env.cc)]
      if (destinataires.length > 0 && !destinataires.includes(adresse)) continue
      const entetes = entetesDe(m.headers)
      const id = String(env.messageId ?? '').trim() || `<uid-${validite ?? 0}-${uid}@releve.invalid>`
      if (vus.has(id)) { plusGrand = Math.max(plusGrand, uid); continue }
      vus.add(id)
      const partie = partieTexte(m.bodyStructure) ?? { part: 'text', html: false }
      const de = adresseDe(env.from)
      const objet = String(env.subject ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300)
      const texte = await lireTexte(imap, uid, partie.part, partie.html)
      const reponseA = String(env.inReplyTo ?? entetes.get('in-reply-to') ?? '').trim()
      messages.push({
        id_externe: id, de, objet, texte,
        en_reponse_a: reponseA || null,
        auto: estAuto(entetes),
        accuse_site: estAccuseSite(de, objet, texte, entetes),
        imap_uid: uid,
      })
      plusGrand = Math.max(plusGrand, uid)
    }
    return { messages, curseur_suivant: plusGrand, uid_validity: validite }
  } catch (e) {
    const brut = (e && typeof e === 'object' ? e : {}) as { authenticationFailed?: unknown; responseText?: unknown; message?: unknown }
    const auth = brut.authenticationFailed === true || /authenticat|invalid credentials|auth/i.test(`${String(brut.responseText ?? '')} ${String(brut.message ?? '')}`)
    return { erreur: auth ? 'auth' : 'injoignable' }
  } finally {
    if (imap) { try { await imap.logout() } catch { /* la connexion est déjà fermée */ } }
  }
}
