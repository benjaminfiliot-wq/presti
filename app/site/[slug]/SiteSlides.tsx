'use client'

import { useEffect, useRef } from 'react'

// Slides 3D de réalisations (Signature, v5 §10 H2) — ce que montrent les références FIND / DRIP :
// UNE chose par écran, épinglée au scroll, la photo qui arrive du fond et se redresse, le
// titre qui se révèle par masque, le numéro qui défile. Mise en scène en CSS 3D (perspective +
// preserve-3d) pilotée par GSAP ScrollTrigger en `scrub`. Pas de WebGL : plus léger, plus
// fiable, et c'est exactement le rendu des références.
//
// Repli : sans JS, sous 760 px, en reduced-motion ou en saveData, les panneaux restent des
// figures empilées en flux normal (rien de cassé, rien d'invisible). Le JS n'est qu'un
// rehaussement — et il est chargé en différé (import dynamique de gsap).
//
// Anti-fabrication : `fait` (lieu, matériau, durée) n'est affiché que si l'artisan l'a écrit.

export type Panneau = { image: string; titre?: string; specialite?: string; fait?: string; blur?: string }
export type StyleSlides = 'profondeur' | 'feuillete' | 'cinema'

type Props = { panneaux: Panneau[]; style?: StyleSlides; intensite?: number }

export default function SiteSlides({ panneaux, style = 'profondeur', intensite = 1 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root || panneaux.length < 2) return
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 760 || conn?.saveData) return

    let vivant = true
    let nettoyer: (() => void) | null = null
    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      if (!vivant) return
      // Deuxième garde, APRÈS l'import (quelques centaines de ms plus tard) : sur un téléphone,
      // la largeur de fenêtre peut encore être celle du viewport par défaut au moment du premier
      // test. Un écran étroit ou tactile ne s'arme jamais.
      if (innerWidth < 760 || matchMedia('(max-width: 759px)').matches || matchMedia('(pointer: coarse)').matches) return
      gsap.registerPlugin(ScrollTrigger)
      root.classList.add('armed')
      const panels = Array.from(root.querySelectorAll<HTMLElement>('.site-slide'))
      const n = panels.length
      const k = Math.max(0.4, Math.min(1.4, intensite))

      // État initial : seul le premier est visible et « posé ».
      panels.forEach((p, i) => {
        const img = p.querySelector<HTMLElement>('.site-slide-media')
        const txt = p.querySelector<HTMLElement>('.site-slide-txt')
        gsap.set(p, { zIndex: n - i, opacity: i === 0 ? 1 : 0 })
        gsap.set(img, i === 0 ? { scale: 1, z: 0, rotateX: 0, yPercent: 0 } : { scale: 1 - 0.14 * k, z: -220 * k, rotateX: 7 * k, yPercent: 0 })
        gsap.set(txt, { clipPath: i === 0 ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)' })
      })

      // Une timeline scrubée : chaque transition occupe une part égale du défilement épinglé.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${(n - 1) * innerHeight * 0.9}`, pin: true, scrub: 0.6, anticipatePin: 1 },
      })
      for (let i = 1; i < n; i++) {
        const sortant = panels[i - 1], entrant = panels[i]
        const imgS = sortant.querySelector('.site-slide-media'), imgE = entrant.querySelector('.site-slide-media')
        const txtS = sortant.querySelector('.site-slide-txt'), txtE = entrant.querySelector('.site-slide-txt')
        const t = i - 1
        if (style === 'feuillete') {
          // Panneaux qui se recouvrent : l'entrant monte depuis le bas et vient couvrir.
          // Le « set » est posé un souffle APRÈS t : à t exactement (progression 0 pour i = 1), il
          // s'exécuterait dès le chargement et rendrait le panneau suivant visible avant l'heure.
          tl.set(entrant, { opacity: 1, zIndex: n + i }, t + 0.02)
            .fromTo(imgE, { yPercent: 100, scale: 1 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, t)
            .to(imgS, { scale: 1 - 0.08 * k, yPercent: -6 * k, filter: 'brightness(0.6)', duration: 1, ease: 'power1.out' }, t)
            .to(txtS, { clipPath: 'inset(0 0 100% 0)', duration: 0.35 }, t)
            .to(txtE, { clipPath: 'inset(0 0 0% 0)', duration: 0.5 }, t + 0.5)
        } else if (style === 'cinema') {
          // Fondu + travelling lent : la photo qui part continue d'avancer, l'autre s'installe.
          tl.set(entrant, { opacity: 0, zIndex: n + i }, t)
            .to(imgS, { scale: 1 + 0.06 * k, duration: 1, ease: 'none' }, t)
            .to(sortant, { opacity: 0, duration: 0.6, ease: 'power1.inOut' }, t + 0.4)
            .to(entrant, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, t + 0.4)
            .fromTo(imgE, { scale: 1 - 0.06 * k }, { scale: 1, duration: 1, ease: 'none' }, t)
            .to(txtS, { clipPath: 'inset(0 0 100% 0)', duration: 0.3 }, t)
            .to(txtE, { clipPath: 'inset(0 0 0% 0)', duration: 0.5 }, t + 0.55)
        } else {
          // Profondeur (défaut) : l'entrant arrive du fond (scale .86 → 1, translateZ, tilt 7° qui se
          // redresse), le sortant glisse vers le haut et s'estompe.
          tl.set(entrant, { opacity: 1, zIndex: n + i }, t + 0.02)
            .to(imgS, { yPercent: -10 * k, scale: 1 + 0.03 * k, duration: 1, ease: 'power1.in' }, t)
            .to(sortant, { opacity: 0, duration: 0.55, ease: 'power1.in' }, t + 0.45)
            .to(imgE, { scale: 1, z: 0, rotateX: 0, duration: 1, ease: 'power2.out' }, t)
            .to(txtS, { clipPath: 'inset(0 0 100% 0)', duration: 0.3 }, t)
            .to(txtE, { clipPath: 'inset(0 0 0% 0)', duration: 0.5 }, t + 0.5)
        }
      }
      // Le compteur suit la progression (01, 02, …).
      const num = root.querySelector<HTMLElement>('.site-slides-num')
      tl.eventCallback('onUpdate', () => { if (num) num.textContent = String(Math.min(n, Math.round(tl.progress() * (n - 1)) + 1)).padStart(2, '0') })

      nettoyer = () => { tl.scrollTrigger?.kill(); tl.kill(); root.classList.remove('armed') }
    })()
    return () => { vivant = false; nettoyer?.() }
  }, [panneaux.length, style, intensite])

  if (panneaux.length < 2) return null
  return (
    <div className="site-slides" ref={ref} data-style={style}>
      <span className="site-slides-num" aria-hidden="true">01</span>
      <span className="site-slides-total" aria-hidden="true">/ {String(panneaux.length).padStart(2, '0')}</span>
      {panneaux.map((p, i) => (
        <figure className="site-slide" key={p.image + i}>
          <div className="site-slide-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.titre || 'Réalisation'} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
          </div>
          <figcaption className="site-slide-txt">
            <span className="site-slide-n">{String(i + 1).padStart(2, '0')}</span>
            {p.titre ? <h3>{p.titre}</h3> : null}
            {p.specialite ? <span className="site-slide-spe">{p.specialite}</span> : null}
            {p.fait ? <span className="site-slide-fait">{p.fait}</span> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
