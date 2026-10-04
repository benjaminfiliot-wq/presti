// lib/pilotage/disposition.ts — la validation d'une disposition des salles de la station (fiche 026-173).
// Module PUR, le même code au serveur (route des réglages) et à l'écran (panneau Réglages : dire pourquoi une disposition est refusée).
// Ne jette jamais, n'écrit jamais dans ses entrées.
import { SALLES, SALLE_RESERVEE, CLES_SALLE } from './equipage'
import type { Coursives, Emplacement, Tapis, Theme } from './theme'

/** `salles` : salle → clé d'emplacement ; `coursives`, `tapis` et `portrait.coursives` remplacent ceux du thème s'ils sont présents. */
export type Disposition = {
  salles: Record<string, string>
  plaques?: Record<string, string>
  coursives?: Coursives
  tapis?: Tapis
  portrait?: { coursives?: Coursives }
}
export type VerdictDisposition = { ok: true } | { ok: false; raison: string }

const refus = (raison: string): VerdictDisposition => ({ ok: false, raison })
const estObjet = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x)
const aCle = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k)
const court = (v: unknown, n = 40): string => String(v).slice(0, n)

function distanceSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y, n = dx * dx + dy * dy
  const t = n === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / n))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Les composantes du graphe des coursives (nœud → identifiant de sa composante) et le premier nœud inconnu visé par une arête. */
function composantes(c: Coursives): { comp: Map<string, string>; inconnu: string | null } {
  const parent = new Map<string, string>()
  for (const n of c.noeuds) parent.set(n.id, n.id)
  const racine = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r) as string; return r }
  let inconnu: string | null = null
  for (const a of c.aretes) {
    if (!parent.has(a.de) || !parent.has(a.a)) { if (inconnu === null) inconnu = !parent.has(a.de) ? a.de : a.a; continue }
    parent.set(racine(a.de), racine(a.a))
  }
  const comp = new Map<string, string>()
  for (const id of parent.keys()) comp.set(id, racine(id))
  return { comp, inconnu }
}

/** Pour chaque emplacement, les composantes que sa porte touche (distance à une arête au plus la moitié de sa largeur). */
function portesParComposante(emplacements: Emplacement[], c: Coursives, comp: Map<string, string>): Map<string, Set<string>> {
  const noeuds = new Map(c.noeuds.map(n => [n.id, n]))
  const sortie = new Map<string, Set<string>>()
  for (const e of emplacements) {
    const s = new Set<string>()
    for (const a of c.aretes) {
      const p = noeuds.get(a.de), q = noeuds.get(a.a)
      if (p && q && distanceSegment(e.porte, p, q) <= a.largeur / 2) s.add(comp.get(a.de) as string)
    }
    sortie.set(e.cle, s)
  }
  return sortie
}

function lisible(c: unknown): c is Coursives {
  return estObjet(c) && Array.isArray(c.noeuds) && Array.isArray(c.aretes)
    && c.noeuds.every((n: any) => estObjet(n) && typeof n.id === 'string' && Number.isFinite(n.x) && Number.isFinite(n.y))
    && c.aretes.every((a: any) => estObjet(a) && typeof a.de === 'string' && typeof a.a === 'string' && Number.isFinite(a.largeur))
}

/** Le graphe d'une vue : la porte de chaque salle (la réservée exceptée, sa porte est fermée) rejoint la composante du Commandement. */
function verifierGraphe(vue: string, emplacements: Emplacement[], c: unknown, salles: Record<string, string>, plaques: Record<string, string>): string | null {
  const prefixe = vue === 'portrait' ? 'Sur le téléphone, ' : ''
  if (!lisible(c)) return `${prefixe}les coursives sont illisibles`
  const { comp, inconnu } = composantes(c)
  if (inconnu !== null) return `${prefixe}une coursive vise un nœud inconnu « ${court(inconnu)} »`
  const portes = portesParComposante(emplacements, c, comp)
  const nomDe = (salle: string): string => {
    const plaque = plaques[salle] ?? SALLES.find(s => s.cle === salle)?.plaque ?? salle
    return /^Salle/.test(plaque) ? `La ${plaque}` : `La salle « ${plaque} »`
  }
  const depart = portes.get(salles.commandement) ?? new Set<string>()
  if (depart.size === 0) return `${prefixe}${nomDe('commandement')} n'est plus reliée au reste : aucune coursive ne touche la porte du Commandement`
  for (const s of SALLES) {
    if (s.cle === 'commandement') continue
    const mes = portes.get(salles[s.cle]) ?? new Set<string>()
    if (![...mes].some(x => depart.has(x))) return `${prefixe}${nomDe(s.cle)} n'est plus reliée au reste (le Commandement)`
  }
  return null
}

function verifierTapis(t: unknown, pas: number): string | null {
  if (!estObjet(t) || !Array.isArray(t.trace) || !Array.isArray(t.etapes)) return 'Le tapis est illisible'
  if (!t.trace.every((p: any) => estObjet(p) && Number.isFinite(p.x) && Number.isFinite(p.y))) return 'Le tracé du tapis est illisible'
  for (let i = 1; i < t.trace.length; i++) {
    const dx = Math.abs(t.trace[i].x - t.trace[i - 1].x), dy = Math.abs(t.trace[i].y - t.trace[i - 1].y)
    if (dx > pas || dy > pas || (dx === 0 && dy === 0)) return `Le tapis de la prospection n'est plus continu : le tracé saute entre les points ${i - 1} et ${i}`
  }
  const sur = new Set(t.trace.map((p: any) => `${p.x},${p.y}`))
  for (const e of t.etapes) if (!estObjet(e) || !sur.has(`${e.x},${e.y}`)) return `Le tapis ne porte plus l'étape « ${court(estObjet(e) ? e.cle : '?')} » : elle n'est pas sur le tracé`
  return null
}

/**
 * Juge une disposition : salles connues, réservée fixe et sous son nom, une salle par emplacement, graphe des coursives relié
 * au Commandement (bureau puis portrait), tapis continu. Rend `{ ok: true }` ou `{ ok: false, raison }` en français.
 */
export function validerDisposition(theme: unknown, disposition: unknown): VerdictDisposition {
  try {
    if (!estObjet(theme) || !Array.isArray(theme.emplacements) || !estObjet(theme.coursives) || !estObjet(theme.tapis)) return refus('Le thème est illisible')
    const t = theme as unknown as Theme
    if (!estObjet(disposition) || !estObjet(disposition.salles)) return refus('La disposition est illisible : les salles manquent')
    const d = disposition as Disposition
    const salles = d.salles
    const plaques: Record<string, string> = estObjet(d.plaques) ? d.plaques : {}
    const cles = new Set(t.emplacements.map(e => e.cle))
    const reservee = t.emplacements.find(e => e.reservee === true)
    // 1. Salles et emplacements connus
    for (const [s, e] of Object.entries(salles)) {
      if (!CLES_SALLE.includes(s)) return refus(`La salle « ${court(s)} » est inconnue`)
      if (typeof e !== 'string' || !cles.has(e)) return refus(`L'emplacement « ${court(e)} » de la salle ${court(s)} est inconnu`)
    }
    // 2. La salle réservée : fixe, sous son nom, seule dans son emplacement
    if (aCle(salles, SALLE_RESERVEE.cle) && salles[SALLE_RESERVEE.cle] !== reservee?.cle) return refus(`La salle réservée ${SALLE_RESERVEE.plaque} ne se déplace pas`)
    if (aCle(plaques, SALLE_RESERVEE.cle) && plaques[SALLE_RESERVEE.cle] !== SALLE_RESERVEE.plaque) return refus(`La salle réservée ${SALLE_RESERVEE.plaque} ne se renomme pas`)
    for (const s of SALLES) if (reservee && salles[s.cle] === reservee.cle) return refus(`L'emplacement réservé (${reservee.cle}) n'accueille aucune autre salle : ${s.plaque} ne peut pas y siéger`)
    // 3. Une salle par emplacement, un emplacement par salle
    for (const s of SALLES) if (!aCle(salles, s.cle)) return refus(`La salle « ${s.plaque} » n'a pas d'emplacement`)
    const occupe = new Map<string, string>()
    for (const s of SALLES) {
      const e = salles[s.cle]
      if (occupe.has(e)) return refus(`Deux salles occupent l'emplacement ${e} : ${occupe.get(e)} et ${s.plaque}`)
      occupe.set(e, s.plaque)
    }
    // 4. Le graphe des coursives, au bureau puis en portrait
    const bureau = verifierGraphe('bureau', t.emplacements, d.coursives ?? t.coursives, salles, plaques)
    if (bureau) return refus(bureau)
    if (t.portrait) {
      const p = verifierGraphe('portrait', t.portrait.emplacements, d.portrait?.coursives ?? t.portrait.coursives, salles, plaques)
      if (p) return refus(p)
    }
    // 5. Le tapis de la prospection
    const tapis = verifierTapis(d.tapis ?? t.tapis, t.grille.pas)
    if (tapis) return refus(tapis)
    return { ok: true }
  } catch (e) {
    return refus(`La disposition est illisible (${court((e as Error)?.message ?? e, 60)})`)
  }
}
