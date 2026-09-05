'use client'

import { useEffect } from 'react'

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

    // v8 A1.8 — téléphone (ou écran tactile) : version légère, sans GSAP ni parallax. Les révélations
    // se font par IntersectionObserver (une classe, une transition CSS), les compteurs sont posés
    // d'emblée. GSAP ne se charge que sur bureau, à la demande : 70 Ko de moins sur mobile.
    const mobile = window.innerWidth < 760 || !matchMedia('(hover:hover) and (pointer:fine)').matches
    if (mobile) {
      countEls.forEach((e) => { e.textContent = (e.dataset.to || '0') + (e.dataset.suffix || '') })
      const io = new IntersectionObserver((entries) => {
        for (const en of entries) if (en.isIntersecting) { (en.target as HTMLElement).classList.add('in'); io.unobserve(en.target) }
      }, { rootMargin: '0px 0px -8% 0px' })
      revealEls.forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add('in'); else io.observe(el) })
      const stageM = document.querySelector<HTMLElement>('.lp-stage')
      const ioStageM = stageM ? new IntersectionObserver((e) => { stageM.classList.toggle('hors-champ', !(e[0]?.isIntersecting ?? true)) }) : null
      if (stageM) ioStageM?.observe(stageM)
      const safetyM = setTimeout(() => { lp?.classList.remove('reveal-armed'); showAll() }, 4000)
      return () => { io.disconnect(); ioStageM?.disconnect(); clearTimeout(safetyM) }
    }

    let annule = false
    let revert: (() => void) | null = null
    const refreshes: ReturnType<typeof setTimeout>[] = []
    ;(async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      if (annule) return
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
      revert = () => ctx.revert()
      refreshes.push(setTimeout(() => ScrollTrigger.refresh(), 400))
    })()

    // Scène du hero : ses deux animations CSS sont infinies et tournaient encore quand le visiteur
    // était en bas de page (audit final G). On les met en pause dès qu'elle quitte l'écran — c'est
    // le seul endroit de la landing où une boucle sans fin est posée.
    const stage = document.querySelector<HTMLElement>('.lp-stage')
    let ioStage: IntersectionObserver | null = null
    if (stage && 'IntersectionObserver' in window) {
      ioStage = new IntersectionObserver((e) => { stage.classList.toggle('hors-champ', !(e[0]?.isIntersecting ?? true)) })
      ioStage.observe(stage)
    }

    // filet : après 4 s on DÉSARME (contenu visible sans dépendre d'une transition/rAF) + reveal complet
    const safety = setTimeout(() => { lp?.classList.remove('reveal-armed'); showAll() }, 4000)
    return () => { annule = true; revert?.(); refreshes.forEach(clearTimeout); clearTimeout(safety); ioStage?.disconnect() }
  }, [])

  return null
}
