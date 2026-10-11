'use client'

import { apiDirection } from '../../client'
import Fenetre, { Corps, type SalleProps } from './Fenetre'
import { heure, usePanneau, type Rep } from './lecture'

// Le panneau de la salle Audience (fiche 026-189) : les visiteurs de la vitrine, par page, par minute et par campagne, en lecture seule.
// C'est l'existant (migrations 0090 à 0092) : sans cookie ni IP, jamais la liste des abonnés, aucun outil payant. Une sous-partie
// refusée se dit « hors périmètre », jamais 0. Le texte servi s'affiche en texte, jamais en HTML ; aucun bouton.
type Vue = {
  pages: { page: string; vues: number }[]
  minutes: { minute: string; vues: number }[]
  campagnes: { cle: string; vues: number }[]
}

export default function Audience({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=audience'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="audience" titre="Audience" onFermer={onFermer} etat={v ? etat : null} resume={{ equipage, poser, taches: v?.pages?.length ?? null }}>
      <Corps etat={etat} quoi="Audience">
        {(vue) => (
          <>
            <h3 className="mc-titre-zone">PAGES</h3>
            {vue.pages.length === 0 ? <p className="mc-etat">Aucune visite pour l’instant.</p> : (
              <ul className="mc-liste" data-groupe="pages">
                {vue.pages.map((p) => <li key={p.page} data-page={p.page}><span className="mc-texte-exact">{p.page}</span><span className="mc-chiffre">{p.vues}</span></li>)}
              </ul>
            )}
            <h3 className="mc-titre-zone">PAR MINUTE</h3>
            {vue.minutes.length === 0 ? <p className="mc-etat">Aucune visite récente.</p> : (
              <ul className="mc-liste" data-groupe="minutes">
                {vue.minutes.map((m) => <li key={m.minute}><span className="mc-chiffre">{heure(m.minute)}</span><span className="mc-chiffre">{m.vues}</span></li>)}
              </ul>
            )}
            <h3 className="mc-titre-zone">CAMPAGNES</h3>
            {vue.campagnes.length === 0 ? <p className="mc-etat">Aucune campagne ne ramène de visite.</p> : (
              <ul className="mc-liste" data-groupe="campagnes">
                {vue.campagnes.map((c) => <li key={c.cle} data-campagne={c.cle}><span className="mc-texte-exact">{c.cle}</span><span className="mc-chiffre">{c.vues}</span></li>)}
              </ul>
            )}
            <p className="mc-doux">Sans cookie ni adresse IP : une page et une minute, rien d’autre.</p>
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
