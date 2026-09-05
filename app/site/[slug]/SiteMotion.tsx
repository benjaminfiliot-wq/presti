'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

// Animations du site vitrine — niveau cinématique (sites primés), mais TENUES et performantes.
//  • Mesures des positions mises en cache (montage + ResizeObserver) → ZÉRO lecture de layout
//    (getBoundingClientRect) dans la boucle rAF : plus de jank sur mobile milieu de gamme.
//  • Parallax lourd (hero image, manifeste, mots géants, panneaux) coupé sous 760 px, sur
//    pointeur grossier, sur saveData et réseau 2g/3g. Lenis (smooth scroll JS) désactivé sur
//    mobile : le scroll natif iOS/Android est meilleur.
//  • Révélations au scroll (IntersectionObserver) + cascade d'entrée du hero : conservées partout.
//  • prefers-reduced-motion : tout visible d'emblée, aucun mouvement, pas de smooth scroll.
export default function SiteMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.site')
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.site-reveal'))
    const showAll = () => reveals.forEach((e) => e.classList.add('in'))

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { showAll(); return }
    root?.classList.add('site-armed')

    // Entrée du hero (cascade) juste après le montage.
    const heroEls = reveals.filter((e) => e.closest('.site-hero'))
    heroEls.forEach((e, i) => { e.style.setProperty('--d', `${0.08 + i * 0.09}s`); e.classList.add('hero-in') })
    const t0 = setTimeout(() => heroEls.forEach((e) => e.classList.add('in')), 60)

    // Révélations au scroll (hors hero) — cheap, actif partout.
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { (en.target as HTMLElement).classList.add('in'); io?.unobserve(en.target) } })
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' })
      reveals.filter((e) => !e.closest('.site-hero')).forEach((e) => {
        if (e.getBoundingClientRect().top < innerHeight * 0.92) e.classList.add('in')
        else io!.observe(e)
      })
    } else showAll()

    // Contexte appareil / réseau : sur mobile ou lien lent, on allège fortement.
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    const slow = !!(conn && (conn.saveData || /(^|-)[23]g$/.test(conn.effectiveType || '')))
    const mobile = innerWidth < 760 || matchMedia('(pointer: coarse)').matches
    const doParallax = !mobile && !slow

    const heroIn = document.querySelector<HTMLElement>('.site-hero-in') // copie du hero (dérive + fondu), léger, gardé partout
    const heroImg = doParallax ? document.querySelector<HTMLElement>('.site-hero-img') : null
    const manif = doParallax ? document.querySelector<HTMLElement>('.site-manifesto-img') : null
    const words = doParallax ? Array.from(document.querySelectorAll<HTMLElement>('.site-word')) : []
    const feats = doParallax ? Array.from(document.querySelectorAll<HTMLElement>('.site-feature-media img')) : []

    // ── Positions mises en cache (document-relatives). Recalculées au resize / changement de layout.
    type M = { el: HTMLElement; top: number; h: number }
    let mManif: M | null = null
    let mWords: M[] = []
    let mFeats: M[] = []
    const measure = () => {
      const sy = scrollY
      mManif = manif ? { el: manif, top: manif.getBoundingClientRect().top + sy, h: manif.offsetHeight } : null
      mWords = words.map((el) => ({ el, top: el.getBoundingClientRect().top + sy, h: el.offsetHeight }))
      mFeats = feats.map((el) => ({ el, top: el.getBoundingClientRect().top + sy, h: el.offsetHeight }))
    }
    measure()
    let ro: ResizeObserver | null = null
    if (doParallax && 'ResizeObserver' in window) { ro = new ResizeObserver(() => measure()); ro.observe(document.body) }

    // ── Boucle : QUE des écritures de transform, aucune lecture de layout.
    const update = () => {
      const y = scrollY
      const vc = y + innerHeight / 2
      const vb = y + innerHeight // bas du viewport (document)
      if (heroImg) { const py = Math.min(y, innerHeight) * 0.3; heroImg.style.transform = `translate3d(0,${py.toFixed(1)}px,0) scale(1.08)` }
      if (heroIn) {
        const prog = Math.min(y / innerHeight, 1)
        heroIn.style.transform = `translate3d(0,${(prog * 64).toFixed(1)}px,0)`
        heroIn.style.opacity = String(Math.max(0, 1 - prog * 1.15))
      }
      if (mManif && mManif.top + mManif.h > y && mManif.top < vb) {
        const p = (mManif.top + mManif.h / 2 - vc) / innerHeight
        mManif.el.style.transform = `translate3d(0,${(p * -60).toFixed(1)}px,0)`
      }
      for (let i = 0; i < mWords.length; i++) {
        const m = mWords[i]
        if (m.top + m.h < y || m.top > vb) continue // hors viewport → on laisse le dernier transform
        const prog = 1 - (m.top + m.h / 2 - y) / innerHeight
        const x = (0.5 - prog) * 46 * (i % 2 ? 1 : -1)
        m.el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
      }
      for (let i = 0; i < mFeats.length; i++) {
        const m = mFeats[i]
        if (m.top + m.h < y || m.top > vb) continue
        const raw = (m.top + m.h / 2 - vc) / innerHeight
        const p = Math.max(-1, Math.min(1, raw))
        m.el.style.transform = `translate3d(0,${(p * -6).toFixed(2)}%,0) scale(1.16)`
      }
    }
    const hasAnim = !!(heroIn || heroImg || manif || words.length || feats.length)

    // ── Pilotage du scroll. Desktop : Lenis (glisse feutrée) + ancres douces. Mobile : scroll natif.
    let lenis: Lenis | null = null
    let rafId = 0
    let nativeRaf = 0
    let onNative: (() => void) | null = null
    let onAnchor: ((ev: Event) => void) | null = null
    const startNative = () => {
      onNative = () => { if (nativeRaf) return; nativeRaf = requestAnimationFrame(() => { nativeRaf = 0; update() }) }
      if (hasAnim) { addEventListener('scroll', onNative, { passive: true }) }
      update()
    }
    if (mobile) {
      startNative() // pas de Lenis sur mobile : le scroll natif est meilleur
    } else {
      try {
        lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1, smoothWheel: true })
        // Exposé à la visionneuse : `overflow:hidden` sur le body ne suffit pas, Lenis capte la molette (audit final, G-2.2).
        ;(window as unknown as { __lenis?: unknown }).__lenis = lenis
        lenis.on('scroll', update)
        const raf = (time: number) => { lenis!.raf(time); rafId = requestAnimationFrame(raf) }
        rafId = requestAnimationFrame(raf)
        onAnchor = (ev: Event) => {
          const t = (ev.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
          if (!t) return
          const id = t.getAttribute('href') || ''
          if (id.length < 2) return
          const dest = document.querySelector<HTMLElement>(id)
          if (!dest) return
          ev.preventDefault()
          lenis!.scrollTo(dest, { offset: -72, duration: 1.1 })
        }
        document.addEventListener('click', onAnchor)
        update()
      } catch { lenis = null; startNative() }
    }

    const safety = setTimeout(() => { root?.classList.remove('site-armed'); showAll() }, 3200)
    return () => {
      clearTimeout(t0); clearTimeout(safety); io?.disconnect(); ro?.disconnect()
      if (lenis) { delete (window as unknown as { __lenis?: unknown }).__lenis; lenis.destroy(); cancelAnimationFrame(rafId); if (onAnchor) document.removeEventListener('click', onAnchor) }
      if (onNative) { removeEventListener('scroll', onNative); if (nativeRaf) cancelAnimationFrame(nativeRaf) }
    }
  }, [])
  return null
}
