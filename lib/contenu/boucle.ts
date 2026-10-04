// lib/contenu/boucle.ts — C11 (fiche 026-214) : la boucle d'apprentissage et le score de republication.
//
// Entrée : les mesures de chaque publication (lib/contenu/mesure.ts). Sortie : une RECOMMANDATION (refaire, suspendre, suivre
// une tendance) ou « insuffisant » — jamais une publication. Règles :
//  - on ne classe que des publications dont la source et la fenêtre de mesure sont complètes : un échantillon H+1 seul ne
//    justifie jamais de suspendre une ligne ni de refaire un contenu ;
//  - `jev score --provider laya` (lib/agents/llm.ts `noter`) classe sur une échelle ORDONNÉE de 1 à 5 ; il ne rédige rien et
//    n'autorise rien. Sa distribution et sa provenance sont conservées ; sa panne se voit (`scoreJev: null`) ;
//  - les signaux déterministes (vues sur la meilleure fenêtre) gardent la PRIORITÉ : un score de Laya seul ne suffit jamais à
//    refaire ni à suspendre, il ne peut que nuancer ;
//  - refaire crée une PROPOSITION (lib/contenu/brief.ts) qui repart par un nouveau contrôle `jev noul` des promesses et un
//    nouveau passage des garde-fous automatiques (30/09). Ce module ne publie rien et ne parle à personne.
// Fonctions pures, sauf l'appel local à Laya. Aucun texte de prospect, aucune donnée nominative : seulement des contenus de Presti.
import { noter, type DepsLecteur } from '@/lib/agents/llm'
import { sortiePermise } from '@/lib/agents/sortie'

export type Fenetre = 'H+1' | 'H+24' | 'J+7'
export type MesureFenetre = { fenetre: Fenetre; disponible: boolean; valeur?: number | null; metrique?: string }
export type Candidat = { id: string; texte: string; mesures: MesureFenetre[]; provenance: string; ligne?: string }
export type StatutReco = 'refaire' | 'suspendre' | 'tendance' | 'insuffisant'
export type ScoreJev = { niveau: number; distribution: Record<string, number>; provenance: 'jev score --provider laya' }
export type Recommandation = { id: string; statut: StatutReco; motif: string; signal: 'fort' | 'faible' | 'neutre' | 'inconnu'; fenetre?: Fenetre; scoreJev: ScoreJev | null }

/** Seuils explicites, valeurs de DÉPART à réviser avec les premières mesures réelles (aucune n'est un fait de marché). */
export const SEUILS = Object.freeze({
  /** Vues à la meilleure fenêtre au-delà desquelles le signal est « fort ». */
  vuesFort: 1000,
  /** Vues en dessous desquelles le signal est « faible » (à J+7 ou H+24 complet, jamais à H+1). */
  vuesFaible: 200,
  /** Niveau Jev (1 à 5) à partir duquel le score est jugé haut / bas. */
  niveauHaut: 4,
  niveauBas: 2,
  /** Publications minimales par accroche pour en comparer deux. */
  publicationsComparaison: 6,
  /** Écart relatif des médianes en dessous duquel on ne tranche pas. */
  ecartIndecis: 0.15,
})

const meilleure = (m: MesureFenetre[]): MesureFenetre | null => {
  const dispo = m.filter((x) => x && x.disponible)
  return dispo.find((x) => x.fenetre === 'J+7') ?? dispo.find((x) => x.fenetre === 'H+24') ?? null
}

/** Classable = au moins une fenêtre H+24 ou J+7 disponible. Un échantillon H+1 seul ne l'est jamais. */
export function classable(mesures: MesureFenetre[]): boolean {
  return Array.isArray(mesures) && meilleure(mesures) !== null
}

/** Le signal déterministe : les vues de la meilleure fenêtre contre les seuils. Vues absentes : « inconnu ». */
export function signalDeterministe(mesures: MesureFenetre[]): { signal: Recommandation['signal']; fenetre?: Fenetre } {
  const m = meilleure(mesures || [])
  if (!m) return { signal: 'inconnu' }
  const v = m.valeur
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return { signal: 'inconnu', fenetre: m.fenetre }
  if (v >= SEUILS.vuesFort) return { signal: 'fort', fenetre: m.fenetre }
  if (v < SEUILS.vuesFaible) return { signal: 'faible', fenetre: m.fenetre }
  return { signal: 'neutre', fenetre: m.fenetre }
}

/** Combine le signal déterministe (prioritaire) et le score Jev (nuance) : voir l'en-tête du fichier. */
export function combiner(signal: Recommandation['signal'], niveau: number | null): { statut: StatutReco; raison: string } {
  const haut = niveau !== null && niveau >= SEUILS.niveauHaut
  const bas = niveau !== null && niveau <= SEUILS.niveauBas
  if (signal === 'inconnu') {
    // Le score seul ne tranche jamais : au mieux une tendance à suivre.
    return niveau === null
      ? { statut: 'insuffisant', raison: 'aucune vue exploitable et Laya indisponible' }
      : { statut: 'tendance', raison: 'vues inconnues : le score de Laya seul ne suffit pas à refaire ni à suspendre' }
  }
  if (signal === 'fort') return !bas
    ? { statut: 'refaire', raison: 'vues élevées, score de Laya compatible' }
    : { statut: 'tendance', raison: 'vues élevées mais score de Laya bas : à suivre avant de refaire' }
  if (signal === 'faible') return !haut
    ? { statut: 'suspendre', raison: 'vues faibles sur une fenêtre complète, score de Laya compatible' }
    : { statut: 'tendance', raison: 'vues faibles mais score de Laya haut : à suivre avant de suspendre' }
  return { statut: 'tendance', raison: 'vues intermédiaires : une tendance à suivre, pas de décision' }
}

function consignePourLaya(c: Candidat, m: MesureFenetre | null): string {
  const vues = m && typeof m.valeur === 'number' ? `${m.valeur} vues à ${m.fenetre}` : 'vues inconnues'
  return `Potentiel de republication (échelle 1 à 5, 5 = à refaire) d'un contenu de Presti. Texte : « ${c.texte} ». Mesure : ${vues}. Provenance : ${c.provenance}.`
}

/** Recommande pour UN candidat. Ne publie rien : le résultat ne porte ni URL ni statut « publié ». */
export async function recommander(candidat: Candidat, deps: DepsLecteur = {}): Promise<Recommandation> {
  const base = { id: candidat?.id, scoreJev: null as ScoreJev | null }
  try {
    if (!candidat || typeof candidat.id !== 'string' || typeof candidat.texte !== 'string' || !candidat.texte.trim()) {
      return { id: String(candidat?.id ?? ''), statut: 'insuffisant', motif: 'candidat mal formé', signal: 'inconnu', scoreJev: null }
    }
    if (!classable(candidat.mesures)) return { ...base, statut: 'insuffisant', motif: 'mesures incomplètes (H+1 seul ou source absente) : pas de conclusion forte sur un petit échantillon', signal: 'inconnu' }
    if (typeof candidat.provenance !== 'string' || !candidat.provenance.trim()) return { ...base, statut: 'insuffisant', motif: 'provenance des mesures absente : pas de classement', signal: 'inconnu' }
    const { signal, fenetre } = signalDeterministe(candidat.mesures)
    if (!(await sortiePermise()).permise) return { ...base, statut: 'insuffisant', motif: 'pause générale : aucun appel au modèle', signal: 'inconnu' }
    const retour = await noter(consignePourLaya(candidat, meilleure(candidat.mesures)), {}, deps)
    const niveau = retour && Number.isFinite(retour.niveau) ? retour.niveau : null
    const scoreJev: ScoreJev | null = retour && niveau !== null ? { niveau, distribution: retour.distribution ?? {}, provenance: 'jev score --provider laya' } : null
    const { statut, raison } = combiner(signal, niveau)
    const jev = niveau !== null ? `score Laya ${niveau}/5` : 'score Laya indisponible'
    return { ...base, statut, signal, fenetre, scoreJev, motif: `${raison} (${jev}) : suggestion de classement seulement, un nouveau brief et un nouveau contrôle automatique des promesses et garde-fous restent requis` }
  } catch (e) {
    return { ...base, id: String(candidat?.id ?? ''), statut: 'insuffisant', signal: 'inconnu', motif: `erreur du classement, aucune conclusion : ${String((e as Error)?.message || e).slice(0, 120)}` }
  }
}

// ── comparer deux accroches approuvées d'une même ligne ──────────────────────────────────────────────────────────
export type Accroche = { id: string; ligne: string; origine: 'approuvee' | 'concurrent' | string; vues: number[] }
export type Comparaison =
  | { ok: false; motif: string }
  | { ok: true; gagnant: string | null; ecartRelatif: number; medianes: Record<string, number>; incertitude: 'forte' | 'moyenne'; note: string }

const mediane = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }

/** Compare deux accroches approuvées d'une MÊME ligne après au moins six publications chacune ; jamais les mots d'un concurrent. */
export function comparerAccroches(a: Accroche, b: Accroche): Comparaison {
  if (!a || !b) return { ok: false, motif: 'deux accroches attendues' }
  if (a.origine !== 'approuvee' || b.origine !== 'approuvee') return { ok: false, motif: 'seules des accroches approuvées de Presti se comparent (jamais les mots d\'un concurrent)' }
  if (a.ligne !== b.ligne) return { ok: false, motif: 'les deux accroches doivent relever de la même ligne' }
  const propres = (x: Accroche) => (Array.isArray(x.vues) ? x.vues : []).filter((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)
  const va = propres(a), vb = propres(b)
  if (va.length < SEUILS.publicationsComparaison || vb.length < SEUILS.publicationsComparaison) return { ok: false, motif: `au moins ${SEUILS.publicationsComparaison} publications mesurées par accroche (${va.length} et ${vb.length})` }
  const ma = mediane(va), mb = mediane(vb)
  const haut = Math.max(ma, mb)
  const ecartRelatif = haut === 0 ? 0 : (ma - mb) / haut
  const tranche = Math.abs(ecartRelatif) >= SEUILS.ecartIndecis
  const petit = Math.min(va.length, vb.length) < 12
  return {
    ok: true,
    gagnant: tranche ? (ecartRelatif > 0 ? a.id : b.id) : null,
    ecartRelatif,
    medianes: { [a.id]: ma, [b.id]: mb },
    incertitude: !tranche || petit ? 'forte' : 'moyenne',
    note: `${tranche ? 'écart net' : 'écart trop faible pour trancher'} sur ${Math.min(va.length, vb.length)} publications ou plus : une comparaison de médianes, pas une preuve de cause`,
  }
}

// ── les trois lignes du digest et de la réunion ──────────────────────────────────────────────────────────────────
/** Exactement trois lignes : « refaire », « suspendre », « tendance ». Aucun agent n'en ajoute une quatrième ni une sixième. */
export function lignesDigest(recos: Recommandation[]): [string, string, string] {
  const noms = (s: StatutReco) => (recos || []).filter((r) => r && r.statut === s).map((r) => r.id)
  const ligne = (titre: string, s: StatutReco) => { const ids = noms(s); return `${titre} : ${ids.length ? ids.join(', ') : 'rien à signaler'}` }
  return [ligne('Refaire', 'refaire'), ligne('Suspendre', 'suspendre'), ligne('Tendance', 'tendance')]
}
