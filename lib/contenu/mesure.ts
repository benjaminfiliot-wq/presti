// lib/contenu/mesure.ts — C10 (fiche 026-213) : la mesure de chaque publication à H+1, H+24 et J+7, et l'attribution PRUDENTE.
//
// Règles :
//  - une donnée indisponible (erreur, absente, négative, non finie) reste « non mesuré » : JAMAIS un zéro ; ce qui n'est pas
//    encore échu est « en attente » ; ni l'un ni l'autre n'a de valeur (contrainte de contenu_mesures) ;
//  - chaque mesure garde sa source, l'heure de lecture, l'unité, son statut de disponibilité et l'ID du post ;
//  - TikTok : une API officielle SEULEMENT si son accès est prouvé, sinon un relevé manuel signé par Benj ; ni TikTok Studio
//    ni le centre créatif ne sont lus par un script, aucun outil payant (Windsor) n'est employé ;
//  - une vente ou une demande de maquette rattachée à une ligne par une fenêtre de temps est une ESTIMATION, avec sa fenêtre
//    et ses ambiguïtés visibles ; le code d'apport est par réseau, pas par ligne, donc une visite ne prouve pas la ligne ;
//  - toute formule publique de résultat passe par `jev noul --provider laya` (seuil 0,5, source obligatoire, panne = refus).
// Fonctions pures, sauf l'appel local à Laya ; tout accès externe (Graph, base) est INJECTÉ. Aucun secret ici.
import { SEUIL_LAYA, porteUneAffirmationChiffree } from './lignes'
import { vraisemblance, type DepsLecteur } from '@/lib/agents/llm'

// ── vocabulaire (celui de public.contenu_mesures) ────────────────────────────────────────────────────────────────
export type Echeance = 'H+1' | 'H+24' | 'J+7'
export const ECHEANCES: readonly Echeance[] = Object.freeze(['H+1', 'H+24', 'J+7'] as Echeance[])
export const DELAI_ECHEANCE_H: Readonly<Record<Echeance, number>> = Object.freeze({ 'H+1': 1, 'H+24': 24, 'J+7': 168 })

export type Metrique = 'vues' | 'lectures_completes' | 'temps_moyen_s' | 'enregistrements' | 'partages' | 'commentaires' | 'j_aime' | 'visites' | 'demandes_maquette' | 'ventes'
export const METRIQUES_RESEAU: readonly Metrique[] = Object.freeze(['vues', 'lectures_completes', 'temps_moyen_s', 'enregistrements', 'partages', 'commentaires', 'j_aime'] as Metrique[])
export type SourceMesure = 'api_officielle' | 'releve_main' | 'audience_maison' | 'base_presti'
export type Unite = 'nombre' | 'secondes'
export const UNITE: Readonly<Record<Metrique, Unite>> = Object.freeze({
  vues: 'nombre', lectures_completes: 'nombre', temps_moyen_s: 'secondes', enregistrements: 'nombre', partages: 'nombre',
  commentaires: 'nombre', j_aime: 'nombre', visites: 'nombre', demandes_maquette: 'nombre', ventes: 'nombre',
})

// ── une mesure, brute puis normalisée ────────────────────────────────────────────────────────────────────────────
export type MesureBrute = { valeur?: number | null; erreur?: boolean; source: string; le: string; metrique?: Metrique; echeance?: Echeance; postId?: string; unite?: Unite }
export type Mesure = {
  valeur: number | null
  disponible: boolean
  etat: 'mesure' | 'non_mesure'
  source: string
  le: string
  metrique?: Metrique
  echeance?: Echeance
  postId?: string
  unite?: Unite
}

/** Une donnée en erreur, absente, négative ou non finie devient « non mesuré » (valeur nulle) : jamais zéro. */
export function normaliserMesure(brut: MesureBrute): Mesure {
  const base = { source: brut?.source, le: brut?.le, metrique: brut?.metrique, echeance: brut?.echeance, postId: brut?.postId, unite: brut?.unite ?? (brut?.metrique ? UNITE[brut.metrique] : undefined) }
  const v = brut?.valeur
  if (!brut || brut.erreur === true || typeof v !== 'number' || !Number.isFinite(v) || v < 0) return { valeur: null, disponible: false, etat: 'non_mesure', ...base }
  return { valeur: v, disponible: true, etat: 'mesure', ...base }
}

// ── les trois échéances ──────────────────────────────────────────────────────────────────────────────────────────
/** L'échéance est-elle échue ? (publication + délai ≤ maintenant). Une date de publication illisible : jamais échue. */
export function echeanceEchue(publieLe: string | number | Date | null | undefined, echeance: Echeance, maintenantMs: number): boolean {
  const t = publieLe instanceof Date ? publieLe.getTime() : typeof publieLe === 'number' ? publieLe : Date.parse(String(publieLe ?? ''))
  if (!Number.isFinite(t) || !Number.isFinite(maintenantMs)) return false
  const h = DELAI_ECHEANCE_H[echeance]
  return h !== undefined && t + h * 3_600_000 <= maintenantMs
}

/** Pour un post publié : quelles échéances sont échues, lesquelles attendent encore. */
export function planMesures(publieLe: string | number | Date | null | undefined, maintenantMs: number): Array<{ echeance: Echeance; statut: 'echue' | 'en_attente' }> {
  return ECHEANCES.map((echeance) => ({ echeance, statut: echeanceEchue(publieLe, echeance, maintenantMs) ? 'echue' : 'en_attente' }))
}

/** La ligne de `contenu_mesures` (mêmes colonnes et mêmes contraintes) — ou un refus si la provenance est incohérente. */
export type LigneMesure = {
  post_id: string
  echeance: Echeance
  metrique: Metrique
  etat: 'mesure' | 'non_mesure' | 'en_attente'
  valeur: number | null
  source: SourceMesure
  source_ref: string | null
  certitude: 'mesure' | 'estimation'
  fenetre_attribution_h: number | null
  mesure_le: string
}

const SOURCE_REF = /^[a-z0-9_.:/-]{2,80}$/

/** Cohérence source/métrique : ventes et demandes = base_presti (estimation) ; visites = audience_maison ; le reste = réseau. */
export function sourceCoherente(metrique: Metrique, source: SourceMesure): boolean {
  if (metrique === 'ventes' || metrique === 'demandes_maquette') return source === 'base_presti'
  if (metrique === 'visites') return source === 'audience_maison'
  return source === 'api_officielle' || source === 'releve_main'
}

export function ligneMesure(
  o: { postId: string; echeance: Echeance; metrique: Metrique; source: SourceMesure; sourceRef?: string | null; le: string; etat: 'mesure' | 'non_mesure' | 'en_attente'; valeur?: number | null; fenetreAttributionH?: number | null },
): { ok: true; ligne: LigneMesure } | { ok: false; motif: string } {
  if (!o.postId) return { ok: false, motif: 'ID de post absent' }
  if (!ECHEANCES.includes(o.echeance)) return { ok: false, motif: `échéance « ${String(o.echeance)} » inconnue` }
  if (!(o.metrique in UNITE)) return { ok: false, motif: `métrique « ${String(o.metrique)} » inconnue` }
  if (!sourceCoherente(o.metrique, o.source)) return { ok: false, motif: `source « ${o.source} » incohérente avec la métrique « ${o.metrique} »` }
  if (o.sourceRef != null && !SOURCE_REF.test(o.sourceRef)) return { ok: false, motif: 'référence de source invalide' }
  const estimation = o.metrique === 'ventes' || o.metrique === 'demandes_maquette'
  const fenetre = o.fenetreAttributionH ?? null
  if (estimation && !(Number.isInteger(fenetre) && (fenetre as number) >= 1 && (fenetre as number) <= 168)) return { ok: false, motif: 'une attribution à la ligne exige sa fenêtre en heures (1 à 168)' }
  if (!estimation && fenetre !== null) return { ok: false, motif: 'une mesure directe n\'a pas de fenêtre d\'attribution' }
  const mesure = o.etat === 'mesure'
  if (mesure && !(typeof o.valeur === 'number' && Number.isFinite(o.valeur) && o.valeur >= 0)) return { ok: false, motif: 'valeur mesurée absente ou négative : elle ne devient pas un zéro' }
  return {
    ok: true,
    ligne: {
      post_id: o.postId, echeance: o.echeance, metrique: o.metrique, etat: o.etat,
      valeur: mesure ? (o.valeur as number) : null, source: o.source, source_ref: o.sourceRef ?? null,
      certitude: estimation ? 'estimation' : 'mesure', fenetre_attribution_h: estimation ? (fenetre as number) : null, mesure_le: o.le,
    },
  }
}

// ── lecture des insights (client Graph INJECTÉ) ──────────────────────────────────────────────────────────────────
export type ClientInsights = {
  lireInsights: (m: { idExterne: string; canal: 'instagram' | 'facebook' }) => Promise<{ ok: true; valeurs: Partial<Record<Metrique, number>> } | { ok: false; erreur: string; status?: number }>
}
export type PostMesurable = { id: string; canal: string; id_externe?: string | null; publie_le?: string | null }

/**
 * Mesure un post à une échéance : ce qui n'est pas échu est « en_attente », une lecture en échec ou une métrique absente est
 * « non_mesure » (jamais zéro). Instagram et Facebook seulement par Graph ; TikTok n'entre pas ici (relevé manuel signé).
 */
export async function mesurerInsights(client: ClientInsights | null | undefined, post: PostMesurable, echeance: Echeance, maintenantMs: number): Promise<LigneMesure[]> {
  const le = new Date(maintenantMs).toISOString()
  const ligne = (metrique: Metrique, etat: LigneMesure['etat'], valeur: number | null): LigneMesure => ({
    post_id: post.id, echeance, metrique, etat, valeur: etat === 'mesure' ? valeur : null, source: 'api_officielle', source_ref: 'graph:insights', certitude: 'mesure', fenetre_attribution_h: null, mesure_le: le,
  })
  if (!echeanceEchue(post.publie_le, echeance, maintenantMs)) return METRIQUES_RESEAU.map((m) => ligne(m, 'en_attente', null))
  if (post.canal !== 'instagram' && post.canal !== 'facebook') return METRIQUES_RESEAU.map((m) => ({ ...ligne(m, 'non_mesure', null), source: 'releve_main' as SourceMesure, source_ref: 'releve:manuel' }))
  if (!client || !post.id_externe) return METRIQUES_RESEAU.map((m) => ligne(m, 'non_mesure', null))
  let lecture: Awaited<ReturnType<ClientInsights['lireInsights']>>
  try { lecture = await client.lireInsights({ idExterne: post.id_externe, canal: post.canal }) } catch { return METRIQUES_RESEAU.map((m) => ligne(m, 'non_mesure', null)) }
  if (!lecture.ok) return METRIQUES_RESEAU.map((m) => ligne(m, 'non_mesure', null))
  return METRIQUES_RESEAU.map((m) => {
    const n = normaliserMesure({ valeur: lecture.valeurs[m], source: 'api_officielle', le })
    return n.disponible ? ligne(m, 'mesure', n.valeur) : ligne(m, 'non_mesure', null)
  })
}

// ── TikTok : relevé manuel signé par Benj (jamais de lecture de la console du réseau par un script) ────────────────
export type ReleveManuel = { postId: string; echeance: Echeance; valeurs: Partial<Record<Metrique, number>>; signePar: string; le: string }

export function ligneReleveManuelTikTok(r: ReleveManuel): { ok: true; lignes: LigneMesure[] } | { ok: false; motif: string } {
  if (!r || typeof r !== 'object') return { ok: false, motif: 'relevé absent' }
  if (typeof r.signePar !== 'string' || r.signePar.trim().toLowerCase() !== 'benj') return { ok: false, motif: 'relevé manuel non signé par Benj : refusé' }
  const lignes: LigneMesure[] = []
  for (const m of METRIQUES_RESEAU) {
    const n = normaliserMesure({ valeur: r.valeurs?.[m], source: 'releve_main', le: r.le })
    const l = ligneMesure({ postId: r.postId, echeance: r.echeance, metrique: m, source: 'releve_main', sourceRef: 'releve:benj', le: r.le, etat: n.disponible ? 'mesure' : 'non_mesure', valeur: n.valeur })
    if (!l.ok) return l
    lignes.push(l.ligne)
  }
  return { ok: true, lignes }
}

// ── visites par source et par campagne (Audience maison) ─────────────────────────────────────────────────────────
export type Visite = { source: string; campagne: string | null; le: string }

/** Compte les visites par source et campagne ; une campagne hors liste fermée est comptée « inconnue », jamais inventée. */
export function compterVisites(visites: Visite[], campagnesPermises: readonly string[]): Record<string, { source: string; campagne: string; visites: number }> {
  const par: Record<string, { source: string; campagne: string; visites: number }> = {}
  for (const v of visites || []) {
    if (!v || typeof v.source !== 'string' || !v.source) continue
    const campagne = typeof v.campagne === 'string' && campagnesPermises.includes(v.campagne) ? v.campagne : 'inconnue'
    const cle = `${v.source}:${campagne}`
    par[cle] ??= { source: v.source, campagne, visites: 0 }
    par[cle].visites += 1
  }
  return par
}

// ── attribution à la ligne : toujours une ESTIMATION ─────────────────────────────────────────────────────────────
export type PostAttribuable = { id: string; ligne: string; canal: string; publie_le: string }
export type EvenementVente = { id: string; le: string }
export type Attribution = { evenementId: string; ligne: string | null; postId: string | null; certitude: 'estimation'; fenetre_attribution_h: number; ambigu: boolean; candidats: string[] }
export type AttributionParLigne = { ligne: string; total: number; ambigus: number; certitude: 'estimation'; fenetre_attribution_h: number }

/**
 * Rattache chaque vente (ou demande) au réseau et à la ligne par la seule fenêtre de temps : les posts publiés dans les
 * `fenetreH` heures avant l'événement. Plusieurs candidats = ambigu (la ligne du plus récent est proposée, l'ambiguïté est
 * dite) ; aucun candidat = non attribuée. Le résultat est toujours une `estimation`, jamais une certitude.
 */
export function attribuerALaLigne(evenements: EvenementVente[], posts: PostAttribuable[], fenetreH: number): { attributions: Attribution[]; parLigne: AttributionParLigne[] } | { ok: false; motif: string } {
  if (!Number.isInteger(fenetreH) || fenetreH < 1 || fenetreH > 168) return { ok: false, motif: 'fenêtre d\'attribution invalide (1 à 168 heures)' }
  const attributions: Attribution[] = []
  for (const e of evenements || []) {
    const t = Date.parse(e?.le)
    const candidats = Number.isFinite(t)
      ? (posts || []).filter((p) => { const d = Date.parse(p.publie_le); return Number.isFinite(d) && d <= t && t - d <= fenetreH * 3_600_000 }).sort((a, b) => Date.parse(b.publie_le) - Date.parse(a.publie_le))
      : []
    attributions.push({
      evenementId: e?.id, ligne: candidats[0]?.ligne ?? null, postId: candidats[0]?.id ?? null,
      certitude: 'estimation', fenetre_attribution_h: fenetreH, ambigu: candidats.length > 1, candidats: candidats.map((p) => p.id),
    })
  }
  const par = new Map<string, AttributionParLigne>()
  for (const a of attributions) {
    if (!a.ligne) continue
    const x = par.get(a.ligne) ?? { ligne: a.ligne, total: 0, ambigus: 0, certitude: 'estimation' as const, fenetre_attribution_h: fenetreH }
    x.total += 1
    if (a.ambigu) x.ambigus += 1
    par.set(a.ligne, x)
  }
  return { attributions, parLigne: [...par.values()].sort((a, b) => a.ligne.localeCompare(b.ligne)) }
}

/** Le libellé public d'une attribution : il dit « estimation », la fenêtre, et les cas ambigus. */
export function libelleAttribution(a: AttributionParLigne, noun: 'vente' | 'demande de maquette' = 'vente'): string {
  const amb = a.ambigus > 0 ? `, dont ${a.ambigus} ambiguë${a.ambigus > 1 ? 's' : ''}` : ''
  return `${a.total} ${noun}${a.total > 1 ? 's' : ''} (estimation) rattachée${a.total > 1 ? 's' : ''} à ${a.ligne} sur ${a.fenetre_attribution_h} h${amb}`
}

// ── le contrôle d'une formule publique de résultat ───────────────────────────────────────────────────────────────
const CERTITUDE_ABUSIVE = /(?<![\p{L}])(certain(?:e|es|ement)?|certitude|prouv(?:é|ée|és|ées)|à coup sûr|grâce à ce post|causé par ce post)(?![\p{L}])/iu

export async function verdictFormulePublique(
  libelle: string,
  source: string | null | undefined,
  estAttributionVente: boolean,
  deps: DepsLecteur = {},
): Promise<{ ok: true } | { ok: false; motif: string }> {
  try {
    if (typeof libelle !== 'string' || !libelle.trim()) return { ok: false, motif: 'libellé absent' }
    if (estAttributionVente) {
      if (!/estimation/i.test(libelle)) return { ok: false, motif: 'une vente attribuée à une ligne par fenêtre temporelle doit porter la mention « estimation »' }
      if (CERTITUDE_ABUSIVE.test(libelle)) return { ok: false, motif: 'une vente ne s\'affiche jamais comme attribuée avec certitude à un post' }
    }
    if (porteUneAffirmationChiffree(libelle)) {
      if (typeof source !== 'string' || !source.trim()) return { ok: false, motif: 'affirmation chiffrée sans source' }
      const r = await vraisemblance(libelle, {}, deps)
      if (r === null) return { ok: false, motif: 'Laya indisponible (jev absent ou en panne) : bloqué, renvoyé à Benj' }
      if (r.bloque || !Number.isFinite(r.p) || r.p < SEUIL_LAYA) return { ok: false, motif: `score de vérité insuffisant (p=${r.p} < ${SEUIL_LAYA})` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, motif: `erreur du contrôle, par prudence rien ne s'affiche : ${String((e as Error)?.message || e).slice(0, 160)}` }
  }
}
