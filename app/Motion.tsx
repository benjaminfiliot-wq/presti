'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Moteur d'animation de la landing (GSAP ScrollTrigger).
 * - Révèle les blocs `.reveal` au scroll (toggle de classe → transition CSS).
 * - Parallax léger sur les calques `.parallax` (data-speed).
 * - Compteurs `.count` (data-to / data-suffix).
 * Robustesse : repli `prefers-reduced-motion` (tout visible, aucun mouvement) +
 * filet de sécurité (rien ne reste jamais caché même si ScrollTrigger échoue).
 */
export default function Motion() {
  useEffect(() => {
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    const countEls = Array.from(document.querySelectorAll<HTMLElement>('.count'))
    const showAll = () => {
      revealEls.forEach((e) => e.classList.add('in'))
      countEls.forEach((e) => { e.textContent = (e.dataset.to || '0') + (e.dataset.suffix || '') })
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { showAll(); return }

    const lp = document.querySelector('.lp')
    lp?.classList.add('reveal-armed') // à partir d'ici, les .reveal sont cachés jusqu'à .in
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      // Révélations
      revealEls.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) { el.classList.add('in'); return }
        ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => el.classList.add('in') })
      })
      // Parallax (calques décoratifs uniquement)
      gsap.utils.toArray<HTMLElement>('.parallax').forEach((layer) => {
        const speed = Number(layer.dataset.speed || '-10')
        const host = layer.closest('section') || layer
        gsap.to(layer, {
          yPercent: speed, ease: 'none',
          scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        })
      })
      // Compteurs
      countEls.forEach((el) => {
        const to = Number(el.dataset.to || '0'); const suf = el.dataset.suffix || ''
        const obj = { v: 0 }
        gsap.to(obj, {
          v: to, duration: 1.4, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
          onUpdate: () => { el.textContent = Math.round(obj.v) + suf },
        })
      })
    })

    const refresh = setTimeout(() => ScrollTrigger.refresh(), 400)
    // filet : après 4 s on DÉSARME (contenu visible sans dépendre d'une transition/rAF) + reveal complet
    const safety = setTimeout(() => { lp?.classList.remove('reveal-armed'); showAll() }, 4000)
    return () => { ctx.revert(); clearTimeout(refresh); clearTimeout(safety) }
  }, [])

  return null
}
