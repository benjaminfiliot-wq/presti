'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

// Animations du site vitrine — niveau cinématique (sites primés), mais tenu (jamais de sur-animation).
//  • Smooth scroll Lenis : la « glisse » feutrée des sites Awwwards (inertie, jamais saccadé).
//  • Séquence d'entrée au chargement (le hero se compose en cascade).
//  • Hero cinétique : la copie dérive + se fond doucement quand on quitte le hero (profondeur).
//  • Révélations au scroll (fade + montée) via IntersectionObserver, staggerées.
//  • Parallax : image du hero, manifeste, MOTS GÉANTS (dérive horizontale façon « FIND »).
//  • prefers-reduced-motion : tout est visible d'emblée, aucun mouvement, pas de smooth scroll.
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

    // Éléments animés au scroll.
    const heroIn = document.querySelector<HTMLElement>('.site-hero-in')   // copie du hero (dérive + fondu)
    const heroImg = document.querySelector<HTMLElement>('.site-hero-img') // image plein-cadre (parallax)
    const manif = document.querySelector<HTMLElement>('.site-manifesto-img')
    const words = Array.from(document.querySelectorAll<HTMLElement>('.site-word'))

    // Transforms only (jamais de layout) → 60fps. Une seule fonction, appelée par Lenis à chaque frame.
    const update = () => {
      const y = scrollY
      if (heroImg) { const py = Math.min(y, innerHeight) * 0.3; heroImg.style.transform = `translate3d(0,${py.toFixed(1)}px,0) scale(1.08)` }
      if (heroIn) {
        const prog = Math.min(y / innerHeight, 1)           // 0 en haut → 1 quand le hero est passé
        heroIn.style.transform = `translate3d(0,${(prog * 64).toFixed(1)}px,0)` // lag parallax (profondeur)
        heroIn.style.opacity = String(Math.max(0, 1 - prog * 1.15))            // fondu de sortie
      }
      if (manif) {
        const rc = manif.getBoundingClientRect()
        const p = (rc.top + rc.height / 2 - innerHeight / 2) / innerHeight
        manif.style.transform = `translate3d(0,${(p * -60).toFixed(1)}px,0)`
      }
      for (let i = 0; i < words.length; i++) {
        const rc = words[i].getBoundingClientRect()
        const prog = 1 - (rc.top + rc.height / 2) / innerHeight // 0 en bas → 1 en haut
        const x = (0.5 - prog) * 46 * (i % 2 ? 1 : -1)          // dérive horizontale, alternée
        words[i].style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
      }
    }
    const hasAnim = !!(heroIn || heroImg || manif || words.length)

    // Smooth scroll Lenis — le cœur du feel « site primé ». Sa boucle rAF pilote aussi `update`.
    let lenis: Lenis | null = null
    let rafId = 0
    let nativeRaf = 0
    let onNative: (() => void) | null = null
    let onAnchor: ((ev: Event) => void) | null = null
    try {
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.6, smoothWheel: true })
      lenis.on('scroll', update)
      const raf = (time: number) => { lenis!.raf(time); rafId = requestAnimationFrame(raf) }
      rafId = requestAnimationFrame(raf)
      // Ancres du nav en scroll feutré (cohérent avec la glisse Lenis).
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
    } catch {
      // Repli sans smooth scroll (au cas où Lenis échoue) : scroll natif + throttle rAF.
      lenis = null
      onNative = () => { if (nativeRaf) return; nativeRaf = requestAnimationFrame(() => { nativeRaf = 0; update() }) }
      if (hasAnim) { addEventListener('scroll', onNative, { passive: true }); update() }
    }

    const safety = setTimeout(() => { root?.classList.remove('site-armed'); showAll() }, 3200)
    return () => {
      clearTimeout(t0); clearTimeout(safety); io?.disconnect()
      if (lenis) { lenis.destroy(); cancelAnimationFrame(rafId); if (onAnchor) document.removeEventListener('click', onAnchor) }
      if (onNative) { removeEventListener('scroll', onNative); if (nativeRaf) cancelAnimationFrame(nativeRaf) }
    }
  }, [])
  return null
}
