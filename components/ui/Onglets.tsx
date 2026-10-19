// components/ui/Onglets.tsx — onglets ARIA (tablist / tab / tabpanel), refonte 18/10 étape 4.2.
// Clavier : ← → passent d'un onglet à l'autre (et l'activent), Origine / Fin vont au premier / dernier ; un seul onglet est
// dans l'ordre de tabulation (tabindex mobile). Option `ancres` : l'onglet suit le # de l'adresse (`/#chiffres` ouvre l'onglet
// « chiffres »), ce qui garde vivantes les ancres de la landing actuelle (ARCHITECTURE.md §1.3).
// Sans JavaScript : la liste d'onglets est masquée et TOUS les panneaux sont visibles, chacun sous son titre (.ui-arme absent).
'use client'

import './ui.css'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export type Onglet = { id: string; libelle: ReactNode; contenu: ReactNode }

export default function Onglets({ onglets, initial, ancres = false, etiquette, onChange }: {
  onglets: Onglet[]; initial?: string; ancres?: boolean; etiquette: string; onChange?: (id: string) => void
}) {
  const base = useId()
  const [actif, setActif] = useState(initial ?? onglets[0]?.id)
  const [arme, setArme] = useState(false)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    setArme(true)
    if (!ancres) return
    const lire = () => { const h = decodeURIComponent(window.location.hash.slice(1)); if (onglets.some((o) => o.id === h)) setActif(h) }
    lire()
    window.addEventListener('hashchange', lire)
    return () => window.removeEventListener('hashchange', lire)
  }, [ancres, onglets])

  const choisir = (id: string, focus = false) => {
    setActif(id); onChange?.(id)
    if (ancres) history.replaceState(null, '', `#${id}`)
    if (focus) refs.current[onglets.findIndex((o) => o.id === id)]?.focus()
  }
  const touche = (e: KeyboardEvent, i: number) => {
    const n = onglets.length
    const cible = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (cible < 0) return
    e.preventDefault(); choisir(onglets[cible].id, true)
  }

  return (
    <div className={`ui-onglets${arme ? ' ui-arme' : ''}`}>
      <div className="ui-onglets-liste" role="tablist" aria-label={etiquette}>
        {onglets.map((o, i) => (
          <button key={o.id} ref={(el) => { refs.current[i] = el }} type="button" role="tab" className="ui-onglet"
            id={`${base}-t-${o.id}`} aria-controls={`${base}-p-${o.id}`} aria-selected={o.id === actif} tabIndex={o.id === actif ? 0 : -1}
            onClick={() => choisir(o.id)} onKeyDown={(e) => touche(e, i)}>
            {o.libelle}
          </button>
        ))}
      </div>
      {onglets.map((o) => (
        <div key={o.id} id={`${base}-p-${o.id}`} role="tabpanel" aria-labelledby={`${base}-t-${o.id}`} className="ui-onglet-panneau" tabIndex={0} hidden={arme && o.id !== actif}>
          <div className="ui-onglet-titre-repli" aria-hidden="true">{o.libelle}</div>
          {o.contenu}
        </div>
      ))}
    </div>
  )
}
