// Fiche 026-184 (K4c) : ce que le calque lit des propriétés de la carte. Tout ce qui vient d'un agent ou d'un réglage (noms, plaques,
// bulles, rôles, modèles, libellés d'étape) sort d'ici en CHAÎNE, et le calque ne le pose jamais que par `textContent` : un
// `<img src=x onerror=alert(1)>` s'affiche tel quel. Une valeur qui n'est pas du texte est ignorée, jamais convertie en balisage.
import { EQUIPAGE, SALLES, SALLE_RESERVEE } from '@/lib/pilotage/equipage'
import type { ActeurStation, MotifActeur, PropsCarte } from '../types'

export const MOTIFS: Record<MotifActeur, string> = { porte: 'à la porte', tache: 'au travail', reunion: 'en réunion', pause: 'en pause', panne: 'en panne' }
const MOTIFS_CONNUS = Object.keys(MOTIFS)
const PLAQUES: Record<string, string> = Object.fromEntries([...SALLES.map((s) => [s.cle, s.plaque]), [SALLE_RESERVEE.cle, SALLE_RESERVEE.plaque]])

const objet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const texte = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null)

/** Un personnage tel que le calque le décrit : l'acteur du moteur plus ce que l'info-bulle et le miroir disent de lui. */
export type Perso = ActeurStation & { libelle: string; role: string; modele: string }
export type BulleLue = { id: number; agent: string; texte: string }
export type Etape = { cle: string; libelle: string; jour: number }

const reglage = (p: PropsCarte): Record<string, unknown> => (objet(p.reglages?.reglages) ? p.reglages.reglages : {})

/** La clé du thème réglé (« station » tant que rien n'est réglé). */
export const cleTheme = (p: PropsCarte): string => texte(reglage(p).theme) ?? 'station'
/** La taille des plaques : 12 px au moins, jamais en dessous. */
export const taillePlaques = (p: PropsCarte): number => {
  const a = reglage(p).affichage
  const t = objet(a) ? a.taille_plaques : null
  return t === 'grande' ? 14 : 12
}

/** La plaque d'une salle : le réglage, sinon le nom de la salle (SALLES), sinon le texte du thème. */
export function plaqueDe(p: PropsCarte, cle: string, parDefaut: string): string {
  const s = reglage(p).salles
  const r = objet(s) && objet(s[cle]) ? texte((s[cle] as Record<string, unknown>).plaque) : null
  return r ?? PLAQUES[cle] ?? parDefaut
}

/** Le nom d'un agent : le réglage, sinon son libellé. */
export function nomDe(p: PropsCarte, nom: string, libelle: string): string {
  const e = reglage(p).equipage
  const r = objet(e) && objet(e[nom]) ? texte((e[nom] as Record<string, unknown>).nom) : null
  return r ?? libelle
}

/** Les personnages : ceux du pont quand le moteur en a posé, sinon ceux de `positions()` servis dans l'équipage (un agent sans salle n'est pas dessiné). */
export function personnages(p: PropsCarte, duPont: readonly ActeurStation[]): Perso[] {
  const agents = p.equipage?.valeur?.agents ?? []
  const parNom = new Map(agents.map((a) => [a.nom, a]))
  const base: ActeurStation[] = duPont.length
    ? [...duPont]
    : agents.flatMap((a): ActeurStation[] => {
      const salle = texte(a.position?.salle) ?? null
      if (!salle) return []
      const motif = MOTIFS_CONNUS.includes(a.position?.motif) ? (a.position.motif as MotifActeur) : null
      const couleur = objet(reglage(p).equipage) && objet((reglage(p).equipage as Record<string, unknown>)[a.nom]) ? texte(((reglage(p).equipage as Record<string, unknown>)[a.nom] as Record<string, unknown>).couleur) : null
      return [{ nom: a.nom, couleur: couleur ?? '#8fa0b0', avatar: a.nom, salle, motif, bulle: null }]
    })
  return base.filter((a) => a.salle).map((a) => {
    const ag = parNom.get(a.nom)
    // Le nom d'un agent est son identité (EQUIPAGE, le même descriptif que celui de la route), jamais une donnée servie : le décor et ce qui
    // s'écrit par-dessus ne changent pas quand les chiffres et les textes de la lecture changent.
    return { ...a, libelle: EQUIPAGE[a.nom]?.libelle ?? a.nom, role: texte(ag?.role) ?? '', modele: texte(ag?.modele?.texte) ?? 'sans IA' }
  })
}

/** La dernière bulle de chaque agent (elle reste jusqu'à l'événement suivant : règle de vérité de 026-181) : le texte servi, tel quel. */
export function bullesLues(p: PropsCarte): BulleLue[] {
  const dernieres = new Map<string, BulleLue>()
  for (const b of p.bulles ?? []) {
    const t = texte(b?.texte), a = texte(b?.agent)
    if (!t || !a) continue
    const id = typeof b.id === 'number' ? b.id : 0
    const avant = dernieres.get(a)
    if (!avant || id >= avant.id) dernieres.set(a, { id, agent: a, texte: t })
  }
  return [...dernieres.values()].sort((x, y) => y.id - x.id)
}

/** Les étapes du tapis servies (clé, libellé, compteur du jour) ; rien si la source est absente. */
export function etapesLues(p: PropsCarte): Etape[] | null {
  const e = p.tapis?.valeur?.etapes
  if (!Array.isArray(e)) return null
  return e.flatMap((x): Etape[] => {
    if (!objet(x)) return []
    const cle = texte(x.cle), jour = x.jour
    return cle && typeof jour === 'number' && Number.isFinite(jour) ? [{ cle, libelle: texte(x.libelle) ?? cle, jour }] : []
  })
}
