// scripts/fixtures/contenu/temoin/lib/contenu/_noyau.ts — TÉMOIN (fiche 026-204, Claude Code). Mirroir minimal de ce
// que `lib/contenu/lignes.ts`, `accord.ts`, `metaPublier.ts` etc. (026-207, 026-212, 026-217…) devront faire : ce
// fichier n'est JAMAIS copié en production, il sert seulement à prouver que contenu-qa.mjs sait distinguer un
// comportement correct d'un comportement sabordé (--temoin puis --preuve-echecs). Les deux invariants transversaux
// de 026-204 : (1) toute affirmation chiffrée passe par `vraisemblance()` (jev noul) — le VRAI `lib/agents/llm.ts`
// (026-041/026-043, déjà PASS), jamais une réimplémentation ; (2) la pause générale se lit AVANT chaque appel au modèle et
// chaque sortie, par la VRAIE porte fail-closed `sortiePermise()` (lib/agents/sortie.ts).
// Mise à jour du 04/10/2026 (décision « tout est automatique », D-0410-1 : audit C §5.3/§5.4) : le témoin n'exige plus
// d'accord individuel pour publier (les contrôles automatiques le remplacent : pause, STOP/opposition, coût nul exact, chiffres
// vérifiés, ligne, canal, plafond) ; `accordValide` reste exporté pour le seul chemin TikTok, qui l'exige encore (TT-2).
import { vraisemblance, type DepsLecteur } from '@/lib/agents/llm'
import { sortiePermise } from '@/lib/agents/sortie'

/** Les dépendances d'un contrôle de publication : celles du lecteur, plus l'opposition connue et le coût déclaré. */
export type DepsControle = DepsLecteur & { coutEuros?: unknown; opposition?: unknown }

/** La pause générale, lue par la porte fail-closed : faux sous pause, dans le doute ou si la lecture lève. */
export async function pausePermise(): Promise<boolean> {
  return (await sortiePermise()).permise
}

/** STOP ou opposition connue, puis coût inconnu ou non nul : le refus se fait AVANT tout appel (modèle, Graph). */
export function gardesDeCout(deps: DepsControle): string | null {
  if (deps.opposition === true) return 'STOP ou opposition : aucune publication'
  if (deps.coutEuros !== 0) return 'coût inconnu ou positif : publication refusée'
  return null
}

export type DecisionAccord = {
  statut: 'ouverte' | 'tranchee' | 'defaut_applique'
  choix?: string
  cible: string
  texte_version?: string
  /** ISO : échéance de la décision. */
  echeance?: string
  /** ISO : date à laquelle la décision a été tranchée. */
  le?: string
} | null | undefined

export type VerdictAccord = { ok: true } | { ok: false; motif: string }

/** Le SEUL chemin qui autorise une publication : une décision tranchée, choix accorder, cible exacte, même version
 *  de texte que celle sur laquelle l'accord a été donné. `defaut_applique` (échéance passée → option par défaut,
 *  toujours « refuser », 0098) et `ouverte` sont refusés au même titre qu'une décision absente. */
export function accordValide(decision: DecisionAccord, cibleAttendue: string, texteVersion?: string, maintenantMs: number = Date.now()): VerdictAccord {
  if (!decision) return { ok: false, motif: 'accord individuel absent' }
  if (decision.statut !== 'tranchee') return { ok: false, motif: `décision ${decision.statut} (attendu tranchee ; une échéance passée applique le défaut « refuser »)` }
  if (decision.choix !== 'accorder') return { ok: false, motif: `choix « ${decision.choix} » (attendu accorder)` }
  if (decision.cible !== cibleAttendue) return { ok: false, motif: `l'accord vise « ${decision.cible} », pas « ${cibleAttendue} » (un accord pour A n'autorise jamais B)` }
  if (texteVersion !== undefined && decision.texte_version !== undefined && decision.texte_version !== texteVersion) {
    return { ok: false, motif: 'le texte ou le média a changé depuis l\'accord : il est caduc' }
  }
  // 05/10/2026 (D-0510-A1) : échéance passée ou illisible, accord de plus de 7 jours : refusés (comme lib/contenu/lignes.ts).
  if (decision.echeance !== undefined) {
    const e = Date.parse(decision.echeance)
    if (!Number.isFinite(e) || e <= maintenantMs) return { ok: false, motif: "l'échéance de la décision est passée ou illisible" }
  }
  if (decision.le !== undefined) {
    const l = Date.parse(decision.le)
    if (!Number.isFinite(l) || l > maintenantMs || maintenantMs - l > 7 * 24 * 3600 * 1000) return { ok: false, motif: "l'accord date de plus de 7 jours ou d'une date illisible : il est caduc" }
  }
  return { ok: true }
}

export type VerdictChiffre = { ok: true; p: number } | { ok: false; motif: string }

/** Toute affirmation chiffrée ou toute promesse : seuil 0,5, source obligatoire, panne ou absence = blocage — jamais
 *  un passage automatique (026-204, contrat transversal). `deps` porte `env.JEV_CHEMIN` (voir lib/contenu/lib de
 *  commun.mjs) : ce noyau ne fabrique jamais son propre appel à jev, il réutilise le module déjà jugé. */
export async function verdictChiffre(texte: string, source: string | null | undefined, deps: DepsLecteur = {}): Promise<VerdictChiffre> {
  // La pause se lit avant CHAQUE appel au modèle (pas seulement au début d'un lot) : fail-closed.
  if (!(await pausePermise())) return { ok: false, motif: 'pause générale : aucun appel au modèle' }
  if (typeof source !== 'string' || !source.trim()) return { ok: false, motif: 'affirmation chiffrée sans source' }
  const r = await vraisemblance(texte, {}, deps)
  if (r === null) return { ok: false, motif: 'Laya indisponible (jev absent ou en panne) : bloqué, renvoyé à Benj' }
  if (r.bloque) return { ok: false, motif: `score de vérité insuffisant (p=${r.p} < 0,5)` }
  return { ok: true, p: r.p }
}

/** Une affirmation chiffrée se détecte par un chiffre dans le texte visible (heuristique volontairement large : mieux
 *  vaut un contrôle de trop qu'une promesse oubliée). */
export function porteUneAffirmationChiffree(texte: string): boolean {
  return /\d/.test(String(texte || ''))
}
