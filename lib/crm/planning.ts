// CRM — le PLANNING de la semaine (plan plans/crm-idees-twenty-1810.md, n°6) : 7 jours en colonnes, une ligne par membre de l'équipe
// et par véhicule, les chantiers en barres (début → fin prévue), les rendez-vous et rappels en épingles, et les CONFLITS (un membre
// sur deux chantiers qui se chevauchent, un véhicule réservé deux fois, un chantier ouvert sans date). Module pur, sans base ni réseau :
// rejoué par scripts/crm-lot3-qa.mjs. Les dates sont des jours de Paris (AAAA-MM-JJ), comparés en texte (ordre lexicographique = ordre
// chronologique) : aucune heure d'été ne peut décaler un chantier d'un jour.
//
// Rien n'est inventé : un chantier sans date de début n'a pas de barre (il est listé « sans date ») ; sans fin prévue, sa barre dure
// un jour, et le planning le dit.
import { ajouterJours, ecartJours } from './rappels.ts'

export type ChantierP = { id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null; vehicule_id: string | null; equipe: readonly string[]; client?: string | null }
export type RappelP = { id: string; type: string; echeance: string; heure: string | null; texte: string | null; fait_le: string | null; cible: { libelle: string; href: string | null } }
export type Barre = { chantierId: string; titre: string; statut: string; debut: number; fin: number; avant: boolean; apres: boolean; sansFin: boolean; conflit: boolean }
export type LignePlanning = { type: 'membre' | 'vehicule' | 'chantiers'; id: string; nom: string; barres: Barre[] }
export type Conflit = { type: 'membre' | 'vehicule'; id: string; nom: string; chantiers: [string, string]; titres: [string, string]; du: string; au: string }
export type Planning = {
  lundi: string
  jours: string[]
  lignes: LignePlanning[]
  /** Les rappels ouverts de la semaine, par jour (index 0 = lundi). */
  epingles: RappelP[][]
  conflits: Conflit[]
  sansDate: { id: string; titre: string }[]
}

const OUVERT = (s: string) => s !== 'termine' && s !== 'annule'
/** Le lundi de la semaine d'un jour. */
export function lundiDe(jour: string): string {
  const jds = new Date(Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10))).getUTCDay()
  return ajouterJours(jour, -((jds + 6) % 7))
}
/** La période d'un chantier : du début à la fin prévue (ou au début seul sans fin) ; null sans début. */
export function periode(c: Pick<ChantierP, 'date_debut' | 'date_fin_prevue'>): { du: string; au: string; sansFin: boolean } | null {
  if (!c.date_debut) return null
  const au = c.date_fin_prevue && c.date_fin_prevue >= c.date_debut ? c.date_fin_prevue : c.date_debut
  return { du: c.date_debut, au, sansFin: !c.date_fin_prevue }
}
const chevauche = (a: { du: string; au: string }, b: { du: string; au: string }) => a.du <= b.au && b.du <= a.au

/** Les conflits sur une fenêtre de jours : deux chantiers ouverts d'un même membre (ou d'un même véhicule) qui se chevauchent. */
export function conflits(chantiers: readonly ChantierP[], noms: { membres: ReadonlyMap<string, string>; vehicules: ReadonlyMap<string, string> }, fenetre: { du: string; au: string }): Conflit[] {
  const ouverts = chantiers.filter((c) => OUVERT(c.statut)).map((c) => ({ c, p: periode(c) })).filter((x): x is { c: ChantierP; p: NonNullable<ReturnType<typeof periode>> } => !!x.p && chevauche(x.p, fenetre))
  const sortie: Conflit[] = []
  const examiner = (type: 'membre' | 'vehicule', id: string, nom: string, liste: typeof ouverts) => {
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j]
      if (!chevauche(a.p, b.p)) continue
      const du = [a.p.du, b.p.du, fenetre.du].sort().at(-1)!, au = [a.p.au, b.p.au, fenetre.au].sort()[0]
      const [x, y] = [a, b].sort((m, n) => m.c.id.localeCompare(n.c.id))
      sortie.push({ type, id, nom, chantiers: [x.c.id, y.c.id], titres: [x.c.titre, y.c.titre], du, au })
    }
  }
  for (const [id, nom] of noms.membres) examiner('membre', id, nom, ouverts.filter((x) => x.c.equipe.includes(id)))
  for (const [id, nom] of noms.vehicules) examiner('vehicule', id, nom, ouverts.filter((x) => x.c.vehicule_id === id))
  return sortie.sort((a, b) => a.du.localeCompare(b.du) || a.type.localeCompare(b.type) || a.nom.localeCompare(b.nom, 'fr'))
}

export function planning(p: {
  jour: string
  chantiers: readonly ChantierP[]
  membres: readonly { id: string; nom: string; actif: boolean }[]
  vehicules: readonly { id: string; nom: string; actif: boolean }[]
  rappels: readonly RappelP[]
}): Planning {
  const lundi = lundiDe(p.jour)
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i))
  const fenetre = { du: jours[0], au: jours[6] }
  const membres = p.membres.filter((m) => m.actif || p.chantiers.some((c) => OUVERT(c.statut) && c.equipe.includes(m.id)))
  const vehicules = p.vehicules.filter((v) => v.actif || p.chantiers.some((c) => OUVERT(c.statut) && c.vehicule_id === v.id))
  const cf = conflits(p.chantiers, { membres: new Map(membres.map((m) => [m.id, m.nom])), vehicules: new Map(vehicules.map((v) => [v.id, v.nom])) }, fenetre)
  const enConflit = (ligne: string, chantierId: string) => cf.some((c) => c.id === ligne && c.chantiers.includes(chantierId))
  const barre = (c: ChantierP, ligne: string): Barre | null => {
    const pe = periode(c)
    if (!pe || !OUVERT(c.statut) || !chevauche(pe, fenetre)) return null
    const debut = Math.max(0, ecartJours(lundi, pe.du)), fin = Math.min(6, ecartJours(lundi, pe.au))
    return { chantierId: c.id, titre: c.titre, statut: c.statut, debut, fin, avant: pe.du < fenetre.du, apres: pe.au > fenetre.au, sansFin: pe.sansFin, conflit: enConflit(ligne, c.id) }
  }
  const trier = (b: Barre[]) => b.sort((x, y) => x.debut - y.debut || x.titre.localeCompare(y.titre, 'fr'))
  const lignes: LignePlanning[] = [
    ...membres.map((m) => ({ type: 'membre' as const, id: m.id, nom: m.nom, barres: trier(p.chantiers.filter((c) => c.equipe.includes(m.id)).map((c) => barre(c, m.id)).filter((x): x is Barre => !!x)) })),
    ...vehicules.map((v) => ({ type: 'vehicule' as const, id: v.id, nom: v.nom, barres: trier(p.chantiers.filter((c) => c.vehicule_id === v.id).map((c) => barre(c, v.id)).filter((x): x is Barre => !!x)) })),
  ]
  // Les chantiers de la semaine qui n'ont ni équipe ni véhicule : une ligne à part, pour qu'aucun ne disparaisse du planning.
  const orphelins = p.chantiers.filter((c) => !c.equipe.length && !c.vehicule_id).map((c) => barre(c, 'chantiers')).filter((x): x is Barre => !!x)
  if (orphelins.length) lignes.push({ type: 'chantiers', id: 'chantiers', nom: 'Sans équipe ni véhicule', barres: trier(orphelins) })
  const epingles = jours.map((j) => p.rappels.filter((r) => !r.fait_le && r.echeance === j).sort((a, b) => String(a.heure ?? '').localeCompare(String(b.heure ?? '')) || a.id.localeCompare(b.id)))
  const sansDate = p.chantiers.filter((c) => OUVERT(c.statut) && !c.date_debut).map((c) => ({ id: c.id, titre: c.titre })).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'))
  return { lundi, jours, lignes, epingles, conflits: cf, sansDate }
}

/** Décaler un chantier de n jours : le début et la fin prévue bougent ensemble (la durée est gardée). */
export function decaler(c: Pick<ChantierP, 'date_debut' | 'date_fin_prevue'>, n: number): { date_debut: string; date_fin_prevue: string | null } | null {
  if (!c.date_debut || !Number.isInteger(n) || n === 0 || Math.abs(n) > 366) return null
  return { date_debut: ajouterJours(c.date_debut, n), date_fin_prevue: c.date_fin_prevue ? ajouterJours(c.date_fin_prevue, n) : null }
}
