'use client'

import { useEffect } from 'react'

export default function ScrollFx() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('.section'))
    const reveal = (e: Element) => e.classList.add('revealed')
    els.forEach((e) => {
      e.classList.add('will-reveal')
      // déjà (presque) visible → révéler tout de suite
      if (e.getBoundingClientRect().top < window.innerHeight * 0.9) reveal(e)
    })
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((en) => { if (en.isIntersecting) { reveal(en.target); io?.unobserve(en.target) } }),
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      )
      els.forEach((e) => { if (!e.classList.contains('revealed')) io!.observe(e) })
    }
    // filet de sécurité : rien ne reste jamais caché
    const safety = setTimeout(() => els.forEach(reveal), 2600)
    return () => { io?.disconnect(); clearTimeout(safety) }
  }, [])
  return null
}
