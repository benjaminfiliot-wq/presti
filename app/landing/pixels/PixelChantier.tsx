'use client'

// PixelChantier — une scène d'artisan en pixels qui se construit (version artisan des pixels qui avancent de mistral.ai).
// - mode « defilement » : la construction suit la progression de la section (GSAP ScrollTrigger, scrub 0,6) — on remonte, ça se
//   défait ; mode « boucle » : la scène se joue à chaque entrée à l'écran (IntersectionObserver), une fois, puis reste bâtie
//   (jamais plus de 4,8 s de mouvement automatique) ; sortie de l'écran, elle se remet à zéro pour rejouer à la prochaine entrée.
// - La place est réservée par aspect-ratio (aucun décalage de mise en page) ; rendu serveur : un bloc vide de la bonne taille.
// - En mouvement réduit, ou si GSAP ne se charge pas : la scène s'affiche directement dans son état final (le mur bâti, l'aube levée).
import { useEffect, useMemo, useRef } from 'react'
import { borne, boucle, chargerScrollTrigger, courbes, dimensionner, mesurer, surveiller, type Toile } from './moteur'
import { useMouvementReduit } from './reduit'
import { construireScene, type NomScene, type Scene } from './scenes'

export type PixelChantierProps = {
  scene: NomScene
  /** « defilement » (défaut) : liée au défilement ; « boucle » : jouée quand elle entre à l'écran. */
  mode?: 'defilement' | 'boucle'
  className?: string
}


/** Dessine la scène à la progression p (0 → 1), à l’opacité `opacite` (1 par défaut). */
function dessiner(toile: Toile, s: Scene, p: number, opacite = 1) {
  const debut = performance.now()
  const { ctx, largeur, hauteur, dpr } = toile
  ctx.clearRect(0, 0, largeur, hauteur)
  const cote = Math.min(largeur / s.colonnes, hauteur / s.rangs)
  const ox = (largeur - cote * s.colonnes) / 2
  const oy = (hauteur - cote * s.rangs) / 2
  const ecart = s.ecart && cote >= 7 ? s.ecart : 0
  // Chaque case est calée sur les pixels de l'écran, bords voisins partagés : aucune couture, aucun recouvrement (une case
  // translucide ne fait pas de ligne plus claire sur sa voisine).
  const net = (v: number) => Math.round(v * dpr) / dpr
  for (const k of s.cellules) {
    let a = k.a, x = k.x, y = k.y, eclair = 0
    if (k.e !== 'fixe') {
      const u = borne((p - k.d) / k.u)
      if (k.e === 'pose') {
        if (u <= 0) continue
        y -= (1 - courbes.rebond(u)) * k.dy
        a *= Math.min(1, u * 4)
        if (k.eclair && u > 0.5 && u < 1) eclair = 1 - (u - 0.5) / 0.5
      } else if (k.e === 'vol') {
        if (u <= 0) continue
        const e = courbes.sortie(u)
        x += k.dx * (1 - e); y += k.dy * (1 - e)
        a *= Math.min(1, u * 3)
      } else if (k.e === 'allume') {
        if (u <= 0) continue
        a *= courbes.lisse(u)
      } else if (k.e === 'eteint') {
        a *= 1 - courbes.lisse(u)
        if (a <= 0.01) continue
      } else if (k.e === 'monte') {
        y += Math.round(k.dy * (1 - courbes.traverse(u))) // par marches entières : le soleil monte case par case
        if (k.horizon !== undefined && y >= k.horizon) continue // derrière l'horizon : on ne la voit pas
      }
    }
    const px = net(ox + x * cote + ecart / 2), py = net(oy + y * cote + ecart / 2)
    const l = net(ox + (x + 1) * cote - ecart / 2) - px, h = net(oy + (y + 1) * cote - ecart / 2) - py
    ctx.globalAlpha = a * opacite
    ctx.fillStyle = k.c
    ctx.fillRect(px, py, l, h)
    if (eclair > 0 && k.eclair) {
      ctx.globalAlpha = eclair * 0.7 * opacite
      ctx.fillStyle = k.eclair
      ctx.fillRect(px, py, l, h)
    }
  }
  ctx.globalAlpha = 1
  mesurer(`scene-${s.nom}`, performance.now() - debut)
}

export function PixelChantier({ scene, mode = 'defilement', className }: PixelChantierProps) {
  const enveloppe = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLCanvasElement>(null)
  const s = useMemo(() => construireScene(scene), [scene])
  const reduit = useMouvementReduit()

  useEffect(() => {
    const canvas = ref.current, el = enveloppe.current
    if (!canvas || !el) return
    let toile = dimensionner(canvas)
    let p = 0
    const opacite = 1
    const rendre = () => { if (toile) dessiner(toile, s, p, opacite) }
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { toile = dimensionner(canvas); rendre() }) : null
    ro?.observe(canvas)

    if (reduit) {
      p = 1; rendre()
      return () => ro?.disconnect()
    }

    let annule = false
    let nettoyer: (() => void) | null = null

    if (mode === 'boucle') {
      // Jouée à chaque entrée à l'écran (une horloge qui n'avance que visible), une seule fois (≤ 4,8 s), puis la scène reste bâtie
      // et la boucle s'arrête : aucun mouvement automatique de plus de 5 s (WCAG 2.2.2). Sortie de l'écran une fois bâtie : remise à
      // zéro, hors de la vue, pour rejouer à la prochaine entrée.
      let horloge = 0
      let avant = 0
      let finie = false
      const anim = boucle((t) => {
        horloge += avant ? Math.min(50, t - avant) : 16
        avant = t
        p = Math.min(1, horloge / s.dureeBoucle)
        rendre()
        if (p >= 1) { finie = true; return false }
        return true
      })
      rendre()
      const fin = surveiller(el, (v) => {
        anim.permettre(v)
        avant = 0
        if (v && !finie) anim.demarrer()
        if (!v && finie) { horloge = 0; finie = false; p = 0; rendre() }
      }, '0px')
      nettoyer = () => { anim.arreter(); fin() }
    } else {
      rendre()
      chargerScrollTrigger().then(({ gsap }) => {
        if (annule) return
        const etat = { p: 0 }
        const tween = gsap.to(etat, {
          p: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'center 42%', scrub: 0.6, invalidateOnRefresh: true },
          onUpdate: () => { p = etat.p; rendre() },
        })
        nettoyer = () => { tween.scrollTrigger?.kill(); tween.kill() }
      }).catch(() => { if (!annule) { p = 1; rendre() } })
    }

    return () => { annule = true; ro?.disconnect(); nettoyer?.() }
  }, [s, mode, reduit])

  return (
    <div
      ref={enveloppe}
      aria-hidden="true"
      className={className}
      data-pixels={`chantier-${scene}`}
      style={{ position: 'relative', width: '100%', aspectRatio: `${s.colonnes} / ${s.rangs}` }}
    >
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
