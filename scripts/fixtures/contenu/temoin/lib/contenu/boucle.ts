// scripts/fixtures/contenu/temoin/lib/contenu/boucle.ts — TÉMOIN de `lib/contenu/boucle.ts` (026-214, partie
// « boucle »). BO-1 : un échantillon H+1 seul ne justifie jamais une conclusion forte. BO-2 : `jev score` (noter)
// classe, il ne publie JAMAIS — `recommander` ne rend qu'un statut à trois issues plus « insuffisant », jamais un
// objet de publication ; republier exige toujours un `brief.ts` (nouvelle proposition) puis un nouvel accord.
import { noter, type DepsLecteur } from '@/lib/agents/llm'
import { pausePermise } from './_noyau'

export type MesureFenetre = { fenetre: 'H+1' | 'H+24' | 'J+7'; disponible: boolean; valeur?: number | null }
export type Candidat = { id: string; texte: string; mesures: MesureFenetre[]; provenance: string }
export type Recommandation = { id: string; statut: 'refaire' | 'suspendre' | 'tendance' | 'insuffisant'; motif: string; scoreJev?: { niveau: number; distribution: Record<string, number> } }

export function classable(mesures: MesureFenetre[]): boolean {
  const dispo = new Set(mesures.filter((m) => m.disponible).map((m) => m.fenetre))
  return dispo.has('H+24') || dispo.has('J+7')
}

export async function recommander(candidat: Candidat, deps: DepsLecteur = {}): Promise<Recommandation> {
  if (!classable(candidat.mesures)) return { id: candidat.id, statut: 'insuffisant', motif: 'mesures incomplètes (H+1 seul) : pas de conclusion forte sur un petit échantillon' }
  // Décision du 30/09 (confirmée le 04/10) : la pause générale se lit AVANT l'appel au modèle ; sous pause, aucun score.
  if (!(await pausePermise())) return { id: candidat.id, statut: 'insuffisant', motif: 'pause générale : aucun appel au modèle' }
  const score = await noter(candidat.texte, {}, deps)
  const niveau = score?.niveau ?? 0
  // Le score de Laya seul ne tranche jamais : sans vue exploitable (signal « inconnu »), au mieux une tendance (comme lib/contenu/boucle.ts).
  const vues = (candidat.mesures.find((m) => m.disponible && m.fenetre === 'J+7') ?? candidat.mesures.find((m) => m.disponible && m.fenetre === 'H+24'))?.valeur
  const statut = typeof vues !== 'number' || !Number.isFinite(vues) ? 'tendance' : niveau >= 4 ? 'refaire' : niveau <= 2 ? 'suspendre' : 'tendance'
  return { id: candidat.id, statut, motif: `score Laya ${score ? `${niveau}/5` : 'indisponible'} : suggestion de classement seulement, un nouveau brief puis un nouvel accord de Benj restent requis`, scoreJev: score ?? undefined }
}
