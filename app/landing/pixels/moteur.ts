// app/landing/pixels/moteur.ts — le socle commun des trois effets de pixels de la landing v2 (033-008, passe 3).
// Canvas 2D seulement (aucun contexte 3D), aucune dépendance nouvelle : GSAP ScrollTrigger est déjà dans le projet et n'est importé
// qu'à la demande, après l'affichage. Ce fichier fixe :
// - la palette (corail, ambre, nuit chaude, ivoire ; #F5B301 en étincelle rare ; jamais de bleu ni de violet) ;
// - la toile : taille CSS × devicePixelRatio (plafonné à 2), redimensionnée par ResizeObserver ;
// - la visibilité : IntersectionObserver + onglet caché → la boucle requestAnimationFrame s'arrête ;
// - le mouvement réduit (prefers-reduced-motion: reduce ; suivi en direct par le hook de ./reduit.ts, côté client) ;
// - une mesure du temps de dessin par image, en développement seulement (lue par le banc et les outils de preuve).

export const PALETTE = {
  corail: '#D97757',
  corailClair: '#E8946F',
  corailProfond: '#B85C3C',
  ambre: '#EE8B3C',
  etincelle: '#F5B301',
  nuit: '#09090C',
  /** silhouettes du chantier : une nuit à peine chauffée */
  silhouette: '#0E0B0D',
  ivoire: '#F3EEE5',
} as const

export type Rvb = [number, number, number]

/** « #D97757 » ou « #fff » → [r, v, b]. Une couleur illisible retombe sur le corail (jamais d'erreur à l'écran). */
export function versRvb(hex: string): Rvb {
  let h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((x) => x + x).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return [217, 119, 87]
  const n = Number.parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function melange(a: Rvb, b: Rvb, t: number): Rvb {
  const k = Math.max(0, Math.min(1, t))
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

export function enCss(c: Rvb): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
}

/** Mélange de deux couleurs hexadécimales, rendu en CSS. */
export function teinte(a: string, b: string, t: number): string {
  return enCss(melange(versRvb(a), versRvb(b), t))
}

/** Générateur pseudo-aléatoire stable (Mulberry32) : même graine → mêmes pixels, sur le serveur comme au client. */
export function graine(n: number) {
  return () => {
    n |= 0; n = (n + 0x6d2b79f5) | 0
    let t = Math.imul(n ^ (n >>> 15), 1 | n)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Courbes (u de 0 à 1). Les noms suivent GSAP pour qu'on s'y retrouve.
export const courbes = {
  /** power3.out — une arrivée franche qui se pose. */
  sortie: (u: number) => 1 - Math.pow(1 - u, 3),
  /** back.out(1.6) — le petit rebond de la brique qu'on pose (dépasse de ~10 % puis revient). */
  rebond: (u: number) => { const s = 1.6; const x = u - 1; return 1 + (s + 1) * x * x * x + s * x * x },
  /** power2.inOut — un déplacement à l'écran. */
  traverse: (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  lisse: (u: number) => u * u * (3 - 2 * u),
}

export const borne = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u)

export const REQUETE_REDUIT = '(prefers-reduced-motion: reduce)'

export function mouvementReduit(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REQUETE_REDUIT).matches
}

export type Toile = { ctx: CanvasRenderingContext2D; largeur: number; hauteur: number; dpr: number }

/** Met la toile à sa taille CSS × devicePixelRatio (plafonné à 2 : au-delà, le coût monte sans gain visible pour des cases nettes). */
export function dimensionner(canvas: HTMLCanvasElement): Toile | null {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return null
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
  const largeur = Math.max(1, canvas.clientWidth)
  const hauteur = Math.max(1, canvas.clientHeight)
  const l = Math.round(largeur * dpr)
  const h = Math.round(hauteur * dpr)
  if (canvas.width !== l) canvas.width = l
  if (canvas.height !== h) canvas.height = h
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
  return { ctx, largeur, hauteur, dpr }
}

/**
 * Surveille la visibilité réelle d'un élément : à l'écran (IntersectionObserver, avec une marge) ET onglet affiché.
 * Rappelle `quand(visible)` à chaque changement. Rend la fonction de nettoyage.
 */
export function surveiller(el: Element, quand: (visible: boolean) => void, marge = '120px 0px'): () => void {
  let aLEcran = true
  let etat: boolean | null = null
  const publier = () => {
    const v = aLEcran && !document.hidden
    if (v !== etat) { etat = v; quand(v) }
  }
  let io: IntersectionObserver | null = null
  if ('IntersectionObserver' in window) {
    // La DERNIÈRE entrée fait foi : un défilement rapide peut livrer [entre, sort] dans le même lot.
    io = new IntersectionObserver((e) => { const d = e[e.length - 1]; if (d) aLEcran = d.isIntersecting; publier() }, { rootMargin: marge })
    io.observe(el)
  }
  document.addEventListener('visibilitychange', publier)
  publier()
  return () => { io?.disconnect(); document.removeEventListener('visibilitychange', publier) }
}

/** Une boucle requestAnimationFrame qui ne tourne que tant qu'il y a quelque chose à dessiner (`image` rend true pour continuer). */
export function boucle(image: (maintenant: number) => boolean) {
  let id = 0
  let permise = true
  const tic = (t: number) => {
    id = 0
    if (!permise) return
    if (image(t)) id = requestAnimationFrame(tic)
  }
  return {
    demarrer() { if (permise && !id) id = requestAnimationFrame(tic) },
    arreter() { if (id) cancelAnimationFrame(id); id = 0 },
    permettre(oui: boolean) { permise = oui; if (!oui && id) { cancelAnimationFrame(id); id = 0 } },
    get active() { return id !== 0 },
  }
}

type Gsap = typeof import('gsap').default
type ScrollTriggerT = typeof import('gsap/ScrollTrigger').ScrollTrigger
let chargement: Promise<{ gsap: Gsap; ScrollTrigger: ScrollTriggerT }> | null = null

/** GSAP + ScrollTrigger, importés une seule fois et à la demande (même schéma qu'app/landing/Journee.tsx). */
export function chargerScrollTrigger() {
  if (!chargement) {
    chargement = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
      g.default.registerPlugin(s.ScrollTrigger)
      return { gsap: g.default, ScrollTrigger: s.ScrollTrigger }
    })
    chargement.catch(() => { chargement = null })
  }
  return chargement
}

type Mesures = Record<string, { n: number; total: number; max: number; derniers: number[] }>

/** Temps de dessin d'une image (ms). En développement seulement : `window.__pixels` est lu par le banc et par les outils de preuve. */
export function mesurer(nom: string, ms: number) {
  if (process.env.NODE_ENV !== 'development') return
  const w = window as unknown as { __pixels?: Mesures }
  const m = (w.__pixels ??= {})
  const e = (m[nom] ??= { n: 0, total: 0, max: 0, derniers: [] })
  e.n += 1; e.total += ms; if (ms > e.max) e.max = ms
  e.derniers.push(ms); if (e.derniers.length > 240) e.derniers.shift()
}
