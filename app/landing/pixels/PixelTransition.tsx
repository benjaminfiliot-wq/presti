'use client'

// PixelTransition — la bande entre deux sections : des marches de pixels qui coulent d'une couleur à l'autre quand on défile
// (la grammaire de mistral.ai). `de` est la couleur de la section du dessus, `vers` celle du dessous.
// - sens « monte » (défaut) : la couleur du dessous monte dans la bande en escalier quand on descend la page ;
//   sens « descend » : la couleur du dessus coule vers le bas.
// - Six rangs de cases ; chaque colonne a son seuil (des marches de huit colonnes, un peu de hasard fixe) ; la frontière avance case par
//   case, jamais en glissé ; la case qui vient de changer s'allume corail une fraction de seconde (le front qui avance) ; quelques
//   cases détachées flottent au-dessus du front, comme des braises.
// - Progression : GSAP ScrollTrigger (de « la bande entre par le bas » à « elle sort par le haut »). Sans script, ou en mouvement
//   réduit : la couture nette à mi-hauteur (CSS), puis l'escalier figé à mi-course.
import { useEffect, useRef } from 'react'
import { PALETTE, boucle, chargerScrollTrigger, dimensionner, graine, mesurer, surveiller, teinte, type Toile } from './moteur'
import { useMouvementReduit } from './reduit'

export type PixelTransitionProps = {
  /** couleur de la section du dessus — une couleur CSS littérale (hex, rgb()), jamais var(--…) (le canvas ne lit pas les variables) */
  de: string
  /** couleur de la section du dessous — même règle */
  vers: string
  /** hauteur de la bande en px CSS (défaut 96) */
  hauteur?: number
  sens?: 'monte' | 'descend'
}

const RANGS = 6
const MARCHE = 8
const AMPLEUR = 0.8
const FRONT_MS = 380

export function PixelTransition({ de, vers, hauteur = 96, sens = 'monte' }: PixelTransitionProps) {
  const enveloppe = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const reduit = useMouvementReduit()

  useEffect(() => {
    const canvas = ref.current, el = enveloppe.current
    if (!canvas || !el) return
    let toile: Toile | null = dimensionner(canvas)
    const front = teinte(PALETTE.corail, vers, 0.25)
    let motif: number[] = []
    let braises: number[] = []
    let niveaux: number[] = []
    let changes: number[] = []
    let p = 0.5

    const preparer = () => {
      toile = dimensionner(canvas)
      if (!toile) return
      const hasard = graine(577) // même graine à chaque mesure : l'escalier ne change pas quand on redimensionne
      const cote = toile.hauteur / RANGS
      const colonnes = Math.ceil(toile.largeur / cote) + 1
      motif = Array.from({ length: colonnes }, (_, c) => (c % MARCHE) / (MARCHE - 1) * 0.86 + hasard() * 0.14)
      braises = Array.from({ length: colonnes }, () => (hasard() < 0.2 ? 1 + Math.floor(hasard() * 2) : 0))
      niveaux = new Array(colonnes).fill(-1)
      changes = new Array(colonnes).fill(-1e9)
    }

    /** Combien de rangs, dans la colonne c, ont pris la couleur qui avance (0 → RANGS). */
    const niveau = (c: number) => Math.max(0, Math.min(RANGS, Math.round((p * (1 + AMPLEUR) - AMPLEUR * motif[c]) * RANGS)))

    const dessiner = (maintenant: number) => {
      if (!toile) return false
      const debut = performance.now()
      const { ctx, largeur, hauteur: h, dpr } = toile
      const cote = h / RANGS
      const net = (v: number) => Math.round(v * dpr) / dpr
      const avance = sens === 'monte' ? vers : de
      const recule = sens === 'monte' ? de : vers
      ctx.globalAlpha = 1
      ctx.fillStyle = recule
      ctx.fillRect(0, 0, largeur, h)
      let fronts = false
      for (let c = 0; c < motif.length; c++) {
        const n = niveau(c)
        if (niveaux[c] !== -1 && n !== niveaux[c]) changes[c] = maintenant
        niveaux[c] = n
        const x = net(c * cote), l = net((c + 1) * cote) - x
        // monte : la couleur qui avance occupe les n rangs du bas ; descend : les n rangs du haut.
        const y0 = sens === 'monte' ? h - n * cote : 0
        if (n > 0) { ctx.fillStyle = avance; ctx.fillRect(x, net(y0), l, net(n * cote)) }
        // Les braises : une case détachée au-delà du front.
        const b = braises[c]
        if (b && n > 0 && n + b < RANGS) {
          const yb = sens === 'monte' ? h - (n + b + 1) * cote : (n + b) * cote
          ctx.fillStyle = avance; ctx.fillRect(x, net(yb), l, net(cote))
        }
        // Le front qui vient d'avancer s'allume corail, puis reprend sa couleur.
        const age = maintenant - changes[c]
        if (age < FRONT_MS && n > 0 && n < RANGS) {
          fronts = true
          const yf = sens === 'monte' ? h - n * cote : (n - 1) * cote
          ctx.globalAlpha = 0.85 * (1 - age / FRONT_MS)
          ctx.fillStyle = front; ctx.fillRect(x, net(yf), l, net(cote))
          ctx.globalAlpha = 1
        }
      }
      mesurer('transition', performance.now() - debut)
      return fronts
    }

    const anim = boucle((t) => dessiner(t))
    const rendre = () => { if (dessiner(performance.now())) anim.demarrer() }
    preparer(); rendre()
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { preparer(); rendre() }) : null
    ro?.observe(canvas)
    if (reduit) return () => ro?.disconnect()

    let annule = false
    let nettoyer: (() => void) | null = null
    const finSurveillance = surveiller(el, (v) => { anim.permettre(v); if (v) rendre() }) // au retour : aucun front figé à moitié
    chargerScrollTrigger().then(({ ScrollTrigger }) => {
      if (annule) return
      const st = ScrollTrigger.create({
        trigger: el, start: 'top bottom', end: 'bottom top',
        onUpdate: (s) => { p = s.progress; rendre() },
        // Une remise à jour (chargement, redimensionnement) pose l'escalier sans faire briller le front : seul le défilement l'allume.
        onRefresh: (s) => { p = s.progress; niveaux.fill(-1); rendre() },
      })
      p = st.progress; niveaux.fill(-1); rendre()
      nettoyer = () => st.kill()
    }).catch(() => { /* reste figé à mi-course */ })
    return () => { annule = true; ro?.disconnect(); finSurveillance(); anim.arreter(); nettoyer?.() }
  }, [de, vers, sens, reduit])

  return (
    <div
      ref={enveloppe}
      aria-hidden="true"
      data-pixels="transition"
      style={{ position: 'relative', width: '100%', height: hauteur, background: `linear-gradient(to bottom, ${de} 50%, ${vers} 50%)` }}
    >
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
