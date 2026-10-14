'use client'

import type { Urgence } from '@/lib/crm/alertes'

// « Urgences du jour » : la liste de ce qu'il faut regarder en premier, la plus grave d'abord. Chaque ligne vient d'une règle de
// lib/crm/alertes.ts (retard, livraison en retard, stock insuffisant, à facturer, demandes…) calculée sur les données du compte ;
// un clic ouvre l'objet concerné de la maquette (le chantier, le rayonnage, l'accueil). Posée sur la carte en 3D, en tête de liste en 2D.
export default function Urgences({ urgences, variante, actif, onChoisir }: { urgences: Urgence[]; variante: 'carte' | 'liste'; actif: string | null; onChoisir: (u: Urgence) => void }) {
  const critiques = urgences.filter((u) => u.gravite === 'critique').length
  return (
    <aside className={`atl-urg ${variante}`} aria-label="Urgences du jour" data-atelier-urgences>
      <details open={variante === 'liste' || urgences.length > 0}>
        <summary>
          <span>Urgences du jour</span>
          <span className={`atl-urg-n tnum${critiques ? ' critique' : ''}`}>{urgences.length}</span>
        </summary>
        {urgences.length === 0 ? <p className="crm-vide">Rien d’urgent aujourd’hui : aucun retard, aucune livraison attendue en vain, aucun stock manquant.</p> : (
          <ul>
            {urgences.map((u) => (
              <li key={u.cle}>
                <button type="button" className={`g-${u.gravite}${actif && u.objetCle === actif ? ' choisie' : ''}`} onClick={() => onChoisir(u)} data-atelier-urgence={u.type}>
                  <i aria-hidden="true" />
                  <span><b>{u.titre}</b><small>{u.detail}</small></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>
    </aside>
  )
}
