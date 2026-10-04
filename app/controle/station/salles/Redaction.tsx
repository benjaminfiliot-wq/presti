'use client'

import { apiDirection } from '../../client'
import { Verdicts } from './Envois'
import Fenetre, { Corps, Tuile, type SalleProps } from './Fenetre'
import { usePanneau, type Rep } from './lecture'

// La Rédaction (fiche 026-120, revue du 25/09) : ce que les rédacteurs ont produit et ce que les juges en ont dit. Les variantes
// de message (contacts touchés et « oui » reçus), les envois du jour avec leurs trois verdicts (J1, J3, 2e juge), le nombre
// de rejets et les modèles suspendus. Lecture seule : aucun bouton.
type Variante = { contacts: number; oui: number }
type Envoi = { id: string; canal: string; type: string; variante: string | null; verdicts?: { j1?: string | null; j3?: string | null; second?: string | null } }
type Vue = { variantes: Record<string, Variante>; envois: Envoi[]; rejets: number; modeles_suspendus: string[] }

export default function Redaction({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=redaction'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="redaction" titre="Rédaction" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.envois?.length ?? null }}>
      <Corps etat={etat} quoi="Rédaction">
        {(vue) => (
          <>
            <div className="mc-tuiles" data-groupe="redaction">
              <Tuile libelle="REJETS" attribut="rejets">{vue.rejets}</Tuile>
            </div>
            <h3 className="mc-titre-zone">VARIANTES</h3>
            {Object.keys(vue.variantes).length === 0 ? <p className="mc-etat">Aucune variante mesurée.</p> : (
              <ul className="mc-liste" data-groupe="variantes">
                {Object.entries(vue.variantes).map(([nom, y]) => <li key={nom} data-variante={nom}><span className="mc-chiffre">{`${nom} · ${y.contacts} contacts · ${y.oui} oui`}</span></li>)}
              </ul>
            )}
            <h3 className="mc-titre-zone">ENVOIS DU JOUR</h3>
            {vue.envois.length === 0 ? <p className="mc-etat">Aucun envoi aujourd’hui.</p> : (
              <ul className="mc-liste" data-groupe="envois-du-jour">
                {vue.envois.map((e) => (
                  <li key={e.id} data-envoi={e.id}>
                    <small className="mc-doux">{e.canal} · {e.type} · variante {e.variante ?? '—'}</small>
                    <Verdicts verdicts={e.verdicts} />
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mc-titre-zone">MODÈLES SUSPENDUS</h3>
            {vue.modeles_suspendus.length === 0 ? <p className="mc-etat">aucun</p> : (
              <ul className="mc-liste" data-groupe="modeles-suspendus">
                {vue.modeles_suspendus.map((m) => <li key={m}><span className="mc-chiffre">{m}</span></li>)}
              </ul>
            )}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
