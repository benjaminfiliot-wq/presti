// La caméra de la carte (fiche 026-182, K4a). Elle est la SEULE maîtresse de la vue : le zoom (×1 à ×3, par entiers), le centre, la vue
// d'ensemble ⊞, le glissé borné, la molette, le clavier, le pincement ; le calque (moteur/calque/vue.ts) ne fait que lire les attributs
// qu'elle pose sur le cadre de la carte : `data-zoom`, `data-vue-x`, `data-vue-y` (le centre, en pixels de la grille) et `data-vue`
// (`ensemble` ou `zoom`).
//
// L'ÉCHELLE se compte en pixels de l'appareil : le canevas fait toujours grille × k pixels (k entier, posé par claw3d/OfficePhaserCanvas)
// et la caméra de Phaser reçoit k × zoom, un entier : un pixel logique couvre toujours un nombre entier de pixels de l'appareil, rien ne
// scintille aux densités 2, 2,625 ou 3. Le glissé est BORNÉ : au-delà de la coque jusque dans la nébuleuse, dans une limite fixe.
//
// Aucune minuterie, aucune boucle, aucune animation : la vue ne change que sur un geste, et la boucle de Phaser n'est réveillée que le
// temps de repeindre. Le montage des zones cliquables (zones.ts) est fait ici : elles suivent la caméra.
import { mondeDe } from '../theme/grille'
import type { Accroche, Grille } from '../types'
import { lireVue, ZOOM_MAX, type Vue } from '../calque/vue'
import { monterZones } from './zones'
import './camera.css'

/** Jusqu'où le centre de la vue peut sortir de la grille, en pixels logiques : la nébuleuse autour de la coque, jamais plus. */
export const MARGE_NEBULEUSE = 48
const PAS_FLECHE = 16
/** Un glissé commence après ce déplacement, en pixels CSS : en deçà, c'est un clic. */
const SEUIL_GLISSE = 4
/** Une cran de molette vaut 100 : un pas de zoom par cran, plusieurs petits mouvements de pavé tactile se cumulent. */
const CRAN_MOLETTE = 100

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Garde la vue : zoom de 1 à 3, centre dans la grille plus la nébuleuse ; en vue d'ensemble il est au milieu, sans marge. */
export function borner(v: Vue, g: Grille): Vue {
  const zoom = borne(Math.round(v.zoom), 1, ZOOM_MAX)
  const marge = zoom > 1 ? MARGE_NEBULEUSE : 0
  const mx = g.largeur / (2 * zoom), my = g.hauteur / (2 * zoom)
  return { zoom, x: Math.round(borne(v.x, mx - marge, g.largeur - mx + marge)), y: Math.round(borne(v.y, my - marge, g.hauteur - my + marge)) }
}

export const accrocheCamera: Accroche = (contexte) => {
  const { racine, jeu } = contexte
  const monde = mondeDe(contexte)
  if (!racine || !jeu || !jeu.canvas || !monde) return
  const toile = jeu.canvas
  const grille = contexte.grille
  const carte = racine.closest<HTMLElement>('[data-station-carte]') ?? racine
  if (getComputedStyle(racine).position === 'static') racine.style.position = 'relative'

  let vue: Vue = borner({ zoom: 1, x: grille.largeur / 2, y: grille.hauteur / 2 }, grille)
  let zones: ReturnType<typeof monterZones> | null = null

  /** Pose la vue : les attributs du cadre, la caméra de Phaser (k × zoom), les zones ; réveille la boucle le temps de repeindre. */
  const poser = (suivante: Vue) => {
    vue = borner(suivante, grille)
    carte.dataset.zoom = String(vue.zoom)
    carte.dataset.vueX = String(vue.x)
    carte.dataset.vueY = String(vue.y)
    const centre = Math.abs(vue.x - grille.largeur / 2) < 1 && Math.abs(vue.y - grille.hauteur / 2) < 1
    carte.dataset.vue = vue.zoom === 1 && centre ? 'ensemble' : 'zoom'
    const k = toile.width / grille.largeur
    const camera = jeu.scene.scenes[0]?.cameras?.main
    if (camera) {
      camera.setZoom(k * vue.zoom)
      camera.centerOn(vue.x, vue.y)
    }
    zones?.placer()
    jeu.loop.wake()
  }
  const zoomer = (d: number, vers?: { x: number; y: number }) => {
    const zoom = borne(vue.zoom + d, 1, ZOOM_MAX)
    if (zoom === vue.zoom) return
    // Avec un point visé (la molette), la carte reste sous le pointeur : le centre se déplace de ce que l'échelle déplace.
    const x = vers ? vers.x - (vers.x - vue.x) * (vue.zoom / zoom) : vue.x
    const y = vers ? vers.y - (vers.y - vue.y) * (vue.zoom / zoom) : vue.y
    poser({ zoom, x, y })
  }
  const ensemble = () => poser({ zoom: 1, x: grille.largeur / 2, y: grille.hauteur / 2 })
  const deplacer = (dx: number, dy: number) => poser({ ...vue, x: vue.x + dx, y: vue.y + dy })

  /** Le point de la grille sous un point de la page. */
  const logique = (cx: number, cy: number) => {
    const r = toile.getBoundingClientRect()
    const s = (r.width / grille.largeur) * vue.zoom
    return { x: vue.x + (cx - r.left - r.width / 2) / s, y: vue.y + (cy - r.top - r.height / 2) / s, s }
  }

  // ── Le cadre : il reçoit le clavier, le toucher ne sert qu'à la carte ───────────────────────────────────────────────────────
  racine.tabIndex = 0
  racine.setAttribute('role', 'group')
  racine.setAttribute('aria-label', 'Carte de la station. Plus et moins zooment, les flèches déplacent la vue, I ou Échap ferment une salle.')
  carte.style.touchAction = 'none'

  // ── La barre +, − et ⊞ : sous la carte, jamais dessus ─────────────────────────────────────────────────────────────────────────
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
    if (a === 'zoom-avant') zoomer(1)
    else if (a === 'zoom-arriere') zoomer(-1)
    else if (a === 'vue-ensemble') ensemble()
  }
  barre.addEventListener('click', surBarre)

  // ── La molette : un pas de zoom par cran, sous le pointeur ────────────────────────────────────────────────────────────────────
  let cumul = 0
  const surMolette = (ev: WheelEvent) => {
    if (ev.ctrlKey || (ev.target as HTMLElement | null)?.closest('[data-camera]')) return
    ev.preventDefault()
    cumul += ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY
    if (Math.abs(cumul) < CRAN_MOLETTE) return
    const sens = cumul < 0 ? 1 : -1
    cumul = 0
    zoomer(sens, logique(ev.clientX, ev.clientY))
  }
  carte.addEventListener('wheel', surMolette, { passive: false })

  // ── Le glissé (un doigt ou la souris) et le pincement (deux doigts) ───────────────────────────────────────────────────────────
  const pointeurs = new Map<number, { x: number; y: number }>()
  let glisse: { x: number; y: number; vue: Vue } | null = null
  let aGlisse = false
  let ecart: number | null = null
  const distance = () => { const [a, b] = [...pointeurs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }

  const surAppui = (ev: PointerEvent) => {
    if (ev.button !== 0 || (ev.target as HTMLElement | null)?.closest('[data-camera]')) return
    pointeurs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    aGlisse = false
    if (pointeurs.size === 1) glisse = { x: ev.clientX, y: ev.clientY, vue }
    if (pointeurs.size === 2) { glisse = null; ecart = distance() }
  }
  const surDeplacement = (ev: PointerEvent) => {
    const p = pointeurs.get(ev.pointerId)
    if (!p) return
    p.x = ev.clientX
    p.y = ev.clientY
    if (pointeurs.size === 2 && ecart) {
      const d = distance()
      // Le pincement : un pas de zoom quand les doigts s'écartent ou se rapprochent d'un tiers, puis on repart de là.
      if (d > ecart * 1.35) { zoomer(1); ecart = d; aGlisse = true } else if (d < ecart / 1.35) { zoomer(-1); ecart = d; aGlisse = true }
      return
    }
    if (!glisse) return
    const dx = ev.clientX - glisse.x, dy = ev.clientY - glisse.y
    if (!aGlisse && Math.hypot(dx, dy) < SEUIL_GLISSE) return
    if (!aGlisse) {
      aGlisse = true
      carte.setAttribute('data-glisse', '')
      try { carte.setPointerCapture(ev.pointerId) } catch { /* pointeur déjà relâché */ }
    }
    const r = toile.getBoundingClientRect()
    const s = (r.width / grille.largeur) * glisse.vue.zoom
    poser({ zoom: glisse.vue.zoom, x: glisse.vue.x - dx / s, y: glisse.vue.y - dy / s })
  }
  const surRelache = (ev: PointerEvent) => {
    pointeurs.delete(ev.pointerId)
    if (pointeurs.size < 2) ecart = null
    if (!pointeurs.size) { glisse = null; carte.removeAttribute('data-glisse') }
  }
  // Un glissé qui s'achève sur une salle n'est pas un clic sur cette salle.
  const surClic = (ev: MouseEvent) => {
    if (!aGlisse) return
    aGlisse = false
    ev.stopPropagation()
    ev.preventDefault()
  }
  carte.addEventListener('pointerdown', surAppui)
  carte.addEventListener('pointermove', surDeplacement)
  carte.addEventListener('pointerup', surRelache)
  carte.addEventListener('pointercancel', surRelache)
  carte.addEventListener('click', surClic, true)
  const surGeste = (ev: Event) => ev.preventDefault()
  carte.addEventListener('gesturestart', surGeste)

  // ── Le clavier : + et − zooment, ⊞ revient, les flèches déplacent la vue ──────────────────────────────────────────────────────────
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

  // ── Les zones, et ce qui les remet en place : la taille du cadre, l'adresse (la salle choisie) ──────────────────────────────────
  zones = monterZones({ racine, toile, carte, monde, grille, vue: () => lireVue(carte, grille) })
  const observeur = new ResizeObserver(() => zones?.placer())
  observeur.observe(toile)
  observeur.observe(racine)
  // La station repasse ses propriétés à chaque rendu, donc aussi quand l'adresse change (Échap ferme la salle) : la salle choisie suit.
  contexte.ecouter(() => zones?.majSelection())
  const surHistorique = () => zones?.majSelection()
  window.addEventListener('popstate', surHistorique)

  poser(vue)
  return () => {
    carte.removeEventListener('wheel', surMolette)
    carte.removeEventListener('pointerdown', surAppui)
    carte.removeEventListener('pointermove', surDeplacement)
    carte.removeEventListener('pointerup', surRelache)
    carte.removeEventListener('pointercancel', surRelache)
    carte.removeEventListener('click', surClic, true)
    carte.removeEventListener('gesturestart', surGeste)
    carte.removeEventListener('keydown', surTouche)
    window.removeEventListener('popstate', surHistorique)
    barre.removeEventListener('click', surBarre)
    barre.remove()
    observeur.disconnect()
    zones?.defaire()
    carte.removeAttribute('data-glisse')
  }
}
