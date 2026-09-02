'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

// Motion de la page-plateforme.
//  • Smooth scroll Lenis : même « glisse » premium que le site vitrine (cohérence des deux surfaces).
//  • Révélations au scroll (.plat-reveal) via IntersectionObserver, filet de sécurité anti-blocage.
//  • Parallax doux des halos (aurora) → profondeur ambiante, façon interface Claude.
//  • prefers-reduced-motion : tout visible, aucun mouvement, pas de smooth scroll.
export default function PlatMotion() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.plat-reveal'))
    const showAll = () => els.forEach((e) => e.classList.add('in'))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { showAll(); return }
    const root = document.querySelector('.plat')
    root?.classList.add('plat-armed')

    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io?.unobserve(en.target) } })
      }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
      els.forEach((e) => {
        if (e.getBoundingClientRect().top < window.innerHeight * 0.9) e.classList.add('in')
        else io!.observe(e)
      })
    } else showAll()

    // Smooth scroll Lenis + ancres feutrées — DESKTOP uniquement. Sur mobile, scroll natif
    // (meilleur que l'inertie JS) ; les reveals + les halos CSS restent actifs.
    const mobile = window.innerWidth < 760 || matchMedia('(pointer: coarse)').matches
    let lenis: Lenis | null = null
    let rafId = 0
    let onAnchor: ((ev: Event) => void) | null = null
    try {
      if (mobile) throw new Error('mobile: scroll natif')
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1, smoothWheel: true })
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
    } catch { lenis = null }

    // CTA collant mobile : masqué dès que la section contact entre dans le champ (évite le doublon avec le formulaire).
    let ioCta: IntersectionObserver | null = null
    const sticky = document.querySelector<HTMLElement>('.plat-sticky')
    const contact = document.querySelector('#contact')
    if (sticky && contact && 'IntersectionObserver' in window) {
      ioCta = new IntersectionObserver((entries) => {
        entries.forEach((en) => sticky.classList.toggle('gone', en.isIntersecting))
      }, { threshold: 0.01 })
      ioCta.observe(contact)
    }

    const safety = setTimeout(() => { root?.classList.remove('plat-armed'); showAll() }, 3000)
    return () => {
      io?.disconnect(); ioCta?.disconnect(); clearTimeout(safety)
      if (lenis) { lenis.destroy(); cancelAnimationFrame(rafId); if (onAnchor) document.removeEventListener('click', onAnchor) }
    }
  }, [])
  return null
}
