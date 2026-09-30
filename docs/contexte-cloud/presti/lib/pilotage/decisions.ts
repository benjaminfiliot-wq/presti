import { euros } from '@/lib/direction/fraicheur'

export const MAX_CARTES = 5

export type OptionDecision = { cle: string; libelle: string; recommandee?: boolean }
export type Decision = {
  id: string
  question: string
  contexte: string
  options: OptionDecision[]
  option_defaut: string
  montant_cents: number | null
  portee: 'aucune' | 'argent' | 'artisan' | 'securite'
  echeance: string | null
  cree_le: string
  creee_par?: string
}

export function carteValide(d: Decision): { ok: true } | { ok: false; raison: string } {
  if (!Array.isArray(d.options) || d.options.length < 2 || d.options.length > 7) return { ok: false, raison: 'Il faut entre 2 et 7 options.' }
  const cles = new Set<string>()
  let recommandees = 0
  for (const option of d.options) {
    if (typeof option.cle !== 'string' || !option.cle.trim()) return { ok: false, raison: 'Clé vide.' }
    if (cles.has(option.cle)) return { ok: false, raison: 'Clés en double.' }
    cles.add(option.cle)
    if (typeof option.libelle !== 'string' || option.libelle.length < 1 || option.libelle.length > 80 || !option.libelle.trim()) return { ok: false, raison: 'Libellé invalide.' }
    if (option.recommandee) recommandees++
  }
  if (!cles.has(d.option_defaut)) return { ok: false, raison: 'Option par défaut inconnue.' }
  if (recommandees > 1) return { ok: false, raison: 'Plusieurs options recommandées.' }
  return { ok: true }
}

function horodatage(s: string | null): number {
  if (!s) return Number.POSITIVE_INFINITY
  const n = Date.parse(s)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

export function trierDecisions<T extends Decision>(ds: readonly T[]): T[] {
  return ds.map((d, i) => ({ d, i })).sort((a, b) => {
    const montantA = Number.isFinite(a.d.montant_cents) ? (a.d.montant_cents ?? 0) : 0
    const montantB = Number.isFinite(b.d.montant_cents) ? (b.d.montant_cents ?? 0) : 0
    return montantB - montantA || horodatage(a.d.echeance) - horodatage(b.d.echeance) || horodatage(a.d.cree_le) - horodatage(b.d.cree_le) || a.i - b.i
  }).map(x => x.d)
}

export function porteeExigee(d: Decision): 'argent' | 'artisan' | 'securite' | null {
  if (d.portee !== 'aucune') return d.portee
  return d.montant_cents !== null && Number.isFinite(d.montant_cents) && d.montant_cents > 0 ? 'argent' : null
}

export function choixValide(d: Decision, choix: string): boolean {
  return typeof choix === 'string' && choix.length > 0 && d.options.some(o => o.cle === choix)
}

export function libelleDefaut(d: Decision, maintenant: Date): string {
  if (!d.echeance) return 'Pas d’échéance : rien ne se fait sans vous'
  const libelle = d.options.find(o => o.cle === d.option_defaut)?.libelle ?? ''
  const minutes = Math.floor((Date.parse(d.echeance) - maintenant.getTime()) / 60_000)
  if (!Number.isFinite(minutes) || minutes <= 0) return `Par défaut appliqué sous peu : ${libelle}`
  if (minutes >= 60) return `Par défaut dans ${Math.floor(minutes / 60)} h : ${libelle}`
  return `Par défaut dans ${minutes} min : ${libelle}`
}

export function cartesDecisions(ds: readonly Decision[], epingle?: string, maintenant = new Date()) {
  const valides = ds.filter(d => carteValide(d).ok)
  const triees = trierDecisions(valides)
  const choisies = epingle && triees.some(d => d.id === epingle)
    ? [triees.find(d => d.id === epingle)!, ...triees.filter(d => d.id !== epingle)].slice(0, MAX_CARTES)
    : triees.slice(0, MAX_CARTES)
  return {
    cartes: choisies.map(d => {
      const defaut = d.options.find(o => o.cle === d.option_defaut)!
      return {
        id: d.id, question: d.question, contexte: d.contexte,
        montant: d.montant_cents === null || !Number.isFinite(d.montant_cents) ? null : euros(d.montant_cents / 100),
        options: d.options, defaut: { cle: defaut.cle, libelle: defaut.libelle },
        libelleDefaut: libelleDefaut(d, maintenant), portee: porteeExigee(d),
        echeance: d.echeance, epinglee: d.id === epingle,
      }
    }),
    autres: valides.length - choisies.length,
    invalides: ds.length - valides.length,
  }
}
