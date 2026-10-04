// Garde automatique des lignes éditoriales, décision du 30/09.
// Pause fail-closed, STOP/opposition, coût explicite nul, faits/drapeaux, cadence,
// doublons et chaque affirmation chiffrée contrôlée : aucun accord individuel requis.
// Les posts Crieur restent sur leur propre voie réservée pour éviter le double envoi.
import { vraisemblance, type DepsLecteur } from '@/lib/agents/llm'
import { sortiePermise } from '@/lib/agents/sortie'

// ── types ────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Canal = 'tiktok' | 'instagram' | 'facebook' | 'linkedin'

/** Une décision du bus (`ops.decisions`) telle que la garde en a besoin. */
export type DecisionAccord = {
  statut: string
  choix?: string
  cible: string
  texte_version?: string
  portee?: string
  /** ISO : échéance de la décision. */
  echeance?: string
  /** ISO : date à laquelle la décision a été tranchée. */
  le?: string
} | null | undefined

export type ExistantPost = { id: string; canal: string; texte: string; statut?: string }
export type FaitRegistre = { drapeau?: string; preuve?: unknown }

/** Le monde autour du post, fourni par l'appelant (jamais lu ici : pas de base, pas de variable d'environnement). */
export type ContexteLignes = {
  /** Registre des faits (lib/crieur/faits.ts) : id → fait. */
  faits?: Record<string, FaitRegistre>
  /** Instantané des drapeaux (lib/flags.ts) : nom → levé ou non. */
  drapeaux?: Record<string, boolean>
  /** Les publications déjà connues (contenu_posts et crieur_posts) pour repérer les doublons. */
  existants?: ExistantPost[]
}

export type Post = {
  id: string
  ligne: string
  canal: string
  texte: string
  legende?: string | null
  sous_titres?: string | null
  miniature_texte?: string | null
  description?: string | null
  /** Référence de la preuve des affirmations chiffrées. */
  source?: string | null
  gabarit?: string
  fait_ids?: string[]
  /** Nom d'un drapeau dont dépend la fonction montrée (ex. `aimantSite`). */
  drapeau?: string
  decision?: DecisionAccord
  origine?: 'contenu' | 'crieur_posts'
  crieurStatut?: string
  contexte?: ContexteLignes
}

export type Ligne = {
  id: string
  suspendue?: boolean
  /** Explicitement `false` : ligne non approuvée par Benj (approuver une ligne n'autorise de toute façon rien). */
  approuvee?: boolean
  canaux: string[]
  drapeau?: string
  gabarits?: string[]
  quotaJour?: number
  publieAujourdhui?: number
  cadenceSemaine?: number
  publieCetteSemaine?: number
}

export type PreuveChiffre = { texte: string; source: string; p: number | null; verdict: 'pass' | 'refus' | 'indisponible'; le: string }
export type Verdict =
  | { decision: 'publier'; preuves: PreuveChiffre[] }
  | { decision: 'refuser'; motif: string; preuves: PreuveChiffre[] }

export type DepsLignes = DepsLecteur & { coutEuros?: unknown; opposition?: boolean }

// ── le cadre L1–L5 (docs/marketing/lignes/README.md) ─────────────────────────────────────────────────────────────
export const CADRE: Readonly<Record<string, { canaux: readonly string[]; gabarits: readonly string[] }>> = Object.freeze({
  L1: { canaux: ['tiktok', 'instagram', 'facebook'], gabarits: ['video-vertical'] },
  L2: { canaux: ['tiktok', 'instagram', 'facebook'], gabarits: ['texte-anime'] },
  L3: { canaux: ['tiktok', 'instagram', 'facebook'], gabarits: ['capture-produit'] },
  L4: { canaux: ['tiktok'], gabarits: ['capture-station'] },
  L5: { canaux: ['instagram', 'facebook', 'linkedin'], gabarits: ['texte-visuel'] },
})

export const PLAFOND_PUBLORA_MOIS = 15
export const PLAFOND_PUBLORA_A_VENIR = 3
export const SEUIL_LAYA = 0.5
export const MOTIF_CRIEUR = 'un post du Crieur passe par sa route réservée et ses garde-fous automatiques'
const VALIDITE_ACCORD_MS = 7 * 24 * 3600 * 1000

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────
const refuser = (motif: string, preuves: PreuveChiffre[] = []): Verdict => ({ decision: 'refuser', motif, preuves })
const estTexte = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const dateIso = (ms: number) => new Date(ms).toISOString()

function maintenant(deps: DepsLignes): number {
  try {
    const t = deps.maintenant ? deps.maintenant() : Date.now()
    return Number.isFinite(t) ? t : Date.now()
  } catch {
    return Date.now()
  }
}

type Visibles = Pick<Post, 'texte' | 'legende' | 'sous_titres' | 'miniature_texte' | 'description'>

/** Tous les textes que le public verra : c'est sur eux que porte le contrôle des chiffres (une promesse peut se
 *  cacher dans un sous-titre incrusté, la légende, la miniature ou la description). */
export function textesVisibles(post: Visibles): string[] {
  return [post.texte, post.legende, post.sous_titres, post.miniature_texte, post.description].filter((t): t is string => estTexte(t))
}

/** La version exacte sur laquelle l'accord se donne : le texte seul quand il n'y a rien d'autre à voir, sinon tous les
 *  textes visibles, dans un ordre fixe. Retoucher un mot change la version : l'accord devient caduc. */
export function versionTexte(post: Visibles): string {
  const t = textesVisibles(post)
  if (t.length === 1) return t[0]
  return [post.texte, post.legende ?? '', post.sous_titres ?? '', post.miniature_texte ?? '', post.description ?? ''].join('\n---\n')
}

/** Une affirmation chiffrée se détecte par un chiffre dans le texte visible (large exprès : un contrôle de trop vaut
 *  mieux qu'une promesse oubliée). */
export function porteUneAffirmationChiffree(texte: string): boolean {
  return /\d/.test(String(texte || ''))
}

function cibleVise(cible: unknown, postId: string): boolean {
  if (typeof cible !== 'string') return false
  if (cible === postId) return true
  const prefixe = `contenu:post:${postId}:`
  return cible.startsWith(prefixe) && /^[0-9a-f]{8,64}$/.test(cible.slice(prefixe.length))
}

/** Lecture d'une ancienne carte d'accord : décision tranchée, choix `accorder`, cible exacte, même version du texte, portée
 *  sécurité si elle est renseignée, ni expirée ni vieille de plus de 7 jours. Depuis la décision du 30/09 (confirmée le 04/10),
 *  ce n'est plus le chemin d'autorisation des publications Instagram/Facebook : `verdictPublication` les ouvre par les contrôles
 *  automatiques. Seul le chemin TikTok (scripts/contenu/publier-tiktok.mjs) l'exige encore.
 *  @deprecated la voie automatique ne l'appelle plus. */
export function accordValide(decision: DecisionAccord, postId: string, version: string, maintenantMs: number): { ok: true } | { ok: false; motif: string } {
  if (!decision || typeof decision !== 'object') return { ok: false, motif: 'accord individuel de Benj absent : aucune publication sans lui' }
  if (decision.statut !== 'tranchee') return { ok: false, motif: `décision « ${decision.statut} » (attendu tranchee ; une échéance passée applique le défaut « refuser »)` }
  if (decision.choix !== 'accorder') return { ok: false, motif: `choix « ${decision.choix} » (attendu accorder)` }
  if (!cibleVise(decision.cible, postId)) return { ok: false, motif: `l'accord vise « ${decision.cible} », pas « ${postId} » (un accord pour A n'autorise jamais B)` }
  if (decision.texte_version === undefined || decision.texte_version === null) return { ok: false, motif: "l'accord ne dit pas sur quelle version du texte il porte" }
  if (decision.texte_version !== version) return { ok: false, motif: "le texte ou le média a changé depuis l'accord : il est caduc" }
  if (decision.portee !== undefined && decision.portee !== 'securite') return { ok: false, motif: `portée « ${decision.portee} » (attendu securite)` }
  if (decision.echeance !== undefined) {
    const e = Date.parse(decision.echeance)
    if (!Number.isFinite(e) || e <= maintenantMs) return { ok: false, motif: "l'échéance de la décision est passée ou illisible" }
  }
  if (decision.le !== undefined) {
    const l = Date.parse(decision.le)
    if (!Number.isFinite(l) || l > maintenantMs || maintenantMs - l > VALIDITE_ACCORD_MS) return { ok: false, motif: "l'accord date de plus de 7 jours ou d'une date illisible : il est caduc" }
  }
  return { ok: true }
}

// ── le pont avec le Crieur ───────────────────────────────────────────────────────────────────────────────────────
export type LigneCrieur = {
  id?: unknown
  canal?: unknown
  statut?: unknown
  texte?: unknown
  fait_ids?: unknown
  programmee_pour?: unknown
}

/** Normalise une ligne de `crieur_posts` (sans toucher son schéma) : identifiant préfixé `crieur:`, canal permis,
 *  preuve = ses faits. Une ligne illisible est refusée avec son motif, jamais « réparée ». */
export function normaliserPostCrieur(ligne: LigneCrieur | null | undefined, ligneId = 'L5'): { ok: true; post: Post } | { ok: false; motif: string } {
  if (!ligne || typeof ligne !== 'object') return { ok: false, motif: 'post du Crieur absent' }
  const id = typeof ligne.id === 'string' || typeof ligne.id === 'number' ? String(ligne.id).trim() : ''
  if (!id) return { ok: false, motif: 'post du Crieur sans identifiant' }
  const canal = typeof ligne.canal === 'string' ? ligne.canal.trim().toLowerCase() : ''
  if (!CADRE[ligneId]?.canaux.includes(canal)) return { ok: false, motif: `canal « ${canal || '?'} » hors de la ligne ${ligneId}` }
  if (!estTexte(ligne.texte)) return { ok: false, motif: 'post du Crieur sans texte' }
  const faits = Array.isArray(ligne.fait_ids) ? ligne.fait_ids.filter((f): f is string => estTexte(f)) : []
  return {
    ok: true,
    post: {
      id: id.startsWith('crieur:') ? id : `crieur:${id}`,
      ligne: ligneId,
      canal,
      texte: ligne.texte,
      source: faits.length ? `faits:${faits.join(',')}` : null,
      fait_ids: faits,
      origine: 'crieur_posts',
      crieurStatut: typeof ligne.statut === 'string' ? ligne.statut : 'inconnu',
    },
  }
}

/** La charge de Publora Starter : posts programmés ce mois-ci (UTC) et posts à venir (brouillon ou programmé, dans
 *  le futur). Un statut refusé, annulé ou en erreur ne compte pas. */
export function chargePublora(lignes: Array<{ statut?: unknown; programmee_pour?: unknown }>, maintenantMs: number): { mois: number; aVenir: number; plein: boolean; motif: string | null } {
  const now = new Date(maintenantMs)
  let mois = 0
  let aVenir = 0
  for (const l of Array.isArray(lignes) ? lignes : []) {
    const statut = typeof l?.statut === 'string' ? l.statut : ''
    if (!['brouillon_publora', 'programmee', 'publiee'].includes(statut)) continue
    const t = typeof l?.programmee_pour === 'string' ? Date.parse(l.programmee_pour) : NaN
    if (!Number.isFinite(t)) continue
    const d = new Date(t)
    if (d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth()) mois += 1
    if ((statut === 'brouillon_publora' || statut === 'programmee') && t > maintenantMs) aVenir += 1
  }
  const motifs: string[] = []
  if (mois >= PLAFOND_PUBLORA_MOIS) motifs.push(`${mois} publications ce mois-ci (plafond ${PLAFOND_PUBLORA_MOIS})`)
  if (aVenir >= PLAFOND_PUBLORA_A_VENIR) motifs.push(`${aVenir} à venir (plafond ${PLAFOND_PUBLORA_A_VENIR})`)
  return { mois, aVenir, plein: motifs.length > 0, motif: motifs.length ? `plafond Publora atteint : ${motifs.join(' ; ')}` : null }
}

/** Même réseau, même texte exact, autre identifiant (ou le même déjà publié) : un doublon. */
export function estDoublon(post: Pick<Post, 'id' | 'canal' | 'texte'>, existants: ExistantPost[] | undefined): boolean {
  const norm = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
  return (Array.isArray(existants) ? existants : []).some(
    (e) => e && e.canal === post.canal && norm(e.texte) === norm(post.texte) && (e.id !== post.id || e.statut === 'publie' || e.statut === 'publiee'),
  )
}

const estCrieur = (p: Post) => p.origine === 'crieur_posts' || p.crieurStatut !== undefined || p.id.startsWith('crieur:')

// ── le verdict ───────────────────────────────────────────────────────────────────────────────────────────────────
export async function verdictPublication(post: Post, ligne: Ligne | null, deps: DepsLignes = {}): Promise<Verdict> {
  try {
    return await juger(post, ligne, deps)
  } catch (e) {
    return refuser(`erreur du contrôle, par prudence rien ne part : ${String((e as Error)?.message || e).slice(0, 160)}`)
  }
}

async function juger(post: Post, ligne: Ligne | null, deps: DepsLignes): Promise<Verdict> {
  const t = maintenant(deps)
  if (!(await sortiePermise()).permise) return refuser('pause générale : aucune publication')
  if (deps.opposition === true) return refuser('STOP ou opposition : aucune publication')
  if (deps.coutEuros !== 0) return refuser('coût inconnu ou positif : publication refusée')
  // 1. entrée valide
  if (!post || typeof post !== 'object') return refuser('post absent')
  if (!estTexte(post.id)) return refuser('post sans identifiant')
  if (!estTexte(post.texte)) return refuser('post sans texte visible')
  if (!estTexte(post.canal)) return refuser('post sans canal')
  if (post.origine !== undefined && post.origine !== 'contenu' && post.origine !== 'crieur_posts') return refuser(`origine « ${String(post.origine)} » inconnue`)
  const ctx = post.contexte || {}

  // 2. le Crieur : jamais `publier` ici (cadence, plafond Publora et doublons seulement)
  if (estCrieur(post)) {
    if (post.origine === 'contenu') return refuser("origine contradictoire : un post du Crieur ne se déclare pas « contenu »")
    if (estDoublon(post, ctx.existants)) return refuser('doublon : ce texte est déjà connu sur ce réseau')
    if (!ligne || !estTexte(ligne.id) || !(ligne.canaux || []).includes(post.canal) || !CADRE[ligne.id]?.canaux.includes(post.canal)) {
      return refuser(`post du Crieur hors ligne : canal « ${post.canal} » non permis`)
    }
    return refuser(post.crieurStatut === 'brouillon_publora' ? MOTIF_CRIEUR : `${MOTIF_CRIEUR} (statut « ${post.crieurStatut ?? 'inconnu'} »)`)
  }

  // 3. la ligne
  if (!ligne || typeof ligne !== 'object') return refuser('ligne absente ou suspendue')
  if (ligne.suspendue !== false && ligne.suspendue !== undefined) return refuser('ligne suspendue')
  if (ligne.approuvee === false) return refuser("ligne non approuvée par Benj (et approuver une ligne n'autorise aucune publication)")
  const cadre = CADRE[ligne.id]
  if (!cadre) return refuser(`ligne « ${String(ligne.id)} » hors du cadre L1–L5`)
  if (post.ligne !== ligne.id) return refuser(`le post relève de la ligne « ${post.ligne} », pas de « ${ligne.id} »`)

  // 4. le canal : celui de la ligne ET celui du cadre
  if (!Array.isArray(ligne.canaux) || !ligne.canaux.includes(post.canal)) return refuser(`canal « ${post.canal} » non permis pour ${ligne.id}`)
  if (!cadre.canaux.includes(post.canal)) return refuser(`canal « ${post.canal} » hors du cadre de ${ligne.id}`)

  // 5. drapeaux : une fonction masquée par un drapeau baissé (ou dont l'état est inconnu) ne se montre pas
  const drapeaux = ctx.drapeaux
  const requis = new Set<string>()
  if (estTexte(post.drapeau)) requis.add(post.drapeau)
  if (estTexte(ligne.drapeau)) requis.add(ligne.drapeau)
  const ids = Array.isArray(post.fait_ids) ? post.fait_ids : []
  if (ids.length) {
    const registre = ctx.faits
    if (!registre) return refuser('faits cités sans registre pour les vérifier')
    for (const f of ids) {
      const fait = registre[f]
      if (!fait) return refuser(`fait « ${f} » absent du registre`)
      if (estTexte(fait.drapeau)) requis.add(fait.drapeau)
    }
  }
  for (const d of requis) {
    if (!drapeaux || drapeaux[d] !== true) return refuser(`drapeau « ${d} » baissé : la fonction montrée n'est pas ouverte`)
  }

  // 6. gabarit (celui de la ligne, et celui du cadre)
  if (post.gabarit !== undefined) {
    const deLaLigne = Array.isArray(ligne.gabarits) ? ligne.gabarits : cadre.gabarits
    if (!deLaLigne.includes(post.gabarit) || !cadre.gabarits.includes(post.gabarit)) return refuser(`gabarit « ${post.gabarit} » non autorisé pour ${ligne.id}`)
  }

  // 7. doublon
  if (estDoublon(post, ctx.existants)) return refuser('doublon : ce texte est déjà connu sur ce réseau')

  // 8. cadence de la semaine, puis plafond du jour
  if (ligne.cadenceSemaine !== undefined) {
    if (!estNombre(ligne.cadenceSemaine) || !estNombre(ligne.publieCetteSemaine) || ligne.publieCetteSemaine >= ligne.cadenceSemaine) return refuser('cadence de la semaine atteinte (ou non mesurable)')
  }
  if (ligne.quotaJour !== undefined) {
    const fait = ligne.publieAujourdhui ?? 0
    if (!estNombre(ligne.quotaJour) || !estNombre(fait) || fait >= ligne.quotaJour) return refuser('plafond du jour atteint')
  }

  // 9. affirmations chiffrées : chaque texte visible qui porte un chiffre passe par Laya, sur le texte exact + sa source
  const preuves: PreuveChiffre[] = []
  for (const texte of textesVisibles(post)) {
    if (!porteUneAffirmationChiffree(texte)) continue
    if (!estTexte(post.source)) return refuser('affirmation chiffrée sans source : renvoyée à Benj', preuves)
    if (!(await sortiePermise()).permise) return refuser('pause générale : aucun appel au modèle', preuves)
    const r = await vraisemblance(texte, {}, deps)
    if (r === null) {
      preuves.push({ texte, source: post.source, p: null, verdict: 'indisponible', le: dateIso(t) })
      return refuser('Laya indisponible (jev absent ou en panne) : bloqué, renvoyé à Benj', preuves)
    }
    const passe = !r.bloque && Number.isFinite(r.p) && r.p >= SEUIL_LAYA
    preuves.push({ texte, source: post.source, p: r.p, verdict: passe ? 'pass' : 'refus', le: dateIso(t) })
    if (!passe) return refuser(`score de vérité insuffisant (p=${r.p} < ${SEUIL_LAYA}) : renvoyé à Benj`, preuves)
  }

  // Décision du 30/09 : les contrôles automatiques remplacent l'accord individuel.
  return { decision: 'publier', preuves }
}
