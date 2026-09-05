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
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.reveal, .reveal-kids'))
    const countEls = Array.from(document.querySelectorAll<HTMLElement>('.count'))
    // Cascade : chaque enfant direct d'une grille .reveal-kids entre légèrement décalé.
    document.querySelectorAll<HTMLElement>('.reveal-kids').forEach((c) => {
      Array.from(c.children).forEach((ch, i) => (ch as HTMLElement).style.setProperty('--d', `${i * 0.08}s`))
    })
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

    // Scène du hero : ses deux animations CSS sont infinies et tournaient encore quand le visiteur
    // était en bas de page (audit final G). On les met en pause dès qu'elle quitte l'écran — c'est
    // le seul endroit de la landing où une boucle sans fin est posée.
    const stage = document.querySelector<HTMLElement>('.lp-stage')
    let ioStage: IntersectionObserver | null = null
    if (stage && 'IntersectionObserver' in window) {
      ioStage = new IntersectionObserver((e) => { stage.classList.toggle('hors-champ', !(e[0]?.isIntersecting ?? true)) })
      ioStage.observe(stage)
    }

    const refresh = setTimeout(() => ScrollTrigger.refresh(), 400)
    // filet : après 4 s on DÉSARME (contenu visible sans dépendre d'une transition/rAF) + reveal complet
    const safety = setTimeout(() => { lp?.classList.remove('reveal-armed'); showAll() }, 4000)
    return () => { ctx.revert(); clearTimeout(refresh); clearTimeout(safety); ioStage?.disconnect() }
  }, [])

  return null
}
