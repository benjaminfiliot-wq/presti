// lib/contenu/accroches.ts — laboratoire des accroches (fiche 026-215, C12). Le type d'accroche se classe d'abord PAR
// RÈGLES en code ; `jev decide --provider laya` (decider) ne départage que les cas ambigus, sur un texte public
// anonymisé, et ne rédige jamais. `jev score --provider laya` (noter) classe une idée candidate avec source, récence et
// pertinence métier : le score alimente la file d'idées, jamais une publication ; garde-fous automatiques requis (30/09).
// Le texte d'un artisan ou d'un prospect n'est traité que localement, par règles : il ne part vers aucun moteur.
import { noter, decider, type DepsLecteur } from '@/lib/agents/llm'
import { sortiePermise } from '@/lib/agents/sortie'

export type Categorie = 'question' | 'chiffre' | 'avant_apres' | 'contraste'
export const CATEGORIES: Categorie[] = ['question', 'chiffre', 'avant_apres', 'contraste']

const RE_EMAIL = /[\w.+-]+(?:@|%40)[\w-]+(?:\.|%2e)[\w.-]+/i
const RE_TEL = /(?:\+33|0033|%2b33)[\s.\d%+-]{8,}|(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/i
const RE_PSEUDO = /(?:^|[\s(/])@[A-Za-z0-9._]{2,30}/

/** Vrai si le texte peut identifier une personne (adresse, téléphone, pseudo, prospect connu). */
export function nominatif(texte: string, prospects: string[] = []): boolean {
  const t = String(texte ?? '')
  const bas = t.toLowerCase()
  return RE_EMAIL.test(t) || RE_TEL.test(t) || RE_PSEUDO.test(t) || prospects.some((p) => p.trim().length >= 2 && bas.includes(p.toLowerCase()))
}

/** Élague adresses, téléphones, pseudos, liens, noms de prospects connus avant toute analyse facultative. */
export function anonymiser(texte: string, prospects: string[] = []): string {
  let t = String(texte ?? '')
  for (const p of prospects) if (p.trim().length >= 2) t = t.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[nom]')
  return t.replace(/https?:\/\/\S+/gi, '[lien]').replace(new RegExp(RE_EMAIL.source, 'gi'), '[adresse]').replace(new RegExp(RE_TEL.source, 'gi'), '[tel]')
    .replace(/(^|[\s(/])@[A-Za-z0-9._]{2,30}/g, '$1[pseudo]').replace(/\s{2,}/g, ' ').trim()
}

/** Catégories que les règles reconnaissent dans le texte (peut en rendre 0, 1 ou plusieurs). */
export function categoriesParRegles(texte: string): Categorie[] {
  const t = String(texte ?? '').toLowerCase()
  const trouvees: Categorie[] = []
  if (/\?\s*$|^(comment|pourquoi|et si|savez-vous|combien|quel|quelle|est-ce)\b/.test(t.trim())) trouvees.push('question')
  if (/\b\d+([.,]\d+)?\s?(%|€|euros?|h|heures?|minutes?|min|jours?|fois|devis|clients?)\b/.test(t)) trouvees.push('chiffre')
  if (/\b(avant|apr[eè]s)\b.*\b(avant|apr[eè]s)\b|\bde\b.+\b(à|a)\b.+\bsans\b/.test(t)) trouvees.push('avant_apres')
  if (/\b(mais|pourtant|contrairement|au lieu de|plut[oô]t que|et non)\b|\bvs\.?\b/.test(t)) trouvees.push('contraste')
  return trouvees
}

export type Classement = { categorie: Categorie | string }

/** Règles d'abord ; `jev decide` seulement si les règles n'ont pas tranché, sur texte anonymisé. Un texte nominatif ne
 *  quitte jamais le code : règles seules, sinon null (« non classé »). Rend UNIQUEMENT { categorie } ou null. */
export async function classerAccroche(texteAnonymise: string, deps: DepsLecteur = {}): Promise<Classement | null> {
  const texte = String(texteAnonymise ?? '')
  const parRegles = categoriesParRegles(texte)
  if (parRegles.length === 1) return { categorie: parRegles[0] }
  if (nominatif(texte)) return parRegles.length ? { categorie: parRegles[0] } : null
  const options = parRegles.length ? parRegles : CATEGORIES
  if (!(await sortiePermise()).permise) return parRegles.length ? { categorie: parRegles[0] } : null
  const r = await decider(anonymiser(texte), options, {}, deps)
  if (!r || !options.includes(r.choix as Categorie)) return parRegles.length ? { categorie: parRegles[0] } : null
  return { categorie: r.choix }
}

export type Recence = 'jour' | 'semaine' | 'mois'
export type Idee = {
  texte: string
  source: string
  recence: Recence
  metier?: string
  score?: { niveau: number; distribution: Record<string, number> }
  statut: 'note' | 'non_mesure'
  raison?: string
  alimenteFileIdees: boolean
  publicationAutomatique: false
}

/** Note une idée candidate. Source absente, récence invalide ou panne de Laya : « non mesuré », idée non versée à la
 *  file — jamais un score flatteur par défaut, jamais une publication. `deps.metier` porte la pertinence métier. */
export async function scoreIdee(texte: string, source: string, recence: Recence, deps: DepsLecteur & { metier?: string; prospects?: string[] } = {}): Promise<Idee> {
  const { metier, prospects, ...depsLecteur } = deps
  const base = { texte: String(texte ?? ''), source: String(source ?? ''), recence, metier, publicationAutomatique: false as const }
  if (!base.source.trim()) return { ...base, statut: 'non_mesure', raison: 'source_absente', alimenteFileIdees: false }
  if (!['jour', 'semaine', 'mois'].includes(recence)) return { ...base, statut: 'non_mesure', raison: 'recence_invalide', alimenteFileIdees: false }
  const consigne = `idée : ${anonymiser(base.texte, prospects || [])} | source : ${anonymiser(base.source, prospects || [])} | récence : ${recence} | métier : ${metier ?? 'non précisé'}`
  if (!(await sortiePermise()).permise) return { ...base, statut: 'non_mesure', raison: 'pause_generale', alimenteFileIdees: false }
  const score = await noter(consigne, {}, depsLecteur)
  if (!score) return { ...base, statut: 'non_mesure', raison: 'laya_indisponible', alimenteFileIdees: false }
  return { ...base, score, statut: 'note', alimenteFileIdees: true }
}
