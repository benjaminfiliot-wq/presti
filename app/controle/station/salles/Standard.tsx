'use client'

import { apiDirection } from '../../client'
import Fenetre, { Corps, Pastille, type SalleProps } from './Fenetre'
import { heure, usePanneau, type Rep } from './lecture'

// Le Standard (fiche 026-120, revue du 25/09) : ce que le Répondeur reçoit et répond, en lecture seule. Les réponses du jour
// par classe (une pastille par classe, « sensible » et « rgpd » en rouge), puis le fil exact des dernières réponses. Le texte
// servi s'affiche tel quel (jamais interprété) ; c'est, avec la fiche du Répondeur, le seul endroit où un texte de prospect
// se lit. Aucun bouton : on ne répond pas d'ici.
type Classe = { classe: string; nombre: number }
type Reponse = { id: string; recu_le: string; classe: string; texte_recu: string; reponse_envoyee: string | null }
type Vue = { parClasse: Classe[]; reponses: Reponse[] }

const tonClasse = (c: string) => (c === 'sensible' || c === 'rgpd' ? 'crit' : c === 'oui' ? 'ok' : 'muet')

export default function Standard({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=standard'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="standard" titre="Standard" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.reponses?.length ?? null }}>
      <Corps etat={etat} quoi="Standard">
        {(vue) => (
          <>
            <h3 className="mc-titre-zone">RÉPONSES DU JOUR PAR CLASSE</h3>
            <ul className="mc-classes" data-groupe="par-classe">
              {vue.parClasse.map((c) => <li key={c.classe}><Pastille ton={tonClasse(c.classe)}>{`${c.classe} ${c.nombre}`}</Pastille></li>)}
            </ul>
            <h3 className="mc-titre-zone">DERNIÈRES RÉPONSES</h3>
            {vue.reponses.length === 0 ? <p className="mc-etat">Aucune réponse aujourd’hui.</p> : (
              <ol className="mc-liste mc-fil" data-groupe="reponses">
                {vue.reponses.map((r) => (
                  <li key={r.id} data-reponse={r.id}>
                    <div className="mc-meta"><small className="mc-chiffre">{heure(r.recu_le)}</small><Pastille ton={tonClasse(r.classe)}>{r.classe}</Pastille></div>
                    <p className="mc-texte-exact" data-recu>{r.texte_recu}</p>
                    {r.reponse_envoyee ? <p className="mc-texte-exact mc-envoyee" data-envoyee>↳ {r.reponse_envoyee}</p> : <small className="mc-doux">pas de réponse envoyée</small>}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
