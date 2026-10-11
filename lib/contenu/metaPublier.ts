// Publication Graph automatique sous garde-fous (décision du 30/09).
// Pause fail-closed relue avant chaque sortie, STOP/opposition, coût explicite nul,
// média privé, chiffres contrôlés, idempotence et réconciliation des délais ambigus.
// Le transport, jeton et signature sont injectés ; aucun accord individuel requis.
import {
  SEUIL_LAYA, accordValide, porteUneAffirmationChiffree, textesVisibles, verdictPublication, versionTexte,
  type ContexteLignes, type DecisionAccord, type Ligne, type Post,
} from './lignes'
import { vraisemblance, type DepsLecteur } from '@/lib/agents/llm'
import { sortiePermise } from '@/lib/agents/sortie'

// ── types ────────────────────────────────────────────────────────────────────────────────────────────────────────
export type CanalMeta = 'instagram' | 'facebook'

export type Variante = {
  id: string
  texte: string
  /** Référence de la preuve des affirmations chiffrées. */
  source?: string | null
  bucket: string
  /** Clé du média dans le bucket (jamais une URL). */
  cle: string
  canal?: CanalMeta
  legende?: string | null
  sous_titres?: string | null
  miniature_texte?: string | null
  description?: string | null
}

export type ContexteMeta = {
  bucketAttendu: string
  decision?: DecisionAccord
  /** L'accord de LIGNE : lu, jamais utilisé comme permission. */
  ligneAccordee?: boolean
  dejaPublie?: boolean
  /** Pause générale des agents (ops.interrupteurs) : vrai = rien ne part. */
  pause?: boolean
  /** Facultatif : le post complet et sa ligne. Présents, ils passent par `verdictPublication` (drapeaux, plafonds, doublons). */
  post?: Post
  ligne?: Ligne | null
  contexteLignes?: ContexteLignes
  /** Nombre d'essais de lecture de l'état du conteneur (défaut 10) et pause entre deux lectures en ms (défaut 3 000). */
  essaisEtat?: number
  pauseEtatMs?: number
}

export type ErreurGraph = { erreur: string; status: number }
export type ReseauGraph = {
  creerConteneur: (m: { bucket: string; cle: string; canal?: CanalMeta; legende?: string }) => Promise<{ id: string } | ErreurGraph>
  publier: (conteneurId: string) => Promise<{ url: string; id?: string } | ErreurGraph>
  /** Facultatif : état du conteneur média (`FINISHED` = prêt). Sans lui, la publication suit directement. */
  etatConteneur?: (conteneurId: string) => Promise<{ etat: 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' } | ErreurGraph>
  /** Facultatif : retrouve une publication déjà faite pour ce conteneur (réconciliation après un timeout ambigu). */
  retrouver?: (conteneurId: string) => Promise<{ url: string; id?: string } | null | ErreurGraph>
}

export type ResultatMeta =
  | { ok: true; url?: string; id_externe?: string; idempotent?: boolean; reconcilie?: boolean }
  | { ok: false; motif: string; reessayable?: boolean; etape?: string }

type DepsMeta = DepsLecteur & { coutEuros?: unknown; opposition?: boolean }

const CLE_MEDIA = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/
const refus = (motif: string, plus: { reessayable?: boolean; etape?: string } = {}): ResultatMeta => ({ ok: false, motif, ...plus })
const estTexte = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const maintenant = (deps: DepsMeta) => { try { const t = deps.maintenant ? deps.maintenant() : Date.now(); return Number.isFinite(t) ? t : Date.now() } catch { return Date.now() } }

/** Une erreur Graph : la cause (permissions, limite, panne) et si un nouvel essai a un sens. */
export function classerErreurGraph(e: ErreurGraph): { motif: string; reessayable: boolean } {
  const s = e.status
  if (s === 429) return { motif: `limite de débit Graph (429) : ${e.erreur}`, reessayable: true }
  if (s === 0 || s === 408 || s === 504) return { motif: `Graph n'a pas répondu à temps (${s}) : ${e.erreur}`, reessayable: true }
  if (s >= 500) return { motif: `erreur Graph côté Meta (${s}) : ${e.erreur}`, reessayable: true }
  if (s === 401 || s === 403 || s === 10 || s === 200) return { motif: `permission Graph absente ou jeton refusé (${s}) : ${e.erreur}`, reessayable: false }
  return { motif: `refus Graph (${s}) : ${e.erreur}`, reessayable: false }
}

const estErreur = (v: unknown): v is ErreurGraph => !!v && typeof v === 'object' && 'erreur' in (v as object)

// ── le contrôle avant tout appel réseau ──────────────────────────────────────────────────────────────────────────
/** Toutes les vérifications qui précèdent un appel Graph. Rend `null` quand tout est en règle, sinon le refus. */
export async function controlerAvantPublication(variante: Variante, ctx: ContexteMeta, deps: DepsMeta = {}): Promise<ResultatMeta | null> {
  if (!(await sortiePermise()).permise) return refus('pause générale : aucune publication')
  if (deps.opposition === true) return refus('STOP ou opposition : aucune publication')
  if (deps.coutEuros !== 0) return refus('coût inconnu ou positif : publication refusée')
  if (!variante || typeof variante !== 'object') return refus('variante absente')
  if (!estTexte(variante.id)) return refus('variante sans identifiant')
  if (!estTexte(variante.texte)) return refus('variante sans texte visible')
  if (!ctx || typeof ctx !== 'object') return refus('contexte de publication absent')
  if (!estTexte(ctx.bucketAttendu) || variante.bucket !== ctx.bucketAttendu) return refus('média situé hors du bucket privé attendu')
  if (!estTexte(variante.cle) || !CLE_MEDIA.test(variante.cle) || /^[a-z][a-z0-9+.-]*:/i.test(variante.cle)) return refus('média : clé de bucket invalide (une URL arbitraire n\'est jamais publiée)')
  if (ctx.pause === true) return refus('pause générale des agents : rien ne part')
  if (variante.canal !== undefined && variante.canal !== 'instagram' && variante.canal !== 'facebook') return refus(`canal « ${String(variante.canal)} » : Graph ne publie que sur Instagram et Facebook`)

  // Un post déjà publié : rien à envoyer, rien à contrôler de plus (l'idempotence ne lance jamais d'appel).
  if (ctx.dejaPublie === true) return { ok: true, idempotent: true }

  const t = maintenant(deps)
  const visibles = textesVisibles(variante)
  const version = versionTexte(variante)

  // Contrôle complet quand le post et sa ligne sont fournis : drapeaux, plafonds, doublons, chiffres (aucun accord individuel : les contrôles automatiques le remplacent).
  if (ctx.post) {
    if (ctx.post.id !== variante.id) return refus(`le post fourni (« ${ctx.post.id} ») n'est pas la variante « ${variante.id} »`)
    const verdict = await verdictPublication({ ...ctx.post, contexte: ctx.contexteLignes ?? ctx.post.contexte, decision: ctx.decision ?? ctx.post.decision }, ctx.ligne ?? null, deps)
    if (verdict.decision !== 'publier') return refus(`contrôle de la ligne : ${verdict.motif}`)
    return null
  }

  // Contrôle minimal : chiffres et garde-fous automatiques, sans accord individuel.
  for (const texte of visibles) {
    if (!porteUneAffirmationChiffree(texte)) continue
    if (!estTexte(variante.source)) return refus('affirmation chiffrée sans source : renvoyée à Benj')
    if (!(await sortiePermise()).permise) return refus('pause générale : aucun appel au modèle')
    const r = await vraisemblance(texte, {}, deps)
    if (r === null) return refus('Laya indisponible (jev absent ou en panne) : bloqué, renvoyé à Benj')
    if (r.bloque || !Number.isFinite(r.p) || r.p < SEUIL_LAYA) return refus(`score de vérité insuffisant (p=${r.p} < ${SEUIL_LAYA}) : renvoyé à Benj`)
  }
  // Aucun accord individuel : décision du 30/09, validation automatique ci-dessus.
  return null
}

// ── la publication ───────────────────────────────────────────────────────────────────────────────────────────────
/** Attend que le conteneur média soit prêt : délai borné, états d'échec explicites. */
export async function attendreConteneurPret(reseau: ReseauGraph, conteneurId: string, ctx: Pick<ContexteMeta, 'essaisEtat' | 'pauseEtatMs'>, deps: DepsMeta = {}): Promise<ResultatMeta | null> {
  if (!reseau.etatConteneur) return null
  const essais = Number.isInteger(ctx.essaisEtat) && (ctx.essaisEtat as number) > 0 ? (ctx.essaisEtat as number) : 10
  const pause = Number.isFinite(ctx.pauseEtatMs) && (ctx.pauseEtatMs as number) >= 0 ? (ctx.pauseEtatMs as number) : 3000
  const attendre = deps.attendre ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  for (let i = 0; i < essais; i++) {
    if (!(await sortiePermise()).permise) return refus('pause générale : aucun appel Graph', { etape: 'etat_conteneur' })
    const e = await reseau.etatConteneur(conteneurId)
    if (estErreur(e)) {
      const c = classerErreurGraph(e)
      if (!c.reessayable) return refus(`Graph (état du conteneur) : ${c.motif}`, { etape: 'etat_conteneur' })
    } else {
      if (e.etat === 'FINISHED') return null
      if (e.etat === 'ERROR') return refus('Graph (conteneur) : le traitement du média a échoué', { etape: 'etat_conteneur' })
      if (e.etat === 'EXPIRED') return refus('Graph (conteneur) : conteneur expiré, il faut en créer un nouveau', { etape: 'etat_conteneur', reessayable: true })
    }
    if (i < essais - 1) await attendre(pause)
  }
  return refus('Graph (conteneur) : pas prêt dans le délai imparti, rien n\'a été publié', { etape: 'etat_conteneur', reessayable: true })
}

/**
 * Publie un Reel Instagram ou une vidéo Facebook par Graph. Rien ne part sans validation automatique des garde-fous. Chaque chemin de
 * sortie est explicite : `ok:true` avec l'URL publique, `ok:true` idempotent, ou `ok:false` avec le motif (et si un nouvel
 * essai a un sens). Une exception d'un service injecté devient un refus, jamais une publication.
 */
export async function publierMeta(variante: Variante, ctx: ContexteMeta, reseau: ReseauGraph, deps: DepsMeta = {}): Promise<ResultatMeta> {
  try {
    const refuse = await controlerAvantPublication(variante, ctx, deps)
    if (refuse) return refuse
    if (ctx.dejaPublie === true) return { ok: true, idempotent: true }
    if (!reseau || typeof reseau.creerConteneur !== 'function' || typeof reseau.publier !== 'function') return refus('client Graph absent : rien n\'est publié')

    const legende = [variante.legende, variante.texte].find(estTexte)
    if (!(await sortiePermise()).permise) return refus('pause générale : aucun appel Graph')
    const conteneur = await reseau.creerConteneur({ bucket: variante.bucket, cle: variante.cle, canal: variante.canal, legende })
    if (estErreur(conteneur)) {
      const c = classerErreurGraph(conteneur)
      return refus(`Graph (conteneur) : ${c.motif}`, { reessayable: c.reessayable, etape: 'conteneur' })
    }
    if (!estTexte(conteneur?.id)) return refus('Graph (conteneur) : réponse sans identifiant', { etape: 'conteneur' })

    const pret = await attendreConteneurPret(reseau, conteneur.id, ctx, deps)
    if (pret) return pret

    if (!(await sortiePermise()).permise) return refus('pause générale : aucune publication Graph', { etape: 'publication' })
    const p = await reseau.publier(conteneur.id)
    if (estErreur(p)) {
      const c = classerErreurGraph(p)
      // Timeout ou 5xx : la publication a peut-être eu lieu. On la retrouve avant de dire qu'elle a échoué (jamais un 2e envoi).
      if (c.reessayable && reseau.retrouver) {
        if (!(await sortiePermise()).permise) return refus('pause générale : réconciliation différée', { etape: 'reconciliation', reessayable: false })
        const deja = await reseau.retrouver(conteneur.id)
        if (deja && !estErreur(deja)) return { ok: true, url: deja.url, id_externe: deja.id, reconcilie: true }
        if (estErreur(deja)) return refus(`Graph (publication) : ${c.motif} ; réconciliation impossible : ${deja.erreur}`, { reessayable: false, etape: 'reconciliation' })
      }
      return refus(`Graph (publication) : ${c.motif}`, { reessayable: c.reessayable, etape: 'publication' })
    }
    if (!estTexte(p?.url) || !/^https:\/\/\S+$/.test(p.url)) return refus('Graph (publication) : pas d\'URL publique en retour, publication non prouvée', { etape: 'publication' })
    return { ok: true, url: p.url, id_externe: p.id }
  } catch (e) {
    return refus(`erreur du contrôle ou du réseau, par prudence rien n'est confirmé : ${String((e as Error)?.message || e).slice(0, 160)}`)
  }
}

// ── l'inscription dans contenu_posts ─────────────────────────────────────────────────────────────────────────────
export type MajContenuPost = { statut: 'publie'; preuve_publique: string; id_externe: string | null; preuve_le: string; publie_le: string }

/** Ce qui s'écrit dans `contenu_posts` après une publication prouvée (URL publique, ID externe, heure). Un résultat non
 *  prouvé ne produit rien : le post reste en attente. */
export function majApresPublication(resultat: ResultatMeta, deps: DepsMeta = {}): MajContenuPost | null {
  if (!resultat.ok || resultat.idempotent || !resultat.url) return null
  if (!/^https:\/\/\S+$/.test(resultat.url) || resultat.url.length > 500) return null
  const iso = new Date(maintenant(deps)).toISOString()
  const id = resultat.id_externe && /^[A-Za-z0-9_.:-]{3,120}$/.test(resultat.id_externe) ? resultat.id_externe : null
  return { statut: 'publie', preuve_publique: resultat.url, id_externe: id, preuve_le: iso, publie_le: iso }
}

// ── le client Graph (injecté : jamais de jeton lu ici) ───────────────────────────────────────────────────────────
export type OptionsClientGraph = {
  coutEuros?: unknown
  opposition?: boolean
  jeton: string | null | undefined
  /** Droits accordés au jeton (ex. `instagram_content_publish`, `pages_manage_posts`) : sans eux, le client refuse. */
  capacites: readonly string[]
  /** Identifiant du compte Instagram professionnel et de la Page Facebook. */
  compteInstagram?: string
  page?: string
  /** Signe une URL temporaire de lecture d'un média du bucket privé. */
  signerUrl: (bucket: string, cle: string) => Promise<string>
  fetch: typeof fetch
  /** Version de l'API Graph (à confirmer avec le premier jeton, R6). */
  version?: string
  delaiMs?: number
}

export const CAPACITE_INSTAGRAM = 'instagram_content_publish'
export const CAPACITE_FACEBOOK = 'pages_manage_posts'

/** Fabrique le faux ou le vrai `ReseauGraph` : refuse sans jeton ni capacité de publication. Aucun appel à la création. */
export function creerClientGraph(o: OptionsClientGraph, canal: CanalMeta): { ok: true; reseau: ReseauGraph } | { ok: false; motif: string } {
  if (o.coutEuros !== 0 || o.opposition === true) return { ok: false, motif: 'coût inconnu/positif ou opposition : voie Graph fermée' }
  if (!estTexte(o.jeton)) return { ok: false, motif: 'aucun jeton Graph (R6 non levée) : voie fermée' }
  const besoin = canal === 'instagram' ? CAPACITE_INSTAGRAM : CAPACITE_FACEBOOK
  if (!Array.isArray(o.capacites) || !o.capacites.includes(besoin)) return { ok: false, motif: `le jeton n'a pas la capacité « ${besoin} » : voie fermée` }
  const cible = canal === 'instagram' ? o.compteInstagram : o.page
  if (!estTexte(cible) || !/^[0-9]{5,25}$/.test(cible)) return { ok: false, motif: `identifiant ${canal === 'instagram' ? 'du compte Instagram' : 'de la Page'} absent ou invalide` }
  const base = `https://graph.facebook.com/${o.version ?? 'v21.0'}`
  const jeton = o.jeton
  const appeler = async (chemin: string, methode: 'GET' | 'POST', champs: Record<string, string>): Promise<Record<string, unknown> | ErreurGraph> => {
    try {
      if (!(await sortiePermise()).permise) return { erreur: 'pause générale : aucun appel Graph', status: 403 }
      const url = new URL(`${base}/${chemin}`)
      const corps = new URLSearchParams({ ...champs, access_token: jeton })
      if (methode === 'GET') for (const [k, v] of corps) url.searchParams.set(k, v)
      const r = await o.fetch(url, { method: methode, body: methode === 'POST' ? corps : undefined, redirect: 'error', signal: AbortSignal.timeout(o.delaiMs ?? 20_000) })
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string; code?: number } }
      if (!r.ok || j.error) return { erreur: String(j.error?.message ?? `HTTP ${r.status}`).slice(0, 160), status: r.status || 0 }
      return j
    } catch (e) {
      return { erreur: String((e as Error)?.message || e).slice(0, 160), status: 0 }
    }
  }
  const reseau: ReseauGraph = {
    async creerConteneur(m) {
      const video_url = await o.signerUrl(m.bucket, m.cle)
      if (canal === 'instagram') {
        const r = await appeler(`${cible}/media`, 'POST', { media_type: 'REELS', video_url, caption: m.legende ?? '' })
        return estErreur(r) ? r : { id: String(r.id ?? '') }
      }
      const r = await appeler(`${cible}/videos`, 'POST', { file_url: video_url, description: m.legende ?? '', published: 'false' })
      return estErreur(r) ? r : { id: String(r.id ?? '') }
    },
    async etatConteneur(id) {
      const r = await appeler(id, 'GET', { fields: 'status_code' })
      if (estErreur(r)) return r
      const s = String(r.status_code ?? '')
      return { etat: s === 'FINISHED' || s === 'ERROR' || s === 'EXPIRED' ? s : 'IN_PROGRESS' }
    },
    async publier(id) {
      const r = canal === 'instagram'
        ? await appeler(`${cible}/media_publish`, 'POST', { creation_id: id })
        : await appeler(id, 'POST', { published: 'true' })
      if (estErreur(r)) return r
      const idPost = String(r.id ?? id)
      const p = await appeler(idPost, 'GET', { fields: canal === 'instagram' ? 'permalink' : 'permalink_url' })
      const lien = estErreur(p) ? null : String(p.permalink ?? p.permalink_url ?? '')
      return lien && /^https:\/\/\S+$/.test(lien) ? { url: lien, id: idPost } : { erreur: 'publication faite mais lien public illisible', status: 0 }
    },
    async retrouver(id) {
      const p = await appeler(id, 'GET', { fields: canal === 'instagram' ? 'permalink' : 'permalink_url' })
      if (estErreur(p)) return p.status === 404 ? null : p
      const lien = String(p.permalink ?? p.permalink_url ?? '')
      return /^https:\/\/\S+$/.test(lien) ? { url: lien, id } : null
    },
  }
  return { ok: true, reseau }
}
