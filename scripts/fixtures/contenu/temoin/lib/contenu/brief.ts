// scripts/fixtures/contenu/temoin/lib/contenu/brief.ts — TÉMOIN de `lib/contenu/brief.ts` (026-214, partie
// « boucle »). Une nouvelle proposition issue de la boucle repart TOUJOURS par le chemin normal : nouveau contrôle
// `jev noul` des promesses, nouvel accord individuel de Benj. Ce fichier ne fait qu'exposer la forme attendue —
// aucun champ de ce type ne permet de publier directement.
export type Brief = { id: string; ligne: string; motif: string; inspireDe?: string; statut: 'proposition' }
export function nouveauBrief(id: string, ligne: string, motif: string, inspireDe?: string): Brief {
  return { id, ligne, motif, inspireDe, statut: 'proposition' }
}
