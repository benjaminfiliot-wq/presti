// scripts/fixtures/contenu/temoin/lib/contenu/metaPublier.ts — TÉMOIN de `lib/contenu/metaPublier.ts` (026-212,
// partie « meta »). Décision du 30/09 confirmée par Benj le 04/10 (D-0410-1) : aucun accord individuel ; les contrôles
// automatiques le remplacent — pause générale lue d'abord ET avant chaque appel Graph (fail-closed), STOP/opposition, coût
// nul exact, média dans le bucket privé attendu, chaque texte visible chiffré contrôlé. L'accord de LIGNE n'est jamais une
// permission. Idempotence par ID de post : un post déjà publié ne relance jamais l'appel Graph.
import { gardesDeCout, pausePermise, verdictChiffre, porteUneAffirmationChiffree, type DecisionAccord, type DepsControle } from './_noyau'

export type Variante = { id: string; texte: string; legende?: string; source?: string | null; bucket: string; cle: string }
export type ContexteMeta = { bucketAttendu: string; decision?: DecisionAccord; ligneAccordee?: boolean; dejaPublie?: boolean }
export type ReseauGraph = {
  creerConteneur: (m: { bucket: string; cle: string }) => Promise<{ id: string } | { erreur: string; status: number }>
  publier: (conteneurId: string) => Promise<{ url: string } | { erreur: string; status: number }>
}
export type ResultatMeta = { ok: true; url?: string; idempotent?: boolean } | { ok: false; motif: string }

const refus = (motif: string): { ok: false; motif: string } => ({ ok: false, motif })

/** Tout ce qui se contrôle AVANT d'appeler Graph. */
export async function controlerAvantPublication(variante: Variante, ctx: ContexteMeta, deps: DepsControle = {}): Promise<{ ok: true } | { ok: false; motif: string }> {
  if (!(await pausePermise())) return refus('pause générale : aucune publication')
  const garde = gardesDeCout(deps)
  if (garde) return refus(garde)
  if (variante.bucket !== ctx.bucketAttendu) return refus('média situé hors du bucket privé attendu')
  for (const visible of [variante.texte, variante.legende]) {
    if (typeof visible === 'string' && porteUneAffirmationChiffree(visible)) {
      const v = await verdictChiffre(visible, variante.source, deps)
      if (!v.ok) return refus(v.motif)
    }
  }
  // Aucun accord individuel (ctx.decision et ctx.ligneAccordee sont lus, jamais utilisés comme permission).
  return { ok: true }
}

export async function publierMeta(variante: Variante, ctx: ContexteMeta, reseau: ReseauGraph, deps: DepsControle = {}): Promise<ResultatMeta> {
  const controle = await controlerAvantPublication(variante, ctx, deps)
  if (!controle.ok) return controle
  if (ctx.dejaPublie) return { ok: true, idempotent: true }
  if (!(await pausePermise())) return refus('pause générale : aucun appel Graph')
  const conteneur = await reseau.creerConteneur({ bucket: variante.bucket, cle: variante.cle })
  if ('erreur' in conteneur) return { ok: false, motif: `Graph (conteneur) : ${conteneur.erreur} (${conteneur.status})` }
  // La pause peut tomber pendant la fabrication du conteneur : elle se relit avant de publier.
  if (!(await pausePermise())) return refus('pause générale : aucune publication Graph')
  const p = await reseau.publier(conteneur.id)
  if ('erreur' in p) return { ok: false, motif: `Graph (publication) : ${p.erreur} (${p.status})` }
  return { ok: true, url: p.url }
}
