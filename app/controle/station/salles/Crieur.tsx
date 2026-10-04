'use client'

import { apiDirection } from '../../client'
import type { Bulle } from '../Station'
import Fenetre, { Corps, Pastille, Tuile, type SalleProps } from './Fenetre'
import { heure, usePanneau, type Rep } from './lecture'

// La Tour du Crieur (fiche 026-164, §4.5) : ce que le Crieur a programmé (ses bulles du fil, heure et texte tels que servis) et
// le nombre de réponses privées du jour (la ligne `reponse_privee` de la Salle des envois). Lecture seule, toutes les 5 min.
// Le texte d'une bulle s'affiche tel quel : jamais interprété comme du HTML. Aucun bouton ni lien.
type Fil = { bulles: Bulle[]; dernier_id?: number | null }
type Canal = { canal: string; texte: string }
type Envois = { parCanal?: Canal[] }

const CINQ_MINUTES = 300_000

export default function Crieur({ equipage, poser, onFermer }: SalleProps) {
  const fil = usePanneau(() => apiDirection<Rep<Fil>>('/api/controle/station?vue=fil&agent=crieur'), undefined, CINQ_MINUTES)
  const envois = usePanneau(() => apiDirection<Rep<Envois>>('/api/controle/station?vue=salle&salle=envois'), undefined, CINQ_MINUTES)
  const bulles = fil.rep?.valeur?.bulles?.length ?? null
  return (
    <Fenetre cle="crieur" titre="Tour du Crieur" onFermer={onFermer} etat={fil} resume={{ equipage, poser, taches: bulles }}>
      <h3 className="mc-titre-zone">RÉPONSES PRIVÉES DU JOUR</h3>
      <Corps etat={envois} quoi="Salle des envois">
        {(v) => {
          const c = v.parCanal?.find((x) => x.canal === 'reponse_privee')
          return c ? <div className="mc-tuiles" data-groupe="reponses-privees"><Tuile libelle="RÉPONSES PRIVÉES" attribut="reponses-privees">{c.texte}</Tuile></div> : <p className="mc-etat">Le nombre de réponses privées n'est pas servi.</p>
        }}
      </Corps>
      <h3 className="mc-titre-zone">PUBLICATIONS ET COMMENTAIRES</h3>
      <Corps etat={fil} quoi="Fil du Crieur">
        {(v) => v.bulles.length === 0 ? <p className="mc-etat">Rien de publié pour l'instant.</p> : (
          <ol className="mc-liste mc-fil" data-groupe="bulles-crieur">
            {v.bulles.map((b) => (
              <li key={b.id} data-bulle={b.id}>
                <div className="mc-meta"><small className="mc-chiffre">{heure(b.le)}</small><Pastille ton="muet">{b.type}</Pastille></div>
                <p className="mc-texte-exact">{b.texte}</p>
              </li>
            ))}
          </ol>
        )}
      </Corps>
    </Fenetre>
  )
}
