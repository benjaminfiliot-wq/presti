// components/ui/Carrousel.tsx — carrousel accessible, refonte 18/10 étape 4.2.
// Règle du prompt (§4 étape 4.2) : JAMAIS d'avance automatique sans contrôle. Par défaut il n'avance pas seul ; avec
// `avance` (ms) il avance, mais un bouton Pause/Lecture est toujours là, le survol et le focus le suspendent, et
// prefers-reduced-motion coupe l'avance. Précédent / suivant / points ; ← → au clavier quand le carrousel a le focus.
// Annonces : « n sur N » (aria-roledescription), région polie quand il ne défile pas seul.
// Sans JavaScript : les diapositives s'empilent (.ui-arme absent), rien n'est caché.
'use client'

import './ui.css'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icone } from './icones'

export default function Carrousel({ diapos, etiquette, avance, onChange }: {
  diapos: { id: string; titre: string; contenu: ReactNode }[]; etiquette: string; avance?: number; onChange?: (i: number) => void
}) {
  const [i, setI] = useState(0)
  const [arme, setArme] = useState(false)
  const [joue, setJoue] = useState(false)
  const [suspendu, setSuspendu] = useState(false)
  const racine = useRef<HTMLElement>(null)
  const n = diapos.length

  useEffect(() => {
    setArme(true)
    if (avance && !matchMedia('(prefers-reduced-motion: reduce)').matches) setJoue(true)
  }, [avance])
  const aller = useCallback((k: number) => { const j = ((k % n) + n) % n; setI(j); onChange?.(j) }, [n, onChange])
  useEffect(() => {
    if (!joue || suspendu || !avance || n < 2) return
    const t = setTimeout(() => aller(i + 1), avance)
    return () => clearTimeout(t)
  }, [joue, suspendu, avance, i, n, aller])

  return (
    <section ref={racine} className={`ui-carrousel${arme ? ' ui-arme' : ''}`} aria-roledescription="carrousel" aria-label={etiquette}
      onMouseEnter={() => setSuspendu(true)} onMouseLeave={() => setSuspendu(false)}
      onFocus={() => setSuspendu(true)} onBlur={(e) => { if (!racine.current?.contains(e.relatedTarget as Node)) setSuspendu(false) }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); aller(i + 1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); aller(i - 1) } }}>
      <div className="ui-carrousel-vue" aria-live={joue && !suspendu ? 'off' : 'polite'}>
        <div className="ui-carrousel-piste" style={arme ? { transform: `translateX(-${i * 100}%)` } : undefined}>
          {diapos.map((d, k) => (
            <div key={d.id} className="ui-carrousel-diapo" role="group" aria-roledescription="diapositive" aria-label={`${k + 1} sur ${n} : ${d.titre}`} aria-hidden={arme && k !== i} inert={arme && k !== i ? true : undefined}>
              {d.contenu}
            </div>
          ))}
        </div>
      </div>
      {n > 1 ? (
        <div className="ui-carrousel-nav">
          <ul className="ui-carrousel-pts">
            {diapos.map((d, k) => (
              <li key={d.id}><button type="button" aria-label={`Diapositive ${k + 1} : ${d.titre}`} aria-current={k === i} onClick={() => aller(k)} /></li>
            ))}
          </ul>
          <button type="button" className="ui-ctl" aria-label="Précédente" onClick={() => aller(i - 1)}><Icone nom="gauche" /></button>
          {avance ? (
            <button type="button" className="ui-ctl" aria-label={joue ? 'Mettre en pause' : 'Reprendre le défilement'} aria-pressed={!joue} onClick={() => setJoue((v) => !v)}>
              <Icone nom={joue ? 'pause' : 'lecture'} />
            </button>
          ) : null}
          <button type="button" className="ui-ctl" aria-label="Suivante" onClick={() => aller(i + 1)}><Icone nom="droite" /></button>
        </div>
      ) : null}
    </section>
  )
}
