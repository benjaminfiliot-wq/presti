'use client'

import type { Scene, TypeObjet } from '@/lib/crm/atelier'

// Le repli 2D de l'atelier : les MÊMES objets que la maquette 3D (lib/crm/atelier.ts, construireScene), rangés par zone, et
// les MÊMES actions (chaque bouton ouvre le même panneau). Pensé pour le téléphone, le clavier et les lecteurs d'écran :
// une liste par zone, un bouton par objet, son état écrit en toutes lettres ; le filtre actif est annoncé, les objets qu'il
// écarte restent lisibles mais passent au second plan.
const ZONES: { type: TypeObjet; titre: string; vide: string }[] = [
  { type: 'chantier', titre: 'Chantiers', vide: 'Aucun chantier ouvert.' },
  { type: 'accueil', titre: 'Accueil', vide: '' },
  { type: 'categorie', titre: 'Dépôt — rayonnages', vide: 'Inventaire vide : ajoutez vos matériaux dans l’Inventaire.' },
  { type: 'vehicule', titre: 'Parking', vide: 'Aucun véhicule : ajoutez-les dans « Équipe & véhicules ».' },
  { type: 'membre', titre: 'Équipe', vide: 'Personne dans l’équipe pour l’instant.' },
  { type: 'bureau', titre: 'Bureau', vide: '' },
]

export default function Plan2D({ scene, allumes, filtreActif, selection, onSelection, raison }: {
  scene: Scene; allumes: Set<number>; filtreActif: boolean; selection: number | null; onSelection: (i: number) => void; raison: string | null
}) {
  return (
    <div className="atl-plan" data-atelier-plan>
      {raison && <p className="crm-note" role="note">{raison}</p>}
      <div className="atl-plan-grille">
        {ZONES.map((z) => {
          const objets = scene.objets.map((o, i) => ({ o, i })).filter((x) => x.o.type === z.type)
          return (
            <section key={z.type} className={`atl-plan-zone atl-plan-${z.type}`} aria-labelledby={`atl-z-${z.type}`}>
              <h3 id={`atl-z-${z.type}`}>{z.titre}{objets.length > 1 ? <span className="tnum"> · {objets.length}</span> : null}</h3>
              {objets.length === 0 ? <p className="crm-vide">{z.vide}</p> : (
                <ul>
                  {objets.map(({ o, i }) => {
                    const allume = !filtreActif || allumes.has(i)
                    return (
                      <li key={o.cle}>
                        <button type="button" className={`atl-plan-objet${allume ? '' : ' estompe'}${selection === i ? ' choisi' : ''}`}
                          aria-pressed={selection === i} aria-describedby={`atl-d-${i}`} onClick={() => onSelection(i)}
                          data-atelier-objet={o.cle}>
                          {o.epingle && <i style={{ background: o.epingle }} aria-hidden="true" />}
                          <span className="atl-plan-nom">{o.libelle}</span>
                          <span className="atl-plan-detail" id={`atl-d-${i}`}>{o.detail}{filtreActif && !allume ? ' · hors du filtre' : ''}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
