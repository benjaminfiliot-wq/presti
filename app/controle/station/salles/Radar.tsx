'use client'

import { apiDirection } from '../../client'
import type { Env } from '../Station'
import Fenetre, { Corps, Tuile, type SalleProps } from './Fenetre'
import { usePanneau, type Rep } from './lecture'

// Le Radar (fiche 026-164, §4.5) : les annonceurs repérés et recensés, froids d'un côté, chauds de l'autre. Le tapis du jour
// (trouvé, vérifié, maquette, contacté) vient de la sous-partie `tapis` de vue=direct ; l'entonnoir (7 et 30 jours) du bloc
// `entonnoir` du pilotage. Lecture seule, toutes les 5 min : l'écran n'ordonne, ne filtre et ne calcule rien, un `manque` servi
// s'affiche tel quel (jamais « 0 »), une source en panne se voit. Aucun bouton ni lien.
type Etape = { cle?: string; libelle: string; jour: number | null }
type Tapis = { etapes: Etape[] }
type Direct = { tapis?: Env<Tapis> | null }
type Fenetre_ = { contacts: number; reponses: number; oui: number; chauds: number }
type Entonnoir = { j7: Fenetre_; j30: Fenetre_ }

const CINQ_MINUTES = 300_000
const estBloc = (corps: any) => !!corps && typeof corps === 'object' && 'bloc' in corps
const SANS_TAPIS: Env<Tapis> = { valeur: null, manque: 'Le tapis n’est pas servi.' }

export default function Radar({ equipage, poser, onFermer }: SalleProps) {
  const direct = usePanneau(() => apiDirection<Rep<Direct>>('/api/controle/station?vue=direct'), undefined, CINQ_MINUTES)
  const entonnoir = usePanneau(() => apiDirection<Rep<Entonnoir>>('/api/controle/pilotage?bloc=entonnoir'), estBloc, CINQ_MINUTES)
  return (
    <Fenetre cle="radar" titre="Radar" onFermer={onFermer} etat={direct} resume={{ equipage, poser }}>
      <h3 className="mc-titre-zone">TAPIS DU JOUR</h3>
      <Corps etat={direct} quoi="Radar">
        {(d) => (
          <Corps etat={{ rep: (d.tapis ?? SANS_TAPIS) as Rep<Tapis>, panne: null }} quoi="Tapis">
            {(t) => t.etapes.length === 0 ? <p className="mc-etat">Aucun prospect pour l'instant.</p> : (
              <div className="mc-tuiles" data-groupe="tapis">
                {t.etapes.map((e) => <Tuile key={e.cle ?? e.libelle} libelle={e.libelle} attribut={`tapis-${e.cle ?? e.libelle}`}>{e.jour ?? '—'}</Tuile>)}
              </div>
            )}
          </Corps>
        )}
      </Corps>
      <h3 className="mc-titre-zone">ENTONNOIR</h3>
      <Corps etat={entonnoir} quoi="Entonnoir">
        {(e) => (
          <>
            {([['j7', '7 JOURS'], ['j30', '30 JOURS']] as const).map(([cle, titre]) => (
              <section key={cle} data-fenetre={cle} aria-label={titre}>
                <h4 className="mc-sous-titre">{titre}</h4>
                <div className="mc-tuiles" data-groupe={`entonnoir-${cle}`}>
                  <Tuile libelle="CONTACTS FROIDS" attribut={`${cle}-contacts`}>{e[cle].contacts}</Tuile>
                  <Tuile libelle="RÉPONSES" attribut={`${cle}-reponses`}>{e[cle].reponses}</Tuile>
                  <Tuile libelle="OUI" attribut={`${cle}-oui`}>{e[cle].oui}</Tuile>
                </div>
                <p className="mc-doux" data-chauds={cle}>chauds (entrants) : {e[cle].chauds}</p>
              </section>
            ))}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
