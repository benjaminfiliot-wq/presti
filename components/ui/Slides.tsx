// components/ui/Slides.tsx — « slides épinglées » : le défilement fait avancer des étapes (refonte 18/10, étape 4.2).
// Ordinateur, mouvement permis : la section devient haute (n × 70 vh), la scène colle en haut de l'écran et l'étape suit le
// défilement ; les boutons et les étapes font défiler jusqu'à l'étape choisie (le défilement reste la seule source de vérité).
// Téléphone (≤ 900 px) ou prefers-reduced-motion : pas d'épinglage, un pas-à-pas à boutons (précédent / suivant / étapes).
// Clavier : ← → quand la scène a le focus. Sans JavaScript : la liste complète, chaque étape avec son visuel.
'use client'

import './ui.css'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icone } from './icones'

export type Etape = { id: string; sur: string; titre: string; texte: ReactNode; visuel: ReactNode }

export default function Slides({ etapes, etiquette, epingler = true }: { etapes: Etape[]; etiquette: string; epingler?: boolean }) {
  const [i, setI] = useState(0)
  const [arme, setArme] = useState(false)
  const [epingle, setEpingle] = useState(false)
  const racine = useRef<HTMLElement>(null)
  const n = etapes.length

  useEffect(() => {
    setArme(true)
    const mq = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)')
    const maj = () => setEpingle(epingler && mq.matches)
    maj(); mq.addEventListener('change', maj)
    return () => mq.removeEventListener('change', maj)
  }, [epingler])

  // Épinglé : l'étape = la part de la section déjà défilée.
  useEffect(() => {
    if (!epingle) return
    let raf = 0
    const lire = () => {
      raf = 0
      const el = racine.current; if (!el) return
      const r = el.getBoundingClientRect()
      const course = Math.max(1, el.offsetHeight - window.innerHeight * 0.7)
      const p = Math.min(0.9999, Math.max(0, -r.top / course))
      setI(Math.floor(p * n))
    }
    const surDefilement = () => { if (!raf) raf = requestAnimationFrame(lire) }
    lire(); window.addEventListener('scroll', surDefilement, { passive: true }); window.addEventListener('resize', surDefilement)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', surDefilement); window.removeEventListener('resize', surDefilement) }
  }, [epingle, n])

  const aller = useCallback((k: number) => {
    const j = Math.max(0, Math.min(n - 1, k))
    if (!epingle) { setI(j); return }
    const el = racine.current; if (!el) return
    const course = Math.max(1, el.offsetHeight - window.innerHeight * 0.7)
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + (course * (j + 0.5)) / n, behavior: 'smooth' })
  }, [epingle, n])

  const actif = etapes[i]
  return (
    <section ref={racine} className={`ui-slides${arme ? ' ui-arme' : ''}${epingle ? ' ui-epingle' : ''}`} style={{ ['--n' as string]: n }} aria-label={etiquette} aria-roledescription="diaporama">
      <div className="ui-slides-colle">
        <div className="ui-slides-scene" tabIndex={arme ? 0 : undefined}
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); aller(i + 1) } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); aller(i - 1) } }}>
          <div>
            <ol className="ui-slides-etapes">
              {etapes.map((e, k) => (
                <li key={e.id}>
                  <button type="button" className="ui-slides-etape" aria-current={arme && k === i ? 'step' : undefined} onClick={() => aller(k)} tabIndex={arme ? -1 : 0}>
                    <span className="ui-slides-sur">{e.sur}</span>
                    <span><b>{e.titre}</b><p>{e.texte}</p></span>
                  </button>
                  {/* Sans JS, le visuel suit son étape dans la liste. */}
                  {!arme ? <div className="ui-slides-visuel">{e.visuel}</div> : null}
                </li>
              ))}
            </ol>
            {arme ? <p className="ui-slides-texte-m" aria-live="polite">{actif?.texte}</p> : null}
            {arme ? (
              <div className="ui-slides-nav">
                <span className="ui-slides-progres" aria-hidden="true"><i style={{ transform: `scaleX(${(i + 1) / n})` }} /></span>
                <span className="ui-mono" aria-live="polite">{i + 1} / {n}</span>
                <button type="button" className="ui-ctl" aria-label="Étape précédente" onClick={() => aller(i - 1)} disabled={i === 0}><Icone nom="gauche" /></button>
                <button type="button" className="ui-ctl" aria-label="Étape suivante" onClick={() => aller(i + 1)} disabled={i === n - 1}><Icone nom="droite" /></button>
              </div>
            ) : null}
          </div>
          {arme ? (
            <div className="ui-slides-visuels">
              {etapes.map((e, k) => <div key={e.id} className={`ui-slides-visuel${k === i ? ' on' : ''}`} aria-hidden={k !== i}>{e.visuel}</div>)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
