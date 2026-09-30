type Ligne = { etape?: string; jour?: number; taux_pass?: number | null; mois?: number | null }
const nombre = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0
export const ETAPES = [['trouve', 'TROUVÉ'], ['verifie', 'VÉRIFIÉ'], ['maquette', 'MAQUETTE'], ['contacte', 'CONTACTÉ'], ['repondu', 'RÉPONDU'], ['oui', 'OUI'], ['paye', 'PAYÉ'], ['en_ligne', 'EN LIGNE']] as const
export const LIGNES = {
  contenu: [['idee', 'IDÉE'], ['texte', 'TEXTE'], ['visuel', 'VISUEL'], ['juge', 'JUGÉ'], ['programmee', 'PROGRAMMÉE'], ['publiee', 'PUBLIÉE']],
  sites: [['payee', 'PAYÉE'], ['generee', 'GÉNÉRÉE'], ['validee', 'VALIDÉE'], ['en_ligne', 'EN LIGNE']],
  packs: [['paye', 'PAYÉ'], ['dossier', 'DOSSIER'], ['fabrique', 'FABRIQUÉ'], ['livre', 'LIVRÉ']],
} as const
function construire(entree: readonly Ligne[] | null | undefined, etapes: readonly (readonly [string, string])[]) {
  const lignes = entree ?? []
  return { etapes: etapes.map(([cle, libelle]) => { const ligne = lignes.find(x => x.etape === cle); return { cle, libelle, jour: nombre(ligne?.jour), source: ligne ? 'mesuree' : 'absente' } }) }
}
export function tapis(entree: readonly Ligne[] | null) {
  const base = construire(entree, ETAPES)
  const rejet = entree?.find(x => x.etape === 'rejet')
  return { ...base, rejet: { nombre: nombre(rejet?.jour), tauxPass: rejet?.taux_pass ?? null } }
}
export function lignes(entree: Partial<Record<keyof typeof LIGNES, readonly Ligne[] | null>> | null) {
  return { contenu: construire(entree?.contenu, LIGNES.contenu), sites: construire(entree?.sites, LIGNES.sites), packs: construire(entree?.packs, LIGNES.packs) }
}
type Releve = { etapes?: { cle: string; jour: number }[] } | null
export function mouvements(avant: Releve, apres: Releve): { etape: string; carres: number }[] | { remiseAZero: true; carres: [] } {
  if (!avant || !apres) return []
  const anciennes = new Map((avant.etapes ?? []).map(x => [x.cle, x.jour]))
  const variations = (apres.etapes ?? []).map(x => ({ etape: x.cle, carres: x.jour - (anciennes.get(x.cle) ?? 0) }))
  if (variations.some(x => x.carres < 0)) return { remiseAZero: true, carres: [] }
  return variations.filter(x => x.carres > 0)
}
