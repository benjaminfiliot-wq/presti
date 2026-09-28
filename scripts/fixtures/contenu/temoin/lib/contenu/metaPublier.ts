// scripts/fixtures/contenu/temoin/lib/contenu/metaPublier.ts — TÉMOIN de `lib/contenu/metaPublier.ts` (026-212,
// partie « meta »). Un accord de ligne n'autorise JAMAIS une publication Meta : chaque Reel ou vidéo Facebook exige
// son propre accord individuel, même si sa ligne est accordée (contrat transversal 026-204). Idempotence par ID de
// post : un post déjà publié ne relance jamais l'appel Graph.
import { accordValide, verdictChiffre, porteUneAffirmationChiffree, type DecisionAccord } from './_noyau'
import type { DepsLecteur } from '@/lib/agents/llm'

export type Variante = { id: string; texte: string; source?: string | null; bucket: string; cle: string }
export type ContexteMeta = { bucketAttendu: string; decision: DecisionAccord; ligneAccordee: boolean; dejaPublie?: boolean }
export type ReseauGraph = {
  creerConteneur: (m: { bucket: string; cle: string }) => Promise<{ id: string } | { erreur: string; status: number }>
  publier: (conteneurId: string) => Promise<{ url: string } | { erreur: string; status: number }>
}
export type ResultatMeta = { ok: true; url?: string; idempotent?: boolean } | { ok: false; motif: string }

export async function publierMeta(variante: Variante, ctx: ContexteMeta, reseau: ReseauGraph, deps: DepsLecteur = {}): Promise<ResultatMeta> {
  if (variante.bucket !== ctx.bucketAttendu) return { ok: false, motif: 'média situé hors du bucket privé attendu' }
  if (porteUneAffirmationChiffree(variante.texte)) {
    const v = await verdictChiffre(variante.texte, variante.source, deps)
    if (!v.ok) return { ok: false, motif: v.motif }
  }
  // L'accord de LIGNE (ctx.ligneAccordee) n'entre jamais dans ce calcul : lu ici, jamais utilisé comme permission.
  const a = accordValide(ctx.decision, variante.id, variante.texte)
  if (!a.ok) return { ok: false, motif: `accord individuel requis : ${a.motif}` }
  if (ctx.dejaPublie) return { ok: true, idempotent: true }
  const conteneur = await reseau.creerConteneur({ bucket: variante.bucket, cle: variante.cle })
  if ('erreur' in conteneur) return { ok: false, motif: `Graph (conteneur) : ${conteneur.erreur} (${conteneur.status})` }
  const p = await reseau.publier(conteneur.id)
  if ('erreur' in p) return { ok: false, motif: `Graph (publication) : ${p.erreur} (${p.status})` }
  return { ok: true, url: p.url }
}
