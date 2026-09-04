'use client'

import { useEffect, useRef, useState } from 'react'
import DemoSequence from '@/app/DemoSequence'

// La vidéo de démonstration (v5 §5) : 26 s, sans son, sous-titres incrustés, montée à partir
// des CINQ MÊMES captures du vrai produit que DemoSequence (public/demo/scene-*.png →
// public/demo/hero.mp4). Elle ne se lance que lorsqu'elle est visible, et jamais si la
// personne préfère moins d'animation (prefers-reduced-motion) : dans ce cas, et à la demande
// (« scène par scène »), c'est la séquence cliquable qui s'affiche.

export default function DemoVideo() {
  const [parScene, setParScene] = useState(false)
  const [reduit, setReduit] = useState(false)
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduit(mq.matches)
    const onChange = () => setReduit(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v || parScene || reduit) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    }, { threshold: 0.35 })
    io.observe(v)
    return () => io.disconnect()
  }, [parScene, reduit])

  if (parScene || reduit) {
    return (
      <div className="dv">
        <DemoSequence />
        {!reduit && <p className="dv-bascule"><button type="button" onClick={() => setParScene(false)}>Revoir la vidéo</button></p>}
      </div>
    )
  }

  return (
    <div className="dv">
      <div className="dv-cadre">
        <video ref={ref} src="/demo/hero.mp4" poster="/demo/scene-1.png" muted loop playsInline preload="metadata"
          aria-label="Démonstration : une demande arrive le soir, un devis est prêt le matin, le client l'accepte sur son téléphone — cinq captures du vrai produit, sous-titrées." />
      </div>
      <p className="dv-bascule">Cinq captures du produit tel qu'il tourne aujourd'hui, montées bout à bout. <button type="button" onClick={() => setParScene(true)}>Voir scène par scène</button></p>
    </div>
  )
}
