'use client'

import { useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CLES_SALLE } from '@/lib/pilotage/equipage'
import type { BarreDonnees, Env, Equipage, Role, Tresorerie } from './Station'
import Atelier from './salles/Atelier'
import Envois from './salles/Envois'
import FicheAgent from './salles/FicheAgent'
import Fenetre, { PLAQUE_DE, type PoserUrl } from './salles/Fenetre'
import Machines from './salles/Machines'
import Recettes from './salles/Recettes'
import Redaction from './salles/Redaction'
import Reunion from './salles/Reunion'
import Standard from './salles/Standard'
import Tresorerie_ from './salles/Tresorerie'
import Usine from './salles/Usine'
import './salles/salles.css'

// Les panneaux de la station (fiche 026-120) : `?salle=<clé>` ouvre le panneau de la salle, `?agent=<nom>` la fiche de
// l'agent. Le panneau lit sa vue (GET /api/controle/station?vue=salle|agent) à l'ouverture, puis toutes les 30 s tant qu'il
// est ouvert et la page visible ; fermé, il ne lit plus rien. « Fermer » et Échap retirent le paramètre de l'adresse.
// Les salles sans panneau ouvrent la liste de leurs agents (chacun ouvre sa fiche) en attendant leur fiche (026-164, 026-188, 026-189).
export type PanneauxProps = {
  role: Role
  equipage: Env<Equipage> | null
  tresorerie: Tresorerie | null
  barre: Env<BarreDonnees> | null
}

const SALLES_SANS_PANNEAU = ['commandement', 'radar', 'crieur', 'studio', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos', 'ecommerce']
const NOM_AGENT = /^[a-z0-9_]{2,40}$/

/** La liste des agents d'une salle sans panneau : la plaque, ses agents en boutons (chacun ouvre sa fiche), la promesse du panneau. */
function SalleAgents({ cle, equipage, poser, onFermer }: { cle: string; equipage: Env<Equipage> | null; poser: PoserUrl; onFermer: () => void }) {
  const agents = (equipage?.valeur?.agents ?? []).filter((a) => a.salle === cle)
  return (
    <Fenetre cle={cle} attribut="data-salle-agents" titre={PLAQUE_DE[cle] ?? cle} onFermer={onFermer}>
      {agents.length === 0 ? <p className="mc-etat">Aucun agent dans cette salle pour l'instant.</p> : (
        <ul className="mc-liste mc-agents-salle" data-groupe="agents-de-la-salle">
          {agents.map((a) => (
            <li key={a.nom}><button type="button" className="mc-bouton" data-agent-salle={a.nom} onClick={() => poser({ agent: a.nom, salle: null })}>{a.libelle}</button></li>
          ))}
        </ul>
      )}
      <p className="mc-etat">Le panneau détaillé de cette salle viendra avec sa fiche.</p>
    </Fenetre>
  )
}

export default function Panneaux({ role, equipage, tresorerie, barre }: PanneauxProps) {
  const router = useRouter()
  const params = useSearchParams()
  const salle = params.get('salle')
  const agent = params.get('agent')
  const ouvert = !!agent || !!salle

  // Pose des paramètres dans l'adresse (null = retirer), sans quitter la page ni recharger.
  const poser: PoserUrl = useCallback((p) => {
    const q = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(p)) { if (v === null) q.delete(k); else q.set(k, v) }
    const s = q.toString()
    router.replace(`${window.location.pathname}${s ? `?${s}` : ''}`, { scroll: false })
  }, [router])
  const fermer = useCallback(() => poser({ salle: null, agent: null }), [poser])

  // Échap ferme le panneau ouvert ; fermé, rien n'écoute.
  useEffect(() => {
    if (!ouvert) return
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [ouvert, fermer])

  if (agent) return NOM_AGENT.test(agent) ? <FicheAgent key={agent} nom={agent} role={role} equipage={equipage} poser={poser} onFermer={fermer} /> : null
  if (!salle || !CLES_SALLE.includes(salle)) return null

  if (SALLES_SANS_PANNEAU.includes(salle)) return <SalleAgents cle={salle} equipage={equipage} poser={poser} onFermer={fermer} />

  const commun = { role, equipage, poser, onFermer: fermer }
  switch (salle) {
    case 'recettes': return <Recettes {...commun} tresorerie={tresorerie} />
    case 'tresorerie': return <Tresorerie_ {...commun} tresorerie={tresorerie} />
    case 'usine': return <Usine {...commun} barre={barre} />
    case 'atelier': return <Atelier {...commun} />
    case 'reunion': return <Reunion {...commun} />
    case 'envois': return <Envois {...commun} />
    case 'standard': return <Standard {...commun} />
    case 'redaction': return <Redaction {...commun} />
    case 'machines': return <Machines {...commun} />
    default: return null
  }
}
