type Evenement = { id?: number; le?: string | null; agent?: string | null; type?: string; objet?: string | null; resume?: string | null }
export function masquer(texte: string | null | undefined): string {
  if (!texte) return ''
  return texte
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[adresse]')
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>]+|\b[a-z0-9][a-z0-9.-]+\.(?:fr|com|net|org|invalid)(?:\/[^\s<>]*)?/gi, '[lien]')
    .replace(/(?<!\w)(?:(?:\+33|0033|0)[\s.()-]*[1-9](?:[\s.()-]*\d){8}|[1-9](?:[\s.()-]*\d){8})(?!\w)/g, '[numéro]')
    .replace(/\b(?:M\.|Mme\.?|Monsieur|Madame)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?/g, '[nom]')
    .slice(0, 200)
}
export const PASTILLES: Record<string, string> = { chef: 'CHEF', facteur: 'FACTEUR', standardiste: 'STANDARD', redacteur: 'PLUME' }
const tries = (evenements: readonly Evenement[] | null) => [...(evenements ?? [])].filter(x => x && x.type !== 'battement').sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
export function bulles(evenements: readonly Evenement[] | null, options: { agent?: string } = {}) {
  const resultat: { id: number; le: string | null; agent: string; pastille: string; type: string; texte: string; lignes?: string[]; cible?: string | null; cibleLibelle?: string | null }[] = []
  const vus = new Set<number>()
  for (const x of tries(evenements)) {
    const id = x.id ?? 0, agent = x.agent ?? ''
    if (vus.has(id) || (options.agent && options.agent !== agent)) continue
    vus.add(id)
    const texte = masquer(x.resume)
    const precedent = resultat.at(-1)
    if (x.type === 'reunion_compte_rendu' && precedent?.type === x.type) { precedent.lignes = [...(precedent.lignes ?? [precedent.texte]), texte]; continue }
    const cible = x.type === 'consigne' && x.objet?.startsWith('agent:') ? x.objet.slice(6) : null
    const bulle: (typeof resultat)[number] = { id, le: x.le ?? null, agent, pastille: x.type === 'consigne' ? 'BENJ' : PASTILLES[agent] ?? agent.toLocaleUpperCase('fr-FR'), type: x.type ?? '', texte }
    if (x.type === 'consigne') { bulle.cible = cible; bulle.cibleLibelle = cible ? PASTILLES[cible] ?? cible.toLocaleUpperCase('fr-FR') : null }
    resultat.push(bulle)
  }
  return resultat
}
export function derniereBulle(evenements: readonly Evenement[] | null): Record<string, string> {
  const resultat: Record<string, string> = {}
  for (const x of tries(evenements)) if (x.agent) resultat[x.agent] = masquer(x.resume)
  return resultat
}
export const TYPES_BANDEAU = ['commande_payee', 'pack_paye', 'reponse_oui'] as const
export function bandeau(evenements: readonly Evenement[] | null) {
  return tries(evenements).filter(x => TYPES_BANDEAU.includes(x.type as typeof TYPES_BANDEAU[number])).sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 10).map(x => ({ id: x.id ?? 0, type: x.type ?? '', texte: masquer(x.resume) }))
}
