'use client'

import { useEffect, type ReactNode } from 'react'

// Panneau latéral (droite) de l'inventaire — fiche matériau, import CSV, fiche fournisseur.
// Un seul composant pour les trois : même geste, même fermeture (croix, voile, Échap).

type Props = { titre: string; onFermer: () => void; children: ReactNode }

export default function Panneau({ titre, onFermer, children }: Props) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onFermer])

  return (
    <div className="inv-voile" onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer() }}>
      <aside className="inv-panneau" role="dialog" aria-modal="true" aria-label={titre}>
        <header className="inv-panneau-h">
          <h2>{titre}</h2>
          <button type="button" className="inv-panneau-x" onClick={onFermer} aria-label="Fermer">×</button>
        </header>
        <div className="inv-panneau-c">{children}</div>
      </aside>
    </div>
  )
}
