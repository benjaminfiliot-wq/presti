// scripts/fixtures/contenu/temoin/lib/contenu/lignes.ts — TÉMOIN de `lib/contenu/lignes.ts` (026-207, partie
// « lignes »). Non copié en production ; prouve que contenu-qa.mjs (LN-1 à LN-7) distingue un verdict correct d'un
// verdict saboté. Décision du 30/09 confirmée par Benj le 04/10 (D-0410-1) : plus d'accord individuel, les contrôles
// automatiques le remplacent — pause générale lue d'abord (fail-closed), STOP/opposition, coût nul exact, ligne, canal,
// plafond du jour, chaque texte visible chiffré contrôlé (la pause est relue avant CHAQUE appel au modèle). Un post
// `crieur_posts` en `brouillon_publora` n'est jamais publié par ce chemin (le Crieur dépose et programme lui-même).
import { gardesDeCout, pausePermise, verdictChiffre, porteUneAffirmationChiffree, type DecisionAccord, type DepsControle } from './_noyau'

/** Seuil de vérité de Laya (jev noul) : le contrat de la série, 0,5 (comme lib/contenu/lignes.ts). */
export const SEUIL_LAYA = 0.5

export type Post = {
  id: string
  ligne: string
  canal: string
  texte: string
  legende?: string
  source?: string | null
  /** Ancienne carte d'accord : lue par le chemin TikTok seulement, jamais exigée ici. */
  decision?: DecisionAccord
  origine?: 'contenu' | 'crieur_posts'
  crieurStatut?: string
}
export type Ligne = { id: string; suspendue?: boolean; canaux: string[]; quotaJour?: number; publieAujourdhui?: number }
export type Verdict = { decision: 'publier' } | { decision: 'refuser'; motif: string }

export async function verdictPublication(post: Post, ligne: Ligne | null, deps: DepsControle = {}): Promise<Verdict> {
  if (!(await pausePermise())) return { decision: 'refuser', motif: 'pause générale : aucune publication' }
  const garde = gardesDeCout(deps)
  if (garde) return { decision: 'refuser', motif: garde }
  if (post.origine === 'crieur_posts' && post.crieurStatut === 'brouillon_publora') {
    return { decision: 'refuser', motif: 'un post du Crieur se programme par sa propre route, jamais par ce chemin' }
  }
  if (!ligne || ligne.suspendue) return { decision: 'refuser', motif: 'ligne suspendue' }
  if (!ligne.canaux.includes(post.canal)) return { decision: 'refuser', motif: `canal « ${post.canal} » non permis pour ${ligne.id}` }
  if (ligne.quotaJour !== undefined && (ligne.publieAujourdhui || 0) >= ligne.quotaJour) return { decision: 'refuser', motif: 'plafond du jour atteint' }
  for (const visible of [post.texte, post.legende]) {
    if (typeof visible === 'string' && porteUneAffirmationChiffree(visible)) {
      const v = await verdictChiffre(visible, post.source, deps)
      if (!v.ok) return { decision: 'refuser', motif: v.motif }
    }
  }
  return { decision: 'publier' }
}
