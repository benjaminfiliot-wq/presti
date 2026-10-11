// Du thème à la carte du moteur (fiche 026-180, K2) : les données validées d'un theme.json, la disposition choisie par Benj et l'écran
// (bureau ou portrait) deviennent la carte au format de Claw3D (claw3d/schema.ts), enrichie de ce que le moteur de Presti y ajoute :
// les portes, les postes, les plaques, les teintes, les coursives et le tapis. Aucune donnée n'est inventée ici : tout vient du thème.
import { validerDisposition } from '@/lib/pilotage/disposition'
import type { Disposition } from '@/lib/pilotage/disposition'
import { CLES_SALLE } from '@/lib/pilotage/equipage'
import type { Coursives, Emplacement, Palette, Point, Tapis, Theme } from '@/lib/pilotage/theme'
import type { OfficeMap, OfficeVector, OfficeZone } from '../claw3d/schema'
import type { VueMarche } from '../grille/grille'

/** Un emplacement du thème, avec la salle que la disposition y pose (null : l'emplacement réservé, ou un emplacement sans salle). */
export type EmplacementCarte = Emplacement & { salle: string | null }

export type CarteMoteur = OfficeMap & {
  /** La clé du thème dont la carte vient (« station », « vaisseau », « essai ») : la scène en tire l'adresse de l'atlas (urlsTheme). */
  cle: string
  /** Les emplacements de la vue retenue (bureau ou portrait), chacun avec sa salle. */
  emplacements: EmplacementCarte[]
  /** La porte et le poste de chaque salle, par clé de salle ; l'emplacement réservé n'a ni l'un ni l'autre. */
  portes: Record<string, Point>
  postes: Record<string, Point>
  plaques: { salle: string | null; x: number; y: number; texte: string }[]
  /** La teinte de chaque emplacement, par clé d'emplacement. */
  teintes: Record<string, string>
  coursives: Coursives
  tapis: Tapis
  palette: Palette
}

const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/
const estObjet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

/**
 * Ce que les réglages enregistrés (`salles` : une salle → emplacement, plaque, teinte ; schéma de lib/pilotage/reglages.ts) disent de la
 * carte : la disposition (salle → emplacement, plaques) et les teintes par salle. Une disposition que le thème d'aujourd'hui refuse
 * (réglée sur un ancien thème) n'est pas appliquée : la carte garde l'ordre par défaut du thème, elle ne reste jamais vide.
 */
export function dispositionDe(theme: Theme, reglages: unknown): { disposition: Disposition | null; teintes: Record<string, string> } {
  const salles = estObjet(reglages) && estObjet(reglages.salles) ? reglages.salles : null
  if (!salles) return { disposition: null, teintes: {} }
  const placement: Record<string, string> = Object.fromEntries(theme.defauts.map((d) => [d.salle, d.emplacement]))
  const plaques: Record<string, string> = {}
  const teintes: Record<string, string> = {}
  for (const [salle, v] of Object.entries(salles)) {
    if (!CLES_SALLE.includes(salle) || !estObjet(v)) continue
    if (typeof v.emplacement === 'string') placement[salle] = v.emplacement
    if (typeof v.plaque === 'string') plaques[salle] = v.plaque
    if (typeof v.teinte === 'string' && RE_COULEUR.test(v.teinte)) teintes[salle] = v.teinte
  }
  const disposition: Disposition = { salles: placement, plaques }
  return validerDisposition(theme, disposition).ok ? { disposition, teintes } : { disposition: null, teintes: {} }
}

/** La vue du thème qui compte : celle du bureau ou du portrait, avec les coursives et le tapis de la disposition quand elle en porte. */
export function vueDuTheme(theme: Theme, disposition?: Disposition | null, portrait = false): Required<VueMarche> {
  const p = portrait ? theme.portrait : undefined
  return p
    ? { grille: p.grille, emplacements: p.emplacements, coursives: disposition?.portrait?.coursives ?? p.coursives, tapis: disposition?.tapis ?? theme.tapis }
    : { grille: theme.grille, emplacements: theme.emplacements, coursives: disposition?.coursives ?? theme.coursives, tapis: disposition?.tapis ?? theme.tapis }
}

/** Le contour d'un emplacement : ses quatre coins (rectangle) ou ses points (polygone : le hublot rond du Vaisseau). */
function contour(e: Emplacement): OfficeVector[] {
  const f = e.forme
  if (f.type === 'polygone') return (f.points ?? []).map(([x, y]) => ({ x, y }))
  const { x = 0, y = 0, l = 0, h = 0 } = f
  return [{ x, y }, { x: x + l, y }, { x: x + l, y: y + h }, { x, y: y + h }]
}

/** Transforme les données validées du thème en carte du moteur, pour le bureau ou, quand l'écran est étroit, pour le portrait. */
export function versCarteMoteur(theme: Theme, disposition?: Disposition | null, portrait = false, teintesSalles: Record<string, string> = {}): CarteMoteur {
  const vue = vueDuTheme(theme, disposition, portrait)
  const salles = disposition?.salles ?? Object.fromEntries(theme.defauts.map((d) => [d.salle, d.emplacement]))
  const salleDe = new Map(Object.entries(salles).map(([salle, cle]) => [cle, salle]))
  const emplacements: EmplacementCarte[] = vue.emplacements.map((e) => ({ ...e, salle: e.reservee ? null : salleDe.get(e.cle) ?? null }))

  const portes: Record<string, Point> = {}
  const postes: Record<string, Point> = {}
  const teintes: Record<string, string> = {}
  for (const e of emplacements) {
    teintes[e.cle] = (e.salle ? teintesSalles[e.salle] : undefined) ?? e.teinte
    if (e.salle && !e.reservee && e.poste) { portes[e.salle] = e.porte; postes[e.salle] = e.poste }
  }
  const plaques = emplacements.map((e) => ({ salle: e.salle, x: e.plaque.x, y: e.plaque.y, texte: e.salle ? disposition?.plaques?.[e.salle] ?? e.plaque.texte : e.plaque.texte }))

  const zones: OfficeZone[] = emplacements.map((e) => ({
    id: e.cle, type: e.reservee ? 'lounge' : 'desk_zone', name: e.plaque.texte,
    shape: { points: contour(e) }, interactionPointIds: e.poste ? [`poste-${e.cle}`] : [],
  }))
  const habites = emplacements.filter((e) => e.salle && !e.reservee && e.poste)
  return {
    mapVersion: theme.version, workspaceId: 'station', officeVersionId: `${theme.cle}-${theme.version}`,
    canvas: { width: vue.grille.largeur, height: vue.grille.hauteur, tileSize: vue.grille.pas, backgroundColor: theme.palette['--mc-fond'] },
    layers: (['floor', 'walls', 'furniture', 'decor', 'lighting', 'agents'] as const).map((id) => ({ id, visible: true, locked: true, opacity: 1, parallax: 1 })),
    objects: [], zones,
    // L'emplacement réservé est un mur plein : aucune route ne le traverse (la grille de marche le ferme aussi).
    collisions: emplacements.filter((e) => e.reservee).map((e) => ({ id: `reserve-${e.cle}`, shape: { points: contour(e) }, blocked: true })),
    spawnPoints: habites.map((e) => ({ id: e.salle as string, x: e.porte.x, y: e.porte.y })),
    deskAssignments: {},
    interactionPoints: habites.map((e) => ({ id: `poste-${e.cle}`, kind: 'desk_seat' as const, x: (e.poste as Point).x, y: (e.poste as Point).y, zoneId: e.cle, tags: [] })),
    theme: { mood: theme.nuit ? 'night' : 'neutral', enableThoughtBubbles: true },
    cle: theme.cle, emplacements, portes, postes, plaques, teintes, coursives: vue.coursives, tapis: vue.tapis, palette: theme.palette,
  }
}
