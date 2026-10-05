'use client'

import { apiDirection } from '../../client'
import { PauseAgent } from '../Gestes'
import Fenetre, { Corps, type SalleProps } from './Fenetre'
import { heure, jour, usePanneau, type Rep } from './lecture'

// Le panneau de la Salle de repos (fiche 026-189) : les agents en pause, depuis quand et pourquoi, tels que servis, et « Reprendre »
// (le geste de 026-117, PauseAgent, monté ici pour la direction seulement ; le mot de passe de sécurité est demandé par ce geste).
// Sans personne en pause : une phrase vraie, jamais une fenêtre « bientôt ». Seul le nom de l'agent s'écrit, jamais autre chose.
type EnPause = { nom: string; depuis: string | null; motif: string | null }
type Vue = { agents: EnPause[]; vide: string | null }

const VIDE = 'Personne en pause : l’équipage travaille.'

export default function Repos({ role, equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=repos'))
  const v = etat.rep?.valeur ?? null
  const libelle = (nom: string) => (equipage?.valeur?.agents ?? []).find((a) => a.nom === nom)?.libelle ?? nom
  return (
    <Fenetre cle="repos" titre="Salle de repos" onFermer={onFermer} etat={v ? etat : null} resume={{ equipage, poser, taches: v?.agents?.length ?? null }}>
      <Corps etat={etat} quoi="Salle de repos">
        {(vue) => (
          <>
            <h3 className="mc-titre-zone">EN PAUSE</h3>
            {vue.agents.length === 0 ? <p className="mc-etat" data-vide-repos>{vue.vide ?? VIDE}</p> : (
              <ul className="mc-liste" data-groupe="agents-en-pause">
                {vue.agents.map((a) => (
                  <li key={a.nom} data-agent={a.nom}>
                    <b>{libelle(a.nom)}</b>
                    {a.depuis ? <small className="mc-chiffre">depuis le {jour(a.depuis)} à {heure(a.depuis)}</small> : <small className="mc-doux">depuis une date non servie</small>}
                    {a.motif ? <p className="mc-texte-exact">{a.motif}</p> : null}
                    {role === 'direction' ? <PauseAgent nom={a.nom} etat="pause" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
