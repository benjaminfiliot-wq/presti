'use client'

import { useEffect, useState } from 'react'
import type { Urgence } from '@/lib/crm/alertes'

// « Urgences du jour » : la liste de ce qu'il faut regarder en premier, la plus grave d'abord. Chaque ligne vient d'une règle de
// lib/crm/alertes.ts (retard, livraison en retard, stock insuffisant, à facturer, demandes…) calculée sur les données du compte ;
// un clic ouvre l'objet concerné de la maquette (le chantier, le rayonnage, l'accueil). Posée sur la carte en 3D, en tête de liste en 2D.
//
// Lot 7 (Benj : « l'encart masque le coin de la carte ») : sur la carte, l'encart se REPLIE en un bouton « Urgences du jour » et son
// compteur — replié d'office au-delà de deux urgences ; le choix de l'artisan est retenu dans ce navigateur (localStorage, sous
// try/catch : navigation privée ou stockage bloqué, on revient à la règle par défaut).
export const CLE_URGENCES = 'presti-atelier-urgences'
/** Ouvert ou replié au premier affichage : le choix retenu, sinon ouvert jusqu'à deux urgences, replié au-delà. */
export function urgencesOuvertes(n: number, retenu: string | null): boolean {
  if (retenu === 'ouvert') return true
  if (retenu === 'replie') return false
  return n <= 2
}
function lireChoix(): string | null { try { return window.localStorage.getItem(CLE_URGENCES) } catch { return null } }
function ecrireChoix(v: 'ouvert' | 'replie') { try { window.localStorage.setItem(CLE_URGENCES, v) } catch { /* non retenu : la règle par défaut reviendra */ } }

export default function Urgences({ urgences, variante, actif, onChoisir }: { urgences: Urgence[]; variante: 'carte' | 'liste'; actif: string | null; onChoisir: (u: Urgence) => void }) {
  const critiques = urgences.filter((u) => u.gravite === 'critique').length
  const carte = variante === 'carte'
  const [ouvert, setOuvert] = useState(() => (carte ? urgences.length <= 2 : true))
  // Le choix retenu se lit après le montage (le rendu serveur ne connaît pas le navigateur).
  useEffect(() => { if (carte) setOuvert(urgencesOuvertes(urgences.length, lireChoix())) }, [carte]) // eslint-disable-line react-hooks/exhaustive-deps
  const basculer = () => { const v = !ouvert; setOuvert(v); ecrireChoix(v ? 'ouvert' : 'replie') }
  return (
    <aside className={`atl-urg ${variante}${carte && !ouvert ? ' replie' : ''}`} aria-label="Urgences du jour" data-atelier-urgences data-ouvert={carte ? String(ouvert) : undefined}>
      {carte ? (
        <button type="button" className="atl-urg-tete" aria-expanded={ouvert} aria-controls="atl-urg-liste" onClick={basculer} data-atelier-urgences-bascule
          title={ouvert ? 'Replier les urgences (le choix est retenu)' : 'Déplier les urgences'}>
          <span className="atl-urg-chevron" aria-hidden="true">{ouvert ? '▾' : '▸'}</span>
          <span>Urgences du jour</span>
          <span className={`atl-urg-n tnum${critiques ? ' critique' : ''}`}>{urgences.length}</span>
        </button>
      ) : (
        <div className="atl-urg-tete statique"><span>Urgences du jour</span><span className={`atl-urg-n tnum${critiques ? ' critique' : ''}`}>{urgences.length}</span></div>
      )}
      <div id="atl-urg-liste" className="atl-urg-corps" hidden={carte && !ouvert}>
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
      </div>
    </aside>
  )
}
