// Les zones cliquables de la carte (fiche 026-182, K4a) : une zone HTML par emplacement du thème (les vingt salles et la réservée), posée
// au-dessus du canevas d'après la caméra. Un attribut qui n'appartient qu'à la carte, `data-zone-salle="<clé>"` (la liste des salles de la
// station garde son `[data-salle]` : elle ne peut pas passer pour la carte). Un emplacement rond (le hublot de la salle de réunion) est
// une zone en `clip-path: polygon(…)` : seule la partie visible reçoit le pointeur. Un clic ou Entrée pose `?salle=<clé>` dans l'adresse,
// sans quitter la page : le panneau de la salle s'ouvre par la station (026-120), la réservée ouvre « Branche réservée » (026-189).
//
// Aucun texte venu d'un agent ni d'un réglage n'entre ici autrement que par `textContent` (le nom de la salle de l'étiquette, l'étiquette
// d'accessibilité) ; aucune minuterie, aucune animation : la zone ne bouge que sur un geste (survol, clic, caméra).
import type { Grille } from '../types'
import type { Monde } from '../theme/grille'
import { enCss, type Vue } from '../calque/vue'

type Boite = { x: number; y: number; l: number; h: number }
type Zone = { cle: string; el: HTMLElement; boite: Boite; texte: string }

/** La boîte englobante d'un emplacement (rectangle ou polygone), en pixels logiques. */
function boiteDe(e: Monde['carte']['emplacements'][number]): Boite {
  const f = e.forme
  if (f.type === 'polygone' && f.points?.length) {
    const xs = f.points.map((p) => p[0]), ys = f.points.map((p) => p[1])
    return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  return { x: f.x ?? 0, y: f.y ?? 0, l: f.l ?? 0, h: f.h ?? 0 }
}

/** Le `clip-path` d'un emplacement en polygone, en pourcentages de sa boîte ; `none` pour un rectangle. */
function decoupe(e: Monde['carte']['emplacements'][number], b: Boite): string {
  const f = e.forme
  if (f.type !== 'polygone' || !f.points?.length || !b.l || !b.h) return 'none'
  return `polygon(${f.points.map(([x, y]) => `${(((x - b.x) / b.l) * 100).toFixed(2)}% ${(((y - b.y) / b.h) * 100).toFixed(2)}%`).join(', ')})`
}

/** La salle choisie, lue dans l'adresse (`?salle=<clé>`). */
export function salleChoisie(): string | null {
  try { return new URL(window.location.href).searchParams.get('salle') } catch { return null }
}

/**
 * Pose `?salle=<clé>` dans l'adresse sans changer de page (le routeur de Next suit l'historique du navigateur), puis le dit à la station
 * (`mc-ouvrir-salle`, entendu par la liste des salles de Carte.tsx) pour que l'ouverture passe aussi par le routeur, dans l'ordre de ses
 * navigations : une fermeture encore en vol ne l'efface plus au retour.
 */
function poserSalle(cle: string) {
  const u = new URL(window.location.href)
  u.searchParams.set('salle', cle)
  window.history.replaceState(null, '', u)
  window.dispatchEvent(new CustomEvent('mc-ouvrir-salle', { detail: cle }))
}

type Entree = {
  racine: HTMLElement
  toile: HTMLCanvasElement
  carte: HTMLElement
  monde: Monde
  grille: Grille
  vue: () => Vue
}

/** Monte les zones et l'étiquette ; rend `placer` (à rappeler quand la caméra ou la taille change), `majSelection` et la fonction qui défait tout. */
export function monterZones({ racine, toile, carte, monde, grille, vue }: Entree) {
  const couche = document.createElement('div')
  couche.setAttribute('data-zones', '')
  couche.className = 'mc-zones'
  const etiquette = document.createElement('div')
  etiquette.setAttribute('data-etiquette', '')
  etiquette.className = 'mc-etiquette'
  etiquette.hidden = true
  const libelle = document.createElement('span')
  const pointe = document.createElement('i')
  pointe.setAttribute('data-pointe', '')
  etiquette.append(libelle, pointe)

  const plaques = new Map(monde.carte.plaques.filter((p) => p.salle).map((p) => [p.salle as string, p.texte]))
  const zones: Zone[] = monde.carte.emplacements.map((e) => {
    const cle = e.salle ?? e.cle
    const boite = boiteDe(e)
    const el = document.createElement('div')
    el.setAttribute('data-zone-salle', cle)
    el.setAttribute('data-teinte', monde.carte.teintes[e.cle] ?? e.teinte)
    el.setAttribute('data-survol', 'non')
    el.setAttribute('data-selectionnee', 'non')
    el.setAttribute('role', 'button')
    el.tabIndex = -1
    const texte = plaques.get(cle) ?? e.plaque.texte
    el.setAttribute('aria-label', texte)
    el.style.clipPath = decoupe(e, boite)
    return { cle, el, boite, texte }
  })
  couche.append(...zones.map((z) => z.el), etiquette)

  const placer = () => {
    const W = toile.clientWidth, H = toile.clientHeight
    if (!W || !H) return
    Object.assign(couche.style, { left: `${toile.offsetLeft}px`, top: `${toile.offsetTop}px`, width: `${W}px`, height: `${H}px` })
    const v = vue()
    for (const z of zones) {
      const c = enCss(v, grille, W, H, { x: z.boite.x, y: z.boite.y })
      Object.assign(z.el.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${z.boite.l * c.s}px`, height: `${z.boite.h * c.s}px` })
    }
    if (!etiquette.hidden) placerEtiquette()
  }

  let sous: Zone | null = null
  function placerEtiquette() {
    if (!sous) return
    const W = toile.clientWidth
    const v = vue()
    const c = enCss(v, grille, W, toile.clientHeight, { x: sous.boite.x + sous.boite.l / 2, y: sous.boite.y })
    const l = etiquette.offsetWidth
    const x = Math.max(2, Math.min(W - l - 2, c.x - l / 2))
    Object.assign(etiquette.style, { left: `${Math.round(x)}px`, top: `${Math.round(c.y - etiquette.offsetHeight - 6)}px` })
    // La pointe désigne le milieu haut de la salle, même quand l'étiquette est repoussée par un bord.
    pointe.style.left = `${Math.round(Math.max(4, Math.min(l - 8, c.x - x - 4)))}px`
  }

  const plaqueDe = (cle: string) => carte.querySelector<HTMLElement>(`[data-plaque="${CSS.escape(cle)}"]`)
  const quitter = (z: Zone) => {
    z.el.setAttribute('data-survol', 'non')
    plaqueDe(z.cle)?.removeAttribute('data-allumee')
    if (sous === z) { sous = null; etiquette.hidden = true; dire(null) }
  }
  /** Dit à la carte quelle salle est survolée (null : aucune) : les lignes et les écrans de la salle s'ouvrent en fiche, les autres se taisent. */
  const dire = (cle: string | null) => carte.dispatchEvent(new CustomEvent('mc-survol-salle', { detail: cle }))
  const entrer = (z: Zone) => {
    if (sous && sous !== z) quitter(sous)
    sous = z
    dire(z.cle)
    z.el.setAttribute('data-survol', 'oui')
    plaqueDe(z.cle)?.setAttribute('data-allumee', '')
    libelle.textContent = z.texte
    etiquette.hidden = false
    placerEtiquette()
  }

  const majSelection = () => {
    const choisie = salleChoisie()
    for (const z of zones) {
      const v = z.cle === choisie ? 'oui' : 'non'
      if (z.el.getAttribute('data-selectionnee') !== v) z.el.setAttribute('data-selectionnee', v)
    }
  }

  const ecouteurs: [HTMLElement, string, EventListener][] = []
  for (const z of zones) {
    const ajouter = (type: string, f: EventListener) => { z.el.addEventListener(type, f); ecouteurs.push([z.el, type, f]) }
    ajouter('pointerenter', () => entrer(z))
    ajouter('pointerleave', () => quitter(z))
    ajouter('click', () => { poserSalle(z.cle); majSelection() })
    ajouter('keydown', (ev) => { const k = (ev as KeyboardEvent).key; if (k === 'Enter' || k === ' ') { ev.preventDefault(); poserSalle(z.cle); majSelection() } })
  }

  racine.append(couche)
  placer()
  majSelection()
  return {
    placer,
    majSelection,
    defaire: () => {
      for (const [el, type, f] of ecouteurs) el.removeEventListener(type, f)
      couche.remove()
    },
  }
}
