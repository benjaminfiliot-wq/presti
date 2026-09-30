import crypto from 'node:crypto'
import { consommerJauge } from './jauges'
import { estStop } from './standardiste'
import type { ClesOpposition, Conversation, Magasin } from './contrat'

const RE_HEX64 = /^[0-9a-f]{64}$/

export function verifierSignature(corpsBrut: Uint8Array, entete: string | null, secret: string): boolean {
  if (typeof entete !== 'string' || typeof secret !== 'string' || secret === '') return false
  if (!entete.startsWith('sha256=')) return false
  const recu = entete.slice('sha256='.length).toLowerCase()
  if (!RE_HEX64.test(recu)) return false
  const attendu = crypto.createHmac('sha256', secret).update(corpsBrut).digest()
  const propose = Buffer.from(recu, 'hex')
  if (propose.length !== attendu.length) return false
  return crypto.timingSafeEqual(propose, attendu)
}

export type PlateformeMeta = 'instagram' | 'facebook'

export type EvenementMeta =
  | { type: 'commentaire'; id_externe: string; plateforme: PlateformeMeta; meta_id: string; pseudo: string | null; texte: string; publie_le: string | null }
  | { type: 'message'; id_externe: string; plateforme: PlateformeMeta; meta_id: string; texte: string; a_piece_jointe: boolean; recu_le: string | null }
  | { type: 'postback'; id_externe: string; plateforme: PlateformeMeta; meta_id: string; charge: string; recu_le: string | null }

export interface ProfilMeta {
  pseudo: string
  suit_le_compte: boolean
  abonnes: number | null
}
export type LireProfil = (metaId: string, plateforme?: PlateformeMeta) => Promise<ProfilMeta | null>

/** Ce que le module demande au magasin : un sous-ensemble du contrat, plus, quand la base le sait, la boîte d'arrivée. */
export type MagasinMeta = Pick<Magasin, 'opposer' | 'reponseRecue' | 'conversation' | 'enregistrerConversation' | 'jaugeConsommer' | 'jauges'> & {
  /** Idempotente par id_externe : true si l'événement est nouveau (acq_meta_evenement_enregistrer, 0106). */
  enregistrerEvenementMeta?: (e: { id_externe: string; plateforme: PlateformeMeta; type: EvenementMeta['type']; charge: Record<string, unknown> }) => Promise<boolean>
}
export interface DepsMeta {
  magasin: MagasinMeta
  lireProfil: LireProfil
  /** Horodatage en millisecondes (epoch). */
  maintenant: number
}

const MAX_EVENEMENTS = 100
const MAX_ID = 200
const MAX_TEXTE = 2000
const DELAI_PROFIL_MS = 5_000
// Le même hôte et la même version que le client d'envoi (envoiMeta.ts, 026-089), redits ici pour que ce module n'en dépende pas.
const HOTE_META = 'graph.facebook.com'
const VERSION_GRAPH = 'v26.0'

// lib/agents/acquisition/metaWebhooks.ts — les webhooks de Meta (fiche 026-090) : la signature, la lecture des corps, le rangement
// des commentaires « SITE » et des messages reçus, la lecture du profil d'une personne APRÈS qu'elle a écrit.
//
// Ce module ne répond à personne, n'envoie rien, ne crée aucun prospect : il reçoit, range et, pour un STOP, s'oppose tout de
// suite. Le Répondeur (026-096) prépare les réponses ; le Facteur (026-089) les envoie. Pur hors `lireProfil`, dont le `fetch`
// est injecté. Aucune valeur d'un corps (texte, pseudo), aucun jeton, aucun secret ne va dans `console.*`.
//
// Le format des corps (`comments` Instagram, `feed` Page, `messaging`) est celui de la documentation publique de Meta au 26/09
// [à vérifier le jour de R6, Page liée et application examinée].

// ── La signature ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// verifierSignature (en tête du fichier, sans commentaire avant elle) : `X-Hub-Signature-256: sha256=<HMAC-SHA256 hexadécimal du corps
// brut>`, clé : le secret de l'application, comparaison en temps constant.

// ── La lecture des corps ──────────────────────────────────────────────────────────────────────────────────────────────────
type Objet = Record<string, unknown>
const objet = (x: unknown): Objet | null => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Objet) : null)
const identifiant = (x: unknown): string | null => {
  const s = typeof x === 'number' && Number.isSafeInteger(x) ? String(x) : typeof x === 'string' ? x.trim() : ''
  return s !== '' && s.length <= MAX_ID ? s : null
}
const texteDe = (x: unknown): string => (typeof x === 'string' ? x.normalize('NFC').slice(0, MAX_TEXTE) : '')
const iso = (secondesOuMs: unknown, enMs = false): string | null => {
  const n = typeof secondesOuMs === 'number' ? secondesOuMs : Number.NaN
  if (!Number.isFinite(n) || n <= 0) return null
  const d = new Date(enMs ? n : n * 1000)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Les événements neutres d'un corps de webhook. Un écho (envoyé par notre compte) et tout le reste sont ignorés. Ne lève jamais. */
export function normaliserEntrees(corps: unknown): EvenementMeta[] {
  const racine = objet(corps)
  if (!racine) return []
  const plateforme: PlateformeMeta | null = racine.object === 'instagram' ? 'instagram' : racine.object === 'page' ? 'facebook' : null
  if (!plateforme || !Array.isArray(racine.entry)) return []
  const sortie: EvenementMeta[] = []
  for (const brut of racine.entry) {
    const entree = objet(brut)
    if (!entree) continue
    const moi = identifiant(entree.id)
    const temps = entree.time

    if (Array.isArray(entree.changes)) {
      for (const c of entree.changes) {
        const changement = objet(c)
        const valeur = objet(changement?.value)
        if (!changement || !valeur) continue
        let idCommentaire: string | null = null
        if (plateforme === 'instagram' && changement.field === 'comments') idCommentaire = identifiant(valeur.id)
        else if (plateforme === 'facebook' && changement.field === 'feed' && valeur.item === 'comment' && valeur.verb === 'add') idCommentaire = identifiant(valeur.comment_id)
        if (!idCommentaire) continue
        const auteur = objet(valeur.from)
        const metaId = identifiant(auteur?.id)
        if (!metaId || metaId === moi) continue
        const pseudoBrut = plateforme === 'instagram' ? auteur?.username : auteur?.name
        const pseudo = typeof pseudoBrut === 'string' && pseudoBrut.trim() !== '' ? pseudoBrut.trim().slice(0, 60) : null
        const texte = texteDe(plateforme === 'instagram' ? valeur.text : valeur.message)
        sortie.push({ type: 'commentaire', id_externe: idCommentaire, plateforme, meta_id: metaId, pseudo, texte, publie_le: iso(valeur.created_time) ?? iso(temps) })
      }
    }

    if (Array.isArray(entree.messaging)) {
      for (const m of entree.messaging) {
        const evt = objet(m)
        if (!evt) continue
        const metaId = identifiant(objet(evt.sender)?.id)
        if (!metaId || metaId === moi) continue
        const recuLe = iso(evt.timestamp, true) ?? iso(temps, true)
        const message = objet(evt.message)
        const postback = objet(evt.postback)
        if (message) {
          if (message.is_echo === true) continue
          const mid = identifiant(message.mid)
          if (!mid) continue
          const texte = texteDe(message.text)
          const piece = Array.isArray(message.attachments) && message.attachments.length > 0
          if (texte === '' && !piece) continue
          sortie.push({ type: 'message', id_externe: mid, plateforme, meta_id: metaId, texte, a_piece_jointe: piece, recu_le: recuLe })
        } else if (postback) {
          const charge = texteDe(postback.payload).slice(0, 200)
          const mid = identifiant(postback.mid) ?? identifiant(`pb:${metaId}:${String(evt.timestamp ?? temps ?? '')}`)
          if (!mid) continue
          sortie.push({ type: 'postback', id_externe: mid, plateforme, meta_id: metaId, charge, recu_le: recuLe })
        }
      }
    }
    if (sortie.length >= MAX_EVENEMENTS) break
  }
  return sortie.slice(0, MAX_EVENEMENTS)
}

/**
 * L'aimant : après normalisation (minuscules, accents, émojis et ponctuation retirés, espaces fusionnés), le texte vaut exactement
 * « site », ou son premier mot est « site » et il fait 20 signes au plus. « Joli site, bravo » n'en est pas un.
 */
export function estAimant(texte: unknown): boolean {
  if (typeof texte !== 'string') return false
  const t = texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}‍︎️]/gu, ' ')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t === 'site' || (/^site\s/.test(t) && t.length <= 20)
}

// ── Le rangement ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** L'identifiant local d'une conversation : un par (plateforme, personne). La base range par (plateforme, meta_id). */
const idConversation = (plateforme: PlateformeMeta, metaId: string) => `${plateforme}:${metaId}`
type ConversationPartielle = Partial<Conversation> & { id: string; plateforme: PlateformeMeta; meta_id: string; dernier_message_recu_le?: string | null; commentaire_le?: string | null; abonnes?: number | null }

const avecProfil = (c: Partial<Conversation> | null): boolean => typeof c?.suit_le_compte === 'boolean'

async function lireProfilBorne(lireProfil: LireProfil, metaId: string, plateforme: PlateformeMeta): Promise<ProfilMeta | null> {
  let minuteur: ReturnType<typeof setTimeout> | undefined
  try {
    const attente = new Promise<null>((resolve) => { minuteur = setTimeout(() => resolve(null), DELAI_PROFIL_MS) })
    const p = await Promise.race([lireProfil(metaId, plateforme), attente])
    if (!p || typeof p.pseudo !== 'string' || typeof p.suit_le_compte !== 'boolean') return null
    return p
  } catch {
    return null
  } finally {
    if (minuteur) clearTimeout(minuteur)
  }
}

/** La jauge `instagram_api` : celle de l'heure (026-064) et le plafond du jour des lectures de profil ; l'une ou l'autre pleine → non. */
async function jaugePermet(magasin: MagasinMeta, maintenant: number): Promise<boolean> {
  try {
    if (!(await consommerJauge(magasin, 'instagram_api', 1, new Date(maintenant)))) return false
    return await magasin.jaugeConsommer('instagram_api', 1)
  } catch {
    return false
  }
}

/**
 * Range les événements, un à un, dans cet ordre : la boîte d'arrivée (idempotente), puis la conversation, l'opposition d'un STOP
 * (tout de suite), la réponse reçue, le profil (une seule lecture, seulement si la personne a écrit et si la conversation n'en a
 * pas encore). Aucune réponse, aucun envoi, aucun prospect créé ici.
 *
 * Un doublon (Meta rejoue un webhook resté sans réponse) traverse les mêmes étapes : elles sont toutes idempotentes, et si la
 * première livraison est tombée en erreur après la boîte d'arrivée, la seconde n'est pas perdue — un STOP surtout.
 */
export async function traiterEvenements(evenements: EvenementMeta[], deps: DepsMeta): Promise<void> {
  const { magasin, lireProfil, maintenant } = deps
  const maintenantIso = new Date(maintenant).toISOString()
  for (const e of evenements) {
    if (magasin.enregistrerEvenementMeta) {
      // Ni texte ni pseudo dans la boîte d'arrivée : le texte a sa place dans ops.reponses, avec sa propre durée de vie.
      await magasin.enregistrerEvenementMeta({ id_externe: e.id_externe, plateforme: e.plateforme, type: e.type, charge: { type: e.type, plateforme: e.plateforme, id: e.id_externe, le: maintenantIso } })
    }
    const id = idConversation(e.plateforme, e.meta_id)
    // Un commentaire ordinaire ne crée rien : la conversation n'est lue (donc ouverte) que pour un aimant ou un message.
    if (e.type === 'commentaire' && !estAimant(e.texte)) continue
    const existante = (await magasin.conversation(id)) as Partial<Conversation> | null

    if (e.type === 'commentaire') {
      const c: ConversationPartielle = { ...(existante ?? {}), id, plateforme: e.plateforme, meta_id: e.meta_id, commentaire_id: e.id_externe, commentaire_le: e.publie_le ?? maintenantIso }
      if (e.pseudo) c.pseudo = e.pseudo
      await magasin.enregistrerConversation(c as unknown as Conversation)
      continue
    }

    // message ou postback : la personne a écrit.
    const c: ConversationPartielle = { ...(existante ?? {}), id, plateforme: e.plateforme, meta_id: e.meta_id, dernier_message_recu_le: maintenantIso }
    await magasin.enregistrerConversation(c as unknown as Conversation)

    const texte = e.type === 'message' ? (e.texte !== '' ? e.texte : '[pièce jointe]') : `[amorce] ${e.charge}`
    const stop = e.type === 'message' && estStop(e.texte)
    if (stop) {
      const cles: ClesOpposition = { meta_id: e.meta_id }
      if (typeof c.pseudo === 'string' && c.pseudo !== '') cles.instagram = c.pseudo
      await magasin.opposer(cles, 'stop', 'webhook_meta')
    }
    await magasin.reponseRecue({
      id_externe: e.id_externe, envoi_id: null, conversation_id: id, prospect_id: null, canal: 'messagerie', source: 'meta', texte,
      auto: false, accuse_site: false, en_reponse_a: null, recu_le: e.recu_le ?? maintenantIso,
    })

    if (stop || avecProfil(existante)) continue
    if (!(await jaugePermet(magasin, maintenant))) continue
    const profil = await lireProfilBorne(lireProfil, e.meta_id, e.plateforme)
    if (!profil) continue
    const rempli: ConversationPartielle = { ...c, pseudo: profil.pseudo.slice(0, 60), suit_le_compte: profil.suit_le_compte }
    if (typeof profil.abonnes === 'number' && Number.isSafeInteger(profil.abonnes) && profil.abonnes >= 0) rempli.abonnes = profil.abonnes
    await magasin.enregistrerConversation(rempli as unknown as Conversation)
  }
}

// ── Le profil ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
type ReponseHttp = { ok: boolean; status: number; json(): Promise<unknown> }
type FetchProfil = (url: string, init: { method: string; headers: Record<string, string>; signal?: AbortSignal }) => Promise<ReponseHttp>

/**
 * `lireProfil(meta_id)` : GET https://graph.facebook.com/<version>/<meta_id>?fields=… [à vérifier le jour de R6], le jeton dans
 * l'en-tête `Authorization`, jamais dans l'adresse ni dans un journal. Une erreur de consentement, de débit, un délai, un corps
 * illisible → `null`, sans lever.
 */
export function creerLecteurProfil(options: { jeton: string; fetch: FetchProfil | typeof fetch }): LireProfil {
  const appeler = options.fetch as FetchProfil
  return async (metaId: string, plateforme: PlateformeMeta = 'instagram') => {
    if (typeof metaId !== 'string' || !/^[A-Za-z0-9_.-]{1,200}$/.test(metaId) || !options.jeton) return null
    const champs = plateforme === 'instagram' ? 'name,username,follower_count,is_user_follow_business' : 'name'
    const url = `https://${HOTE_META}/${VERSION_GRAPH}/${encodeURIComponent(metaId)}?fields=${champs}`
    if (new URL(url).hostname !== HOTE_META) return null
    const arret = new AbortController()
    const minuteur = setTimeout(() => arret.abort(), DELAI_PROFIL_MS)
    try {
      const r = await appeler(url, { method: 'GET', headers: { authorization: `Bearer ${options.jeton}` }, signal: arret.signal })
      if (!r.ok) return null
      const corps = objet(await r.json())
      if (!corps || corps.error) return null
      const pseudo = typeof corps.username === 'string' && corps.username !== '' ? corps.username : typeof corps.name === 'string' && corps.name !== '' ? corps.name : null
      if (!pseudo) return null
      const abonnes = typeof corps.follower_count === 'number' && Number.isSafeInteger(corps.follower_count) && corps.follower_count >= 0 ? corps.follower_count : null
      // Sur une Page, Meta ne dit pas si la personne « suit » : on ne l'affirme pas.
      return { pseudo: pseudo.slice(0, 60), suit_le_compte: plateforme === 'instagram' && corps.is_user_follow_business === true, abonnes }
    } catch {
      return null
    } finally {
      clearTimeout(minuteur)
    }
  }
}

// ── Le magasin de production ──────────────────────────────────────────────────────────────────────────────────────────────
type Rpc = (fonction: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>

/**
 * Le magasin de la base pour ce module : la base range une conversation par (plateforme, meta_id) et rend son uuid, que
 * `magasinSupabase.enregistrerConversation` (026-060) ne rend pas. Ici, l'identifiant local (« plateforme:meta_id ») est traduit
 * en uuid pour `conversation` et `reponseRecue`, et la boîte d'arrivée de Meta (0106) est branchée. Une instance par requête.
 */
export function creerMagasinMeta(base: Pick<Magasin, 'opposer' | 'reponseRecue' | 'conversation' | 'jaugeConsommer' | 'jauges'>, rpc: Rpc): MagasinMeta {
  const reels = new Map<string, string>()
  const cles = (local: string): { plateforme: PlateformeMeta; meta_id: string } => {
    const i = local.indexOf(':')
    return { plateforme: local.slice(0, i) as PlateformeMeta, meta_id: local.slice(i + 1) }
  }
  const ranger = async (p: Record<string, unknown>, local: string): Promise<string> => {
    const { data, error } = await rpc('acq_conversation_enregistrer', { p })
    const id = objet(data)?.id
    if (error || typeof id !== 'string') throw new Error('[metaWebhooks] acq_conversation_enregistrer')
    reels.set(local, id)
    return id
  }
  const reel = async (local: string): Promise<string> => reels.get(local) ?? ranger({ ...cles(local) }, local)
  return {
    opposer: (c, motif, source, expireLe) => base.opposer(c, motif, source, expireLe),
    jaugeConsommer: (f, n) => base.jaugeConsommer(f, n),
    jauges: () => base.jauges(),
    async conversation(local: string) {
      return base.conversation(await reel(local))
    },
    async enregistrerConversation(c: Conversation) {
      const x = c as unknown as Record<string, unknown>
      const p: Record<string, unknown> = {}
      for (const k of ['plateforme', 'meta_id', 'pseudo', 'suit_le_compte', 'abonnes', 'commentaire_id', 'commentaire_le', 'dernier_message_recu_le', 'prospect_id'])
        if (x[k] !== undefined && x[k] !== null) p[k] = x[k]
      await ranger(p, c.id)
    },
    async reponseRecue(r) {
      return base.reponseRecue({ ...r, conversation_id: r.conversation_id ? await reel(r.conversation_id) : null })
    },
    async enregistrerEvenementMeta(e) {
      const { data, error } = await rpc('acq_meta_evenement_enregistrer', { p: e })
      if (error) throw new Error('[metaWebhooks] acq_meta_evenement_enregistrer')
      return data === true
    },
  }
}
