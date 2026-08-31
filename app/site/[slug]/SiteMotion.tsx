'use client'

import { useEffect } from 'react'

// Animations du site vitrine — niveau cinématique, mais tenu (pas de sur-animation).
//  • Séquence d'entrée au chargement (le hero se compose en cascade).
//  • Révélations au scroll (fade + montée) via IntersectionObserver, staggerées.
//  • Parallax doux sur l'image du hero (tier 3).
//  • prefers-reduced-motion : tout est visible d'emblée, aucun mouvement.
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

    // Révélations au scroll (hors hero).
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

    // Parallax : hero (scroll absolu) + manifeste (relatif à sa position dans le viewport).
    const heroImg = document.querySelector<HTMLElement>('.site-hero-img')
    const manif = document.querySelector<HTMLElement>('.site-manifesto-img')
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (heroImg) { const y = Math.min(scrollY, innerHeight) * 0.28; heroImg.style.transform = `translate3d(0,${y}px,0) scale(1.08)` }
        if (manif) {
          const r = manif.getBoundingClientRect()
          const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight // -1 → +1 autour du centre
          manif.style.transform = `translate3d(0,${p * -60}px,0)`
        }
      })
    }
    if (heroImg || manif) { addEventListener('scroll', onScroll, { passive: true }); onScroll() }

    const safety = setTimeout(() => { root?.classList.remove('site-armed'); showAll() }, 3200)
    return () => { clearTimeout(t0); clearTimeout(safety); io?.disconnect(); if (heroImg || manif) removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return null
}
