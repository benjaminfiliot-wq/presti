'use client'

import { useState } from 'react'

export type AvantApres = { avant: string; apres: string; titre?: string }

// Comparateur avant/après : les vraies photos de l'artisan, révélées au curseur (nettes, non
// déformées). Fonctionne partout, sans dépendance ni 3D. Chaque paire = son propre curseur.
function Compare({ pair }: { pair: AvantApres }) {
  const [v, setV] = useState(50)
  return (
    <figure className="site-aa">
      <div className="site-aa-stage" style={{ ['--x' as string]: v + '%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="site-aa-img" src={pair.avant} alt="Avant" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="site-aa-img after" src={pair.apres} alt="Après" draggable={false} style={{ clipPath: `inset(0 0 0 ${v}%)` }} />
        <span className="site-aa-tag l">Avant</span>
        <span className="site-aa-tag r">Après</span>
        <span className="site-aa-divider" style={{ left: `${v}%` }} aria-hidden="true"><span className="site-aa-knob" /></span>
        <input className="site-aa-range" type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} aria-label="Révéler l’après" />
      </div>
      {pair.titre ? <figcaption>{pair.titre}</figcaption> : null}
    </figure>
  )
}

export default function SiteAvantApres({ pairs }: { pairs: AvantApres[] }) {
  const ok = pairs.filter((p) => p && p.avant && p.apres)
  if (!ok.length) return null
  return <div className="site-aa-grid">{ok.map((p, i) => <Compare key={i} pair={p} />)}</div>
}
