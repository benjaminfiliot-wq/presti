// scripts/fixtures/contenu/temoin/lib/contenu/accroches.ts — TÉMOIN de `lib/contenu/accroches.ts` (026-215, partie
// « veille »). `jev decide` (decider) départage des catégories, `jev score` (noter) alimente la file d'idées : ni
// l'un ni l'autre ne rédige de texte ni ne publie.
import { noter, decider, type DepsLecteur } from '@/lib/agents/llm'
import { pausePermise } from './_noyau'

export type Idee = { texte: string; source: string; recence: 'jour' | 'semaine' | 'mois'; score?: { niveau: number; distribution: Record<string, number> }; alimenteFileIdees: true; publicationAutomatique: false }

export async function scoreIdee(texte: string, source: string, recence: Idee['recence'], deps: DepsLecteur = {}): Promise<Idee> {
  // La pause générale se lit AVANT l'appel au modèle (décision du 30/09, confirmée le 04/10) : sous pause, l'idée entre sans score.
  if (!(await pausePermise())) return { texte, source, recence, alimenteFileIdees: true, publicationAutomatique: false }
  const score = await noter(texte, {}, deps)
  return { texte, source, recence, score: score ?? undefined, alimenteFileIdees: true, publicationAutomatique: false }
}

const CATEGORIES = ['question', 'chiffre', 'avant_apres', 'contraste']
export async function classerAccroche(texteAnonymise: string, deps: DepsLecteur = {}): Promise<{ categorie: string } | null> {
  if (!(await pausePermise())) return null
  const r = await decider(texteAnonymise, CATEGORIES, {}, deps)
  return r ? { categorie: r.choix } : null
}
