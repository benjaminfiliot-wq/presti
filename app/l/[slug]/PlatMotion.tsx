'use client'

import { useEffect } from 'react'

// Révélations au scroll pour la page-plateforme (léger, sans dépendance).
// Chaque élément .plat-reveal apparaît à l'entrée dans le viewport ; filet de sécurité
// (tout visible après 3 s) pour ne jamais bloquer de contenu.
export default function PlatMotion() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.plat-reveal'))
    const showAll = () => els.forEach((e) => e.classList.add('in'))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { showAll(); return }
    const root = document.querySelector('.plat')
    root?.classList.add('plat-armed')
    if (!('IntersectionObserver' in window)) { showAll(); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
    els.forEach((e) => {
      if (e.getBoundingClientRect().top < window.innerHeight * 0.9) e.classList.add('in')
      else io.observe(e)
    })
    const safety = setTimeout(() => { root?.classList.remove('plat-armed'); showAll() }, 3000)
    return () => { io.disconnect(); clearTimeout(safety) }
  }, [])
  return null
}
