// Fiche 026-184 (K4c) : la vue de la carte (zoom entier ×1 à ×3, centre) et le clavier. Quand le module de caméra de la fiche 026-182 est
// monté (la barre `[data-camera]` existe dans le cadre), il en est le seul maître : ce module ne fait alors que LIRE les attributs
// `data-zoom`, `data-vue-x` et `data-vue-y` que la caméra pose sur le cadre. Sinon il tient lui-même la vue, par ces mêmes attributs,
// avec les trois boutons +, − et ⊞ et le clavier : + et − zooment, ⊞ revient à l'ensemble, les flèches déplacent la vue.
// Il n'y a ni boucle ni minuterie : la vue ne change que sur un geste, et la scène de Phaser n'est réveillée que pour s'en repeindre.
import type PhaserType from 'phaser'
import type { Grille } from '../types'

export type Vue = { zoom: number; x: number; y: number }
export const ZOOM_MAX = 3
const PAS_FLECHE = 16

const nombre = (v: string | undefined, defaut: number): number => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) ? n : defaut }

/** La vue lue sur les attributs du cadre (la vue d'ensemble tant qu'aucun n'est posé). */
export function lireVue(carte: HTMLElement, g: Grille): Vue {
  return {
    zoom: Math.min(ZOOM_MAX, Math.max(1, Math.round(nombre(carte.dataset.zoom, 1)))),
    x: nombre(carte.dataset.vueX, g.largeur / 2),
    y: nombre(carte.dataset.vueY, g.hauteur / 2),
  }
}

/** Le point de la grille, en pixels CSS du canevas, pour une vue donnée. */
export function enCss(v: Vue, g: Grille, largeur: number, hauteur: number, p: { x: number; y: number }) {
  const s = (largeur / g.largeur) * v.zoom
  return { x: (p.x - v.x) * s + largeur / 2, y: (p.y - v.y) * s + hauteur / 2, s }
}

/** Garde la vue dans la carte : le centre ne laisse jamais voir au-delà de la grille ; en vue d'ensemble il est au milieu. */
function borner(v: Vue, g: Grille): Vue {
  const mx = g.largeur / (2 * v.zoom), my = g.hauteur / (2 * v.zoom)
  return { zoom: v.zoom, x: Math.min(g.largeur - mx, Math.max(mx, v.x)), y: Math.min(g.hauteur - my, Math.max(my, v.y)) }
}

type Entree = {
  carte: HTMLElement
  racine: HTMLElement
  jeu: PhaserType.Game
  grille: Grille
  /** La barre de la caméra existe déjà : on ne fait que lire. */
  lectureSeule: boolean
}

/** Monte la vue ; rend la fonction qui la défait. */
export function monterVue({ carte, racine, jeu, grille, lectureSeule }: Entree): () => void {
  if (lectureSeule) return () => {}
  const toile = jeu.canvas
  let vue: Vue = lireVue(carte, grille)

  const poser = (suivante: Vue) => {
    vue = borner(suivante, grille)
    carte.dataset.zoom = String(vue.zoom)
    carte.dataset.vueX = String(Math.round(vue.x))
    carte.dataset.vueY = String(Math.round(vue.y))
    const centre = Math.abs(vue.x - grille.largeur / 2) < 1 && Math.abs(vue.y - grille.hauteur / 2) < 1
    carte.dataset.vue = vue.zoom === 1 && centre ? 'ensemble' : 'zoom'
    // La scène reçoit le zoom entier de l'appareil (k) fois le zoom de la vue : un pixel logique couvre toujours un nombre entier de pixels.
    const k = toile.width / grille.largeur
    const scene = jeu.scene.scenes[0]
    if (scene && scene.cameras?.main) {
      scene.cameras.main.setZoom(k * vue.zoom)
      scene.cameras.main.centerOn(vue.x, vue.y)
    }
    jeu.loop.wake()
  }
  const zoomer = (d: number) => poser({ ...vue, zoom: Math.min(ZOOM_MAX, Math.max(1, vue.zoom + d)) })
  const ensemble = () => poser({ zoom: 1, x: grille.largeur / 2, y: grille.hauteur / 2 })
  const deplacer = (dx: number, dy: number) => poser({ ...vue, x: vue.x + dx, y: vue.y + dy })

  // Le cadre prend le focus d'un clic (et de Tab) : c'est lui qui reçoit le clavier.
  racine.tabIndex = 0
  racine.setAttribute('role', 'group')
  racine.setAttribute('aria-label', 'Carte de la station. Plus et moins zooment, les flèches déplacent la vue.')

  const barre = document.createElement('div')
  barre.setAttribute('data-camera', '')
  barre.className = 'mc-camera'
  for (const [action, signe, nom] of [['zoom-avant', '+', 'Zoom avant'], ['zoom-arriere', '−', 'Zoom arrière'], ['vue-ensemble', '⊞', 'Vue d’ensemble']] as const) {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('data-action', action)
    b.setAttribute('aria-label', nom)
    b.textContent = signe
    barre.append(b)
  }
  racine.after(barre)
  const surBarre = (ev: Event) => {
    const a = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
    if (a === 'zoom-avant') zoomer(1); else if (a === 'zoom-arriere') zoomer(-1); else if (a === 'vue-ensemble') ensemble()
  }
  barre.addEventListener('click', surBarre)

  const surTouche = (ev: KeyboardEvent) => {
    const t = ev.target instanceof HTMLElement ? ev.target : null
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('ul[data-miroir]'))) return
    const f: Record<string, () => void> = {
      '+': () => zoomer(1), '=': () => zoomer(1), '-': () => zoomer(-1), '−': () => zoomer(-1),
      ArrowLeft: () => deplacer(-PAS_FLECHE, 0), ArrowRight: () => deplacer(PAS_FLECHE, 0), ArrowUp: () => deplacer(0, -PAS_FLECHE), ArrowDown: () => deplacer(0, PAS_FLECHE),
    }
    const g = f[ev.key]
    if (g) { ev.preventDefault(); g() }
  }
  carte.addEventListener('keydown', surTouche)

  poser(vue)
  return () => {
    carte.removeEventListener('keydown', surTouche)
    barre.removeEventListener('click', surBarre)
    barre.remove()
  }
}
