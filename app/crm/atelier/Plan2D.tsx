'use client'

import type { ReactNode } from 'react'
import { initiales, styleAvatar, type Scene, type TypeObjet } from '@/lib/crm/atelier'
import { LIBELLES_BASE, resumeProfil } from '@/lib/crm/infrastructure'

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
  // Infrastructure (drapeau crmAtelierVivant) : bâtiments, installations et machines de la base, chacun avec son panneau.
  { type: 'structure', titre: 'Installations', vide: '' },
  // Le poste des assistants (drapeau crmAtelierVivant) : sa zone n'est montrée que si l'objet existe dans la scène.
  { type: 'assistants', titre: 'Assistants', vide: '' },
]

export default function Plan2D({ scene, allumes, filtreActif, selection, onSelection, raison, avant, surligne = null, halo = null }: {
  scene: Scene; allumes: Set<number>; filtreActif: boolean; selection: number | null; onSelection: (i: number) => void; raison: string | null
  /** Ce qui se pose en tête du plan (urgences, briefing) : sur téléphone, c'est la première chose lue. */
  avant?: ReactNode
  /** Clé de l'objet surligné quelques secondes (l'accueil, quand une demande vient d'arriver en direct : drapeau crmAtelierVivant). */
  surligne?: string | null
  /** L'objet que l'assistant de gestion vient de toucher (21/10), même indexation que `selection` : un contour corail qui pulse (classe
   *  `halo`, atelier.css), distinct de la marque de sélection (`choisi`) — les deux peuvent se cumuler sans se confondre. */
  halo?: number | null
}) {
  return (
    <div className="atl-plan" data-atelier-plan>
      {raison && <p className="crm-note" role="note">{raison}</p>}
      {/* L'infrastructure (drapeau crmAtelierVivant) : le profil de la base, en une ligne — le plan reste simple. */}
      {scene.infra && (
        <p className="atl-plan-profil" data-atelier-profil={scene.infra.base}>
          <span className="atl-plan-base">{LIBELLES_BASE[scene.infra.base]}</span>
          <span>{resumeProfil(scene.infra.profil)}{scene.infra.auto ? ' · déduit de vos données' : ' · choisi par vous'}</span>
        </p>
      )}
      {avant}
      <div className="atl-plan-grille">
        {ZONES.map((z) => {
          const objets = scene.objets.map((o, i) => ({ o, i })).filter((x) => x.o.type === z.type)
          if ((z.type === 'assistants' || z.type === 'structure') && objets.length === 0) return null
          return (
            <section key={z.type} className={`atl-plan-zone atl-plan-${z.type}`} aria-labelledby={`atl-z-${z.type}`}>
              <h3 id={`atl-z-${z.type}`}>{z.titre}{objets.length > 1 ? <span className="tnum"> · {objets.length}</span> : null}</h3>
              {objets.length === 0 ? <p className="crm-vide">{z.vide}</p> : (
                <ul>
                  {objets.map(({ o, i }) => {
                    const allume = !filtreActif || allumes.has(i)
                    return (
                      <li key={o.cle}>
                        <button type="button" className={`atl-plan-objet${allume ? '' : ' estompe'}${selection === i ? ' choisi' : ''}${surligne === o.cle ? ' arrivee' : ''}${halo === i ? ' halo' : ''}`}
                          aria-pressed={selection === i} aria-describedby={`atl-d-${i}`} onClick={() => onSelection(i)}
                          data-atelier-objet={o.cle}>
                          {o.epingle && <i style={{ background: o.epingle }} aria-hidden="true" />}
                          <span className="atl-plan-nom">{o.libelle}</span>
                          <span className="atl-plan-detail" id={`atl-d-${i}`}>{o.detail}{filtreActif && !allume ? ' · hors du filtre' : ''}</span>
                          {(o.type === 'chantier' || o.type === 'assistants') && (o.badges.length > 0 || (o.info?.equipe.length ?? 0) > 0) && (
                            <span className="atl-plan-pied">
                              {(o.info?.equipe ?? []).slice(0, 4).map((m) => <i key={m.id} className="atl-av" style={styleAvatar(m.role)} title={m.nom}>{initiales(m.nom)}</i>)}
                              {(o.info?.equipe.length ?? 0) > 4 && <span className="muted">+{(o.info?.equipe.length ?? 0) - 4}</span>}
                              {o.badges.map((b) => <span key={b.type} className={`atl-badge g-${b.gravite}`}>{b.libelle}</span>)}
                            </span>
                          )}
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
