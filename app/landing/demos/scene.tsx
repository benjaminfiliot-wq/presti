'use client'
// Le moteur commun des démonstrations animées de la landing v2 (033-009, passe 3) : un vrai écran de Presti recréé, qui JOUE quand il
// entre à l'écran, comme HeroApp.
// - Rendu serveur à l'ÉTAT FINAL (toute la scène visible) : lisible sans JavaScript, et c'est ce que garde le mouvement réduit.
// - À l'entrée à l'écran (IntersectionObserver, 40 %), la scène repart de l'étape 0 et avance au rythme donné ; elle tient l'état final,
//   puis rejoue tant qu'elle reste à l'écran. Hors de l'écran ou onglet caché : plus aucun minuteur.
// - Chaque élément dit à partir de quelle étape il est là (vu(k)) ; la feuille fait le reste (transform et opacity seulement).
import { useEffect, useRef, useState, type ReactNode } from 'react'

export function useScene(rythme: number[], tenue = 3200) {
  const total = rythme.length // étapes 0..total ; l'état final est `total`
  const [etape, setEtape] = useState(total)
  const [joue, setJoue] = useState(false)
  const racine = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = racine.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    let minuteurs: number[] = []
    let visible = false
    const arreter = () => { minuteurs.forEach(clearTimeout); minuteurs = [] }
    const jouer = () => {
      arreter()
      setJoue(true); setEtape(0)
      let t = 0
      rythme.forEach((d, i) => { t += d; minuteurs.push(window.setTimeout(() => setEtape(i + 1), t)) })
      minuteurs.push(window.setTimeout(() => { if (visible && !document.hidden) jouer() }, t + tenue))
    }
    const io = new IntersectionObserver((e) => {
      const v = e[0]?.isIntersecting ?? false
      if (v && !visible) { visible = true; jouer() }
      else if (!v && visible) { visible = false; arreter(); setEtape(total) }
    }, { threshold: 0.4 })
    io.observe(el)
    const onglet = () => { if (document.hidden) { arreter(); setEtape(total) } else if (visible) jouer() }
    document.addEventListener('visibilitychange', onglet)
    return () => { io.disconnect(); arreter(); document.removeEventListener('visibilitychange', onglet) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Classe d'un élément présent à partir de l'étape k. */
  const vu = (k: number) => (etape >= k ? 'd-vu' : 'd-pas')
  return { etape, joue, racine, vu, fini: etape >= total }
}

/** La fenêtre d'un écran de Presti (même gabarit que la fenêtre du héros, lp-win de globals.css). */
export function Fenetre({ ecran, children, racine, joue, className = '' }: { ecran: string; children: ReactNode; racine: React.RefObject<HTMLDivElement | null>; joue: boolean; className?: string }) {
  return (
    <div className={`lp3-demo ${className}${joue ? ' est-joue' : ''}`} ref={racine}>
      <div className="lp3-demo-barre"><span className="d" /><span className="d" /><span className="d" /><span className="u">presti · {ecran}</span></div>
      <div className="lp3-demo-corps">{children}</div>
    </div>
  )
}

/** Une coche au trait (le vert reste réservé à « validé », « accepté », « payé »). */
export const Coche = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
