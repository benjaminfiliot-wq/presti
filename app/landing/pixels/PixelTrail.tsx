'use client'

// PixelTrail — la traînée de pixels qui suit le pointeur sur le fond (la grammaire de n8n.io, en version Presti : « le joint de mortier
// qui se trace »). Réglée sur la mesure de 033-007 (plans/011-cadrage-01-11/c2-lot5/fiche-mouvement.md, « n8n.io — La traînée ») :
// - Un canvas posé en fond de son parent (position absolue, inset 0, pointer-events none) : le parent doit être positionné.
// - Le pointeur (souris, stylet) allume les cases de la grille sur son TRAJET, en angles droits (une diagonale devient un escalier
//   de marches d'une case, jamais deux cases en coin) ; la tête est le pointeur, la queue la poursuit à vitesse bornée : une case vit
//   au moins 30 % de `persistanceMs`, puis la queue avance de 20 cases par `persistanceMs` au plus ; jamais plus de 24 cases.
//   Allumage et extinction secs (de l'animation en pas, comme n8n) : ni fondu, ni grossissement. Tête ivoire chaud, corps corail,
//   une case sur quarante en étincelle #F5B301.
// - Au doigt : une onde courte au TOUCHER (tap : appui court, sans glisser) — un anneau de cases qui s'ouvre en 520 ms ; le doigt qui
//   fait défiler n'allume rien (le défilement annule le pointeur : pointercancel).
// - Rien au chargement, rien sans pointeur : la boucle requestAnimationFrame ne tourne que tant qu'une case est allumée, et se
//   coupe hors de l'écran ou onglet caché. En mouvement réduit, aucun écouteur n'est posé : la traînée ne s'allume jamais.
import { useEffect, useRef } from 'react'
import { PALETTE, boucle, dimensionner, enCss, graine, melange, mesurer, surveiller, versRvb } from './moteur'
import { useMouvementReduit } from './reduit'

export type PixelTrailProps = {
  /** Couleur du corps de la ligne (défaut : corail #D97757). */
  couleur?: string
  /** Pas de la grille en px CSS (défaut 24 : case dessinée de 20 px, joint de 4 px, comme n8n). */
  case?: number
  /** Temps que met la queue à résorber une ligne de 20 cases quand le pointeur s'arrête (défaut 1000 ms, mesure de n8n). */
  persistanceMs?: number
  className?: string
}

const LONGUEUR_MAX = 24
const ONDE_MS = 520
const ONDE_RAYON = 6
const ONDE_VIE_MS = 300
/** Un toucher est un tap s'il dure moins que ceci et glisse de moins de 10 px. */
const TAP_MS = 350
const TAP_PX = 10

export function PixelTrail({ couleur = PALETTE.corail, case: pas = 24, persistanceMs = 1000, className }: PixelTrailProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduit = useMouvementReduit()

  useEffect(() => {
    const canvas = ref.current
    const hote = canvas?.parentElement
    if (!canvas || !hote) return
    if (reduit) { const t = dimensionner(canvas); t?.ctx.clearRect(0, 0, t.largeur, t.hauteur); return }
    const taille = Math.max(6, Math.round(pas))
    const ecart = Math.max(1, Math.round(taille / 6))
    const persistance = Math.max(200, persistanceMs)
    const vieMin = persistance * 0.3
    const vitesseQueue = 20 / persistance // cases par ms
    const hasard = graine(733)

    const base = versRvb(couleur)
    const ivoire = versRvb(PALETTE.ivoire)
    const tete = enCss(melange(ivoire, base, 0.2))
    const cou = enCss(melange(ivoire, base, 0.6))
    const corps = enCss(base)

    let toile = dimensionner(canvas)
    let colonnes = 0
    let rangs = 0
    // La ligne : les cases dans l'ordre du trajet (la tête en dernier), leur naissance, leur étincelle.
    let chemin: { k: number; n: number; e: boolean }[] = []
    let dette = 0
    const ondes: { c: number; r: number; t0: number; fait: number }[] = []
    const cercles = new Map<number, number>() // cases d'onde → naissance
    let dernier: { c: number; r: number } | null = null
    let visible = true
    let avant = 0

    const recalculer = () => {
      toile = dimensionner(canvas)
      colonnes = toile ? Math.ceil(toile.largeur / taille) : 0
      rangs = toile ? Math.ceil(toile.hauteur / taille) : 0
      chemin = []; cercles.clear(); ondes.length = 0; dernier = null
      toile?.ctx.clearRect(0, 0, toile.largeur, toile.hauteur)
    }

    const dedansGrille = (c: number, r: number) => c >= 0 && r >= 0 && c < colonnes && r < rangs
    const allumer = (c: number, r: number, t: number) => {
      if (!dedansGrille(c, r)) return
      const k = r * colonnes + c
      const queue = chemin[chemin.length - 1]
      if (queue && queue.k === k) return
      chemin.push({ k, n: t, e: hasard() < 0.025 })
      if (chemin.length > LONGUEUR_MAX) chemin.splice(0, chemin.length - LONGUEUR_MAX)
    }

    // Le chemin en angles droits entre deux cases (d'abord l'horizontale, puis la verticale).
    const tracer = (c0: number, r0: number, c1: number, r1: number, t: number) => {
      const sc = Math.sign(c1 - c0), sr = Math.sign(r1 - r0)
      let c = c0, r = r0, garde = 0
      while (c !== c1 && ++garde < 400) { c += sc; allumer(c, r, t) }
      while (r !== r1 && ++garde < 800) { r += sr; allumer(c, r, t) }
    }

    // Le rectangle de la toile, gardé entre deux mouvements (aucune mise en page forcée à chaque pointermove) ; oublié au
    // défilement et au redimensionnement.
    let rect: DOMRect | null = null
    const oublier = () => { rect = null }
    const position = (e: PointerEvent) => {
      const b = (rect ??= canvas.getBoundingClientRect())
      const x = e.clientX - b.left, y = e.clientY - b.top
      return { c: Math.floor(x / taille), r: Math.floor(y / taille), dedans: x >= 0 && y >= 0 && x < b.width && y < b.height }
    }

    const image = (maintenant: number) => {
      if (!toile) return false
      const debut = performance.now()
      const dt = avant ? Math.min(64, maintenant - avant) : 16
      avant = maintenant
      const { ctx, largeur, hauteur } = toile
      ctx.clearRect(0, 0, largeur, hauteur)

      // La queue poursuit la tête : une case part quand elle a vécu sa vie minimale, au plus `vitesseQueue` cases par ms.
      dette = Math.min(dette + dt * vitesseQueue, LONGUEUR_MAX)
      while (chemin.length && maintenant - chemin[0].n > vieMin && dette >= 1) { chemin.shift(); dette -= 1 }
      if (!chemin.length) dette = 0

      // Les ondes du toucher : un anneau par rayon entier, allumé une seule fois.
      for (let i = ondes.length - 1; i >= 0; i--) {
        const o = ondes[i]
        const rayon = Math.min(ONDE_RAYON, Math.floor(((maintenant - o.t0) / ONDE_MS) * ONDE_RAYON))
        for (let rr = o.fait + 1; rr <= rayon; rr++) {
          for (let dr = -rr; dr <= rr; dr++) for (let dc = -rr; dc <= rr; dc++) {
            if (Math.round(Math.hypot(dc, dr)) === rr && dedansGrille(o.c + dc, o.r + dr)) cercles.set((o.r + dr) * colonnes + o.c + dc, maintenant)
          }
        }
        o.fait = Math.max(o.fait, rayon)
        if (o.fait >= ONDE_RAYON) ondes.splice(i, 1)
      }

      const cote = taille - ecart
      const decal = ecart / 2
      const peindre = (k: number) => ctx.fillRect((k % colonnes) * taille + decal, ((k / colonnes) | 0) * taille + decal, cote, cote)
      ctx.globalAlpha = 0.9
      for (const [k, n] of cercles) {
        if (maintenant - n > ONDE_VIE_MS) { cercles.delete(k); continue }
        ctx.fillStyle = corps; peindre(k)
      }
      for (let i = 0; i < chemin.length; i++) {
        const d = chemin.length - 1 - i // distance à la tête
        const x = chemin[i]
        ctx.fillStyle = x.e ? PALETTE.etincelle : d === 0 ? tete : d < 3 ? cou : corps
        peindre(x.k)
      }
      ctx.globalAlpha = 1
      mesurer('traine', performance.now() - debut)
      const encore = chemin.length > 0 || ondes.length > 0 || cercles.size > 0
      if (!encore) avant = 0
      return encore
    }

    const anim = boucle(image)

    const bouge = (e: PointerEvent) => {
      if (!visible || e.pointerType === 'touch') return
      const p = position(e)
      if (!p.dedans) { dernier = null; return }
      const t = performance.now()
      if (dernier) tracer(dernier.c, dernier.r, p.c, p.r, t); else allumer(p.c, p.r, t)
      dernier = { c: p.c, r: p.r }
      anim.demarrer()
    }
    const sort = () => { dernier = null }

    // Le toucher : l'onde ne part qu'au relâché d'un tap. Un doigt qui fait défiler déclenche pointercancel : rien ne s'allume.
    let appui: { id: number; x: number; y: number; t: number } | null = null
    const appuie = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      appui = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const annule = () => { appui = null }
    const relache = (e: PointerEvent) => {
      const a = appui
      appui = null
      if (!a || a.id !== e.pointerId || !visible) return
      if (performance.now() - a.t > TAP_MS || Math.hypot(e.clientX - a.x, e.clientY - a.y) > TAP_PX) return
      const p = position(e)
      if (!p.dedans) return
      ondes.push({ c: p.c, r: p.r, t0: performance.now(), fait: -1 })
      anim.demarrer()
    }

    recalculer()
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { oublier(); recalculer() }) : null
    ro?.observe(canvas)
    const finSurveillance = surveiller(hote, (v) => {
      visible = v
      anim.permettre(v)
      avant = 0
      if (v && (chemin.length || cercles.size)) anim.demarrer()
      if (!v) dernier = null
    }, '0px')
    window.addEventListener('scroll', oublier, { passive: true, capture: true })
    hote.addEventListener('pointermove', bouge, { passive: true })
    hote.addEventListener('pointerleave', sort, { passive: true })
    hote.addEventListener('pointerdown', appuie, { passive: true })
    hote.addEventListener('pointerup', relache, { passive: true })
    hote.addEventListener('pointercancel', annule, { passive: true })
    return () => {
      anim.arreter()
      ro?.disconnect()
      finSurveillance()
      window.removeEventListener('scroll', oublier, { capture: true })
      hote.removeEventListener('pointermove', bouge)
      hote.removeEventListener('pointerleave', sort)
      hote.removeEventListener('pointerdown', appuie)
      hote.removeEventListener('pointerup', relache)
      hote.removeEventListener('pointercancel', annule)
    }
  }, [couleur, pas, persistanceMs, reduit])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      data-pixels="traine"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'block' }}
    />
  )
}
