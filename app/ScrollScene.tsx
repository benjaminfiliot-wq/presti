'use client'

import { useEffect, useRef } from 'react'

/**
 * Moteur de "scène épinglée" (scroll-scrub), porté de la démo devis validée.
 * Un enfant [data-stage] est épinglé (position:sticky en CSS) ; la progression 0→1
 * de la scène pilote les enfants via data-attributes :
 *   [data-anim] data-p="a,b" data-fx="up|scale|left|right|none"  → fondu + translation sur a→b
 *   [data-count]="839.4" data-p="a,b" data-dec="2" data-suffix=" €" → compteur FR sur a→b
 *   [data-tilt]="14"                                              → pivot 3D -deg→0 sur 0.1→0.6
 *   [data-stage] reçoit --p (0..1) pour piloter halos/reflets en CSS.
 * Robustesse : repli prefers-reduced-motion (état final direct), et si le JS ne tourne pas
 * le CSS laisse tout visible (aucun contenu bloqué).
 */
export default function ScrollScene({ children, className = '', height = '360vh' }: { children: React.ReactNode; className?: string; height?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = ref.current
    if (!scene) return
    const stage = scene.querySelector<HTMLElement>('[data-stage]')
    const anims = Array.from(scene.querySelectorAll<HTMLElement>('[data-anim]'))
    const counts = Array.from(scene.querySelectorAll<HTMLElement>('[data-count]'))
    const tilts = Array.from(scene.querySelectorAll<HTMLElement>('[data-tilt]'))

    const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
    const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a || 1))
    const fmt = (el: HTMLElement, v: number) => {
      const dec = Number(el.dataset.dec ?? '0')
      return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suffix || '')
    }
    const parseP = (el: HTMLElement) => { const [a, b] = (el.dataset.p || '0,1').split(',').map(Number); return [a, b] as const }

    const showFinal = () => {
      anims.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none' })
      counts.forEach((el) => { el.textContent = fmt(el, Number(el.dataset.count || '0')) })
      tilts.forEach((el) => { el.style.transform = 'none' })
      if (stage) stage.style.setProperty('--p', '1')
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { showFinal(); return }

    const render = (p: number) => {
      if (stage) stage.style.setProperty('--p', p.toFixed(3))
      anims.forEach((el) => {
        const [a, b] = parseP(el); const t = range(p, a, b); const fx = el.dataset.fx || 'up'
        el.style.opacity = String(t)
        el.style.transform =
          fx === 'up' ? `translateY(${((1 - t) * 18).toFixed(1)}px)`
          : fx === 'left' ? `translateX(${((1 - t) * -22).toFixed(1)}px)`
          : fx === 'right' ? `translateX(${((1 - t) * 22).toFixed(1)}px)`
          : fx === 'scale' ? `scale(${(0.9 + 0.1 * t).toFixed(3)})`
          : 'none'
      })
      counts.forEach((el) => { const [a, b] = parseP(el); el.textContent = fmt(el, Number(el.dataset.count || '0') * range(p, a, b)) })
      const mobile = window.innerWidth < 760
      tilts.forEach((el) => {
        let amt = Number(el.dataset.tilt || '14')
        if (mobile) amt = Math.min(amt, 18)            // pivot moins extrême sur mobile (reste à l'écran)
        const t = range(p, 0.08, 0.55)
        const ry = (1 - t) * -amt
        const rx = (1 - t) * Math.min(amt * 0.35, 12)
        const sc = (mobile ? 0.9 : 0.8) + (mobile ? 0.1 : 0.2) * t
        const tz = (1 - t) * (mobile ? -30 : -80)
        el.style.transform = `translateZ(${tz.toFixed(0)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(3)})`
      })
    }

    let ticking = false
    const onScroll = () => {
      const r = scene.getBoundingClientRect()
      const total = scene.offsetHeight - window.innerHeight
      render(clamp(-r.top / (total || 1)))
    }
    const handler = () => { if (!ticking) { requestAnimationFrame(() => { onScroll(); ticking = false }) ; ticking = true } }
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler)
    render(0); onScroll()
    return () => { window.removeEventListener('scroll', handler); window.removeEventListener('resize', handler) }
  }, [])

  return <div ref={ref} className={className} style={{ height }}>{children}</div>
}
