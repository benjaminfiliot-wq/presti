'use client'

import { useEffect, useRef } from 'react'

// La bande de mots géants sous le héros (refonte du 11/10/2026) : deux lignes qui glissent en sens
// contraire au rythme du défilement, comme sur les sites de référence. Le défilement pose une seule
// variable CSS (--p, de 0 à 1) ; tout le mouvement est un transform, calculé par le navigateur.
// Hors écran : aucune écoute. Mouvement réduit : les lignes restent immobiles.
// Les verbes disent ce que fait le produit, sans promesse de plus : l'IA prépare, l'artisan envoie.
const LIGNE_1 = ['Prépare la réponse', 'Chiffre le devis', 'Facture']
const LIGNE_2 = ['Relance le client', 'Range la compta', 'Vous relisez']

function Ligne({ mots, classe }: { mots: string[]; classe: string }) {
  // Trois fois la même suite : la ligne déborde toujours de l'écran, quel que soit le décalage.
  const suite = [...mots, ...mots, ...mots]
  return <p className={`lp-mots-l ${classe}`} aria-hidden="true">{suite.map((m, i) => <span key={i}>{m}<i /></span>)}</p>
}

export default function BandeMots() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let image = 0
    const poser = () => {
      image = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)))
      el.style.setProperty('--p', p.toFixed(4))
    }
    const surDefilement = () => { if (!image) image = requestAnimationFrame(poser) }
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { window.addEventListener('scroll', surDefilement, { passive: true }); poser() }
      else window.removeEventListener('scroll', surDefilement)
    })
    obs.observe(el)
    return () => { obs.disconnect(); window.removeEventListener('scroll', surDefilement); cancelAnimationFrame(image) }
  }, [])

  return (
    <section ref={ref} className="lp-mots" aria-label="Ce que fait Presti">
      <Ligne mots={LIGNE_1} classe="l1" />
      <Ligne mots={LIGNE_2} classe="l2" />
      <p className="sr-only">Presti prépare la réponse, chiffre le devis, facture, relance le client et range la compta. Vous relisez avant d’envoyer.</p>
    </section>
  )
}
