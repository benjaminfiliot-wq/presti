export type SnapshotCode = {
  version: 1
  genere_le: string
  file: string[]
  en_cours: { id: string; agent: string; depuis: string }[]
  fait: number
  refusees: number
  derniers: { id: string; verdict: string; date: string; executant: string; ligne: string }[]
  prs: { numero: number; titre: string; depuis: string; brouillon: boolean }[] | null
  prs_raison?: string
  attention: string[]
}

const objet = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x)
const cles = (x: Record<string, unknown>, attendues: string[], facultatives: string[] = []) =>
  attendues.every((k) => Object.hasOwn(x, k)) && Object.keys(x).every((k) => attendues.includes(k) || facultatives.includes(k))
const texte = (x: unknown): x is string => typeof x === 'string' && x.length <= 200
const entier = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0
const liste = (x: unknown, max: number, valide: (v: unknown) => boolean) => Array.isArray(x) && x.length <= max && x.every(valide)

export function validerSnapshot(x: unknown): SnapshotCode | null {
  if (!objet(x) || !cles(x, ['version', 'genere_le', 'file', 'en_cours', 'fait', 'refusees', 'derniers', 'prs', 'attention'], ['prs_raison'])) return null
  if (x.version !== 1 || !texte(x.genere_le) || !entier(x.fait) || !entier(x.refusees)) return null
  if (!liste(x.file, 50, texte) || !liste(x.attention, 7, texte)) return null
  if (!liste(x.en_cours, 50, (v) => objet(v) && cles(v, ['id', 'agent', 'depuis']) && texte(v.id) && texte(v.agent) && texte(v.depuis))) return null
  if (!liste(x.derniers, 50, (v) => objet(v) && cles(v, ['id', 'verdict', 'date', 'executant', 'ligne']) &&
    texte(v.id) && texte(v.verdict) && texte(v.date) && texte(v.executant) && texte(v.ligne))) return null
  if (x.prs !== null && !liste(x.prs, 50, (v) => objet(v) && cles(v, ['numero', 'titre', 'depuis', 'brouillon']) &&
    entier(v.numero) && texte(v.titre) && texte(v.depuis) && typeof v.brouillon === 'boolean')) return null
  if (x.prs_raison !== undefined && !texte(x.prs_raison)) return null
  return x as SnapshotCode
}

export function resumeCode(s: SnapshotCode | null, publie_le: string | null, maintenant: Date = new Date()) {
  const age = publie_le ? maintenant.getTime() - Date.parse(publie_le) : Number.POSITIVE_INFINITY
  const perime = s !== null && age > 2 * 3_600_000
  const heures = Math.round(age / 3_600_000)
  return {
    file: s?.file ?? [],
    enCours: s?.en_cours ?? [],
    verrousVieux: (s?.en_cours ?? []).filter((v) => maintenant.getTime() - Date.parse(v.depuis) > 60 * 60_000).map((v) => v.id),
    derniers: s?.derniers ?? [],
    prs: s?.prs ?? null,
    attention: s?.attention ?? [],
    perime,
    message: !s ? 'Aucun relevé du poste reçu.' : perime ? `Le poste ne publie plus depuis ${heures} h : PC éteint ?` : null,
    publie_le,
  }
}
