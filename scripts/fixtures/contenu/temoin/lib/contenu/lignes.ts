// scripts/fixtures/contenu/temoin/lib/contenu/lignes.ts — TÉMOIN de `lib/contenu/lignes.ts` (026-207, partie
// « lignes »). Non copié en production ; prouve que contenu-qa.mjs (LN-1, LN-2) distingue un verdict correct d'un
// verdict saboté. Décision du chef d'entreprise du 27/09 reprise ici : R24 n'est plus « ouverte », c'est permanente ;
// un post `crieur_posts` en `brouillon_publora` n'est jamais publié par ce chemin (son accord se donne dans Publora).
import { accordValide, verdictChiffre, porteUneAffirmationChiffree, type DecisionAccord } from './_noyau'
import type { DepsLecteur } from '@/lib/agents/llm'

export type Post = {
  id: string
  ligne: string
  canal: string
  texte: string
  source?: string | null
  decision?: DecisionAccord
  origine?: 'contenu' | 'crieur_posts'
  crieurStatut?: string
}
export type Ligne = { id: string; suspendue?: boolean; canaux: string[]; quotaJour?: number; publieAujourdhui?: number }
export type Verdict = { decision: 'publier' } | { decision: 'refuser'; motif: string }

export async function verdictPublication(post: Post, ligne: Ligne | null, deps: DepsLecteur = {}): Promise<Verdict> {
  if (post.origine === 'crieur_posts' && post.crieurStatut === 'brouillon_publora') {
    return { decision: 'refuser', motif: 'l\'accord d\'un post du Crieur se donne dans Publora' }
  }
  if (!ligne || ligne.suspendue) return { decision: 'refuser', motif: 'ligne suspendue' }
  if (!ligne.canaux.includes(post.canal)) return { decision: 'refuser', motif: `canal « ${post.canal} » non permis pour ${ligne.id}` }
  if (ligne.quotaJour !== undefined && (ligne.publieAujourdhui || 0) >= ligne.quotaJour) return { decision: 'refuser', motif: 'plafond du jour atteint' }
  if (porteUneAffirmationChiffree(post.texte)) {
    const v = await verdictChiffre(post.texte, post.source, deps)
    if (!v.ok) return { decision: 'refuser', motif: v.motif }
  }
  const a = accordValide(post.decision, post.id, post.texte)
  if (!a.ok) return { decision: 'refuser', motif: a.motif }
  return { decision: 'publier' }
}
