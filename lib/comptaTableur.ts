// Le tableur de l'artisan : ses lignes validées présentées comme dans Excel (une feuille par vue,
// tri par colonne, filtres, ligne de totaux), et modifiables cellule par cellule.
//
// Module pur : des lignes en entrée, des lignes ou des tableaux en sortie, jamais de mutation de
// l'entrée. Les montants restent en centimes entiers d'un bout à l'autre : une somme au centime près
// ne passe jamais par un flottant. Aucun régime de TVA n'est déduit (voir docs/agents/compta-artisan.md).
import { lireDate, lireMontantCentimes, type Ligne, type Sens, type Statut } from './comptaImport.ts'

export type ColonneJournal = 'date' | 'libelle' | 'tiers' | 'sens' | 'categorie' | 'statut' | 'recette' | 'depense'
export type Tri = { colonne: ColonneJournal; ordre: 'asc' | 'desc' }
export type Filtres = { texte?: string; sens?: Sens | ''; statut?: Statut | ''; mois?: string }
export type Totaux = { nombre: number; recettes: number; depenses: number; solde: number }
export type RecapMois = { mois: string; nombre: number; recettes: number; depenses: number; benefice: number; cumul: number; impayes: number }
export type RecapCategorie = { categorie: string; nombre: number; montant: number; part: number | null }
export type RecapTiers = { tiers: string; nombre: number; recettes: number; impayes: number }

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const STATUTS: Record<Statut, string> = { paye: 'Payé', impaye: 'Impayé', non_renseigne: 'Non renseigné' }
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

export const libelleStatut = (s: Statut) => STATUTS[s]
export const libelleSens = (s: Sens) => (s === 'recette' ? 'Recette' : 'Dépense')
/** « 2026-03-15 » → « 15/03/2026 ». */
export const dateFr = (iso: string) => iso.split('-').reverse().join('/')
/** « 2026-03 » → « mars 2026 ». */
export const moisFr = (cle: string) => `${MOIS[Number(cle.slice(5, 7)) - 1] ?? cle} ${cle.slice(0, 4)}`

/** Les lignes qui passent TOUS les filtres. Le texte cherche dans libellé, tiers et catégorie, sans accents. */
export function filtrer(lignes: readonly Ligne[], f: Filtres): Ligne[] {
  const t = sansAccents(f.texte ?? '')
  return lignes.filter((l) => (!f.sens || l.sens === f.sens)
    && (!f.statut || l.statut === f.statut)
    && (!f.mois || l.date.startsWith(f.mois))
    && (!t || [l.libelle, l.tiers, l.categorie].some((v) => sansAccents(v).includes(t))))
}

function valeur(l: Ligne, c: ColonneJournal): string | number {
  if (c === 'recette') return l.sens === 'recette' ? l.montant : -1
  if (c === 'depense') return l.sens === 'depense' ? l.montant : -1
  if (c === 'sens') return libelleSens(l.sens)
  if (c === 'statut') return libelleStatut(l.statut)
  return c === 'date' ? l.date : sansAccents(l[c])
}

/** Tri stable : à égalité, l'ordre d'origine (date, puis numéro de ligne) est gardé. */
export function trier(lignes: readonly Ligne[], tri: Tri): Ligne[] {
  const signe = tri.ordre === 'asc' ? 1 : -1
  return lignes.map((l, i) => ({ l, i })).sort((a, b) => {
    const va = valeur(a.l, tri.colonne)
    const vb = valeur(b.l, tri.colonne)
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr')
    return c !== 0 ? c * signe : a.i - b.i
  }).map((x) => x.l)
}

export function totaux(lignes: readonly Ligne[]): Totaux {
  let recettes = 0
  let depenses = 0
  for (const l of lignes) l.sens === 'recette' ? (recettes += l.montant) : (depenses += l.montant)
  return { nombre: lignes.length, recettes, depenses, solde: recettes - depenses }
}

/** Une ligne par mois, du plus ancien au plus récent, avec le bénéfice cumulé depuis le premier mois. */
export function recapMensuel(lignes: readonly Ligne[]): RecapMois[] {
  const mois = new Map<string, Omit<RecapMois, 'mois' | 'benefice' | 'cumul'>>()
  for (const l of lignes) {
    const m = mois.get(l.date.slice(0, 7)) ?? { nombre: 0, recettes: 0, depenses: 0, impayes: 0 }
    m.nombre++
    if (l.sens === 'recette') { m.recettes += l.montant; if (l.statut === 'impaye') m.impayes += l.montant } else m.depenses += l.montant
    mois.set(l.date.slice(0, 7), m)
  }
  let cumul = 0
  return [...mois.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([cle, m]) => {
    cumul += m.recettes - m.depenses
    return { mois: cle, ...m, benefice: m.recettes - m.depenses, cumul }
  })
}

/** Les dépenses par catégorie, la plus lourde d'abord. La part est en dixièmes de pour cent arrondis. */
export function recapCategories(lignes: readonly Ligne[]): RecapCategorie[] {
  const cat = new Map<string, { nombre: number; montant: number }>()
  let total = 0
  for (const l of lignes) {
    if (l.sens !== 'depense') continue
    const c = cat.get(l.categorie) ?? { nombre: 0, montant: 0 }
    c.nombre++; c.montant += l.montant; total += l.montant
    cat.set(l.categorie, c)
  }
  return [...cat.entries()].map(([categorie, c]) => ({ categorie, ...c, part: total > 0 ? Math.round((c.montant * 1000) / total) / 10 : null }))
    .sort((a, b) => b.montant - a.montant || a.categorie.localeCompare(b.categorie, 'fr'))
}

/** Les clients (recettes seulement), le plus gros d'abord, avec ce qu'il reste à vérifier en impayé. */
export function recapClients(lignes: readonly Ligne[]): RecapTiers[] {
  const t = new Map<string, Omit<RecapTiers, 'tiers'>>()
  for (const l of lignes) {
    if (l.sens !== 'recette') continue
    const c = t.get(l.tiers) ?? { nombre: 0, recettes: 0, impayes: 0 }
    c.nombre++; c.recettes += l.montant
    if (l.statut === 'impaye') c.impayes += l.montant
    t.set(l.tiers, c)
  }
  return [...t.entries()].map(([tiers, c]) => ({ tiers, ...c })).sort((a, b) => b.recettes - a.recettes || a.tiers.localeCompare(b.tiers, 'fr'))
}

export const moisPresents = (lignes: readonly Ligne[]) => [...new Set(lignes.map((l) => l.date.slice(0, 7)))].sort().reverse()

// — Modifications, comme dans une cellule Excel. Chaque fonction rend une NOUVELLE liste. —

export type Modification = { champ: 'libelle' | 'tiers' | 'categorie'; valeur: string } | { champ: 'statut'; valeur: Statut } | { champ: 'sens'; valeur: Sens }

/** Modifie la ligne `index` (index dans la liste complète). Un texte vide n'efface pas tiers ni catégorie. */
export function modifier(lignes: readonly Ligne[], index: number, m: Modification): Ligne[] {
  if (index < 0 || index >= lignes.length) return [...lignes]
  return lignes.map((l, i) => {
    if (i !== index) return l
    if (m.champ === 'statut' || m.champ === 'sens') return { ...l, [m.champ]: m.valeur }
    const v = m.valeur.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200)
    if (!v && m.champ !== 'libelle') return l
    return { ...l, [m.champ]: v }
  })
}

export function supprimer(lignes: readonly Ligne[], index: number): Ligne[] {
  return lignes.filter((_, i) => i !== index)
}

export type Saisie = { date: string; libelle: string; tiers: string; sens: Sens; montant: string; categorie: string; statut: Statut }

/** Une ligne saisie à la main. Mêmes règles que l'import : date lisible, montant positif au centime. */
export function ajouter(lignes: readonly Ligne[], s: Saisie): { lignes: Ligne[]; erreur: string | null } {
  const date = lireDate(s.date)
  if (!date) return { lignes: [...lignes], erreur: 'Date illisible : écrivez-la comme 15/03/2026.' }
  const montant = lireMontantCentimes(s.montant)
  if (montant === null || montant <= 0) return { lignes: [...lignes], erreur: 'Montant illisible : écrivez un nombre positif, par exemple 120,50.' }
  const propre = (v: string) => v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200)
  const tiers = propre(s.tiers)
  if (!tiers) return { lignes: [...lignes], erreur: s.sens === 'recette' ? 'Indiquez le client.' : 'Indiquez le fournisseur.' }
  const numero = lignes.reduce((n, l) => Math.max(n, l.ligne), 0) + 1
  return {
    lignes: [...lignes, { ligne: numero, date, libelle: propre(s.libelle), tiers, sens: s.sens, montant, categorie: propre(s.categorie) || 'Sans catégorie', statut: s.statut, source: 'Saisie' }],
    erreur: null,
  }
}
